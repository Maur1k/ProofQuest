import { Navigate } from "@tanstack/react-router";
import { isArchivedQuizId } from "@/domain/archive";
import { useEffect, useState } from "react";
import { useStore } from "@/store/store";
import type { QuizSession } from "@/domain/quiz-session";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { QuizResults } from "./QuizResults";
export function SavedQuizResults({ sessionId }: { sessionId: string }) {
  const { persistence, loadQuizSession } = useStore();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    if (persistence !== "durable") return;
    let active = true;
    setError(null);
    setSession(null);
    void loadQuizSession(sessionId)
      .then((value) => {
        if (!active) return;
        if (
          !value ||
          value.completedAt === null ||
          value.version.questions.some((q) => q.type !== "mcq")
        )
          setError(
            "This completed MCQ result is unavailable. Open Library to find or resume an attempt.",
          );
        else setSession(value);
      })
      .catch(() => {
        if (active) setError("Could not load the saved result. Please retry.");
      });
    return () => {
      active = false;
    };
  }, [persistence, loadQuizSession, sessionId, generation]);
  if (session && isArchivedQuizId(session.version.id))
    return <Navigate to="/archive" search={{ session: session.id }} replace />;
  return (
    <div className="pb-6">
      <PageHeader title="Saved result" back={{ to: "/library", label: "Library" }} />
      {persistence !== "durable" ? (
        <p role="status">Saved browser storage is required.</p>
      ) : error ? (
        <div role="alert">
          <p>{error}</p>
          <Button onClick={() => setGeneration((n) => n + 1)}>Retry result</Button>
        </div>
      ) : !session ? (
        <p role="status">Loading saved result…</p>
      ) : (
        <QuizResults session={session} />
      )}
    </div>
  );
}
