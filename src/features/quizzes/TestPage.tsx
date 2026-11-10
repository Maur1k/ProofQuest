import { QuizResults } from "./QuizResults";
import { useCallback, useEffect, useState } from "react";
import type { QuizSession } from "@/domain/quiz-session";
import { useStore } from "@/store/store";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { TestSession } from "./TestSession";

export function TestPage({ sessionId }: { sessionId: string }) {
  const { persistence, loadQuizSession, saveTestChoice } = useStore();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generation, setGeneration] = useState(0);
  const reload = useCallback(() => setGeneration((value) => value + 1), []);
  useEffect(() => {
    if (persistence !== "durable") return;
    let active = true;
    setLoading(true);
    setError(null);
    void loadQuizSession(sessionId)
      .then((value) => {
        if (!active) return;
        if (
          !value ||
          value.mode !== "test" ||
          value.version.questions.some((q) => q.type !== "mcq")
        ) {
          setSession(null);
          setError("This MCQ Test is unavailable. Open Quiz history to find an attempt.");
        } else setSession(value);
      })
      .catch(() => {
        if (active) setError("Could not load saved Test answers. Please retry.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId, persistence, loadQuizSession, generation]);
  return (
    <div className="pb-6">
      <PageHeader
        title="MCQ Test"
        back={{ to: "/", label: "Home" }}
        subtitle={session?.version.title ?? "Saved MCQ quiz"}
      />
      {persistence === "loading" || (persistence === "durable" && loading) ? (
        <p role="status">Loading saved Test…</p>
      ) : persistence !== "durable" ? (
        <p role="status">Saved browser storage is required. Return Home to recover storage.</p>
      ) : error ? (
        <div role="alert" className="space-y-3">
          <p>{error}</p>
          <Button onClick={reload}>Retry loading</Button>
        </div>
      ) : (
        session &&
        (session.completedAt !== null ? (
          <QuizResults session={session} />
        ) : (
          <TestSession
            key={`${session.id}:${generation}`}
            initial={session}
            onComplete={setSession}
            save={saveTestChoice}
            reload={reload}
          />
        ))
      )}
    </div>
  );
}
