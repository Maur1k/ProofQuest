import { createFileRoute } from "@tanstack/react-router";
import { NewStudy } from "@/features/new-study/NewStudy";
export const Route = createFileRoute("/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { source?: string; document?: string; revision?: string } => ({
    ...(typeof search["source"] === "string" ? { source: search["source"] } : {}),
    ...(typeof search["revision"] === "string" ? { revision: search["revision"] } : {}),
    ...(typeof search["document"] === "string" ? { document: search["document"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "New study — ProofQuest" },
      { name: "description", content: "Turn your PDFs and notes into study materials." },
    ],
  }),
  component: NewStudyPage,
});
function NewStudyPage() {
  const search = Route.useSearch();
  return (
    <NewStudy
      key={`${search.source ?? search.document ?? "new"}:${search.revision ?? "current"}`}
      sourceId={search.source}
      documentId={search.document}
      revisionId={search.revision}
    />
  );
}
