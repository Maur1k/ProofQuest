import { useRef, useState } from "react";
import type { QuizSession } from "@/domain/quiz-session";
import { RevisionConflict } from "@/domain/quiz-session";
import { quizProgress } from "@/domain/quiz-review";
import { useStore } from "@/store/store";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export function FinishQuiz({
  session,
  disabled,
  onPending,
  onComplete,
  reload,
}: {
  session: QuizSession;
  disabled: boolean;
  onPending: (pending: boolean) => void;
  onComplete: (session: QuizSession) => void;
  reload: () => void;
}) {
  const { finishQuiz } = useStore();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const lock = useRef(false);
  const progress = quizProgress(session);
  async function finish() {
    if (lock.current || disabled || conflict) return;
    lock.current = true;
    onPending(true);
    setError(null);
    try {
      onComplete(await finishQuiz(session));
    } catch (failure) {
      const stale = failure instanceof RevisionConflict;
      setConflict(stale);
      setError(
        stale
          ? "Answers changed in another tab. Reload saved answers and review before submitting."
          : "Submission could not be confirmed. Your saved answers remain available. Retry submission safely.",
      );
    } finally {
      lock.current = false;
      onPending(false);
    }
  }
  return (
    <section className="space-y-3 border-t border-border pt-5">
      <p className="text-sm text-muted-foreground">
        {progress.answered} answered · {progress.unanswered} unanswered. Unanswered questions count
        as skipped in your score.
      </p>
      <Button disabled={disabled || conflict} onClick={() => setConfirm(true)}>
        Finish {session.mode === "test" ? "Test" : "Practice"}
      </Button>
      {error && (
        <div role="alert" className="space-y-2">
          <p>{error}</p>
          {conflict && (
            <Button variant="outline" disabled={disabled} onClick={reload}>
              Reload saved answers
            </Button>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Submit this quiz?"
        description={`${progress.answered} of ${progress.total} questions answered. ${progress.unanswered} will be skipped. Submitting locks this attempt and shows results. You can start a new attempt afterward.`}
        confirmLabel="Submit quiz"
        onConfirm={() => void finish()}
      />
    </section>
  );
}
