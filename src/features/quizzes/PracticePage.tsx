import { SourceReference } from "./SourceReference";
import { FinishQuiz } from "./FinishQuiz";
import { QuizResults } from "./QuizResults";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import { presentMcq } from "@/domain/quiz-presentation";
import { RevisionConflict, type QuizSession } from "@/domain/quiz-session";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function PracticePage({ sessionId }: { sessionId: string }) {
  const { persistence, loadQuizSession, submitPractice } = useStore();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generation, setGeneration] = useState(0);
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
          value.mode !== "practice" ||
          value.version.questions.some((q) => q.type !== "mcq")
        ) {
          setSession(null);
          setError("This Practice session is unavailable. Return Home to open the sample quiz.");
        } else setSession(value);
      })
      .catch(() => {
        if (active) setError("Could not load saved Practice. Please retry.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [sessionId, persistence, loadQuizSession, generation]);
  const reload = useCallback(() => setGeneration((value) => value + 1), []);
  return (
    <div className="pb-6">
      <PageHeader
        title="MCQ Practice"
        back={{ to: "/", label: "Home" }}
        subtitle={session?.version.title ?? "Saved MCQ quiz"}
      />
      {persistence !== "durable" ? (
        <p role="status">Saved browser storage is required. Return Home to recover storage.</p>
      ) : loading ? (
        <p role="status">Loading saved Practice…</p>
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
          <PracticeSession
            key={`${session.id}:${generation}`}
            initial={session}
            onComplete={setSession}
            save={submitPractice}
            reload={reload}
          />
        ))
      )}
    </div>
  );
}

export function PracticeSession({
  initial,
  save,
  reload,
  onComplete,
}: {
  onComplete?: (session: QuizSession) => void;
  initial: QuizSession;
  save: (session: QuizSession, questionId: string, optionId: string) => Promise<QuizSession>;
  reload: () => void;
}) {
  const [session, setSession] = useState(initial);
  const [index, setIndex] = useState(() => {
    const first = initial.questionOrder.findIndex((id) => !Object.hasOwn(initial.answers, id));
    return first < 0 ? 0 : first;
  });
  const [selection, setSelection] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [reloadPrompt, setReloadPrompt] = useState(false);
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const view = presentMcq(session, session.questionOrder[index]!);
  const dirty = selection !== null && view.editable;
  const blocker = useBlocker({
    shouldBlockFn: () => dirty || pending,
    enableBeforeUnload: dirty || pending,
    withResolver: true,
  });
  async function submit() {
    if (lock.current || !selection || !view.editable || conflict) return;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      const saved = await save(session, view.id, selection);
      setSession(saved);
      setSelection(null);
    } catch (failure) {
      const stale = failure instanceof RevisionConflict;
      setConflict(stale);
      setError(
        stale
          ? "This session changed in another tab. Load the latest saved answers before continuing."
          : "Your answer was not saved. Your selection is kept here; retry when storage is available.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  function move(next: number) {
    setIndex(next);
    setSelection(null);
    setError(null);
    heading.current?.focus();
  }
  const reviewed = session.questionOrder.every((id) => Object.hasOwn(session.answers, id));
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
        <span>Practice · Feedback after submission</span>
        <span>
          Question {view.position} of {view.total}
        </span>
      </div>
      <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold">
        {view.prompt}
      </h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="space-y-4"
      >
        <fieldset disabled={pending || !view.editable || conflict} className="space-y-3">
          <legend className="mb-3 text-sm text-muted-foreground">Choose one answer</legend>
          {view.options.map((option) => (
            <label
              key={option.id}
              className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 has-[:checked]:border-primary has-[:checked]:bg-accent focus-within:ring-2 focus-within:ring-ring"
            >
              <input
                type="radio"
                name={`answer-${view.id}`}
                value={option.id}
                checked={(selection ?? view.selectedOptionId) === option.id}
                onChange={() => setSelection(option.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-primary"
              />
              <span>{option.text}</span>
            </label>
          ))}
        </fieldset>
        {view.editable && (
          <>
            <p className="text-xs text-muted-foreground">
              Selections are saved only when you submit. Submitted answers cannot be changed.
            </p>
            <Button type="submit" disabled={!selection || pending || conflict}>
              {pending ? "Saving answer…" : error ? "Retry submission" : "Submit answer"}
            </Button>
          </>
        )}
      </form>
      {error && (
        <div role="alert" className="space-y-3 rounded-xl border border-destructive p-4">
          <p>{error}</p>
          {conflict && (
            <Button variant="outline" onClick={() => setReloadPrompt(true)}>
              Load latest saved answers
            </Button>
          )}
        </div>
      )}
      {view.feedback && (
        <section
          role="status"
          className="space-y-2 rounded-xl border border-primary/40 bg-accent p-5"
        >
          <h3 className="font-semibold">
            {view.feedback.outcome === "correct"
              ? "Correct"
              : view.feedback.outcome === "incorrect"
                ? "Not quite"
                : "Skipped"}{" "}
            · Answer saved
          </h3>
          <p>
            <strong>Correct answer:</strong>{" "}
            {view.options.find((option) => option.id === view.feedback?.correctOptionId)?.text}
          </p>
          <p className="text-sm">{view.feedback.explanation}</p>
          {view.feedback.sources.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No PDF source attached to this question.
            </p>
          ) : (
            view.feedback.sources.map((source, index) => (
              <SourceReference
                key={`${source.documentId}:${source.page}:${index}`}
                source={source}
              />
            ))
          )}
        </section>
      )}
      <nav aria-label="Practice questions" className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          disabled={index === 0 || dirty || pending || conflict}
          onClick={() => move(index - 1)}
        >
          Previous question
        </Button>
        <Button
          variant="outline"
          disabled={index === view.total - 1 || dirty || pending || conflict}
          onClick={() => move(index + 1)}
        >
          Next question
        </Button>
      </nav>
      {reviewed && <p role="status">All answers are saved. Finish Practice to view your result.</p>}
      {onComplete && (
        <FinishQuiz
          session={session}
          disabled={dirty || pending || conflict}
          onPending={setPending}
          onComplete={onComplete}
          reload={reload}
        />
      )}
      <ConfirmDialog
        open={blocker.status === "blocked"}
        onOpenChange={(open) => {
          if (!open) blocker.reset?.();
        }}
        title={pending ? "An answer is saving" : "Leave this selection?"}
        description={
          pending
            ? "Wait for saving to finish before leaving. The saved answer will be available when you resume."
            : "Your unsubmitted selection will be lost. Previously submitted answers remain saved."
        }
        confirmLabel={pending ? "Stay here" : "Leave Practice"}
        onConfirm={() => {
          if (pending) blocker.reset?.();
          else blocker.proceed?.();
        }}
      />
      <ConfirmDialog
        open={reloadPrompt}
        onOpenChange={setReloadPrompt}
        title="Load the latest answers?"
        description="Your unsubmitted selection will be discarded. The latest saved answers will be loaded from this browser."
        confirmLabel="Load latest"
        onConfirm={reload}
      />
    </div>
  );
}
