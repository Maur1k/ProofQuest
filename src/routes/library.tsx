import { createFileRoute } from "@tanstack/react-router";
import { UnifiedLibrary } from "@/features/library/UnifiedLibrary";
import { Materials } from "./materials";
export const Route = createFileRoute("/library")({
  validateSearch: (s: Record<string, unknown>): { source?: string; id?: string } => ({
    ...(typeof s["source"] === "string" ? { source: s["source"] } : {}),
    ...(typeof s["id"] === "string" ? { id: s["id"] } : {}),
  }),
  component: LibraryPage,
});
function LibraryPage() {
  const search = Route.useSearch();
  return search.id ? <Materials id={search.id} /> : <UnifiedLibrary sourceKey={search.source} />;
}
