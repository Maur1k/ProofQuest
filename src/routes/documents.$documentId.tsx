import { createFileRoute } from "@tanstack/react-router";
import { DocumentReader } from "@/features/documents/DocumentReader";
export const Route = createFileRoute("/documents/$documentId")({ component: Reader });
function Reader() {
  const { documentId } = Route.useParams();
  return <DocumentReader key={documentId} documentId={documentId} />;
}
