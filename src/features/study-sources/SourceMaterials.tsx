import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import { Button } from "@/components/ui/button";
import { sourcePassages, type SourceMaterial } from "@/domain/source-material";
import type { StudyProgress } from "@/domain/study-record";
import { SegmentEvidence } from "./SourceEvidence";
export function SourceMaterialList({
  sourceId,
  refresh = 0,
}: {
  sourceId?: string;
  refresh?: number;
}) {
  const { listSourceMaterials, startSavedQuiz } = useStore();
  const [rows, setRows] = useState<SourceMaterial[]>([]),
    [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const navigate = useNavigate();
  useEffect(() => {
    let live = true;
    void listSourceMaterials().then(
      (rows) => {
        if (live)
          setRows(
            rows.filter(
              (m) =>
                m.generation.provider !== "sample" &&
                (!sourceId || m.request.source.sourceId === sourceId),
            ),
          );
      },
      () => {
        if (live) setError("Saved source materials could not be loaded.");
      },
    );
    return () => {
      live = false;
    };
  }, [sourceId, refresh, listSourceMaterials]);
  async function open(id: string, mode: "practice" | "test") {
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
      setError("Could not open the saved quiz. Retry without generating again.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="space-y-3" aria-label="Saved source materials">
      {rows.length > 0 && <h3 className="font-semibold">Saved source materials</h3>}
      {rows.map((m) => (
        <div key={m.id} className="space-y-2 rounded-xl border border-border p-3">
          <p>
            {m.title} · {m.output.format}
            {m.generation.provider === "sample" ? " · Sample" : ""}
          </p>
          {m.output.format === "quiz" ? (
            <div className="flex flex-wrap gap-2">
              <Button disabled={busy} onClick={() => void open(m.id, "practice")}>
                Open Quiz
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => void open(m.id, "test")}>
                Open Exam
              </Button>
              <span className="text-xs">Uses the same saved questions; no AI call.</span>
            </div>
          ) : (
            <Link
              to="/materials"
              search={{ id: m.id }}
              className="inline-flex min-h-11 items-center text-primary underline"
            >
              Open {m.output.format}
            </Link>
          )}
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
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
        <SegmentEvidence source={material.request.source} segmentId={p.segmentId} text={p.text} />
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
    <section className="space-y-4">
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
            <section key={i} className="space-y-3 rounded-xl border p-4">
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
        <div className="space-y-4 rounded-xl border bg-card p-5">
          <p>
            Card {progress.index + 1} of {output.cards.length}
          </p>
          <h2 className="text-lg font-semibold">{output.cards[progress.index]!.front}</h2>
          {progress.revealed && evidence(output.cards[progress.index]!.evidenceId)}
          <div className="flex flex-wrap gap-3">
            <Button disabled={busy} onClick={() => void change(progress.index, !progress.revealed)}>
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
