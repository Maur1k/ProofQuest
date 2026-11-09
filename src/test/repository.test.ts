// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore, IDBKeyRange } from "fake-indexeddb";
import { openDatabase } from "@/data/indexed-db";
import { ProofQuestRepository } from "@/data/repository";
import { clearLibrary, exportBackup, importBackup } from "@/data/backup";
import { createSampleQuests } from "@/data/sample-quests";
import type { QuizVersion } from "@/domain/quiz";
import type { AppData, Attempt } from "@/domain/types";
import { RevisionConflict } from "@/domain/quiz-session";

const repositories: ProofQuestRepository[] = [];
const empty: AppData = { version: 1, quests: [], attempts: [] };
async function repository(factory = new IDBFactory(), name = "test") {
  const repo = new ProofQuestRepository(await openDatabase(factory, name));
  repositories.push(repo);
  return repo;
}
afterEach(() => {
  for (const repo of repositories.splice(0)) repo.close();
  vi.restoreAllMocks();
});
function version(): QuizVersion {
  return {
    id: "v1",
    quizId: "quiz",
    title: "Fixture",
    createdAt: 1,
    questions: Array.from({ length: 5 }, (_, i) => ({
      id: `q${i}`,
      type: "mcq" as const,
      prompt: "Choose A",
      explanation: "A is correct",
      hints: [],
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
      correctOptionId: "a",
      sources: [],
    })),
  };
}
const draft = {
  type: "draft" as const,
  questionId: "q0",
  response: { type: "mcq" as const, optionId: "a" },
};
async function prepareSession(repo: ProofQuestRepository) {
  await repo.initializeLegacy(null, empty);
  await repo.addVersion(version());
  return repo.startSession("attempt", "v1", "test", 2);
}
function source(): AppData {
  const quest = createSampleQuests()[0]!;
  const question = quest.questions[0]!;
  const attempt: Attempt = {
    id: "legacy-attempt",
    questId: quest.id,
    questTitle: quest.title,
    subjectId: quest.subjectId,
    topic: quest.topic,
    startedAt: 1,
    updatedAt: 2,
    completedAt: 2,
    currentIndex: 0,
    hintsShown: {},
    answers: {
      [question.id]: {
        questionId: question.id,
        response: { type: "predict", output: "original" },
        correct: true,
        hintsUsed: 0,
        revealed: false,
        answeredAt: 2,
      },
    },
  };
  return { version: 1, quests: [quest], attempts: [attempt] };
}
async function addDocument(repo: ProofQuestRepository) {
  const blob = new Blob(["Synthetic PDF bytes"], { type: "application/pdf" });
  const checksum = Buffer.from(
    await crypto.subtle.digest("SHA-256", await blob.arrayBuffer()),
  ).toString("hex");
  await repo.addDocument(
    { id: "doc", name: "fixture.pdf", checksum, blob, pageCount: 1, createdAt: 1 },
    [{ documentId: "doc", page: 1, text: "Source content", warnings: [] }],
  );
}

describe("durable migration", () => {
  it("commits IDs, raw rollback source and reconstructed snapshots once across two connections", async () => {
    const factory = new IDBFactory();
    const a = await repository(factory),
      b = await repository(factory);
    const raw = JSON.stringify(source());
    const [first, second] = await Promise.all([
      a.initializeLegacy(raw, empty),
      b.initializeLegacy(raw, empty),
    ]);
    expect(first).toEqual(second);
    expect(first.data).toEqual(source());
    expect(first.snapshots["legacy-attempt"]?.provenance).toBe("reconstructed");
    expect((await a.getMigration())?.source).toBe(raw);
    expect(await a.initializeLegacy("{invalid later source", empty)).toEqual(first);
  });
  it("rolls back data and marker together when marker write fails, then retries cleanly", async () => {
    const repo = await repository();
    const add = IDBObjectStore.prototype.add;
    vi.spyOn(IDBObjectStore.prototype, "add").mockImplementation(function (
      this: IDBObjectStore,
      value,
      key,
    ) {
      if (this.name === "meta")
        throw new DOMException("Synthetic quota failure", "QuotaExceededError");
      return add.call(this, value, key);
    });
    await expect(repo.initializeLegacy(JSON.stringify(source()), empty)).rejects.toThrow("quota");
    expect(await repo.getLegacy()).toBeUndefined();
    expect(await repo.getMigration()).toBeUndefined();
    vi.restoreAllMocks();
    expect(
      (await repo.initializeLegacy(JSON.stringify(source()), empty)).data.attempts,
    ).toHaveLength(1);
  });
  it("rejects malformed source without creating a marker and retains partial recovery source", async () => {
    const repo = await repository();
    await expect(repo.initializeLegacy("{", empty)).rejects.toThrow();
    expect(await repo.getMigration()).toBeUndefined();
    const raw = JSON.stringify({ ...source(), quests: [...source().quests, { broken: true }] });
    await repo.initializeLegacy(raw, empty);
    expect((await repo.getMigration())?.source).toBe(raw);
    expect((await repo.getMigration())?.warning).toContain("skipped");
  });
  it("preserves completed historical details after source edits and deletion", async () => {
    const repo = await repository();
    const original = source();
    const state = await repo.initializeLegacy(JSON.stringify(original), empty);
    const quest = { ...original.quests[0]!, title: "Edited title", questions: [] };
    await repo.changeLegacy({ type: "updateQuest", quest }, state.revision);
    const deleted = await repo.changeLegacy({ type: "deleteQuest", id: quest.id }, 1);
    expect(deleted.snapshots["legacy-attempt"]?.quest?.questions).toEqual(
      original.quests[0]?.questions,
    );
    expect(deleted.data.attempts).toEqual(original.attempts);
  });
});

describe("atomic quiz writes", () => {
  it("persists the latest draft across close/reopen and finalizes one correct plus four skips at 20%", async () => {
    const factory = new IDBFactory();
    const repo = await repository(factory);
    await prepareSession(repo);
    await repo.changeSession("attempt", 0, draft, 3);
    await repo.changeSession(
      "attempt",
      1,
      { ...draft, response: { type: "mcq", optionId: "b" } },
      4,
    );
    await repo.changeSession("attempt", 2, draft, 5);
    repo.close();
    const reopened = await repository(factory);
    expect((await reopened.getSession("attempt"))?.answers["q0"]?.response).toEqual(draft.response);
    const result = await reopened.changeSession("attempt", 3, { type: "finalize" }, 6);
    expect(result.result).toEqual({
      correct: 1,
      incorrect: 0,
      skipped: 4,
      total: 5,
      percentage: 20,
    });
  });
  it("allows exactly one of two conflicting writers and returns one result for concurrent finalizations", async () => {
    const factory = new IDBFactory();
    const a = await repository(factory),
      b = await repository(factory);
    await prepareSession(a);
    const writes = await Promise.allSettled([
      a.changeSession("attempt", 0, draft, 3),
      b.changeSession("attempt", 0, draft, 3),
    ]);
    expect(writes.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(writes.find((result) => result.status === "rejected")?.reason).toBeInstanceOf(
      RevisionConflict,
    );
    const results = await Promise.all([
      a.changeSession("attempt", 1, { type: "finalize" }, 4),
      b.changeSession("attempt", 1, { type: "finalize" }, 5),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(results[0]?.revision).toBe(2);
  });
  it("rolls back a failed answer write and never resolves with a fake saved value", async () => {
    const repo = await repository();
    await prepareSession(repo);
    vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(() => {
      throw new DOMException("Quota", "QuotaExceededError");
    });
    await expect(repo.changeSession("attempt", 0, draft, 3)).rejects.toThrow("Quota");
    expect((await repo.getSession("attempt"))?.revision).toBe(0);
    expect((await repo.getSession("attempt"))?.answers).toEqual({});
  });
  it("rejects overwritten versions and preserves session content after source deletion", async () => {
    const repo = await repository();
    await prepareSession(repo);
    await expect(repo.addVersion({ ...version(), title: "Changed" })).rejects.toThrow("immutable");
    await repo.deleteQuiz("quiz");
    expect(await repo.getVersion("v1")).toBeUndefined();
    expect((await repo.getSession("attempt"))?.version).toEqual(version());
    expect((await repo.changeSession("attempt", 0, draft, 3)).answers["q0"]?.correct).toBeNull();
  });
  it("deduplicates concurrent session starts", async () => {
    const repo = await repository();
    await repo.addVersion(version());
    const sessions = await Promise.all([
      repo.startSession("a", "v1", "test", 1),
      repo.startSession("b", "v1", "test", 1),
    ]);
    expect(sessions[0]?.id).toBe(sessions[1]?.id);
  });
});

describe("backup and deletion", () => {
  it("round-trips document bytes, page text, completed sessions and history without duplicating imports", async () => {
    const a = await repository();
    await prepareSession(a);
    await addDocument(a);
    await a.changeSession("attempt", 0, draft, 3);
    await a.changeSession("attempt", 1, { type: "finalize" }, 4);
    const text = await exportBackup(a.database);
    const b = await repository();
    await b.initializeLegacy(null, empty);
    await importBackup(b.database, text);
    await importBackup(b.database, text);
    expect(await b.getSession("attempt")).toEqual(await a.getSession("attempt"));
    expect(await (await b.getDocument("doc"))?.blob.text()).toBe("Synthetic PDF bytes");
    expect(await b.getPages("doc")).toHaveLength(1);
  });
  it("rejects checksum tampering, duplicate IDs and invalid scoring before writing anything", async () => {
    const a = await repository();
    await prepareSession(a);
    await addDocument(a);
    await a.changeSession("attempt", 0, { type: "finalize" }, 3);
    const backup = JSON.parse(await exportBackup(a.database));
    const b = await repository();
    await b.initializeLegacy(null, empty);
    await expect(
      importBackup(
        b.database,
        JSON.stringify({
          ...backup,
          documents: [{ ...backup.documents[0], bytes: btoa("tampered") }],
        }),
      ),
    ).rejects.toThrow();
    await expect(
      importBackup(
        b.database,
        JSON.stringify({ ...backup, versions: [...backup.versions, backup.versions[0]] }),
      ),
    ).rejects.toThrow();
    backup.sessions[0].result.percentage = 100;
    await expect(importBackup(b.database, JSON.stringify(backup))).rejects.toThrow();
    expect(await b.getVersion("v1")).toBeUndefined();
    expect(await b.getDocument("doc")).toBeUndefined();
  });
  it("rolls back earlier imports on a late record conflict", async () => {
    const a = await repository(),
      b = await repository();
    await prepareSession(a);
    await addDocument(a);
    await b.initializeLegacy(null, empty);
    await b.addVersion({ ...version(), title: "Conflicting local quiz" });
    await expect(importBackup(b.database, await exportBackup(a.database))).rejects.toThrow(
      "Conflicting",
    );
    expect(await b.getDocument("doc")).toBeUndefined();
    expect((await b.getLegacy())?.revision).toBe(0);
  });
  it("deletes document bytes and pages but preserves the quiz and attempt", async () => {
    const repo = await repository();
    await prepareSession(repo);
    await addDocument(repo);
    await repo.deleteDocument("doc");
    expect(await repo.getDocument("doc")).toBeUndefined();
    expect(await repo.getPages("doc")).toEqual([]);
    expect(await repo.getVersion("v1")).toBeDefined();
    expect(await repo.getSession("attempt")).toBeDefined();
  });
  it("clears a library deliberately without resurrecting v1 data on reload", async () => {
    const repo = await repository();
    const raw = JSON.stringify(source());
    await repo.initializeLegacy(raw, empty);
    await clearLibrary(repo.database, 0);
    expect((await repo.initializeLegacy(raw, empty)).data).toEqual(empty);
    expect((await repo.getMigration())?.source).toBeNull();
  });
});

describe("recovery edge cases", () => {
  it("finalizes a cleared Test draft and accepts its exported result", async () => {
    const repo = await repository();
    await prepareSession(repo);
    await repo.changeSession(
      "attempt",
      0,
      { ...draft, response: { type: "mcq", optionId: null } },
      3,
    );
    const done = await repo.changeSession("attempt", 1, { type: "finalize" }, 4);
    expect(done.answers["q0"]?.status).toBe("submitted");
    expect(done.result?.skipped).toBe(5);
    const target = await repository();
    await target.initializeLegacy(null, empty);
    await importBackup(target.database, await exportBackup(repo.database));
    expect(await target.getSession("attempt")).toEqual(done);
  });
  it("retains imported original rollback sources through another export/import", async () => {
    const first = await repository(),
      second = await repository(),
      third = await repository();
    const raw = JSON.stringify(source());
    await first.initializeLegacy(raw, empty);
    await second.initializeLegacy(null, empty);
    await third.initializeLegacy(null, empty);
    await importBackup(second.database, await exportBackup(first.database));
    await importBackup(third.database, await exportBackup(second.database));
    expect(JSON.parse(await exportBackup(third.database)).rollbackSources).toContain(raw);
  });
  it("rejects a backup missing attempt snapshots without changing saved data", async () => {
    const repo = await repository();
    await repo.initializeLegacy(JSON.stringify(source()), empty);
    const packet = JSON.parse(await exportBackup(repo.database));
    packet.legacy.snapshots = {};
    await expect(importBackup(repo.database, JSON.stringify(packet))).rejects.toThrow();
    expect((await repo.getLegacy())?.revision).toBe(0);
  });
});

describe("generation job records", () => {
  it("rejects stale revisions and missing results, and keeps completed jobs terminal", async () => {
    const repo = await repository();
    await addDocument(repo);
    const job = {
      id: "job",
      revision: 0,
      documentId: "doc",
      status: "queued" as const,
      selectedPages: [1],
      questionCount: 5,
      createdAt: 1,
      updatedAt: 1,
      resultVersionId: null,
      errorCode: null,
    };
    await repo.saveJob(job, null);
    await expect(
      repo.saveJob({ ...job, revision: 1, status: "running", updatedAt: 2 }, null),
    ).rejects.toThrow();
    await expect(
      repo.saveJob(
        { ...job, revision: 1, status: "succeeded", resultVersionId: "missing", updatedAt: 2 },
        0,
      ),
    ).rejects.toThrow();
    await repo.addVersion(version());
    await repo.saveJob(
      { ...job, revision: 1, status: "succeeded", resultVersionId: "v1", updatedAt: 2 },
      0,
    );
    await expect(
      repo.saveJob({ ...job, revision: 2, status: "running", updatedAt: 3 }, 1),
    ).rejects.toThrow("finished");
  });
});

describe("selected PDF pages", () => {
  it("reopens sparse imports atomically and restores their original page mapping from backup", async () => {
    vi.stubGlobal("IDBKeyRange", IDBKeyRange);
    try {
      const repo = await repository();
      await repo.initializeLegacy(null, empty);
      await addDocument(repo);
      const original = (await repo.getDocument("doc"))!;
      const document = { ...original, id: "sparse", pageCount: 3, extractedPages: [1, 3] };
      const pages = [1, 3].map((page) => ({
        documentId: "sparse",
        page,
        text: `Original page ${page}`,
        warnings: [],
      }));
      await repo.addDocument(document, pages);
      expect((await repo.getDocumentBundle("sparse"))?.pages).toEqual(pages);
      expect(await repo.listDocuments()).toHaveLength(2);
      const backup = await exportBackup(repo.database);
      const restored = await repository(new IDBFactory(), "restored");
      await importBackup(restored.database, backup);
      expect((await restored.getDocumentBundle("sparse"))?.document.extractedPages).toEqual([1, 3]);
      expect((await restored.getDocumentBundle("doc"))?.pages).toHaveLength(1);
      await expect(
        repo.addDocument({ ...document, id: "bad" }, [{ ...pages[0]!, documentId: "bad" }]),
      ).rejects.toThrow("mapping");
      expect(await repo.getDocument("bad")).toBeUndefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
