import { useEffect, useRef, useState } from "react";
import { useStore } from "@/store/store";
import type { StudyRecord, StudyProgress } from "@/domain/study-record";
import { SourceReference } from "@/features/quizzes/SourceReference";
import { Button } from "@/components/ui/button";
type Citation = { page: number; excerpt: string };
function Evidence({ sources, documentId }: { sources: Citation[]; documentId: string }) {
  return (
    <details className="rounded-xl bg-muted/30 p-3 text-sm">
      <summary className="min-h-11 cursor-pointer py-3 font-medium">View source evidence</summary>
      {sources.map((source, index) => (
        <SourceReference key={index} source={{ ...source, documentId }} />
      ))}
    </details>
  );
}
export function StudyMaterialView({ record }: { record: StudyRecord }) {
  const { loadStudyProgress, saveStudyProgress } = useStore();
  const [progress, setProgress] = useState<StudyProgress | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const material = record.material;
  useEffect(() => {
    if (material.format !== "flashcards") return;
    let active = true;
    loadStudyProgress(record.id)
      .then((value) => {
        if (active) setProgress(value);
      })
      .catch(() => {
        if (active) setError("Saved position could not be loaded. Reload to retry.");
      });
    return () => {
      active = false;
    };
  }, [record.id, material.format, loadStudyProgress]);
  async function move(index: number, revealed: boolean) {
    if (!progress || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      setProgress(await saveStudyProgress(progress, index, revealed));
    } catch {
      setError(
        "Could not save this change. Your last saved position is retained; retry, or reload if another tab changed it.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const evidence = (sources: Citation[]) => (
    <Evidence sources={sources} documentId={material.documentId} />
  );
  return (
    <article className="mx-auto min-w-0 max-w-3xl space-y-6 break-words leading-relaxed">
      <h1 className="text-2xl font-bold">{material.title}</h1>
      <p className="text-sm text-muted-foreground">
        {material.format === "flashcards" ? "Flashcards" : "Reviewer"} · Saved in this browser.
        Generated content can be wrong; check the original sources.
      </p>
      {material.format === "reviewer" ? (
        <>
          {material.sections.map((section) => (
            <section
              key={section.heading}
              className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
            >
              <h2 className="text-lg font-semibold">{section.heading}</h2>
              {section.points.map((point, i) => (
                <div key={i} className="space-y-2">
                  <p>{point.text}</p>
                  {evidence(point.sources)}
                </div>
              ))}
            </section>
          ))}
          {material.terms.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Key terms</h2>
              {material.terms.map((term) => (
                <div key={term.term} className="rounded-xl border border-border p-4">
                  <h3 className="font-semibold">{term.term}</h3>
                  <p>{term.definition}</p>
                  {evidence(term.sources)}
                </div>
              ))}
            </section>
          )}
          {material.comparisons.map((comparison) => (
            <section key={comparison.heading} className="space-y-2">
              <h2 className="text-lg font-semibold">{comparison.heading}</h2>
              <table className="w-full table-fixed border-collapse text-left">
                <caption className="sr-only">{comparison.heading}</caption>
                <thead>
                  <tr>
                    <th className="w-1/3 p-2">Term</th>
                    <th className="p-2">Details and evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.rows.map((row) => (
                    <tr key={row.label} className="border-t border-border">
                      <th scope="row" className="p-2 align-top">
                        {row.label}
                      </th>
                      <td className="space-y-2 p-2">
                        {row.detail}
                        {evidence(row.sources)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </>
      ) : progress ? (
        <section
          className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-8"
          aria-label="Flashcard deck"
        >
          <p role="status" className="text-sm font-medium text-muted-foreground">
            Card {progress.index + 1} of {material.cards.length}
          </p>
          <h2 className="py-4 text-xl font-semibold leading-relaxed sm:text-2xl">
            {material.cards[progress.index]!.front}
          </h2>
          {progress.revealed && (
            <div id="flashcard-answer" className="space-y-3 border-t border-border pt-5">
              <p>{material.cards[progress.index]!.back}</p>
              {evidence(material.cards[progress.index]!.sources)}
            </div>
          )}
          <Button
            aria-expanded={progress.revealed}
            disabled={busy}
            onClick={() => void move(progress.index, !progress.revealed)}
          >
            {progress.revealed ? "Hide answer" : "Reveal answer"}
          </Button>
          <div className="flex justify-between gap-3 border-t border-border pt-4">
            <Button
              variant="outline"
              disabled={busy || progress.index === 0}
              onClick={() => void move(progress.index - 1, false)}
            >
              Previous card
            </Button>
            <Button
              variant="outline"
              disabled={busy || progress.index === material.cards.length - 1}
              onClick={() => void move(progress.index + 1, false)}
            >
              Next card
            </Button>
          </div>
          {busy && <p role="status">Saving position…</p>}
        </section>
      ) : (
        !error && <p role="status">Loading saved position…</p>
      )}
      {material.excluded.length > 0 && (
        <section className="rounded-xl border border-border p-4">
          <h2 className="font-semibold">Excluded source content</h2>
          <ul>
            {material.excluded.map((item) => (
              <li key={`${item.page}:${item.reason}`}>
                Page {item.page}:{" "}
                {item.reason === "image-required"
                  ? "Requires image interpretation"
                  : item.reason === "answer-not-supported"
                    ? "Answer not supported by the selected text"
                    : "Insufficient readable text"}
              </li>
            ))}
          </ul>
        </section>
      )}
      {error && <p role="alert">{error}</p>}
    </article>
  );
}
