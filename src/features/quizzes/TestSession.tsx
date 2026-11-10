import { FinishQuiz } from "./FinishQuiz";
import { useRef, useState } from "react";
import { useBlocker } from "@tanstack/react-router";
import { RevisionConflict, type QuizSession } from "@/domain/quiz-session";
import { presentTestDraft } from "@/domain/test-presentation";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function TestSession({
  initial,
  save,
  reload,
  onComplete,
}: {
  onComplete?: (session: QuizSession) => void;
  initial: QuizSession;
  save: (session: QuizSession, questionId: string, optionId: string | null) => Promise<QuizSession>;
  reload: () => void;
}) {
  const [session, setSession] = useState(initial);
  const [index, setIndex] = useState(() => presentTestDraft(initial).resumeIndex);
  // undefined means unchanged; null explicitly clears a saved choice.
  const [selection, setSelection] = useState<string | null | undefined>(undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [reloadPrompt, setReloadPrompt] = useState(false);
  const lock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const progress = presentTestDraft(session);
  const view = progress.questions[index]!;
  const selected = selection === undefined ? view.selectedOptionId : selection;
  const dirty = selected !== view.selectedOptionId;
  const blocker = useBlocker({
    shouldBlockFn: () => dirty || pending,
    enableBeforeUnload: dirty || pending,
    withResolver: true,
  });
  async function saveDraft() {
    if (lock.current || !dirty || conflict) return;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      const saved = await save(session, view.id, selected);
      setSession(saved);
      setSelection(undefined);
    } catch (failure) {
      const stale = failure instanceof RevisionConflict;
      setConflict(stale);
      setError(
        stale
          ? "This Test changed in another tab. Load the latest saved answers before continuing."
          : "Your changes were not saved. They are kept here; retry saving when storage is available.",
      );
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  function move(next: number) {
    if (dirty || pending || conflict) return;
    setIndex(next);
    setSelection(undefined);
    setError(null);
    heading.current?.focus();
  }
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Test mode · Save and edit your answers. Solutions stay hidden until you finish and submit
        this attempt.
      </p>
      <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {progress.answered} of {progress.questions.length} answers saved
        </span>
        <span>
          Question {view.position} of {view.total}
        </span>
      </div>
      <nav aria-label="Test question list" className="flex flex-wrap gap-2">
        {progress.questions.map((question, position) => (
          <Button
            key={question.id}
            variant={position === index ? "default" : "outline"}
            aria-current={position === index ? "step" : undefined}
            aria-label={`Question ${position + 1}, ${question.selectedOptionId === null ? "unanswered" : "saved"}`}
            disabled={dirty || pending || conflict}
            onClick={() => move(position)}
          >
            {position + 1}
          </Button>
        ))}
      </nav>
      <h2 ref={heading} tabIndex={-1} className="text-xl font-semibold">
        {view.prompt}
      </h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void saveDraft();
        }}
        className="space-y-4"
      >
        <fieldset disabled={pending || conflict} className="space-y-3">
          <legend className="mb-3 text-sm text-muted-foreground">Choose one answer</legend>
          {view.options.map((option) => (
            <label
              key={option.id}
              className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-border bg-card p-4 has-[:checked]:border-primary has-[:checked]:bg-accent focus-within:ring-2 focus-within:ring-ring"
            >
              <input
                type="radio"
                name={`test-${view.id}`}
                value={option.id}
                checked={selected === option.id}
                onChange={() => setSelection(option.id)}
                className="mt-1 h-4 w-4 shrink-0 accent-primary"
              />
              <span>{option.text}</span>
            </label>
          ))}
        </fieldset>
        <p role="status" className="text-sm text-muted-foreground">
          {pending
            ? "Saving changes…"
            : dirty
              ? "Unsaved changes — save or discard before changing questions."
              : view.selectedOptionId === null
                ? "No saved answer for this question."
                : "Answer saved in this browser. You can still change it."}
        </p>
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={!dirty || pending || conflict}>
            {pending ? "Saving…" : error ? "Retry saving" : "Save answer"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={selected === null || pending || conflict}
            onClick={() => setSelection(null)}
          >
            Clear choice
          </Button>
          {dirty && (
            <Button
              type="button"
              variant="outline"
              disabled={pending || conflict}
              onClick={() => {
                setSelection(undefined);
                setError(null);
              }}
            >
              Discard changes
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Clearing a choice is also a change: save it to keep this question unanswered. Reopening
          resumes at the first unanswered question.
        </p>
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
      <nav aria-label="Test questions" className="flex flex-wrap gap-3">
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
      {progress.answered === progress.questions.length && (
        <p className="rounded-xl border border-border p-4">
          All answers are saved as editable drafts. This Test has not been submitted. Finish Test
          when you are ready.
        </p>
      )}
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
        title={pending ? "Changes are saving" : "Leave unsaved changes?"}
        description={
          pending
            ? "Wait for saving to finish before leaving."
            : "Your unsaved changes will be lost. Previously saved Test answers remain available."
        }
        confirmLabel={pending ? "Stay here" : "Leave Test"}
        onConfirm={() => {
          if (pending) blocker.reset?.();
          else blocker.proceed?.();
        }}
      />
      <ConfirmDialog
        open={reloadPrompt}
        onOpenChange={setReloadPrompt}
        title="Load the latest Test answers?"
        description="Your unsaved changes will be discarded. Load the latest answers saved in this browser?"
        confirmLabel="Load latest"
        onConfirm={reload}
      />
    </div>
  );
}
