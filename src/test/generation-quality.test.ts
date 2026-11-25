import { expect, it } from "vitest";
import { checkGeneratedQuizQuality } from "@/domain/generation-quality";
import { quizVersionSchema, type QuizVersion } from "@/domain/quiz";
function version(options: string[], excerpt: string): QuizVersion {
  return {
    id: "v",
    quizId: "q",
    title: "Recorded regression",
    createdAt: 1,
    questions: [
      {
        id: "q1",
        type: "mcq",
        prompt: "Which is supported?",
        options: [
          ...options,
          ...Array.from(
            { length: Math.max(0, 4 - options.length) },
            (_, i) => `Unrelated distractor ${i}`,
          ),
        ].map((text, i) => ({ id: String(i), text })),
        correctOptionId: "0",
        explanation: excerpt,
        hints: [],
        sources: [{ documentId: "doc", page: 1, excerpt }],
      },
    ],
  };
}
it("rejects the observed two-valid-RFC alternatives without changing the saved-history contract", () => {
  const saved = version(
    ["RFC 2818", "RFC 3864", "RFC 9110 itself", "RFC 7235"],
    "obsoletes RFCs 2818, 7231, 7232, 7233, 7235, 7538, 7615, 7694",
  );
  expect(() => checkGeneratedQuizQuality(saved)).toThrow();
  expect(quizVersionSchema.parse(saved)).toEqual(saved);
});
it.each(["All of the above", "None of these", "Both of the above", "all options"])(
  "rejects aggregate choice %s",
  (aggregate) => {
    expect(() =>
      checkGeneratedQuizQuality(
        version(
          ["Fielding", "Nottingham", aggregate],
          "Fielding, Nottingham and Reschke are editors.",
        ),
      ),
    ).toThrow();
  },
);
it("rejects punctuation-equivalent choices and list ambiguity outside programming", () => {
  expect(() =>
    checkGeneratedQuizQuality(
      version(["Evaporation", "EVAPORATION."], "Evaporation changes liquid water into vapor."),
    ),
  ).toThrow();
  expect(() =>
    checkGeneratedQuizQuality(
      version(["Rain", "Snow", "Sand"], "Precipitation includes rain, snow, sleet or hail."),
    ),
  ).toThrow();
});
it("uses Unicode word boundaries and escapes mathematical punctuation", () => {
  const clean = version(
    ["stateless", "stateful", "transport"],
    "HTTP is a stateless application-level protocol.",
  );
  expect(checkGeneratedQuizQuality(clean)).toBe(clean);
  expect(() =>
    checkGeneratedQuizQuality(version(["café", "thé"], "Le café et le thé sont cités.")),
  ).toThrow();
  expect(() =>
    checkGeneratedQuizQuality(version(["x+y", "x-y"], "The expression is x+y.")),
  ).not.toThrow();
});
it("documents conservative rejection of co-mentioned contrasts", () => {
  expect(() =>
    checkGeneratedQuizQuality(version(["solid", "liquid"], "It is a solid, not a liquid.")),
  ).toThrow();
});

it("rejects added comparative qualifiers but permits source-supported first/last facts", () => {
  const unsupported = version(["Roots", "Leaves"], "Roots absorb water from soil.");
  unsupported.questions[0]!.prompt = "Which part is primarily responsible?";
  expect(() => checkGeneratedQuizQuality(unsupported)).toThrow();
  const supported = version(
    ["Armstrong", "Collins"],
    "Armstrong was the first person to walk on the Moon.",
  );
  supported.questions[0]!.prompt = "Who was the first person to walk on the Moon?";
  expect(() => checkGeneratedQuizQuality(supported)).not.toThrow();
});

it("rejects three-choice new output without changing the historical schema", () => {
  const saved = version(["A", "B", "C", "D"], "A is stated.");
  if (saved.questions[0]?.type === "mcq") saved.questions[0].options.pop();
  expect(() => checkGeneratedQuizQuality(saved)).toThrow();
  expect(() => quizVersionSchema.parse(saved)).not.toThrow();
});

it("rejects the observed person-role alias and count/value-list ambiguities", () => {
  const alias = version(
    ["Neil Armstrong", "Buzz Aldrin", "Michael Collins", "Apollo 11 Mission Commander"],
    "Neil Armstrong was the first person to walk on the Moon.",
  );
  alias.questions[0]!.prompt = "Who was the first person to walk on the Moon?";
  expect(() => checkGeneratedQuizQuality(alias)).toThrow();
  const count = version(
    ["Three", "Four", "Zero and one", "One and two"],
    "A bit has two possible values, zero and one.",
  );
  count.questions[0]!.prompt = "How many values can a bit assume?";
  expect(() => checkGeneratedQuizQuality(count)).toThrow();
});

it("accepts a source-supported count despite other values in the same sentence", () => {
  const count = version(
    ["Two", "One", "Three", "Four"],
    "A bit has two possible values, zero and one.",
  );
  count.questions[0]!.prompt = "How many possible values does a bit have?";
  expect(() => checkGeneratedQuizQuality(count)).not.toThrow();
  const duplicate = version(
    ["Negative", "Positive", "Neutral", "No charge"],
    "An electron has a negative electric charge.",
  );
  expect(() => checkGeneratedQuizQuality(duplicate)).toThrow();
});
