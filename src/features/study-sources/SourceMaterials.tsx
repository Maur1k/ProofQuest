import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import { Button } from "@/components/ui/button";
import { sourcePassages, type SourceMaterial } from "@/domain/source-material";
import type { StudyProgress } from "@/domain/study-record";
import { SegmentEvidence } from "./SourceEvidence";
export function SourceMaterialDetail({ id }: { id: string }) {
  const { listSourceMaterials } = useStore();
  const [material, setMaterial] = useState<SourceMaterial | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    void listSourceMaterials().then(
      (rows) => {
        if (live) {
          setMaterial(rows.find((m) => m.id === id) ?? null);
          if (!rows.some((m) => m.id === id)) setError("Saved material is unavailable.");
        }
      },
      () => {
        if (live) setError("Could not load saved material.");
      },
    );
    return () => {
      live = false;
    };
  }, [id, listSourceMaterials]);
  if (material?.generation.provider === "sample")
    return <Navigate to="/archive" search={{ sample: material.id }} replace />;
  return material ? (
    <SourceMaterialView key={id} material={material} />
  ) : (
    <p role={error ? "alert" : "status"}>{error || "Loading material…"}</p>
  );
}
export function SourceMaterialView({ material }: { material: SourceMaterial }) {
  const { sourceCardProgress } = useStore();
  const [progress, setProgress] = useState<StudyProgress | null>(null),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let live = true;
    if (material.output.format === "flashcards")
      void sourceCardProgress(material.id).then(
        (p) => {
          if (live) setProgress(p);
        },
        () => {
          if (live) setError("Could not load saved card position.");
        },
      );
    return () => {
      live = false;
    };
  }, [material, sourceCardProgress]);
  const passages = new Map(sourcePassages(material.request.source).map((p) => [p.id, p]));
  const evidence = (id: string) => {
    const p = passages.get(id)!;
    return (
      <>
        <p className="whitespace-pre-wrap break-words">{p.text}</p>
        <details className="rounded-xl bg-muted/30 p-3 text-sm">
          <summary className="min-h-11 cursor-pointer py-3 font-medium">
            View source evidence
          </summary>
          <SegmentEvidence source={material.request.source} segmentId={p.segmentId} text={p.text} />
        </details>
      </>
    );
  };
  async function change(index: number, revealed: boolean) {
    if (lock.current || !progress) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      setProgress(await sourceCardProgress(material.id, { previous: progress, index, revealed }));
    } catch {
      setError("Card progress was not saved. Reload to recover the latest position.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const output = material.output;
  return (
    <section className="mx-auto max-w-3xl space-y-6 break-words leading-relaxed">
      <h1 className="text-2xl font-bold">{material.title}</h1>
      <p className="text-sm text-muted-foreground">
        {material.generation.provider === "sample"
          ? "Authored sample; no AI call."
          : "AI study material; structural checks are not a guarantee of factual accuracy."}{" "}
        Source excerpts and revision are retained.
      </p>
      {output.format === "reviewer" && (
        <>
          {output.sections.map((s, i) => (
            <section
              key={i}
              className="space-y-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
            >
              <h2 className="font-semibold">{s.heading}</h2>
              {s.points.map((p, j) => (
                <div key={j} className="space-y-2">
                  {evidence(p.evidenceId)}
                </div>
              ))}
            </section>
          ))}
          {output.terms.map((t, i) => (
            <section key={i}>
              <h2 className="font-semibold">{t.term}</h2>
              {evidence(t.evidenceId)}
            </section>
          ))}
          {output.comparisons.map((c, i) => (
            <section key={i}>
              <h2 className="font-semibold">{c.heading}</h2>
              {c.rows.map((row, j) => (
                <div key={j} className="my-2 rounded-xl border p-3">
                  <h3>{row.label}</h3>
                  {evidence(row.evidenceId)}
                </div>
              ))}
            </section>
          ))}
        </>
      )}
      {output.format === "flashcards" && progress && (
        <div className="space-y-5 rounded-2xl border border-border bg-card p-5 sm:p-8">
          <p>
            Card {progress.index + 1} of {output.cards.length}
          </p>
          <h2 className="py-4 text-xl font-semibold leading-relaxed sm:text-2xl">
            {output.cards[progress.index]!.front}
          </h2>
          {progress.revealed && evidence(output.cards[progress.index]!.evidenceId)}
          <div className="flex flex-wrap gap-3">
            <Button
              aria-expanded={progress.revealed}
              disabled={busy}
              onClick={() => void change(progress.index, !progress.revealed)}
            >
              {progress.revealed ? "Hide answer" : "Reveal answer"}
            </Button>
            <Button
              variant="outline"
              disabled={busy || progress.index === 0}
              onClick={() => void change(progress.index - 1, false)}
            >
              Previous card
            </Button>
            <Button
              variant="outline"
              disabled={busy || progress.index === output.cards.length - 1}
              onClick={() => void change(progress.index + 1, false)}
            >
              Next card
            </Button>
          </div>
        </div>
      )}
      {output.format !== "quiz" && output.excluded.length > 0 && (
        <section>
          <h2>Excluded content</h2>
          {output.excluded.map((e, i) => (
            <p key={i}>
              {material.request.source.segments.find((s) => s.id === e.segmentId)?.label}:{" "}
              {e.reason.replaceAll("-", " ")}
            </p>
          ))}
        </section>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
