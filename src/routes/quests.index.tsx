import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useStore } from "@/store/store";
import { EmptyState, LoadingState, PageHeader } from "@/components/common";
import { QuestCard } from "@/components/QuestCard";
import { Button } from "@/components/ui/button";
import { DIFFICULTY_LABEL, SUBJECTS, getSubject } from "@/domain/subjects";
import { DIFFICULTIES, SUBJECT_IDS, type Difficulty, type SubjectId } from "@/domain/types";
import { questStatus, type QuestStatus } from "@/domain/stats";

const STATUSES: QuestStatus[] = ["new", "in-progress", "completed"];
const STATUS_LABEL: Record<QuestStatus, string> = {
  new: "Not started",
  "in-progress": "In progress",
  completed: "Completed",
};

interface LibrarySearch {
  q?: string | undefined;
  subject?: SubjectId | undefined;
  difficulty?: Difficulty | undefined;
  status?: QuestStatus | undefined;
}

export const Route = createFileRoute("/quests/")({
  validateSearch: (s: Record<string, unknown>): LibrarySearch => ({
    q: typeof s["q"] === "string" && s["q"] ? s["q"] : undefined,
    subject: (SUBJECT_IDS as readonly unknown[]).includes(s["subject"])
      ? (s["subject"] as SubjectId)
      : undefined,
    difficulty: (DIFFICULTIES as readonly unknown[]).includes(s["difficulty"])
      ? (s["difficulty"] as Difficulty)
      : undefined,
    status: (STATUSES as unknown[]).includes(s["status"])
      ? (s["status"] as QuestStatus)
      : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Quest library — ProofQuest" },
      {
        name: "description",
        content: "Search, filter, edit and practice your programming quests.",
      },
      { property: "og:title", content: "Quest library — ProofQuest" },
      {
        property: "og:description",
        content: "Search, filter, edit and practice your programming quests.",
      },
    ],
  }),
  component: Library,
});

function Library() {
  const { ready, data } = useStore();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/quests/" });
  const update = (patch: Partial<LibrarySearch>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  if (!ready) return <LoadingState />;
  const term = (search.q ?? "").trim().toLowerCase();
  const filtered = data.quests.filter((q) => {
    if (search.subject && q.subjectId !== search.subject) return false;
    if (search.difficulty && q.difficulty !== search.difficulty) return false;
    if (search.status && questStatus(q.id, data.attempts) !== search.status) return false;
    if (term) {
      const hay = `${q.title} ${q.topic} ${getSubject(q.subjectId)?.name ?? ""}`.toLowerCase();
      if (!hay.includes(term)) return false;
    }
    return true;
  });
  const hasFilters = !!(search.q || search.subject || search.difficulty || search.status);

  return (
    <div>
      <PageHeader
        title="Quests"
        subtitle={`${data.quests.length} quest${data.quests.length === 1 ? "" : "s"} in your library`}
        action={
          <Button asChild size="sm">
            <Link to="/quests/new" search={{}}>
              <Plus aria-hidden /> New
            </Link>
          </Button>
        }
      />
      <div className="mb-4 space-y-2">
        <label className="relative block">
          <span className="sr-only">Search quests</span>
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            className="field pl-9"
            placeholder="Search title, topic or subject"
            value={search.q ?? ""}
            onChange={(e) => update({ q: e.target.value || undefined })}
          />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="min-w-0">
            <span className="mb-1 block text-xs text-muted-foreground">Filter by subject</span>
            <select
              className="field px-2 text-sm"
              value={search.subject ?? ""}
              onChange={(e) =>
                update({ subject: (e.target.value || undefined) as SubjectId | undefined })
              }
            >
              <option value="">All subjects</option>
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.short}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="sr-only">Filter by difficulty</span>
            <select
              className="field px-2 text-sm"
              value={search.difficulty ?? ""}
              onChange={(e) =>
                update({ difficulty: (e.target.value || undefined) as Difficulty | undefined })
              }
            >
              <option value="">Any level</option>
              {DIFFICULTIES.map((d) => (
                <option key={d} value={d}>
                  {DIFFICULTY_LABEL[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0">
            <span className="sr-only">Filter by status</span>
            <select
              className="field px-2 text-sm"
              value={search.status ?? ""}
              onChange={(e) =>
                update({ status: (e.target.value || undefined) as QuestStatus | undefined })
              }
            >
              <option value="">Any status</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        {filtered.length} quests shown
      </p>
      {data.quests.length === 0 ? (
        <EmptyState
          title="Your library is empty"
          body="Create a quest with your own predict, trace and debug questions."
          action={
            <Button asChild>
              <Link to="/quests/new" search={{}}>
                Create quest
              </Link>
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No quests match"
          body="Try a different search or clear the filters."
          action={
            <Button variant="outline" onClick={() => navigate({ search: {}, replace: true })}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {hasFilters && (
            <p className="text-xs text-muted-foreground md:col-span-2">
              {filtered.length} of {data.quests.length} shown
            </p>
          )}
          {filtered.map((q) => (
            <QuestCard key={q.id} quest={q} attempts={data.attempts} />
          ))}
        </div>
      )}
    </div>
  );
}
