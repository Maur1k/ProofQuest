import { SourceQuizEvidence } from "@/features/study-sources/SourceEvidence";
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
    <div className="mx-auto max-w-2xl space-y-6 break-words">
      <section
        aria-label="Score summary"
        className="space-y-4 rounded-xl border border-border bg-card p-5 sm:p-6"
      >
        <h2 ref={heading} tabIndex={-1} className="text-2xl font-bold tracking-tight sm:text-3xl">
          {session.mode === "test" ? "Exam" : "Quiz"} results · {result.score.percentage}%
        </h2>
        <p className="break-words text-muted-foreground">
          {session.version.title} · {session.mode === "test" ? "Exam" : "Quiz"}
        </p>
        <p className="rounded-lg bg-muted/50 p-4 text-sm font-medium leading-relaxed">
          {result.score.correct} correct · {result.score.incorrect} incorrect ·{" "}
          {result.score.skipped} skipped · {result.score.total} total
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Score includes every question, including skips. This completed attempt uses its saved quiz
          version and cannot be edited.
        </p>
      </section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          className="h-auto min-h-11 whitespace-normal"
          disabled={pending}
          onClick={() => void retry()}
        >
          {pending ? "Opening attempt…" : "Start or resume another attempt"}
        </Button>
        <Link
          to="/library"
          className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Library
        </Link>
      </div>
      {error && <p role="alert">{error}</p>}
      <section aria-label="Answer review" className="space-y-4">
        <h3 className="text-lg font-semibold">Review your answers</h3>
        <ol className="space-y-4">
          {result.questions.map((question) => (
            <li
              key={question.id}
              className="space-y-4 rounded-xl border border-border bg-card p-5 leading-relaxed sm:p-6"
            >
              <h4 className="text-base font-semibold">
                {question.position}. {question.prompt}
              </h4>
              <p className="inline-flex rounded-md bg-muted px-2.5 py-1 text-sm font-medium capitalize">
                {question.feedback!.outcome}
              </p>
              <div className="space-y-3 rounded-lg bg-muted/40 p-4 text-sm">
                <p>
                  <span className="font-medium">Your answer:</span>{" "}
                  {question.options.find((option) => option.id === question.selectedOptionId)
                    ?.text ?? "No answer"}
                </p>
                <p>
                  <span className="font-medium">Correct answer:</span>{" "}
                  {
                    question.options.find(
                      (option) => option.id === question.feedback!.correctOptionId,
                    )?.text
                  }
                </p>
              </div>
              <div className="space-y-1 text-sm">
                <p className="font-semibold">Explanation</p>
                <p className="text-muted-foreground">{question.feedback!.explanation}</p>
              </div>
              <details className="rounded-lg border border-border p-3 text-sm">
                <summary className="cursor-pointer font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">
                  View source evidence
                </summary>
                <div className="mt-3 space-y-3">
                  {question.feedback!.sources.length === 0 ? (
                    <SourceQuizEvidence versionId={session.version.id} questionId={question.id} />
                  ) : (
                    question.feedback!.sources.map((source, index) => (
                      <SourceReference
                        key={`${source.documentId}:${source.page}:${index}`}
                        source={source}
                      />
                    ))
                  )}
                </div>
              </details>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
