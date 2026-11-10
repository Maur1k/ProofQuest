import { createFileRoute } from "@tanstack/react-router";
import { TestPage } from "@/features/quizzes/TestPage";
export const Route = createFileRoute("/quiz-test/$sessionId")({ component: Page });
function Page() {
  const { sessionId } = Route.useParams();
  return <TestPage key={sessionId} sessionId={sessionId} />;
}
