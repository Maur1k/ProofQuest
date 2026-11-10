import { createFileRoute } from "@tanstack/react-router";
import { PracticePage } from "@/features/quizzes/PracticePage";

export const Route = createFileRoute("/quiz-practice/$sessionId")({ component: Page });
function Page() {
  const { sessionId } = Route.useParams();
  return <PracticePage key={sessionId} sessionId={sessionId} />;
}
