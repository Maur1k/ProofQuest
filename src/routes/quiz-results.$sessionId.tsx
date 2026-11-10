import { createFileRoute } from "@tanstack/react-router";
import { SavedQuizResults } from "@/features/quizzes/SavedQuizResults";
export const Route = createFileRoute("/quiz-results/$sessionId")({ component: Page });
function Page() {
  const { sessionId } = Route.useParams();
  return <SavedQuizResults key={sessionId} sessionId={sessionId} />;
}
