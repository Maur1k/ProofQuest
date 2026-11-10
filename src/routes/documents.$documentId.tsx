import { createFileRoute } from "@tanstack/react-router";
import { DocumentReader } from "@/features/documents/DocumentReader";
export const Route = createFileRoute("/documents/$documentId")({
  component: Reader,
  validateSearch: (search: Record<string, unknown>): { page?: number } => {
    const page = Number(search["page"]);
    return Number.isSafeInteger(page) && page > 0 ? { page } : {};
  },
});
function Reader() {
  const { documentId } = Route.useParams();
  const { page } = Route.useSearch();
  return (
    <DocumentReader
      key={`${documentId}:${page ?? 1}`}
      documentId={documentId}
      initialPage={page ?? 1}
    />
  );
}
