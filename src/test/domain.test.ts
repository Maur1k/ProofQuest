import { describe, expect, it } from "vitest";
import { checkAnswer, checkFix, checkOutput, checkTrace, normalizeOutput } from "@/domain/checking";
import { validateQuest } from "@/domain/validation";
import {
  computeTopicStats,
  continueTarget,
  masteryDelta,
  suggestFocus,
  summarize,
} from "@/domain/stats";
import { parseStoredData } from "@/domain/storage";
import { dataReducer } from "@/store/reducer";
import { createSampleQuests } from "@/data/sample-quests";
import type { AnswerRecord, AppData, Attempt, QuestDraft } from "@/domain/types";

describe("output checking", () => {
  it("ignores leading/trailing whitespace on lines", () => {
    expect(checkOutput("3 7", "   3 7  ")).toBe(true);
  });
  it("ignores CRLF vs LF line endings", () => {
    expect(checkOutput("HI\nHEY", "HI\r\nHEY")).toBe(true);
    expect(checkOutput("HI\nHEY", "HI\rHEY")).toBe(true);
  });
  it("ignores leading and trailing blank lines", () => {
    expect(checkOutput("20", "\n\n20\n\n")).toBe(true);
  });
  it("treats case as significant", () => {
    expect(checkOutput("HI\nHEY", "hi\nhey")).toBe(false);
  });
  it("treats inner blank lines as significant", () => {
    expect(checkOutput("a\nb", "a\n\nb")).toBe(false);
  });
  it("treats inner spacing as significant", () => {
    expect(checkOutput("3 7", "37")).toBe(false);
    expect(checkOutput("1,2,4", "1, 2, 4")).toBe(false);
  });
  it("rejects different values and extra lines", () => {
    expect(checkOutput("20", "21")).toBe(false);
    expect(checkOutput("20", "20\n20")).toBe(false);
    expect(normalizeOutput("")).toBe("");
  });
});

describe("trace checking", () => {
  const q = {
    variables: ["a", "b"],
    steps: [
      { label: "1", values: ["8", "5"] },
      { label: "2", values: ["8", "3"] },
    ],
  };
  it("accepts all cells correct with surrounding spaces", () => {
    expect(
      checkTrace(q, [
        [" 8", "5 "],
        ["8", "3"],
      ]).correct,
    ).toBe(true);
  });
  it("reports which cell is wrong", () => {
    const r = checkTrace(q, [
      ["8", "5"],
      ["8", "5"],
    ]);
    expect(r.correct).toBe(false);
    expect(r.cellResults).toEqual([
      [true, true],
      [true, false],
    ]);
  });
  it("treats missing cells as wrong", () => {
    expect(checkTrace(q, [["8"]]).correct).toBe(false);
  });
});

describe("fix checking", () => {
  it("ignores indentation, spacing runs and blank lines", () => {
    expect(checkFix("if (x) {\n  return 1;\n}", "if (x)   {\n\n\treturn 1;\n}\n")).toBe(true);
  });
  it("rejects a real code difference", () => {
    expect(checkFix("return 1;", "return 0;")).toBe(false);
    expect(checkFix("i < n", "i <= n")).toBe(false);
  });
  it("sample fix questions accept their own saved fix and reject the buggy code", () => {
    for (const quest of createSampleQuests()) {
      for (const q of quest.questions) {
        if (q.type === "fix") {
          expect(checkAnswer(q, { type: "fix", code: q.fixedCode }).correct).toBe(true);
          expect(checkAnswer(q, { type: "fix", code: q.code }).correct).toBe(false);
        }
      }
    }
  });
});

const validDraft = (): QuestDraft => ({
  title: "Loops",
  subjectId: "fundamentals",
  topic: "Loops",
  difficulty: "easy",
  questions: [
    {
      id: "p",
      type: "predict",
      language: "python",
      prompt: "Print?",
      code: "print(1)",
      expectedOutput: "1",
      explanation: "Prints 1",
      hints: [],
    },
    {
      id: "t",
      type: "trace",
      language: "python",
      prompt: "Trace",
      code: "x=1",
      variables: ["x"],
      steps: [{ label: "s1", values: ["1"] }],
      explanation: "e",
      hints: ["h"],
    },
    {
      id: "f",
      type: "fix",
      language: "python",
      prompt: "Fix",
      code: "x = 0",
      fixedCode: "x = 1",
      explanation: "e",
      hints: [],
    },
  ],
});

describe("quest validation", () => {
  it("accepts a valid quest with all three types", () => {
    expect(validateQuest(validDraft())).toEqual({});
  });
  it("requires a title of at least 3 characters", () => {
    expect(validateQuest({ ...validDraft(), title: "  ab " })["title"]).toBeDefined();
  });
  it("requires at least one question", () => {
    expect(validateQuest({ ...validDraft(), questions: [] })["questions"]).toBeDefined();
  });
  it("rejects more than 20 questions", () => {
    const d = validDraft();
    const qs = Array.from({ length: 21 }, (_, i) => ({ ...d.questions[0]!, id: `p${i}` }));
    expect(validateQuest({ ...d, questions: qs })["questions"]).toBeDefined();
  });
  it("rejects an invalid subject and difficulty", () => {
    const e = validateQuest({
      ...validDraft(),
      subjectId: "nope" as never,
      difficulty: "x" as never,
    });
    expect(e["subjectId"]).toBeDefined();
    expect(e["difficulty"]).toBeDefined();
  });
  it("requires code, expected answer and explanation", () => {
    const d = validDraft();
    d.questions[0]! = {
      ...d.questions[0]!,
      code: " ",
      explanation: "",
      ...{ expectedOutput: "" },
    } as never;
    const e = validateQuest(d);
    expect(e["q.p.code"]).toBeDefined();
    expect(e["q.p.explanation"]).toBeDefined();
    expect(e["q.p.expected"]).toBeDefined();
  });
  it("rejects empty hints and more than 3 hints", () => {
    const d = validDraft();
    expect(
      validateQuest({ ...d, questions: [{ ...d.questions[0]!, hints: [" "] }] })["q.p.hints"],
    ).toBeDefined();
    expect(
      validateQuest({ ...d, questions: [{ ...d.questions[0]!, hints: ["a", "b", "c", "d"] }] })[
        "q.p.hints"
      ],
    ).toBeDefined();
  });
  it("rejects duplicate trace variables and empty cells", () => {
    const d = validDraft();
    const t = d.questions[1]! as Extract<QuestDraft["questions"][number], { type: "trace" }>;
    expect(
      validateQuest({
        ...d,
        questions: [{ ...t, variables: ["x", "x"], steps: [{ label: "s", values: ["1", "2"] }] }],
      })["q.t.variables"],
    ).toBeDefined();
    expect(
      validateQuest({ ...d, questions: [{ ...t, steps: [{ label: "s", values: [""] }] }] })[
        "q.t.steps"
      ],
    ).toBeDefined();
  });
  it("rejects a fix identical to the buggy code", () => {
    const d = validDraft();
    expect(
      validateQuest({ ...d, questions: [{ ...d.questions[2]!, fixedCode: "x  =  0" } as never] })[
        "q.f.expected"
      ],
    ).toBeDefined();
  });
  it("all sample quests are valid", () => {
    for (const q of createSampleQuests()) expect(validateQuest(q)).toEqual({});
  });
});

function attemptWith(answers: Partial<AnswerRecord>[], over: Partial<Attempt> = {}): Attempt {
  const recs: Record<string, AnswerRecord> = {};
  answers.forEach((a, i) => {
    recs[`q${i}`] = {
      questionId: `q${i}`,
      response: { type: "predict", output: "x" },
      correct: true,
      hintsUsed: 0,
      revealed: false,
      answeredAt: i + 1,
      ...a,
    };
  });
  return {
    id: "a1",
    questId: "quest",
    questTitle: "T",
    subjectId: "fundamentals",
    topic: "Loops",
    startedAt: 0,
    updatedAt: 0,
    completedAt: 1,
    currentIndex: 0,
    hintsShown: {},
    answers: recs,
    ...over,
  };
}

describe("mastery and accuracy", () => {
  it("only independent correct answers increase mastery", () => {
    expect(masteryDelta({ correct: true, hintsUsed: 0, revealed: false })).toBe(1);
    expect(masteryDelta({ correct: true, hintsUsed: 1, revealed: false })).toBe(0);
    expect(masteryDelta({ correct: false, hintsUsed: 0, revealed: true })).toBe(-1);
    expect(masteryDelta({ correct: false, hintsUsed: 0, revealed: false })).toBe(-1);
  });
  it("computes topic mastery and accuracy from recorded answers", () => {
    const s = computeTopicStats([
      attemptWith([{}, {}, { hintsUsed: 1 }, { correct: false, revealed: true }]),
    ])[0]!;
    expect(s.answered).toBe(4);
    expect(s.correct).toBe(3);
    expect(s.accuracy).toBe(0.75);
    expect(s.mastery).toBe(1); // +1 +1 +0 -1
  });
  it("revealed answers are never counted correct", () => {
    expect(summarize([{ correct: true, revealed: true }]).correct).toBe(0);
  });
  it("mastery is clamped between 0 and 5", () => {
    expect(
      computeTopicStats([attemptWith([{ correct: false }, { correct: false }])])[0]!.mastery,
    ).toBe(0);
    expect(
      computeTopicStats([attemptWith(Array.from({ length: 8 }, () => ({})))])[0]!.mastery,
    ).toBe(5);
  });
  it("suggests the lowest-accuracy topic", () => {
    const a = attemptWith([{}, {}], { id: "x", topic: "Loops" });
    const b = attemptWith([{ correct: false }, {}], { id: "y", topic: "Functions" });
    expect(suggestFocus(computeTopicStats([a, b]))?.topic).toBe("Functions");
  });
});

describe("attempt reducer", () => {
  const base = (): AppData => ({
    version: 1,
    quests: createSampleQuests(),
    attempts: [attemptWith([], { completedAt: null, answers: {} })],
  });
  const rec: AnswerRecord = {
    questionId: "q",
    response: { type: "predict", output: "1" },
    correct: true,
    hintsUsed: 0,
    revealed: false,
    answeredAt: 5,
  };

  it("ignores a duplicate answer for the same question", () => {
    let d = dataReducer(base(), { type: "recordAnswer", attemptId: "a1", record: rec });
    d = dataReducer(d, {
      type: "recordAnswer",
      attemptId: "a1",
      record: { ...rec, correct: false, answeredAt: 6 },
    });
    expect(Object.keys(d.attempts[0]!.answers)).toHaveLength(1);
    expect(d.attempts[0]!.answers["q"]!.correct).toBe(true);
  });
  it("does not start a second unfinished attempt for the same quest", () => {
    const d = dataReducer(base(), {
      type: "startAttempt",
      attempt: { ...base().attempts[0]!, id: "a2" },
    });
    expect(d.attempts).toHaveLength(1);
  });
  it("retry after completion creates a new attempt and keeps history", () => {
    let d = dataReducer(base(), { type: "completeAttempt", attemptId: "a1", now: 9 });
    d = dataReducer(d, { type: "startAttempt", attempt: { ...base().attempts[0]!, id: "a2" } });
    expect(d.attempts.map((a) => a.id)).toEqual(["a1", "a2"]);
  });
  it("continue target picks the most recent unfinished attempt", () => {
    const quests = createSampleQuests();
    const a = attemptWith([], {
      id: "o",
      questId: quests[0]!.id,
      completedAt: null,
      updatedAt: 1,
      currentIndex: 1,
    });
    const b = attemptWith([], {
      id: "n",
      questId: quests[1]!.id,
      completedAt: null,
      updatedAt: 2,
      currentIndex: 1,
    });
    expect(continueTarget(quests, [a, b])?.attempt.id).toBe("n");
  });
});

describe("stored data parsing", () => {
  it("treats missing data as empty", () => {
    expect(parseStoredData(null).kind).toBe("empty");
  });
  it("flags invalid JSON as corrupt", () => {
    expect(parseStoredData("{not json").kind).toBe("corrupt");
    expect(parseStoredData("[]").kind).toBe("corrupt");
  });
  it("keeps valid quests when one entry is broken", () => {
    const quests = createSampleQuests();
    const raw = JSON.stringify({ version: 1, quests: [quests[0], { id: "bad" }], attempts: [] });
    const r = parseStoredData(raw);
    expect(r.kind).toBe("recovered");
    if (r.kind === "recovered") {
      expect(r.data.quests.map((q) => q.id)).toEqual([quests[0]!.id]);
      expect(r.dropped).toBe(1);
    }
  });
  it("round-trips valid data", () => {
    const data: AppData = {
      version: 1,
      quests: createSampleQuests(),
      attempts: [attemptWith([{}])],
    };
    const r = parseStoredData(JSON.stringify(data));
    expect(r.kind).toBe("ok");
  });
});
