// @vitest-environment node
import { expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { openDatabase, requestValue } from "@/data/indexed-db";
import { ProofQuestRepository } from "@/data/repository";
import { listSourceData, saveSourceRevision } from "@/data/source-repository";
import { textSource, pdfSource, WATER_SAMPLE } from "@/features/study-sources/adapters";
import { citeSegment, sourceSelectionKey, sourceRevisionSchema } from "@/domain/study-source";
import { exportBackup, importBackup, clearLibrary } from "@/data/backup";
async function setup(factory = new IDBFactory(), name = "test") {
  const db = await openDatabase(factory, name);
  const repo = new ProofQuestRepository(db);
  await repo.initializeLegacy(null, { version: 1, quests: [], attempts: [] });
  return { db, repo, factory };
}
it("keeps immutable text revisions and paragraph citations across edits and reopen", async () => {
  const { db, repo, factory } = await setup();
  const first = await textSource("Water", WATER_SAMPLE.text, "source");
  const head = await saveSourceRevision(db, first, null);
  const citation = citeSegment(first, "paragraph-1", first.segments[0]!.text);
  expect(citation.kind).toBe("text");
  expect(citation).not.toHaveProperty("page");
  const next = await textSource("Updated", "Changed notes.", "source");
  await saveSourceRevision(db, next, head.revision);
  await expect(
    saveSourceRevision(db, await textSource("Stale", "Old draft.", "source"), 0),
  ).rejects.toThrow();
  await expect(saveSourceRevision(db, first, 1)).rejects.toThrow();
  repo.close();
  const reopened = await openDatabase(factory, "test");
  const data = await listSourceData(reopened);
  expect(data.sources[0]?.currentRevisionId).toBe(next.id);
  expect(data.revisions.find((r) => r.id === first.id)).toEqual(first);
  expect(citation.excerpt).toBe(first.segments[0]!.text);
  reopened.close();
});
it("rejects invalid selection, invented citations, over-limit input and fabricated PDF fields", async () => {
  const source = await textSource("Water", WATER_SAMPLE.text, "water");
  const ids = source.segments.map((s) => s.id);
  expect(sourceSelectionKey(source, ids, "quiz")).toBe(
    sourceSelectionKey(source, [...ids].reverse(), "exam"),
  );
  expect(() => sourceSelectionKey(source, [], "quiz")).toThrow();
  expect(() => sourceSelectionKey(source, [ids[0]!, ids[0]!], "quiz")).toThrow();
  expect(() => citeSegment(source, ids[0]!, "Not present")).toThrow();
  expect(() => textSource("Huge", "x".repeat(60001))).toThrow();
  expect(
    sourceRevisionSchema.safeParse({ ...source, segments: [{ ...source.segments[0], page: 1 }] })
      .success,
  ).toBe(false);
  await expect(textSource("Empty", "  ")).rejects.toThrow();
  await expect(textSource("Too many", Array(101).fill("One").join("\n\n"))).rejects.toThrow();
});
it("maps actual PDF pages, retains text after deletion, and never duplicates the blob", async () => {
  const { db, repo } = await setup();
  const blob = new Blob(["pdf fixture"]);
  const checksum = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  const document = {
    id: "pdf",
    name: "Notes.pdf",
    pageCount: 9,
    extractedPages: [4, 9],
    createdAt: 1,
    checksum,
    blob,
  };
  const pages = [
    { documentId: "pdf", page: 9, text: "Ninth page.", warnings: [] },
    { documentId: "pdf", page: 4, text: "Fourth page.", warnings: [] },
  ];
  await repo.addDocument(document, pages);
  const revision = await pdfSource(document, pages);
  expect(revision).not.toHaveProperty("blob");
  expect(citeSegment(revision, "page-9", "Ninth page.")).toMatchObject({
    kind: "pdf",
    page: 9,
    documentId: "pdf",
  });
  await saveSourceRevision(db, revision, null);
  await repo.deleteDocument("pdf");
  expect((await listSourceData(db)).revisions[0]).toEqual(revision);
  const restored = await setup(new IDBFactory());
  await importBackup(restored.db, await exportBackup(db));
  expect((await listSourceData(restored.db)).revisions[0]).toEqual(revision);
  restored.repo.close();
  repo.close();
});
it("round-trips v4 including sample provenance and retained revisions, rejects corruption atomically", async () => {
  const { db, repo } = await setup();
  const sample = await textSource(WATER_SAMPLE.title, WATER_SAMPLE.text, "sample", true);
  await saveSourceRevision(db, sample, null);
  const backup = await exportBackup(db);
  expect(JSON.parse(backup).version).toBe(5);
  const target = await setup(new IDBFactory());
  await importBackup(target.db, backup);
  expect(await listSourceData(target.db)).toEqual(await listSourceData(db));
  const corrupt = JSON.parse(backup);
  corrupt.sourceRevisions[0].segments[0].text = "Tampered";
  await expect(importBackup(target.db, JSON.stringify(corrupt))).rejects.toThrow("checksum");
  const orphan = JSON.parse(backup);
  orphan.sources = [];
  await expect(importBackup(target.db, JSON.stringify(orphan))).rejects.toThrow();
  expect(await listSourceData(target.db)).toEqual(await listSourceData(db));
  const state = await target.repo.getLegacy();
  await clearLibrary(target.db, state!.revision);
  expect(await listSourceData(target.db)).toEqual({ sources: [], revisions: [] });
  target.repo.close();
  repo.close();
});
it.each([2, 3])("imports legacy v%s backups without synthetic sources", async (version) => {
  const { db, repo } = await setup();
  const backup = JSON.parse(await exportBackup(db));
  backup.version = version;
  delete backup.sources;
  delete backup.sourceRevisions;
  delete backup.sourceMaterials;
  delete backup.sourceMaterialProgress;
  if (version === 2) {
    delete backup.materials;
    delete backup.studyProgress;
  }
  await importBackup(db, JSON.stringify(backup));
  expect(await listSourceData(db)).toEqual({ sources: [], revisions: [] });
  repo.close();
});
it("upgrades schema 2 additively and rejects an old schema writer", async () => {
  const factory = new IDBFactory();
  const request = factory.open("test", 2);
  request.onupgradeneeded = () => request.result.createObjectStore("meta", { keyPath: "id" });
  const old = await requestValue(request);
  await new Promise<void>((resolve) => {
    const tx = old.transaction("meta", "readwrite");
    tx.objectStore("meta").put({ id: "kept", value: 42 });
    tx.oncomplete = () => resolve();
  });
  old.close();
  const db = await openDatabase(factory, "test");
  expect(db.version).toBe(4);
  expect(await requestValue(db.transaction("meta").objectStore("meta").get("kept"))).toEqual({
    id: "kept",
    value: 42,
  });
  await expect(requestValue(factory.open("test", 2))).rejects.toThrow();
  db.close();
});
it("aborts the entire source save on a quota/write failure", async () => {
  const { db, repo } = await setup();
  const source = await textSource("Water", WATER_SAMPLE.text);
  const original = IDBObjectStore.prototype.put;
  const spy = vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
    this: IDBObjectStore,
    ...args: Parameters<typeof original>
  ) {
    if (this.name === "sources") throw new DOMException("Full", "QuotaExceededError");
    return original.apply(this, args);
  });
  try {
    await expect(saveSourceRevision(db, source, null)).rejects.toThrow();
  } finally {
    spy.mockRestore();
  }
  expect(await listSourceData(db)).toEqual({ sources: [], revisions: [] });
  repo.close();
});
