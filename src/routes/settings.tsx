import { createFileRoute, Link } from "@tanstack/react-router";
import { DataControls } from "@/components/DataControls";
export const Route = createFileRoute("/settings")({ component: SettingsPage });
function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <h1 className="text-3xl font-bold">Settings</h1>
      <DataControls />
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">Archive</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your older Quests and sample content are preserved for viewing and backup. Archived
          attempts cannot be resumed.
        </p>
        <Link
          to="/archive"
          search={{}}
          className="inline-flex min-h-11 items-center text-primary underline"
        >
          Open Archive
        </Link>
      </section>
      <section className="space-y-2 rounded-2xl border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">About ProofQuest</h2>
        <p>A study app by Maur1k. Open-source code under the MIT license.</p>
        <a
          href="https://github.com/Maur1k/ProofQuest"
          className="inline-flex min-h-11 items-center text-primary underline"
        >
          View source code
        </a>
      </section>
    </div>
  );
}
