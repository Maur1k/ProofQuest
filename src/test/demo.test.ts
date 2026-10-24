import { describe, expect, it } from "vitest";
import { checkOutput } from "@/domain/checking";
import { validateQuest } from "@/domain/validation";
import { DEMO_LESSONS, DEMO_SAMPLE_FILES, getDemoLesson } from "@/demo/lessons";
import {
  availableQuestionCount,
  defaultDemoConfig,
  demoDraft,
  filterLessons,
  generateDemoQuestions,
  nextUploadProgress,
  validateDemoConfig,
  validateSampleFile,
} from "@/demo/logic";

const loops = getDemoLesson("loops-js")!;

describe("Study-to-Quest demo", () => {
  it("every sample bank question passes the real quest validator", () => {
    for (const l of DEMO_LESSONS) {
      const c = { ...defaultDemoConfig(l), count: availableQuestionCount(l, defaultDemoConfig(l)) };
      expect(validateQuest(demoDraft(l, c, generateDemoQuestions(l, c)))).toEqual({});
    }
  });

  it("generates exactly the requested count, only selected types and sections, deterministically", () => {
    const cfg = {
      ...defaultDemoConfig(loops),
      count: 4,
      types: ["predict", "fix"] as ("predict" | "fix")[],
    };
    const a = generateDemoQuestions(loops, cfg);
    expect(a).toHaveLength(4);
    expect(a.every((q) => q.type === "predict" || q.type === "fix")).toBe(true);
    expect(generateDemoQuestions(loops, cfg)).toEqual(a);
  });

  it("difficulty sets hints: easy 2, medium 1, hard 0", () => {
    const base = defaultDemoConfig(loops);
    expect(generateDemoQuestions(loops, { ...base, difficulty: "easy" })[0]!.hints).toHaveLength(2);
    expect(generateDemoQuestions(loops, { ...base, difficulty: "medium" })[0]!.hints).toHaveLength(
      1,
    );
    expect(generateDemoQuestions(loops, { ...base, difficulty: "hard" })[0]!.hints).toHaveLength(0);
  });

  it("editing a generated question never changes the sample bank", () => {
    const q = generateDemoQuestions(loops, defaultDemoConfig(loops))[0]!;
    q.prompt = "changed";
    expect(loops.sections[0]!.bank.predict.prompt).not.toBe("changed");
  });

  it("rejects no sections, no types, short title and counts above what the selection offers", () => {
    const base = defaultDemoConfig(loops);
    expect(validateDemoConfig(loops, { ...base, sectionIds: [] }).sections).toBeDefined();
    expect(validateDemoConfig(loops, { ...base, types: [] }).types).toBeDefined();
    expect(validateDemoConfig(loops, { ...base, title: "ab" }).title).toBeDefined();
    expect(
      validateDemoConfig(loops, { ...base, sectionIds: ["for-loops"], types: ["fix"], count: 2 })
        .count,
    ).toBeDefined();
    expect(validateDemoConfig(loops, { ...base, count: 0 }).count).toBeDefined();
    expect(generateDemoQuestions(loops, { ...base, types: [] })).toEqual([]);
  });

  it("sample predict answers match the real checker", () => {
    const q = loops.sections[0]!.bank.predict;
    if (q.type !== "predict") throw new Error("bank shape");
    expect(checkOutput(q.expectedOutput, "10")).toBe(true);
  });

  it("simulated upload rejects unsupported and oversized samples (10 MB limit) and accepts a PDF", () => {
    expect(validateSampleFile(undefined)).not.toBeNull();
    expect(validateSampleFile(DEMO_SAMPLE_FILES.find((f) => f.extension === "mp4"))).toMatch(
      /not supported/,
    );
    expect(validateSampleFile(DEMO_SAMPLE_FILES.find((f) => f.id === "f-big"))).toMatch(/limit/);
    expect(validateSampleFile(DEMO_SAMPLE_FILES.find((f) => f.id === "f-loops"))).toBeNull();
  });

  it("simulated upload progress advances in 8 fixed steps and caps at 100", () => {
    let p = 0;
    for (let i = 0; i < 8; i++) p = nextUploadProgress(p);
    expect(p).toBe(100);
    expect(nextUploadProgress(100)).toBe(100);
  });

  it("filters lessons by subject and search text", () => {
    expect(
      filterLessons(DEMO_LESSONS, { query: "", subjectId: "algorithms" }).map((l) => l.id),
    ).toEqual(["binary-search"]);
    expect(
      filterLessons(DEMO_LESSONS, { query: "brackets", subjectId: "all" }).map((l) => l.id),
    ).toEqual(["stacks-arrays"]);
    expect(filterLessons(DEMO_LESSONS, { query: "zzz", subjectId: "all" })).toEqual([]);
  });
});

import { isPointInRect, previewAction } from "@/demo/logic";

describe("Study demo interactions", () => {
  it("resumes an existing review for the same lesson instead of regenerating", () => {
    expect(previewAction("loops-js", "loops-js", 3)).toBe("resume");
  });
  it("asks before replacing questions reviewed for another lesson", () => {
    expect(previewAction("loops-js", "stacks-arrays", 2)).toBe("confirm-replace");
    expect(previewAction("loops-js", "stacks-arrays", 0)).toBe("confirm-replace");
  });
  it("generates straight away when nothing exists, or the same lesson's set was emptied", () => {
    expect(previewAction("loops-js", null, 0)).toBe("generate");
    expect(previewAction("loops-js", "loops-js", 0)).toBe("generate");
  });
  it("only counts a release inside the drop zone as a drop", () => {
    const r = { left: 10, top: 10, right: 110, bottom: 60 };
    expect(isPointInRect(50, 30, r)).toBe(true);
    expect(isPointInRect(5, 30, r)).toBe(false);
    expect(isPointInRect(50, 61, r)).toBe(false);
    expect(isPointInRect(50, 30, null)).toBe(false);
  });
});
