// @vitest-environment node
import { expect, it } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { openDatabase } from "@/data/indexed-db";
import { ProofQuestRepository } from "@/data/repository";
import { validateGeneratedQuiz } from "@/domain/generation";
import { vi } from "vitest";
const text =
  "Active recall means retrieving information from memory. The original source can be checked for evidence.";
const input = { documentId: "doc", pages: [{ page: 1, text }], questionCount: 5 as const };
function version() {
  return validateGeneratedQuiz(
    {
      questions: Array.from({ length: 5 }, (_, i) => ({
        prompt: `Question ${i}?`,
        options: [
          { id: "a", text: "Recall" },
          { id: "b", text: "Copy" },
        ],
        correctOptionId: "a",
        explanation: "Recall retrieves information.",
        sources: [{ page: 1, excerpt: "Active recall means retrieving information from memory." }],
      })),
    },
    input,
    { id: "v", quizId: "q", title: "Generated", createdAt: 1 },
  );
}
async function setup() {
  const repo = new ProofQuestRepository(await openDatabase(new IDBFactory()));
  await repo.addDocument(
    {
      id: "doc",
      name: "test.pdf",
      checksum: "a".repeat(64),
      createdAt: 1,
      pageCount: 1,
      blob: new Blob(["pdf"]),
    },
    [{ documentId: "doc", page: 1, text, warnings: [] }],
  );
  return repo;
}
it("atomically saves a generated quiz and one resumable attempt, deduplicating save retries", async () => {
  const repo = await setup();
  try {
    const a = await repo.commitGeneratedQuiz(input, "a".repeat(64), version());
    const b = await repo.commitGeneratedQuiz(input, "a".repeat(64), version());
    expect(a).toEqual(b);
    expect(await repo.listSessions()).toHaveLength(1);
  } finally {
    repo.close();
  }
});
it("rejects stale source checksums/text and fabricated citations without partial records", async () => {
  const repo = await setup();
  try {
    await expect(repo.commitGeneratedQuiz(input, "b".repeat(64), version())).rejects.toThrow();
    await expect(
      repo.commitGeneratedQuiz(
        { ...input, pages: [{ page: 1, text: text + " altered" }] },
        "a".repeat(64),
        version(),
      ),
    ).rejects.toThrow();
    const changed = version();
    if (changed.questions[0]!.type === "mcq")
      changed.questions[0]!.sources[0]!.documentId = "other";
    await expect(repo.commitGeneratedQuiz(input, "a".repeat(64), changed)).rejects.toThrow();
    expect(await repo.getVersion("v")).toBeUndefined();
    expect(await repo.listSessions()).toEqual([]);
  } finally {
    repo.close();
  }
});
it("rolls back the version if creating the attempt fails", async () => {
  const repo = await setup();
  const add = IDBObjectStore.prototype.add;
  try {
    vi.spyOn(IDBObjectStore.prototype, "add").mockImplementation(function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore["add"]>
    ) {
      if (this.name === "sessions") throw new DOMException("full", "QuotaExceededError");
      return add.apply(this, args);
    });
    await expect(repo.commitGeneratedQuiz(input, "a".repeat(64), version())).rejects.toThrow();
    expect(await repo.getVersion("v")).toBeUndefined();
  } finally {
    vi.restoreAllMocks();
    repo.close();
  }
});
