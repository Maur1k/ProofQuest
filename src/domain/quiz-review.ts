import type { QuizSession } from "./quiz-session";
import { presentMcq } from "./quiz-presentation";
import { responseIsEmpty } from "./quiz";

export function quizProgress(session: QuizSession) {
  const total = session.questionOrder.length;
  const answered = session.questionOrder.filter((id) => {
    const answer = Object.hasOwn(session.answers, id) ? session.answers[id] : undefined;
    return answer && (answer.revealed || !responseIsEmpty(answer.response));
  }).length;
  return { total, answered, unanswered: total - answered };
}
export function presentQuizResult(session: QuizSession) {
  if (session.completedAt === null || !session.result)
    throw new Error("Quiz has not been submitted");
  return {
    score: { ...session.result },
    questions: session.questionOrder.map((id) => presentMcq(session, id)),
  };
}
export function quizHistory(sessions: QuizSession[]) {
  return sessions
    .filter((session) => session.version.questions.every((q) => q.type === "mcq"))
    .slice()
    .sort((a, b) => b.updatedAt - a.updatedAt || a.id.localeCompare(b.id));
}
