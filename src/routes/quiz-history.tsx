import { createFileRoute } from "@tanstack/react-router";
import { QuizHistory } from "@/features/quizzes/QuizHistory";
export const Route = createFileRoute("/quiz-history")({ component: QuizHistory });
