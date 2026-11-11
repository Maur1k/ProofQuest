import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import type { StudyRecord } from "@/domain/study-record";
import type { QuizVersion } from "@/domain/quiz";
import { Button } from "@/components/ui/button";

export function SavedStudyLibrary({ documentId }: { documentId?: string }) {
  const { listStudyMaterials, listSavedQuizzes, startSavedQuiz } = useStore();
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [quizzes, setQuizzes] = useState<QuizVersion[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const navigate = useNavigate();
  useEffect(() => {
    let active = true;
    Promise.all([listStudyMaterials(), listSavedQuizzes()])
      .then(([materials, versions]) => {
        if (!active) return;
        setRecords(
          materials.filter((item) => !documentId || item.request.documentId === documentId),
        );
        setQuizzes(
          versions.filter(
            (item) =>
              !documentId ||
              item.questions.some(
                (q) =>
                  q.type === "mcq" && q.sources.some((source) => source.documentId === documentId),
              ),
          ),
        );
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setError("Saved study materials could not be loaded. Reload to retry.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [documentId, listStudyMaterials, listSavedQuizzes]);
  async function start(id: string, mode: "practice" | "test") {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const session = await startSavedQuiz(id, mode);
      await navigate({
        to: mode === "practice" ? "/quiz-practice/$sessionId" : "/quiz-test/$sessionId",
        params: { sessionId: session.id },
      });
    } catch {
      setError("Could not open the saved questions. Retry when browser storage is available.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3 border-t border-border pt-4" aria-label="Saved study materials">
      <h2 className="text-lg font-semibold">Saved study materials</h2>
      <p className="text-sm text-muted-foreground">
        Reuse saved content without another AI request. Quiz gives immediate feedback; Exam hides
        solutions until submission.
      </p>
      {loading && <p role="status">Loading saved materials…</p>}
      {!loading && !error && records.length === 0 && quizzes.length === 0 && (
        <p>No saved study materials yet.</p>
      )}
      {records.map((record) => (
        <Link
          key={record.id}
          to="/materials"
          search={{ id: record.id }}
          className="block min-h-11 break-words rounded-xl border border-border p-3 text-primary underline"
        >
          {record.material.title} ·{" "}
          {record.material.format === "flashcards" ? "Flashcards" : "Reviewer"}
        </Link>
      ))}
      {quizzes.map((quiz) => (
        <div key={quiz.id} className="space-y-2 rounded-xl border border-border p-3">
          <h3 className="break-words font-semibold">{quiz.title}</h3>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => void start(quiz.id, "practice")}>
              Open Quiz
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void start(quiz.id, "test")}>
              Open Exam
            </Button>
          </div>
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
