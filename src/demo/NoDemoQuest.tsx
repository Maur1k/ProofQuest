import { Link } from "@tanstack/react-router";
import { EmptyState } from "@/components/common";
import { DemoBanner } from "./DemoBanner";

export function NoDemoQuest() {
  return (
    <div className="pt-8">
      <DemoBanner />
      <div className="mt-4">
        <EmptyState
          title="No demo quest yet"
          body="Demo questions live only in this tab. Pick a sample lesson and configure a quest to get started."
          action={
            <Link
              to="/study"
              className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
            >
              Open Study Library
            </Link>
          }
        />
      </div>
    </div>
  );
}
