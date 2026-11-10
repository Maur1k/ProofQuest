// @vitest-environment node
import { expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { openDatabase } from "@/data/indexed-db";
import { ProofQuestRepository } from "@/data/repository";
import { createSampleMcqVersion } from "@/data/sample-mcq";
import { RevisionConflict } from "@/domain/quiz-session";

it("deduplicates concurrent sample starts and retains submitted answers across connections", async () => {
  const factory = new IDBFactory();
  const first = new ProofQuestRepository(await openDatabase(factory, "practice"));
  const second = new ProofQuestRepository(await openDatabase(factory, "practice"));
  try {
    const version = createSampleMcqVersion();
    await Promise.all([first.addVersion(version), second.addVersion(version)]);
    const [a, b] = await Promise.all([
      first.startSession("a", version.id, "practice", 1),
      second.startSession("b", version.id, "practice", 1),
    ]);
    expect(a.id).toBe(b.id);
    const command = {
      type: "practice" as const,
      questionId: "recall",
      response: { type: "mcq" as const, optionId: "a" },
      hintsUsed: 0,
      revealed: false,
    };
    const saved = await first.changeSession(a.id, a.revision, command, 2);
    await expect(
      second.changeSession(
        b.id,
        b.revision,
        { ...command, response: { type: "mcq", optionId: "b" } },
        3,
      ),
    ).rejects.toBeInstanceOf(RevisionConflict);
    expect(await second.getSession(a.id)).toEqual(saved);
    expect(await second.startSession("resume", version.id, "practice", 4)).toEqual(saved);
  } finally {
    first.close();
    second.close();
  }
});
