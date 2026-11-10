// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { IDBFactory, IDBKeyRange, IDBObjectStore } from "fake-indexeddb";
import { openDatabase } from "@/data/indexed-db";
import { ProofQuestRepository } from "@/data/repository";
import { createSampleMcqVersion } from "@/data/sample-mcq";
import { exportBackup, importBackup } from "@/data/backup";
import { presentQuizResult, quizHistory } from "@/domain/quiz-review";
const repos: ProofQuestRepository[] = [];
async function repo(factory = new IDBFactory()) {
  const result = new ProofQuestRepository(await openDatabase(factory));
  repos.push(result);
  await result.initializeLegacy(null, { version: 1, quests: [], attempts: [] });
  return result;
}
afterEach(() => {
  for (const r of repos.splice(0)) r.close();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it("finalizes one correct and four skips once across simultaneous requests and retains it in backup", async () => {
  const factory = new IDBFactory();
  const first = await repo(factory),
    second = await repo(factory);
  const version = createSampleMcqVersion();
  await first.addVersion(version);
  const session = await first.startSession("original", version.id, "test", 1);
  const draft = await first.changeSession(
    session.id,
    0,
    { type: "draft", questionId: "recall", response: { type: "mcq", optionId: "a" } },
    2,
  );
  const [a, b] = await Promise.all([
    first.changeSession(session.id, draft.revision, { type: "finalize" }, 3),
    second.changeSession(session.id, draft.revision, { type: "finalize" }, 3),
  ]);
  expect(a).toEqual(b);
  expect(a.result).toEqual({ correct: 1, incorrect: 0, skipped: 4, total: 5, percentage: 20 });
  expect(await first.listSessions()).toHaveLength(1);
  const restored = await repo();
  await importBackup(restored.database, await exportBackup(first.database));
  expect(await restored.getSession(a.id)).toEqual(a);
  expect(presentQuizResult((await restored.getSession(a.id))!).score.percentage).toBe(20);
  await expect(
    restored.changeSession(
      a.id,
      a.revision,
      { type: "draft", questionId: "recall", response: { type: "mcq", optionId: "b" } },
      4,
    ),
  ).rejects.toThrow();
});
it("preserves completed evidence and retry version after source edits/deletion and quiz deletion", async () => {
  vi.stubGlobal("IDBKeyRange", IDBKeyRange);
  const r = await repo();
  const version = createSampleMcqVersion();
  const q = version.questions[0]!;
  if (q.type !== "mcq") throw new Error("fixture");
  q.sources = [{ documentId: "source", page: 1, excerpt: "Original evidence" }];
  const document = {
    id: "source",
    name: "source.pdf",
    checksum: "a".repeat(64),
    pageCount: 1,
    createdAt: 1,
    blob: new Blob(["%PDF-fixture"]),
  };
  await r.addDocument(document, [
    { documentId: "source", page: 1, text: "Original evidence", warnings: [] },
  ]);
  await r.addVersion(version);
  const draft = await r.startSession("old", version.id, "test", 2);
  const done = await r.changeSession(draft.id, 0, { type: "finalize" }, 3);
  const before = presentQuizResult(done);
  await r.deleteDocument("source");
  await r.addDocument({ ...document, name: "edited.pdf" }, [
    { documentId: "source", page: 1, text: "Changed source", warnings: [] },
  ]);
  expect(presentQuizResult((await r.getSession(done.id))!)).toEqual(before);
  await r.deleteDocument("source");
  await r.deleteQuiz(version.quizId);
  expect(await r.getDocument("source")).toBeUndefined();
  expect(presentQuizResult((await r.getSession(done.id))!)).toEqual(before);
  const [retry, duplicate] = await Promise.all([
    r.retrySession("new", done.id, 4),
    r.retrySession("duplicate", done.id, 4),
  ]);
  expect(retry).toEqual(duplicate);
  expect(retry.version).toEqual(done.version);
  expect(retry.answers).toEqual({});
  expect(retry.result).toBeNull();
  expect(quizHistory(await r.listSessions()).map((s) => s.id)).toEqual([retry.id, done.id]);
});
it("leaves a failed finalization recoverable and retries to a single result", async () => {
  const r = await repo();
  const version = createSampleMcqVersion();
  await r.addVersion(version);
  const start = await r.startSession("s", version.id, "practice", 1);
  const put = IDBObjectStore.prototype.put;
  vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(function (
    this: IDBObjectStore,
    ...args: Parameters<IDBObjectStore["put"]>
  ) {
    if (this.name === "sessions") throw new DOMException("Full", "QuotaExceededError");
    return put.apply(this, args);
  });
  await expect(r.changeSession(start.id, 0, { type: "finalize" }, 2)).rejects.toThrow();
  expect(await r.getSession(start.id)).toEqual(start);
  vi.restoreAllMocks();
  expect((await r.changeSession(start.id, 0, { type: "finalize" }, 3)).result?.skipped).toBe(5);
  expect(await r.listSessions()).toHaveLength(1);
});
