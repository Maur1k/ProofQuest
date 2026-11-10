import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import type { QuizSession } from "@/domain/quiz-session";
import { presentQuizResult } from "@/domain/quiz-review";
import { useStore } from "@/store/store";
import { Button } from "@/components/ui/button";
import { SourceReference } from "./SourceReference";

export function QuizResults({ session }: { session: QuizSession }) {
  const { retryQuiz } = useStore();
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const result = presentQuizResult(session);
  useEffect(() => {
    heading.current?.focus();
  }, [session.id]);
  async function retry() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      const next = await retryQuiz(session.id);
      await navigate({
        to: next.mode === "test" ? "/quiz-test/$sessionId" : "/quiz-practice/$sessionId",
        params: { sessionId: next.id },
      });
    } catch {
      setError(
        "Could not open the next attempt. Retry to start or resume it; this result is unchanged.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h2 ref={heading} tabIndex={-1} className="text-2xl font-bold">
        Quiz results · {result.score.percentage}%
      </h2>
      <p className="break-words text-muted-foreground">
        {session.version.title} · {session.mode === "test" ? "Test" : "Practice"}
      </p>
      <p>
        {result.score.correct} correct · {result.score.incorrect} incorrect · {result.score.skipped}{" "}
        skipped · {result.score.total} total
      </p>
      <p className="text-sm text-muted-foreground">
        Score includes every question, including skips. This completed attempt uses its saved quiz
        version and cannot be edited.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button disabled={pending} onClick={() => void retry()}>
          {pending ? "Opening attempt…" : "Start or resume another attempt"}
        </Button>
        <Link
          to="/quiz-history"
          className="inline-flex min-h-11 items-center text-primary underline"
        >
          Quiz history
        </Link>
      </div>
      {error && <p role="alert">{error}</p>}
      <ol className="space-y-4">
        {result.questions.map((question) => (
          <li key={question.id} className="space-y-3 rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold">
              {question.position}. {question.prompt}
            </h3>
            <p className="font-medium capitalize">{question.feedback!.outcome}</p>
            <p>
              Your answer:{" "}
              {question.options.find((option) => option.id === question.selectedOptionId)?.text ??
                "No answer"}
            </p>
            <p>
              Correct answer:{" "}
              {
                question.options.find((option) => option.id === question.feedback!.correctOptionId)
                  ?.text
              }
            </p>
            <p>{question.feedback!.explanation}</p>
            {question.feedback!.sources.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No PDF source attached to this question.
              </p>
            ) : (
              question.feedback!.sources.map((source, index) => (
                <SourceReference
                  key={`${source.documentId}:${source.page}:${index}`}
                  source={source}
                />
              ))
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
