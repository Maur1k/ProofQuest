import { createFileRoute } from "@tanstack/react-router";
import { Archive } from "@/features/archive/Archive";
export const Route = createFileRoute("/archive")({
  validateSearch: (
    input: Record<string, unknown>,
  ): { quest?: string; attempt?: string; sample?: string; session?: string } =>
    Object.fromEntries(
      Object.entries(input).filter(
        ([key, value]) =>
          ["quest", "attempt", "sample", "session"].includes(key) &&
          typeof value === "string" &&
          value.length <= 200,
      ),
    ),
  component: ArchivePage,
});

function ArchivePage() {
  return <Archive selected={Route.useSearch()} />;
}
