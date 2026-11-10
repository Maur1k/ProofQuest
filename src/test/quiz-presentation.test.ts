import { describe, expect, it } from "vitest";
import { createSampleMcqVersion } from "@/data/sample-mcq";
import { presentMcq } from "@/domain/quiz-presentation";
import {
  startQuizSession,
  saveTestDraft,
  submitPracticeAnswer,
  finalizeQuizSession,
} from "@/domain/quiz-session";
describe("MCQ presentation boundary", () => {
  it("creates five clearly labeled independent fixture questions with no invented PDF citations", () => {
    const first = createSampleMcqVersion(),
      second = createSampleMcqVersion();
    expect(first.questions).toHaveLength(5);
    expect(first.title).toContain("not PDF-generated");
    expect(first).toEqual(second);
    first.questions[0]!.prompt = "Changed";
    expect(second.questions[0]!.prompt).not.toBe("Changed");
    for (const question of second.questions) {
      expect(question.type).toBe("mcq");
      if (question.type === "mcq") expect(question.sources).toEqual([]);
    }
  });
  it("keeps Test solutions absent across draft edits and a serialized reload", () => {
    let session = startQuizSession("s", createSampleMcqVersion(), "test", 1);
    session = saveTestDraft(session, 0, "recall", { type: "mcq", optionId: "a" }, 2);
    session = saveTestDraft(session, 1, "recall", { type: "mcq", optionId: "b" }, 3);
    const view = presentMcq(JSON.parse(JSON.stringify(session)), "recall");
    expect(view.selectedOptionId).toBe("b");
    expect(view.editable).toBe(true);
    expect(view.feedback).toBeNull();
    expect(JSON.stringify(view)).not.toContain("correctOptionId");
    expect(JSON.stringify(view)).not.toContain("explanation");
  });
  it("reveals Practice feedback only for its submitted question", () => {
    const initial = startQuizSession("s", createSampleMcqVersion(), "practice", 1);
    expect(presentMcq(initial, "recall").feedback).toBeNull();
    const answered = submitPracticeAnswer(initial, 0, "recall", { type: "mcq", optionId: "a" }, 2);
    expect(presentMcq(answered, "recall")).toMatchObject({
      editable: false,
      feedback: { outcome: "correct", correctOptionId: "a" },
    });
    expect(presentMcq(answered, "evidence").feedback).toBeNull();
  });
  it("shows stored final feedback and distinguishes skipped from wrong answers", () => {
    let session = startQuizSession("s", createSampleMcqVersion(), "test", 1);
    session = saveTestDraft(session, 0, "recall", { type: "mcq", optionId: "b" }, 2);
    session = finalizeQuizSession(session, 1, 3);
    expect(presentMcq(session, "recall")).toMatchObject({
      editable: false,
      feedback: { outcome: "incorrect" },
    });
    expect(presentMcq(session, "evidence")).toMatchObject({
      editable: false,
      feedback: { outcome: "skipped" },
    });
  });
  it("uses saved question/option order without mutating the version or leaking references", () => {
    const session = startQuizSession("s", createSampleMcqVersion(), "practice", 1);
    session.questionOrder.reverse();
    session.optionOrder["recall"]!.reverse();
    const before = JSON.stringify(session);
    const view = presentMcq(session, "recall");
    expect(view.position).toBe(5);
    expect(view.options.map((o) => o.id)).toEqual(["c", "b", "a"]);
    view.options[0]!.text = "Mutated view";
    expect(JSON.stringify(session)).toBe(before);
  });
  it("rejects missing questions and corrupt option order", () => {
    const session = startQuizSession("s", createSampleMcqVersion(), "test", 1);
    expect(() => presentMcq(session, "missing")).toThrow();
    session.optionOrder["recall"] = ["a", "a", "c"];
    expect(() => presentMcq(session, "recall")).toThrow("Invalid saved option order");
  });
});
