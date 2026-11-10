import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import type { QuizSession } from "@/domain/quiz-session";
import { quizHistory } from "@/domain/quiz-review";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";

export function QuizHistory() {
  const { persistence, listQuizSessions } = useStore();
  const [sessions, setSessions] = useState<QuizSession[] | null>(null);
  const [error, setError] = useState(false);
  const [generation, setGeneration] = useState(0);
  useEffect(() => {
    if (persistence !== "durable") return;
    let active = true;
    setSessions(null);
    setError(false);
    void listQuizSessions()
      .then((value) => {
        if (active) setSessions(quizHistory(value));
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [persistence, listQuizSessions, generation]);
  return (
    <div className="space-y-4 pb-6">
      <PageHeader
        title="Quiz history"
        back={{ to: "/", label: "Home" }}
        subtitle="MCQ attempts saved in this browser. Programming quest history remains in Progress."
      />
      {persistence === "loading" ? (
        <p role="status">Opening saved storage…</p>
      ) : persistence !== "durable" ? (
        <p role="status">Saved browser storage is required.</p>
      ) : error ? (
        <div role="alert">
          <p>Could not load quiz history.</p>
          <Button onClick={() => setGeneration((n) => n + 1)}>Retry history</Button>
        </div>
      ) : !sessions ? (
        <p role="status">Loading history…</p>
      ) : sessions.length === 0 ? (
        <p>No MCQ attempts yet. Start a sample quiz from Home.</p>
      ) : (
        <ul className="space-y-3">
          {sessions.map((session) => (
            <li key={session.id} className="rounded-xl border border-border bg-card p-4">
              <Link
                className="block space-y-2"
                to={
                  session.completedAt !== null
                    ? "/quiz-results/$sessionId"
                    : session.mode === "test"
                      ? "/quiz-test/$sessionId"
                      : "/quiz-practice/$sessionId"
                }
                params={{ sessionId: session.id }}
              >
                <h2 className="break-words font-semibold">{session.version.title}</h2>
                <p className="capitalize">
                  {session.mode} ·{" "}
                  {session.result
                    ? `${session.result.percentage}% · ${session.result.correct}/${session.result.total} correct`
                    : "In progress — resume"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(session.completedAt ?? session.updatedAt).toLocaleString()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
