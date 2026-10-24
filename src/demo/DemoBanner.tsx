import { FlaskConical } from "lucide-react";

/**
 * Compact, always-visible demo label on every Study-to-Quest screen. The fuller
 * explanation sits behind a native disclosure so it never pushes content down.
 */
export function DemoBanner({ children }: { children?: string }) {
  return (
    <details aria-label="Demo notice" className="group mt-4 rounded-xl border border-warning/40 bg-warning/10 text-xs text-warning">
      <summary
        className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-xl px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
      >
        <FlaskConical className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 font-semibold">Demo · sample content only · not saved</span>
        <span className="shrink-0 underline-offset-2 group-open:hidden">About</span>
        <span className="hidden shrink-0 group-open:inline">Hide</span>
      </summary>
      <p className="px-3 pb-3 text-warning/90">
        {children ??
          "Everything here uses built-in sample lessons. No file is opened, read, uploaded or saved, and nothing is added to your quests or progress. Questions come from a fixed sample set, not AI."}
      </p>
    </details>
  );
}
