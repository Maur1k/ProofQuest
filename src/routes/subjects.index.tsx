import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useStore } from "@/store/store";
import { LoadingState, PageHeader, Pill } from "@/components/common";
import { SUBJECTS } from "@/domain/subjects";
import { flattenAnswers, pct, summarize } from "@/domain/stats";

export const Route = createFileRoute("/subjects/")({
  head: () => ({
    meta: [
      { title: "Subjects — ProofQuest" },
      {
        name: "description",
        content:
          "Browse programming fundamentals, data structures, algorithms and computer science topics.",
      },
      { property: "og:title", content: "Subjects — ProofQuest" },
      {
        property: "og:description",
        content: "Browse subjects and topics for your programming practice quests.",
      },
    ],
  }),
  component: Subjects,
});

function Subjects() {
  const { ready, data } = useStore();
  if (!ready) return <LoadingState />;
  return (
    <div>
      <PageHeader title="Subjects" subtitle="Pick a subject to see its topics and quests." />
      <ul className="space-y-3">
        {SUBJECTS.map((s) => {
          const quests = data.quests.filter((q) => q.subjectId === s.id);
          const sum = summarize(flattenAnswers(data.attempts.filter((a) => a.subjectId === s.id)));
          const topics = Array.from(new Set([...s.topics, ...quests.map((q) => q.topic)]));
          return (
            <li key={s.id}>
              <Link
                to="/subjects/$subjectId"
                params={{ subjectId: s.id }}
                className="block rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">{s.name}</h2>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" aria-hidden />
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{s.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {quests.length} quest{quests.length === 1 ? "" : "s"} ·{" "}
                  {sum.answered ? `${pct(sum.accuracy)} accuracy` : "not practiced yet"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {topics.map((t) => (
                    <Pill key={t}>{t}</Pill>
                  ))}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
