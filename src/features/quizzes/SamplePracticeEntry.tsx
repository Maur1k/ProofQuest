import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import { Button } from "@/components/ui/button";

export function SamplePracticeEntry() {
  const { persistence, busy, startSamplePractice } = useStore();
  const navigate = useNavigate();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function start() {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      const session = await startSamplePractice();
      await navigate({ to: "/quiz-practice/$sessionId", params: { sessionId: session.id } });
    } catch {
      setError("Could not open saved Practice. Your progress is unchanged. Please retry.");
    } finally {
      lock.current = false;
      setPending(false);
    }
  }
  return (
    <section
      aria-labelledby="sample-practice-title"
      className="space-y-3 rounded-2xl border border-primary/40 bg-card p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
        Sample quiz · Work in progress
      </p>
      <h2 id="sample-practice-title" className="text-xl font-semibold">
        Practice your study skills
      </h2>
      <p className="text-sm text-muted-foreground">
        Five multiple-choice questions with feedback. Submitted answers are saved in this browser.
        This sample is not generated from your PDFs.
      </p>
      <Button disabled={busy || pending || persistence !== "durable"} onClick={() => void start()}>
        {pending ? "Opening…" : "Start or resume Practice"}
      </Button>
      {persistence !== "durable" && (
        <p className="text-sm text-muted-foreground">
          Saved browser storage is required for this Practice quiz.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Test mode and results are still in development.
      </p>
    </section>
  );
}
