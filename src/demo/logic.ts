/** Pure, deterministic Study-to-Quest DEMO logic. No I/O, no randomness, no persistence. */
import {
  QUESTION_TYPES,
  type Difficulty,
  type QuestDraft,
  type Question,
  type QuestionType,
  type SubjectId,
} from "@/domain/types";
import { DEMO_SAMPLE_FILES, type DemoLesson, type DemoSampleFile } from "./lessons";

export const DEMO_LIMITS = {
  titleMin: 3,
  titleMax: 80,
  countMin: 1,
  countMax: 8,
  uploadMaxBytes: 10_000_000,
  uploadExtensions: ["pdf", "md", "txt"] as readonly string[],
} as const;

export interface DemoConfig {
  lessonId: string;
  title: string;
  sectionIds: string[];
  difficulty: Difficulty;
  count: number;
  types: QuestionType[];
}

export function defaultDemoConfig(lesson: DemoLesson): DemoConfig {
  return {
    lessonId: lesson.id,
    title: `${lesson.title} practice`,
    sectionIds: lesson.sections.map((s) => s.id),
    difficulty: "easy",
    count: Math.min(3, lesson.sections.length * QUESTION_TYPES.length),
    types: [...QUESTION_TYPES],
  };
}

/** How many distinct bank questions the current selection can produce. */
export function availableQuestionCount(
  lesson: DemoLesson,
  config: Pick<DemoConfig, "sectionIds" | "types">,
): number {
  const sections = lesson.sections.filter((s) => config.sectionIds.includes(s.id)).length;
  const types = QUESTION_TYPES.filter((t) => config.types.includes(t)).length;
  return Math.min(DEMO_LIMITS.countMax, sections * types);
}

export type DemoConfigErrors = Partial<Record<"title" | "sections" | "types" | "count", string>>;

export function validateDemoConfig(lesson: DemoLesson, c: DemoConfig): DemoConfigErrors {
  const e: DemoConfigErrors = {};
  const title = c.title.trim();
  if (title.length < DEMO_LIMITS.titleMin)
    e.title = `Title needs at least ${DEMO_LIMITS.titleMin} characters.`;
  else if (title.length > DEMO_LIMITS.titleMax)
    e.title = `Title must be ${DEMO_LIMITS.titleMax} characters or fewer.`;
  const validSections = lesson.sections.filter((s) => c.sectionIds.includes(s.id));
  if (validSections.length === 0) e.sections = "Choose at least one section.";
  const validTypes = QUESTION_TYPES.filter((t) => c.types.includes(t));
  if (validTypes.length === 0) e.types = "Choose at least one question type.";
  const max = availableQuestionCount(lesson, c);
  if (!Number.isInteger(c.count) || c.count < DEMO_LIMITS.countMin)
    e.count = "Choose at least 1 question.";
  else if (max > 0 && c.count > max)
    e.count = `This selection has ${max} sample question${max === 1 ? "" : "s"}. Lower the count or add sections/types.`;
  return e;
}

const HINTS_BY_DIFFICULTY: Record<Difficulty, number> = { easy: 2, medium: 1, hard: 0 };

/**
 * Deterministically picks `count` bank questions, alternating types in the
 * order easy-to-read → predict, trace, fix and walking sections in lesson order.
 * Returns deep copies so edits never touch the bank. Difficulty only controls
 * how many hints are kept (easy 2, medium 1, hard 0).
 */
export function generateDemoQuestions(lesson: DemoLesson, c: DemoConfig): Question[] {
  if (Object.keys(validateDemoConfig(lesson, c)).length > 0) return [];
  const sections = lesson.sections.filter((s) => c.sectionIds.includes(s.id));
  const types = QUESTION_TYPES.filter((t) => c.types.includes(t));
  const queues = types.map((t) => sections.map((s) => s.bank[t]));
  const out: Question[] = [];
  let round = 0;
  while (out.length < c.count) {
    let added = false;
    for (const q of queues) {
      const item = q[round];
      if (item && out.length < c.count) {
        out.push(item);
        added = true;
      }
    }
    if (!added) break;
    round++;
  }
  const hints = HINTS_BY_DIFFICULTY[c.difficulty];
  return out.map((q) => {
    const copy = JSON.parse(JSON.stringify(q)) as Question;
    return { ...copy, id: `demo-${lesson.id}-${q.id}`, hints: copy.hints.slice(0, hints) };
  });
}

/** Builds a QuestDraft only so the existing validator can check reviewed demo questions. Never saved. */
export function demoDraft(lesson: DemoLesson, c: DemoConfig, questions: Question[]): QuestDraft {
  return {
    title: c.title,
    subjectId: lesson.subjectId,
    topic: lesson.topic,
    difficulty: c.difficulty,
    questions,
  };
}

export interface LessonFilter {
  query: string;
  subjectId: SubjectId | "all";
}

export function filterLessons(lessons: DemoLesson[], f: LessonFilter): DemoLesson[] {
  const q = f.query.trim().toLowerCase();
  return lessons.filter((l) => {
    if (f.subjectId !== "all" && l.subjectId !== f.subjectId) return false;
    if (!q) return true;
    const hay = [l.title, l.topic, l.summary, ...l.sections.map((s) => s.heading)]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function validateSampleFile(file: DemoSampleFile | undefined): string | null {
  if (!file) return "Choose a sample file first.";
  if (!DEMO_LIMITS.uploadExtensions.includes(file.extension))
    return `.${file.extension} files are not supported in this demo. Use PDF, Markdown or text.`;
  if (file.sizeBytes > DEMO_LIMITS.uploadMaxBytes)
    return `This file is ${formatBytes(file.sizeBytes)}. The demo limit is ${formatBytes(DEMO_LIMITS.uploadMaxBytes)}.`;
  return null;
}

export function getSampleFile(id: string): DemoSampleFile | undefined {
  return DEMO_SAMPLE_FILES.find((f) => f.id === id);
}

/** Fixed 8-step simulated progress: 0 → 12.5 → … → 100. */
export const UPLOAD_STEP = 12.5;
export function nextUploadProgress(p: number): number {
  return Math.min(100, Math.max(0, p) + UPLOAD_STEP);
}

export function formatBytes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n >= 1_000) return `${Math.round(n / 1_000)} KB`;
  return `${n} B`;
}
