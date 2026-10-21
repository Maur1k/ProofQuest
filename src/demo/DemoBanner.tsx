import { FlaskConical } from "lucide-react";

/** Persistent label on every Study-to-Quest screen so the demo is never mistaken for real data. */
export function DemoBanner({ children }: { children?: string }) {
  return (
    <p
      role="note"
      className="mt-4 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning"
    >
      <FlaskConical className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>
        <strong className="font-semibold">Demo · Simulated.</strong>{" "}
        {children ?? "Sample content only. Nothing is uploaded, saved, or added to your progress."}
      </span>
    </p>
  );
}
