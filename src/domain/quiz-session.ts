import {
  checkQuizAnswer,
  quizVersionSchema,
  responseIsEmpty,
  validateResponse,
  type QuizResponse,
  type QuizVersion,
} from "./quiz";

export type QuizMode = "practice" | "test";
export interface QuizAnswer {
  questionId: string;
  response: QuizResponse;
  status: "draft" | "submitted";
  correct: boolean | null;
  hintsUsed: number;
  revealed: boolean;
  updatedAt: number;
}
export interface QuizScore {
  correct: number;
  incorrect: number;
  skipped: number;
  total: number;
  percentage: number;
}
export interface QuizSession {
  id: string;
  revision: number;
  mode: QuizMode;
  gradingVersion: "all-questions-v1";
  version: QuizVersion;
  questionOrder: string[];
  optionOrder: Record<string, string[]>;
  answers: Record<string, QuizAnswer>;
  startedAt: number;
  updatedAt: number;
  completedAt: number | null;
  result: QuizScore | null;
}

export class RevisionConflict extends Error {
  constructor() {
    super("This session changed in another tab. Reload before saving.");
  }
}

function checkRevision(session: QuizSession, revision: number, now: number) {
  if (session.revision !== revision) throw new RevisionConflict();
  if (!Number.isFinite(now) || now < session.updatedAt) throw new Error("Invalid update time");
}

export function startQuizSession(
  id: string,
  input: unknown,
  mode: QuizMode,
  now: number,
): QuizSession {
  if (!id.trim() || !Number.isFinite(now) || now < 0) throw new Error("Invalid session metadata");
  const version = quizVersionSchema.parse(input);
  return {
    id,
    revision: 0,
    mode,
    gradingVersion: "all-questions-v1",
    version,
    questionOrder: version.questions.map((question) => question.id),
    optionOrder: Object.fromEntries(
      version.questions.flatMap((question) =>
        question.type === "mcq" ? [[question.id, question.options.map((option) => option.id)]] : [],
      ),
    ),
    answers: {},
    startedAt: now,
    updatedAt: now,
    completedAt: null,
    result: null,
  };
}

function questionFor(session: QuizSession, questionId: string) {
  const question = session.version.questions.find((item) => item.id === questionId);
  if (!question) throw new Error("Question is not part of this session");
  return question;
}

export function saveTestDraft(
  session: QuizSession,
  revision: number,
  questionId: string,
  response: QuizResponse,
  now: number,
): QuizSession {
  checkRevision(session, revision, now);
  if (session.mode !== "test" || session.completedAt !== null)
    throw new Error("Test is not editable");
  validateResponse(questionFor(session, questionId), response);
  return {
    ...session,
    revision: revision + 1,
    updatedAt: now,
    answers: {
      ...session.answers,
      [questionId]: {
        questionId,
        response: structuredClone(response),
        status: "draft",
        correct: null,
        hintsUsed: 0,
        revealed: false,
        updatedAt: now,
      },
    },
  };
}

export function submitPracticeAnswer(
  session: QuizSession,
  revision: number,
  questionId: string,
  response: QuizResponse,
  now: number,
  hintsUsed = 0,
  revealed = false,
): QuizSession {
  checkRevision(session, revision, now);
  if (session.mode !== "practice" || session.completedAt !== null)
    throw new Error("Practice is not editable");
  const question = questionFor(session, questionId);
  validateResponse(question, response);
  if (!Number.isInteger(hintsUsed) || hintsUsed < 0 || hintsUsed > question.hints.length)
    throw new Error("Invalid hint count");
  if (Object.hasOwn(session.answers, questionId)) return session;
  if (!revealed && responseIsEmpty(response)) throw new Error("Choose or enter an answer");
  return {
    ...session,
    revision: revision + 1,
    updatedAt: now,
    answers: {
      ...session.answers,
      [questionId]: {
        questionId,
        response: structuredClone(response),
        status: "submitted",
        correct: !revealed && checkQuizAnswer(question, response),
        hintsUsed,
        revealed,
        updatedAt: now,
      },
    },
  };
}

/** Persistence must call this inside its read/write transaction, never after an unlocked read. */
export function finalizeQuizSession(
  session: QuizSession,
  revision: number,
  now: number,
): QuizSession {
  // A retry returns the committed result, even when its original revision is stale.
  if (session.completedAt !== null) return session;
  checkRevision(session, revision, now);
  const answers = { ...session.answers };
  const result: QuizScore = {
    correct: 0,
    incorrect: 0,
    skipped: 0,
    total: session.questionOrder.length,
    percentage: 0,
  };
  for (const questionId of session.questionOrder) {
    const answer = Object.hasOwn(answers, questionId) ? answers[questionId] : undefined;
    if (!answer || (!answer.revealed && responseIsEmpty(answer.response))) {
      result.skipped++;
      if (answer) answers[questionId] = { ...answer, correct: false, status: "submitted" };
      continue;
    }
    const correct =
      session.mode === "practice"
        ? answer.correct === true
        : checkQuizAnswer(questionFor(session, questionId), answer.response);
    answers[questionId] = { ...answer, correct, status: "submitted" };
    if (correct) result.correct++;
    else result.incorrect++;
  }
  result.percentage = result.total ? Math.round((100 * result.correct) / result.total) : 0;
  return { ...session, answers, result, revision: revision + 1, updatedAt: now, completedAt: now };
}
