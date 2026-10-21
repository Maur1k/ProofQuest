import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpenText, FileText, Search, Upload } from "lucide-react";
import { Card, EmptyState, PageHeader, Pill, ProgressBar } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SUBJECTS, getSubject } from "@/domain/subjects";
import type { SubjectId } from "@/domain/types";
import { DemoBanner } from "@/demo/DemoBanner";
import { DEMO_LESSONS, DEMO_SAMPLE_FILES, getDemoLesson } from "@/demo/lessons";
import {
  filterLessons,
  formatBytes,
  getSampleFile,
  nextUploadProgress,
  validateSampleFile,
} from "@/demo/logic";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/study/")({
  head: () => ({
    meta: [
      { title: "Study Library (demo) — ProofQuest" },
      {
        name: "description",
        content: "Demo study library with sample programming lessons and a simulated upload.",
      },
      { property: "og:title", content: "Study Library (demo) — ProofQuest" },
      {
        property: "og:description",
        content: "Browse sample lessons and preview turning them into practice quests.",
      },
    ],
  }),
  component: StudyLibrary,
});

const chip =
  "inline-flex min-h-11 shrink-0 items-center rounded-full border px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function StudyLibrary() {
  const [query, setQuery] = useState("");
  const [subjectId, setSubjectId] = useState<SubjectId | "all">("all");
  const lessons = useMemo(
    () => filterLessons(DEMO_LESSONS, { query, subjectId }),
    [query, subjectId],
  );

  return (
    <>
      <DemoBanner />
      <PageHeader
        title="Study Library"
        subtitle="Sample lessons you can read and turn into a practice quest preview."
        back={{ to: "/", label: "Home" }}
      />

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          aria-label="Search demo lessons"
          placeholder="Search lessons, topics, sections"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 pl-9"
        />
      </div>
      <div
        role="group"
        aria-label="Filter by subject"
        className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1"
      >
        {[{ id: "all" as const, short: "All" }, ...SUBJECTS].map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={subjectId === s.id}
            onClick={() => setSubjectId(s.id)}
            className={cn(
              chip,
              subjectId === s.id
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s.short}
          </button>
        ))}
      </div>

      <section aria-labelledby="lessons-h" className="mt-5">
        <h2 id="lessons-h" className="mb-2 text-sm font-semibold text-muted-foreground">
          {lessons.length} demo lesson{lessons.length === 1 ? "" : "s"}
        </h2>
        {lessons.length === 0 ? (
          <EmptyState
            title="No demo lessons match"
            body="Try a different search or subject."
            action={
              <Button
                variant="outline"
                className="min-h-11"
                onClick={() => {
                  setQuery("");
                  setSubjectId("all");
                }}
              >
                Clear filters
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {lessons.map((l) => (
              <li key={l.id}>
                <Link
                  to="/study/lesson/$lessonId"
                  params={{ lessonId: l.id }}
                  className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Pill tone="warning">Demo</Pill>
                    <Pill tone="primary">{getSubject(l.subjectId)?.short}</Pill>
                    <Pill>{l.topic}</Pill>
                  </div>
                  <h3 className="mt-2 font-display text-base font-semibold text-foreground">
                    {l.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">{l.summary}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {l.sections.length} section{l.sections.length === 1 ? "" : "s"} ·{" "}
                    {l.readMinutes} min read · {l.language}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <UploadPanel />
    </>
  );
}

type UploadStatus = "idle" | "uploading" | "done" | "cancelled";

function UploadPanel() {
  const [fileId, setFileId] = useState("");
  const [subjectId, setSubjectId] = useState<SubjectId | "">("");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const file = getSampleFile(fileId);
  const matched = file?.lessonId ? getDemoLesson(file.lessonId) : undefined;

  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);
  useEffect(() => {
    if (progress >= 100 && status === "uploading") {
      stop();
      setStatus("done");
    }
  }, [progress, status]);

  const start = () => {
    const fileError = validateSampleFile(file);
    const err = fileError ?? (subjectId ? null : "Choose a subject for this sample.");
    setError(err);
    if (err) return;
    setProgress(0);
    setStatus("uploading");
    stop();
    timer.current = setInterval(() => setProgress((p) => nextUploadProgress(p)), 250);
  };
  const cancel = () => {
    stop();
    setStatus("cancelled");
  };
  const reset = () => {
    stop();
    setFileId("");
    setSubjectId("");
    setProgress(0);
    setStatus("idle");
    setError(null);
  };
  const busy = status === "uploading";

  return (
    <section aria-labelledby="upload-h" className="mt-8">
      <Card>
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" aria-hidden />
          <h2 id="upload-h" className="font-display text-base font-semibold text-foreground">
            Simulated upload
          </h2>
          <Pill tone="warning">Simulated</Pill>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a sample file to see how uploading would work. No file picker opens, no file is read,
          and nothing is sent or saved.
        </p>

        <fieldset className="mt-4" disabled={busy}>
          <legend className="text-sm font-medium text-foreground">Sample file</legend>
          <div className="mt-2 space-y-2">
            {DEMO_SAMPLE_FILES.map((f) => (
              <label
                key={f.id}
                className={cn(
                  "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                  fileId === f.id ? "border-primary bg-accent/40" : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="sample-file"
                  value={f.id}
                  checked={fileId === f.id}
                  onChange={() => {
                    setFileId(f.id);
                    setError(null);
                    setStatus("idle");
                    setProgress(0);
                  }}
                  className="h-4 w-4 accent-primary"
                />
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-[13px] text-foreground">
                    {f.name}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {formatBytes(f.sizeBytes)} · .{f.extension}
                    {f.pages ? ` · ${f.pages} pages` : ""}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mt-4">
          <Label htmlFor="upload-subject">Subject</Label>
          <select
            id="upload-subject"
            value={subjectId}
            disabled={busy}
            onChange={(e) => {
              setSubjectId(e.target.value as SubjectId | "");
              setError(null);
            }}
            className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Choose a subject</option>
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        )}

        {status !== "idle" && (
          <div className="mt-4 space-y-2" aria-live="polite">
            <ProgressBar value={progress / 100} label="Simulated upload progress" />
            <p className="text-sm text-muted-foreground">
              {status === "uploading" && `Simulating… ${Math.round(progress)}%`}
              {status === "cancelled" &&
                `Cancelled at ${Math.round(progress)}%. Nothing was uploaded.`}
              {status === "done" && "Simulation complete. No file was uploaded or saved."}
            </p>
            {status === "done" && matched && (
              <Link
                to="/study/lesson/$lessonId"
                params={{ lessonId: matched.id }}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-1 text-sm font-semibold text-primary"
              >
                <BookOpenText className="h-4 w-4" aria-hidden /> Open matching demo lesson:{" "}
                {matched.title}
              </Link>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {busy ? (
            <Button variant="outline" className="min-h-11" onClick={cancel}>
              Cancel
            </Button>
          ) : (
            <Button className="min-h-11" onClick={start}>
              {status === "done" || status === "cancelled" ? "Simulate again" : "Simulate upload"}
            </Button>
          )}
          <Button variant="ghost" className="min-h-11" onClick={reset} disabled={busy}>
            Reset
          </Button>
        </div>
      </Card>
    </section>
  );
}
