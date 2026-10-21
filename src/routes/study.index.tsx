import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUBJECTS, getSubject } from "@/domain/subjects";
import type { SubjectId } from "@/domain/types";
import { DemoBanner } from "@/demo/DemoBanner";
import { DEMO_LESSONS } from "@/demo/lessons";
import { filterLessons } from "@/demo/logic";
import { SampleDropZone } from "@/demo/SampleDropZone";

export const Route = createFileRoute("/study/")({
  head: () => ({
    meta: [
      { title: "Study a sample lesson (demo) — ProofQuest" },
      {
        name: "description",
        content: "Drop or tap a sample document to start reading a demo programming lesson.",
      },
      { property: "og:title", content: "Study a sample lesson (demo) — ProofQuest" },
      {
        property: "og:description",
        content: "Pick a sample lesson and preview turning it into practice questions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudyLibrary,
});

function StudyLibrary() {
  const [query, setQuery] = useState("");
  const [subjectId, setSubjectId] = useState<SubjectId | "all">("all");
  const lessons = useMemo(
    () => filterLessons(DEMO_LESSONS, { query, subjectId }),
    [query, subjectId],
  );

  return (
    <>
      <PageHeader title="Study" back={{ to: "/", label: "Home" }} />
      <div className="-mt-4">
        <DemoBanner />
      </div>

      <SampleDropZone />

      <section aria-labelledby="lessons-h" className="mt-8">
        <h2 id="lessons-h" className="font-display text-base font-semibold text-foreground">
          All sample lessons
        </h2>
        <div className="mt-2 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <div className="relative min-w-0">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              aria-label="Search sample lessons"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 pl-9"
            />
          </div>
          <select
            aria-label="Filter by subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value as SubjectId | "all")}
            className="h-11 max-w-[9.5rem] rounded-md border border-input bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="all">All subjects</option>
            {SUBJECTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.short}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs text-muted-foreground" aria-live="polite">
          {lessons.length} lesson{lessons.length === 1 ? "" : "s"}
        </p>

        {lessons.length === 0 ? (
          <EmptyState
            title="No sample lessons match"
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
          <ul className="mt-2 space-y-2">
            {lessons.map((l) => (
              <li key={l.id}>
                <Link
                  to="/study/lesson/$lessonId"
                  params={{ lessonId: l.id }}
                  className="block rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <h3 className="font-display text-[15px] font-semibold text-foreground">
                    {l.title}
                  </h3>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{l.summary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {getSubject(l.subjectId)?.short} · {l.topic} · {l.readMinutes} min
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
