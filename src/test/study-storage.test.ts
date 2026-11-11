// @vitest-environment node
import { expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { openDatabase, requestValue } from "@/data/indexed-db";
import { ProofQuestRepository } from "@/data/repository";
import {
  saveStudyMaterial,
  listStudyMaterials,
  loadStudyProgress,
  saveStudyProgress,
} from "@/data/study-repository";
import { exportBackup, importBackup } from "@/data/backup";
import { validateGeneratedStudy } from "@/domain/study-material";
import { createSampleMcqVersion } from "@/data/sample-mcq";
const text =
  "Active recall means retrieving information from memory. A source provides evidence for a claim.";
const request = { format: "flashcards" as const, documentId: "doc", pages: [{ page: 1, text }] };
const sources = [{ page: 1, excerpt: "Active recall means retrieving information from memory." }];
const material = validateGeneratedStudy(
  {
    format: "flashcards",
    cards: [
      { front: "What is recall?", back: "Retrieving information.", sources },
      { front: "What can be retrieved?", back: "Information from memory.", sources },
    ],
    excluded: [],
  },
  request,
  { id: "deck", title: "Recall", createdAt: 1 },
);
async function setup(factory = new IDBFactory(), name = "test") {
  const repo = new ProofQuestRepository(await openDatabase(factory, name));
  await repo.initializeLegacy(null, { version: 1, quests: [], attempts: [] });
  const blob = new Blob(["fixture"]);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()));
  const checksum = Array.from(hash, (x) => x.toString(16).padStart(2, "0")).join("");
  await repo.addDocument(
    { id: "doc", name: "fixture.pdf", checksum, pageCount: 1, createdAt: 1, blob },
    [{ documentId: "doc", page: 1, text, warnings: [] }],
  );
  return { repo, record: { id: "deck", request, checksum, material } };
}
it("upgrades existing version-1 databases without losing old stores", async () => {
  const factory = new IDBFactory();
  const opening = factory.open("old", 1);
  opening.onupgradeneeded = () => opening.result.createObjectStore("legacy", { keyPath: "id" });
  const old = await requestValue(opening);
  await new Promise<void>((resolve, reject) => {
    const tx = old.transaction("legacy", "readwrite");
    tx.objectStore("legacy").put({ id: "kept", value: 42 });
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject();
  });
  old.close();
  const upgraded = await openDatabase(factory, "old");
  expect(upgraded.objectStoreNames.contains("materials")).toBe(true);
  expect(
    await requestValue(upgraded.transaction("legacy").objectStore("legacy").get("kept")),
  ).toEqual({ id: "kept", value: 42 });
  upgraded.close();
});
it("deduplicates saves and retains card position across database reopen and source deletion", async () => {
  const factory = new IDBFactory();
  const { repo, record } = await setup(factory);
  await saveStudyMaterial(repo.database, record);
  await saveStudyMaterial(repo.database, record);
  let progress = await loadStudyProgress(repo.database, "deck");
  progress = await saveStudyProgress(repo.database, progress, 0, true);
  progress = await saveStudyProgress(repo.database, progress, 1, true);
  expect(progress.revealed).toBe(false);
  await expect(
    saveStudyProgress(repo.database, { ...progress, revision: 0 }, 0, false),
  ).rejects.toThrow();
  await expect(saveStudyProgress(repo.database, progress, 2, false)).rejects.toThrow();
  await repo.deleteDocument("doc");
  repo.close();
  const reopened = await openDatabase(factory, "test");
  expect(await listStudyMaterials(reopened)).toHaveLength(1);
  expect(await loadStudyProgress(reopened, "deck")).toEqual(progress);
  reopened.close();
});
it("rejects stale source and failed writes without creating a material", async () => {
  const { repo, record } = await setup();
  await expect(
    saveStudyMaterial(repo.database, { ...record, checksum: "b".repeat(64) }),
  ).rejects.toThrow();
  await expect(
    saveStudyMaterial(repo.database, {
      ...record,
      request: { ...request, pages: [{ page: 1, text: text + " Changed" }] },
    }),
  ).rejects.toThrow();
  const original = IDBObjectStore.prototype.add;
  const spy = vi.spyOn(IDBObjectStore.prototype, "add").mockImplementation(function (
    this: IDBObjectStore,
    ...args
  ) {
    if (this.name === "materials") throw new Error("quota");
    return original.apply(this, args);
  });
  try {
    await expect(saveStudyMaterial(repo.database, record)).rejects.toThrow();
  } finally {
    spy.mockRestore();
  }
  expect(await listStudyMaterials(repo.database)).toEqual([]);
  repo.close();
});
it("round-trips new records and progress; accepts version-2 backups and rejects orphan progress", async () => {
  const { repo, record } = await setup();
  await saveStudyMaterial(repo.database, record);
  await saveStudyProgress(repo.database, await loadStudyProgress(repo.database, "deck"), 0, true);
  const backup = await exportBackup(repo.database);
  const target = await openDatabase(new IDBFactory());
  await importBackup(target, backup);
  expect(await listStudyMaterials(target)).toEqual([record]);
  expect((await loadStudyProgress(target, "deck")).revealed).toBe(true);
  const old = JSON.parse(backup);
  old.version = 2;
  delete old.materials;
  delete old.studyProgress;
  const legacyTarget = await openDatabase(new IDBFactory());
  await importBackup(legacyTarget, JSON.stringify(old));
  expect(await listStudyMaterials(legacyTarget)).toEqual([]);
  const bad = JSON.parse(backup);
  bad.studyProgress[0].id = "missing";
  await expect(importBackup(target, JSON.stringify(bad))).rejects.toThrow();
  repo.close();
  target.close();
  legacyTarget.close();
});
it("starts both modes from the same stored question set without rewriting it", async () => {
  const { repo } = await setup();
  const version = createSampleMcqVersion();
  await repo.addVersion(version);
  const quiz = await repo.startSession("quiz", version.id, "practice", 1);
  const exam = await repo.startSession("exam", version.id, "test", 1);
  expect(quiz.mode).toBe("practice");
  expect(exam.mode).toBe("test");
  expect(quiz.version).toEqual(exam.version);
  expect((await repo.startSession("again", version.id, "test", 2)).id).toBe("exam");
  repo.close();
});

it("rejects restored source text that conflicts with saved material atomically", async () => {
  const { repo, record } = await setup();
  await saveStudyMaterial(repo.database, record);
  const backup = JSON.parse(await exportBackup(repo.database));
  backup.pages[0].text += " changed";
  const target = await openDatabase(new IDBFactory());
  await expect(importBackup(target, JSON.stringify(backup))).rejects.toThrow(
    "Study source conflicts",
  );
  expect(await listStudyMaterials(target)).toEqual([]);
  repo.close();
  target.close();
});
