import { expect, it } from "vitest";
import {
  validateGenerationInput,
  validateGeneratedQuiz,
  GenerationValidationError,
  GENERATION_LIMITS,
} from "@/domain/generation";
const text =
  "Active recall means retrieving information from memory. Reviewing an original source helps check a summary.";
function request() {
  return { documentId: "doc", pages: [{ page: 2, text }], questionCount: 5 };
}
const metadata = {
  id: "version",
  quizId: "quiz",
  title: "Generated study questions",
  createdAt: 1,
};
function output() {
  return {
    questions: Array.from({ length: 5 }, (_, i) => ({
      prompt: `Question ${i + 1}?`,
      options: [
        { id: "a", text: "Recall" },
        { id: "b", text: "Copying" },
      ],
      correctOptionId: "a",
      explanation: "Recall retrieves information from memory.",
      sources: [{ page: 2, excerpt: "Active recall means retrieving information from memory." }],
    })),
  };
}
it("accepts only bounded selected-page text and returns detached input", () => {
  const input = request();
  const parsed = validateGenerationInput(input);
  input.pages[0]!.text = "changed";
  expect(parsed.pages[0]!.text).toBe(text);
  expect(() => validateGenerationInput({ ...request(), fileName: "private.pdf" })).toThrow(
    GenerationValidationError,
  );
  expect(() => validateGenerationInput({ ...request(), questionCount: 6 })).toThrow();
});
it("rejects empty, duplicate, out-of-range and oversized page selections without truncation", () => {
  for (const pages of [
    [],
    [{ page: 2, text: " " }],
    [{ page: 0, text }],
    [
      { page: 2, text },
      { page: 2, text },
    ],
    Array.from({ length: 11 }, (_, i) => ({ page: i + 1, text })),
    [
      { page: 2, text: "a".repeat(30_001) },
      { page: 3, text: "b".repeat(30_000) },
    ],
  ])
    expect(() => validateGenerationInput({ ...request(), pages })).toThrow(
      GenerationValidationError,
    );
  expect(() =>
    validateGenerationInput({ ...request(), pages: [{ page: 1, text: "short" }] }),
  ).toThrow();
  expect(
    validateGenerationInput({
      ...request(),
      pages: [{ page: 1, text: "a".repeat(GENERATION_LIMITS.inputCharacters) }],
    }).pages[0]!.text,
  ).toHaveLength(60_000);
});
it("assigns application identity and maps validated evidence into immutable quiz-compatible output", () => {
  const raw = output();
  const result = validateGeneratedQuiz(JSON.stringify(raw), request(), metadata);
  expect(result.questions.map((q) => q.id)).toEqual(["q1", "q2", "q3", "q4", "q5"]);
  expect(result.questions[0]).toMatchObject({
    type: "mcq",
    sources: [{ documentId: "doc", page: 2, excerpt: raw.questions[0]!.sources[0]!.excerpt }],
  });
  raw.questions[0]!.prompt = "mutated";
  expect(result.questions[0]!.prompt).toBe("Question 1?");
});
it("rejects missing, wrong-page, invented and duplicate evidence", () => {
  for (const sources of [
    [],
    [{ page: 1, excerpt: "Active recall" }],
    [{ page: 2, excerpt: "Invented evidence" }],
    [
      { page: 2, excerpt: "Active recall" },
      { page: 2, excerpt: "Active recall" },
    ],
  ]) {
    const raw = output();
    raw.questions[0]!.sources = sources;
    expect(() => validateGeneratedQuiz(raw, request(), metadata)).toThrow(
      GenerationValidationError,
    );
  }
});
it("accepts whitespace-only extraction differences without silently weakening page matching", () => {
  const input = request();
  input.pages[0]!.text = text.replace("Active recall", "Active\nrecall");
  expect(validateGeneratedQuiz(output(), input, metadata).questions).toHaveLength(5);
});
it("rejects duplicate prompts/options, invalid answers, extra metadata and wrong counts", () => {
  const cases = [output(), output(), output(), output(), output(), output()];
  cases[0]!.questions[1]!.prompt = " Question   1? ";
  cases[1]!.questions[0]!.options[1]!.text = " RECALL ";
  cases[2]!.questions[0]!.correctOptionId = "unknown";
  cases[3]!.questions.pop();
  cases[4]!.questions[0]!.options[1]!.id = "a";
  Object.assign(cases[5]!, { id: "model-owned-version" });
  for (const raw of cases)
    expect(() => validateGeneratedQuiz(raw, request(), metadata)).toThrow(
      GenerationValidationError,
    );
});
it("never exposes raw document/provider/secret sentinels or nested causes on validation failures", () => {
  const sentinel = "PRIVATE_DOCUMENT_FAKE_KEY_SENTINEL";
  for (const raw of [
    sentinel,
    "x".repeat(100_001),
    { error: { message: sentinel, cause: { secret: sentinel } } },
  ]) {
    try {
      validateGeneratedQuiz(raw, request(), metadata);
      throw new Error("expected rejection");
    } catch (error) {
      expect(error).toBeInstanceOf(GenerationValidationError);
      expect(String(error) + JSON.stringify(error)).not.toContain(sentinel);
      expect((error as Error).cause).toBeUndefined();
    }
  }
});
