import { describe, expect, it } from "vitest";
import { createSampleQuests } from "@/data/sample-quests";
import { prepareLegacyMigration } from "@/data/legacy-migration";
import { checkQuizAnswer, mcqSchema, quizVersionSchema, type QuizVersion } from "@/domain/quiz";
import {
  finalizeQuizSession,
  RevisionConflict,
  saveTestDraft,
  startQuizSession,
  submitPracticeAnswer,
} from "@/domain/quiz-session";
import type { AppData, Attempt } from "@/domain/types";

function version(): QuizVersion {
  return {
    id: "version-1",
    quizId: "quiz-1",
    title: "Manual fixture",
    createdAt: 1,
    questions: Array.from({ length: 5 }, (_, index) => ({
      id: `q${index}`,
      type: "mcq" as const,
      prompt: `Question ${index}`,
      explanation: "A is supported by the source.",
      hints: ["Consider A"],
      options: [
        { id: "a", text: "First option" },
        { id: "b", text: "Second option" },
      ],
      correctOptionId: "a",
      sources: [{ documentId: "doc-1", page: 1, excerpt: "Source evidence" }],
    })),
  };
}
const selected = { type: "mcq" as const, optionId: "a" };
const other = { type: "mcq" as const, optionId: "b" };

describe("MCQ boundary validation", () => {
  it("accepts a sourced MCQ without programming-only fields", () => {
    expect(mcqSchema.parse(version().questions[0]).type).toBe("mcq");
  });
  it.each([
    {
      options: [
        { id: "a", text: "A" },
        { id: "a", text: "B" },
      ],
    },
    {
      options: [
        { id: "a", text: "Same" },
        { id: "b", text: " same " },
      ],
    },
    { correctOptionId: "missing" },
    { sources: [{ documentId: "doc", page: 0, excerpt: "Evidence" }] },
    { prompt: "   " },
    { options: [{ id: "a", text: "Only one" }] },
  ])("rejects invalid or ambiguous MCQ shape %j", (patch) => {
    expect(mcqSchema.safeParse({ ...version().questions[0], ...patch }).success).toBe(false);
  });
  it("rejects duplicate question IDs", () => {
    const input = version();
    input.questions[1] = input.questions[0]!;
    expect(quizVersionSchema.safeParse(input).success).toBe(false);
  });
  it("continues to grade existing programming question variants", () => {
    for (const question of createSampleQuests().flatMap((quest) => quest.questions)) {
      const response =
        question.type === "predict"
          ? { type: "predict" as const, output: question.expectedOutput }
          : question.type === "fix"
            ? { type: "fix" as const, code: question.fixedCode }
            : { type: "trace" as const, cells: question.steps.map((step) => step.values) };
      expect(checkQuizAnswer(question, response)).toBe(true);
      expect(checkQuizAnswer(question, selected)).toBe(false);
    }
  });
});

describe("new session grading contracts", () => {
  it("grades one correct and four skipped as 20%, with repeat finalization returning the same result", () => {
    let session = startQuizSession("attempt", version(), "test", 2);
    session = saveTestDraft(session, 0, "q0", selected, 3);
    expect(session.answers["q0"]?.correct).toBeNull();
    const completed = finalizeQuizSession(session, 1, 4);
    expect(completed.result).toEqual({
      correct: 1,
      incorrect: 0,
      skipped: 4,
      total: 5,
      percentage: 20,
    });
    expect(finalizeQuizSession(completed, 1, 5)).toBe(completed);
  });
  it("allows repeated Test changes and preserves the latest draft across serialization", () => {
    let session = startQuizSession("attempt", version(), "test", 2);
    session = saveTestDraft(session, 0, "q0", selected, 3);
    session = saveTestDraft(session, 1, "q0", other, 4);
    session = saveTestDraft(session, 2, "q0", selected, 5);
    const restored = JSON.parse(JSON.stringify(session));
    expect(restored.answers.q0.response).toEqual(selected);
    expect(finalizeQuizSession(restored, 3, 6).result?.percentage).toBe(20);
    expect(restored.optionOrder).toEqual(session.optionOrder);
  });
  it("treats a cleared draft as skipped", () => {
    let session = startQuizSession("attempt", version(), "test", 2);
    session = saveTestDraft(session, 0, "q0", selected, 3);
    session = saveTestDraft(session, 1, "q0", { type: "mcq", optionId: null }, 4);
    expect(finalizeQuizSession(session, 2, 5).result?.skipped).toBe(5);
  });
  it("locks Practice answers and counts revealed answers as incorrect", () => {
    let session = startQuizSession("attempt", version(), "practice", 2);
    session = submitPracticeAnswer(session, 0, "q0", selected, 3);
    expect(submitPracticeAnswer(session, 1, "q0", other, 4)).toBe(session);
    session = submitPracticeAnswer(session, 1, "q1", { type: "mcq", optionId: null }, 4, 0, true);
    expect(finalizeQuizSession(session, 2, 5).result).toEqual({
      correct: 1,
      incorrect: 1,
      skipped: 3,
      total: 5,
      percentage: 20,
    });
  });
  it("rejects stale writes and finalization before they can overwrite a newer draft", () => {
    const session = saveTestDraft(
      startQuizSession("attempt", version(), "test", 2),
      0,
      "q0",
      selected,
      3,
    );
    expect(() => saveTestDraft(session, 0, "q0", other, 4)).toThrow(RevisionConflict);
    expect(() => finalizeQuizSession(session, 0, 4)).toThrow(RevisionConflict);
  });
  it("rejects writes after completion and wrong-mode operations", () => {
    const test = startQuizSession("attempt", version(), "test", 2);
    expect(() => submitPracticeAnswer(test, 0, "q0", selected, 3)).toThrow();
    const practice = startQuizSession("attempt", version(), "practice", 2);
    expect(() => saveTestDraft(practice, 0, "q0", selected, 3)).toThrow();
    const completed = finalizeQuizSession(test, 0, 3);
    expect(() => saveTestDraft(completed, 1, "q0", selected, 4)).toThrow();
  });
  it("rejects unknown questions, options, mismatched types and invalid timestamps", () => {
    const session = startQuizSession("attempt", version(), "test", 2);
    expect(() => saveTestDraft(session, 0, "missing", selected, 3)).toThrow();
    expect(() =>
      saveTestDraft(session, 0, "q0", { type: "mcq", optionId: "missing" }, 3),
    ).toThrow();
    expect(() => saveTestDraft(session, 0, "q0", { type: "predict", output: "a" }, 3)).toThrow();
    expect(() => saveTestDraft(session, 0, "q0", selected, 1)).toThrow();
    expect(() => saveTestDraft(session, 0, "q0", selected, NaN)).toThrow();
  });
  it("rejects empty Practice answers and invalid hint counts", () => {
    const session = startQuizSession("attempt", version(), "practice", 2);
    expect(() =>
      submitPracticeAnswer(session, 0, "q0", { type: "mcq", optionId: null }, 3),
    ).toThrow();
    expect(() => submitPracticeAnswer(session, 0, "q0", selected, 3, 2)).toThrow();
  });
  it("copies question and answer inputs so later source edits cannot alter history", () => {
    const source = version();
    const response = { ...selected };
    let session = startQuizSession("attempt", source, "test", 2);
    session = saveTestDraft(session, 0, "q0", response, 3);
    source.questions.length = 0;
    response.optionId = "b";
    const completed = finalizeQuizSession(session, 1, 4);
    expect(completed.version.questions).toHaveLength(5);
    expect(completed.result?.percentage).toBe(20);
  });
});

function legacyFixture(): AppData {
  const quest = createSampleQuests()[0]!;
  const question = quest.questions[0]!;
  const attempt: Attempt = {
    id: "old-attempt",
    questId: quest.id,
    questTitle: "Original title",
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
        response: { type: "predict", output: "Recorded response" },
        correct: true,
        hintsUsed: 0,
        revealed: false,
        answeredAt: 2,
      },
    },
  };
  return { version: 1, quests: [quest], attempts: [attempt] };
}

describe("legacy migration preparation", () => {
  it("preserves IDs, outcomes and answered-only score without regrading edited questions", () => {
    const data = legacyFixture();
    data.quests[0]!.questions[0]!.prompt = "Same ID, edited wording";
    const raw = JSON.stringify(data);
    const plan = prepareLegacyMigration(raw);
    expect(plan.source).toBe(raw);
    expect(plan.data).toEqual(data);
    expect(plan.history[0]?.score.accuracy).toBe(1);
    expect(plan.history[0]?.recorded).toEqual(data.attempts[0]);
    expect(plan.history[0]?.details[0]?.provenance).toBe("reconstructed");
    expect(prepareLegacyMigration(raw)).toEqual(plan);
  });
  it("marks deleted question and quest details missing without losing recorded results", () => {
    const data = legacyFixture();
    data.quests = [];
    const plan = prepareLegacyMigration(JSON.stringify(data));
    expect(plan.history[0]?.details[0]?.provenance).toBe("missing");
    expect(plan.history[0]?.score.accuracy).toBe(1);
  });
  it("retains the exact source and warning when partially recovering malformed records", () => {
    const data = legacyFixture();
    const raw = JSON.stringify({ ...data, quests: [...data.quests, { bad: true }] });
    const plan = prepareLegacyMigration(raw);
    expect(plan.warning).toContain("1 saved item");
    expect(plan.source).toBe(raw);
    expect(plan.data.quests).toHaveLength(1);
  });
  it("rejects unknown schemas, corrupt JSON and duplicate IDs without writing anything", () => {
    expect(() => prepareLegacyMigration("{")).toThrow();
    expect(() =>
      prepareLegacyMigration(JSON.stringify({ ...legacyFixture(), version: 2 })),
    ).toThrow();
    const data = legacyFixture();
    data.attempts.push(data.attempts[0]!);
    expect(() => prepareLegacyMigration(JSON.stringify(data))).toThrow("Duplicate");
  });
});
