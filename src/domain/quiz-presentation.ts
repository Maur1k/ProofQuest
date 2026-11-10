import { responseIsEmpty, type McqQuestion } from "./quiz";
import type { QuizSession } from "./quiz-session";

export interface McqPresentation {
  id: string;
  position: number;
  total: number;
  prompt: string;
  options: Array<{ id: string; text: string }>;
  selectedOptionId: string | null;
  editable: boolean;
  feedback: null | {
    outcome: "correct" | "incorrect" | "skipped";
    correctOptionId: string;
    explanation: string;
    sources: McqQuestion["sources"];
  };
}

/** UI projection only. Uses stored order/outcomes; never grades or changes a session.
 * Hiding solutions here is presentation behavior, not exam-security against local inspection.
 */
export function presentMcq(session: QuizSession, questionId: string): McqPresentation {
  const position = session.questionOrder.indexOf(questionId);
  const question = session.version.questions.find((item) => item.id === questionId);
  if (position < 0 || !question || question.type !== "mcq")
    throw new Error("MCQ is not part of this session");
  const order = session.optionOrder[questionId];
  if (!order || order.length !== question.options.length || new Set(order).size !== order.length)
    throw new Error("Invalid saved option order");
  const options = order.map((id) => {
    const option = question.options.find((item) => item.id === id);
    if (!option) throw new Error("Invalid saved option order");
    return { ...option };
  });
  const answer = Object.hasOwn(session.answers, questionId)
    ? session.answers[questionId]
    : undefined;
  const complete = session.completedAt !== null;
  const showFeedback = complete || (session.mode === "practice" && answer?.status === "submitted");
  const skipped = !answer || (!answer.revealed && responseIsEmpty(answer.response));
  return {
    id: question.id,
    position: position + 1,
    total: session.questionOrder.length,
    prompt: question.prompt,
    options,
    selectedOptionId: answer?.response.type === "mcq" ? answer.response.optionId : null,
    editable: !complete && (session.mode === "test" || !answer),
    feedback: showFeedback
      ? {
          outcome: skipped ? "skipped" : answer.correct ? "correct" : "incorrect",
          correctOptionId: question.correctOptionId,
          explanation: question.explanation,
          sources: question.sources.map((source) => ({ ...source })),
        }
      : null,
  };
}
