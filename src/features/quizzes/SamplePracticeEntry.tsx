import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import { Button } from "@/components/ui/button";

export function SamplePracticeEntry() {
  const { persistence, busy, startSamplePractice, startSampleTest } = useStore();
  const navigate = useNavigate();
  const lock = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function start(mode: "practice" | "test") {
    if (lock.current) return;
    lock.current = true;
    setPending(true);
    setError(null);
    try {
      const session = await (mode === "practice" ? startSamplePractice() : startSampleTest());
      await navigate({
        to: mode === "practice" ? "/quiz-practice/$sessionId" : "/quiz-test/$sessionId",
        params: { sessionId: session.id },
      });
    } catch {
      setError("Could not open the saved quiz. Please retry to start or resume.");
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
        Five multiple-choice questions. Practice gives feedback; Test keeps solutions hidden. Saved
        answers stay in this browser. This sample is not generated from your PDFs.
      </p>
      <Button
        disabled={busy || pending || persistence !== "durable"}
        onClick={() => void start("practice")}
      >
        {pending ? "Opening…" : "Start or resume Practice"}
      </Button>
      <Button
        variant="outline"
        className="sm:ml-3"
        disabled={busy || pending || persistence !== "durable"}
        onClick={() => void start("test")}
      >
        {pending ? "Opening…" : "Start or resume Test"}
      </Button>
      {persistence !== "durable" && (
        <p className="text-sm text-muted-foreground">
          Saved browser storage is required for these sample quizzes.
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Test answers stay editable until submission. Results and quiz history are saved in this
        browser.
      </p>
      <Link to="/quiz-history" className="block min-h-11 py-2 text-sm text-primary underline">
        Quiz history
      </Link>
    </section>
  );
}
