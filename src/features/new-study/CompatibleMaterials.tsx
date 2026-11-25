import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import { sourceSelectionKey, type SourceRevision } from "@/domain/study-source";
import type { StudyChoice } from "@/domain/study-choice";
import type { SourceMaterial } from "@/domain/source-material";
import { Button } from "@/components/ui/button";
export function CompatibleMaterials({
  source,
  selected,
  choice,
}: {
  source: SourceRevision;
  selected: string[];
  choice: StudyChoice;
}) {
  const { listSourceMaterials, startSavedQuiz } = useStore();
  const navigate = useNavigate();
  const [rows, setRows] = useState<SourceMaterial[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const key = sourceSelectionKey(source, selected, choice);
  useEffect(() => {
    let live = true;
    setRows([]);
    setError("");
    void listSourceMaterials().then(
      (all) => {
        if (live)
          setRows(
            all.filter(
              (m) =>
                m.generation.provider !== "sample" &&
                sourceSelectionKey(
                  m.request.source,
                  m.request.source.segments.map((s) => s.id),
                  m.output.format,
                ) === key,
            ),
          );
      },
      () => {
        if (live)
          setError("Could not check saved material. Open Library to retry before generating.");
      },
    );
    return () => {
      live = false;
    };
  }, [key, listSourceMaterials]);
  async function open(m: SourceMaterial) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (choice === "quiz" || choice === "exam") {
        const session = await startSavedQuiz(m.id, choice === "quiz" ? "practice" : "test");
        await navigate({
          to: choice === "quiz" ? "/quiz-practice/$sessionId" : "/quiz-test/$sessionId",
          params: { sessionId: session.id },
        });
      } else await navigate({ to: "/materials", search: { id: m.id } });
    } catch {
      setError("Saved material could not be opened. Retry without generating again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      {rows.map((m) => (
        <div key={m.id} className="rounded-xl border border-primary p-3">
          <p>Saved material matches this source and selection. No AI call needed.</p>
          <Button disabled={busy} onClick={() => void open(m)}>
            Open saved material
          </Button>
        </div>
      ))}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
