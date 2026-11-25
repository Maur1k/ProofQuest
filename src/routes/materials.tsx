import { SourceMaterialDetail } from "@/features/study-sources/SourceMaterials";
import { createFileRoute, Link, Navigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useStore } from "@/store/store";
import type { StudyRecord } from "@/domain/study-record";
import { StudyMaterialView } from "@/features/study-materials/StudyMaterialView";
export const Route = createFileRoute("/materials")({
  validateSearch: (search: Record<string, unknown>): { id?: string } =>
    typeof search["id"] === "string" ? { id: search["id"] } : {},
  beforeLoad: ({ search }) => {
    if (!search.id) throw redirect({ to: "/library", search: {}, replace: true });
  },
  component: MaterialsPage,
});
function Detail({ id }: { id: string }) {
  const { listStudyMaterials } = useStore();
  const [record, setRecord] = useState<StudyRecord | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    listStudyMaterials()
      .then((rows) => {
        if (!active) return;
        const item = rows.find((row) => row.id === id);
        if (item) setRecord(item);
        else setError("This saved material is no longer available.");
      })
      .catch(() => {
        if (active) setError("Study material could not be loaded. Reload to retry.");
      });
    return () => {
      active = false;
    };
  }, [id, listStudyMaterials]);
  return record ? (
    <StudyMaterialView key={record.id} record={record} />
  ) : (
    <p role={error ? "alert" : "status"}>{error || "Loading study material…"}</p>
  );
}
export function Materials({ id }: { id?: string | undefined }) {
  const { ready, persistence } = useStore();
  if (id?.startsWith("source-sample-"))
    return <Navigate to="/archive" search={{ sample: id }} replace />;
  return (
    <div className="space-y-5 py-6">
      <Link
        to="/library"
        search={{}}
        className="inline-flex min-h-11 items-center text-primary underline"
      >
        Back to Library
      </Link>
      {!ready ? (
        <p role="status">Opening browser storage…</p>
      ) : persistence !== "durable" ? (
        <p>
          Saved study materials require browser storage. Open Settings to resolve the storage
          warning.
        </p>
      ) : id ? (
        id.startsWith("source-") ? (
          <SourceMaterialDetail key={id} id={id} />
        ) : (
          <Detail key={id} id={id} />
        )
      ) : (
        <Navigate to="/library" search={{}} replace />
      )}
    </div>
  );
}

function MaterialsPage() {
  return <Materials id={Route.useSearch().id} />;
}
