export const SUBJECT_IDS = [
  "fundamentals",
  "data-structures",
  "algorithms",
  "computer-science",
] as const;
export type SubjectId = (typeof SUBJECT_IDS)[number];

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const QUESTION_TYPES = ["predict", "trace", "fix"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const LANGUAGES = ["javascript", "python"] as const;
export type Language = (typeof LANGUAGES)[number];

interface QuestionBase {
  id: string;
  prompt: string;
  language: Language;
  code: string;
  explanation: string;
  hints: string[];
}

export interface PredictQuestion extends QuestionBase {
  type: "predict";
  expectedOutput: string;
}

/** One row of a trace table; `values` aligns index-for-index with the question's `variables`. */
export interface TraceStep {
  label: string;
  values: string[];
}

export interface TraceQuestion extends QuestionBase {
  type: "trace";
  variables: string[];
  steps: TraceStep[];
}

export interface FixQuestion extends QuestionBase {
  type: "fix";
  fixedCode: string;
}

export type Question = PredictQuestion | TraceQuestion | FixQuestion;

export interface Quest {
  id: string;
  title: string;
  subjectId: SubjectId;
  topic: string;
  difficulty: Difficulty;
  questions: Question[];
  createdAt: number;
  updatedAt: number;
}

export type QuestDraft = Omit<Quest, "id" | "createdAt" | "updatedAt">;

export type AnswerResponse =
  | { type: "predict"; output: string }
  | { type: "trace"; cells: string[][] }
  | { type: "fix"; code: string };

export interface AnswerRecord {
  questionId: string;
  response: AnswerResponse;
  correct: boolean;
  hintsUsed: number;
  revealed: boolean;
  answeredAt: number;
}

export interface Attempt {
  id: string;
  questId: string;
  /** Snapshots so history survives quest edits or deletion. */
  questTitle: string;
  subjectId: SubjectId;
  topic: string;
  startedAt: number;
  updatedAt: number;
  completedAt: number | null;
  currentIndex: number;
  hintsShown: Record<string, number>;
  answers: Record<string, AnswerRecord>;
}

export interface AppData {
  version: 1;
  quests: Quest[];
  attempts: Attempt[];
}
