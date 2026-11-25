import { useEffect, useState } from "react";
import { useStore } from "@/store/store";
import { SourceReference } from "@/features/quizzes/SourceReference";
import { citeSegment, type SourceRevision, type RevisionCitation } from "@/domain/study-source";
import { sourceMaterialCitations, type SourceMaterial } from "@/domain/source-material";
export function RevisionEvidence({
  source,
  citation,
}: {
  source: SourceRevision;
  citation: RevisionCitation;
}) {
  if (citation.kind === "pdf")
    return (
      <SourceReference
        source={{ documentId: citation.documentId, page: citation.page, excerpt: citation.excerpt }}
      />
    );
  return (
    <details className="rounded-xl border border-border p-3 text-sm">
      <summary className="cursor-pointer">
        {citation.kind === "sample" ? "Sample source" : "Source"} · {citation.label} · saved
        revision
      </summary>
      <blockquote className="my-2 whitespace-pre-wrap break-words">{citation.excerpt}</blockquote>
      <p className="text-xs text-muted-foreground">
        {source.title} · {new Date(source.createdAt).toLocaleString()}. Retained with this material;
        later edits do not change it.
      </p>
      <p className="mt-2 whitespace-pre-wrap break-words">
        {source.segments.find((s) => s.id === citation.segmentId)?.text}
      </p>
    </details>
  );
}
export function SourceQuizEvidence({
  versionId,
  questionId,
}: {
  versionId: string;
  questionId: string;
}) {
  const { listSourceMaterials } = useStore();
  const [material, setMaterial] = useState<SourceMaterial | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    setMaterial(null);
    setFailed(false);
    if (!versionId.startsWith("source-")) return;
    void listSourceMaterials().then(
      (rows) => {
        if (live) {
          const found = rows.find((m) => m.id === versionId);
          setMaterial(found ?? null);
          setFailed(!found);
        }
      },
      () => {
        if (live) setFailed(true);
      },
    );
    return () => {
      live = false;
    };
  }, [versionId, listSourceMaterials]);
  if (!versionId.startsWith("source-"))
    return (
      <p className="text-xs text-muted-foreground">No PDF source attached to this question.</p>
    );
  if (!material)
    return (
      <p role="status">
        {failed
          ? "Saved source evidence is unavailable; the recorded score is unchanged."
          : "Loading saved source evidence…"}
      </p>
    );
  return (
    <>
      {sourceMaterialCitations(material, questionId).map((citation, i) => (
        <RevisionEvidence key={i} source={material.request.source} citation={citation} />
      ))}
    </>
  );
}
export function SegmentEvidence({
  source,
  segmentId,
  text,
}: {
  source: SourceRevision;
  segmentId: string;
  text: string;
}) {
  return <RevisionEvidence source={source} citation={citeSegment(source, segmentId, text)} />;
}
