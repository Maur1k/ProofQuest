import { createFileRoute, Link } from "@tanstack/react-router";
import { DataControls } from "@/components/DataControls";
export const Route = createFileRoute("/settings")({ component: SettingsPage });
function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 py-6 sm:space-y-6 sm:py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage saved data and learn about ProofQuest.
        </p>
      </header>
      <section
        id="data-backup"
        aria-labelledby="data-backup-heading"
        className="rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <h2 id="data-backup-heading" className="text-lg font-semibold">
          Data &amp; backup
        </h2>
        <DataControls />
      </section>
      <section
        aria-labelledby="archive-heading"
        className="rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <h2 id="archive-heading" className="text-lg font-semibold">
          Archive
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Older Quests and sample content stay available to read and export. Archived attempts are
          read-only.
        </p>
        <Link
          to="/archive"
          search={{}}
          className="mt-2 inline-flex min-h-11 items-center rounded-md text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Open Archive
        </Link>
      </section>
      <section
        aria-labelledby="about-heading"
        className="space-y-3 rounded-2xl border border-border bg-card p-5 sm:p-6"
      >
        <h2 id="about-heading" className="text-lg font-semibold">
          About ProofQuest
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          A study app by Maur1k. Open-source code under the MIT license.
        </p>
        <a
          href="https://github.com/Maur1k/ProofQuest"
          className="inline-flex min-h-11 items-center rounded-md text-primary underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
        >
          View source code
        </a>
      </section>
    </div>
  );
}
