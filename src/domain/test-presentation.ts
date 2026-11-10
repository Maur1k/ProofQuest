import { presentMcq } from "./quiz-presentation";
import type { QuizSession } from "./quiz-session";

/** A draft-only projection: completed sessions belong to the future results flow. */
export function presentTestDraft(session: QuizSession) {
  if (session.mode !== "test" || session.completedAt !== null)
    throw new Error("An unfinished Test session is required");
  const questions = session.questionOrder.map((id) => presentMcq(session, id));
  const firstEmpty = questions.findIndex((question) => question.selectedOptionId === null);
  return {
    questions,
    answered: questions.filter((question) => question.selectedOptionId !== null).length,
    resumeIndex: firstEmpty < 0 ? 0 : firstEmpty,
  };
}
