import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import { EmptyState, LoadingState, MasteryDots, PageHeader } from "@/components/common";
import { QuestCard } from "@/components/QuestCard";
import { getSubject } from "@/domain/subjects";
import { computeTopicStats, pct, topicKey } from "@/domain/stats";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subjects/$subjectId")({
  head: ({ params }) => {
    const name = getSubject(params.subjectId)?.name ?? "Subject";
    return {
      meta: [
        { title: `${name} — ProofQuest` },
        { name: "description", content: `Topics and practice quests for ${name}.` },
        { property: "og:title", content: `${name} — ProofQuest` },
        { property: "og:description", content: `Topics and practice quests for ${name}.` },
      ],
    };
  },
  component: SubjectDetail,
});

function SubjectDetail() {
  const { subjectId } = Route.useParams();
  const subject = getSubject(subjectId);
  const { ready, data } = useStore();
  const [topic, setTopic] = useState<string | null>(null);

  if (!subject)
    return (
      <div className="pt-10">
        <EmptyState title="Subject not found" body="This subject doesn't exist." action={<Link to="/subjects" className="text-primary">Back to subjects</Link>} />
      </div>
    );
  if (!ready) return <LoadingState />;

  const quests = data.quests.filter((q) => q.subjectId === subject.id);
  const topics = Array.from(new Set([...subject.topics, ...quests.map((q) => q.topic)]));
  const stats = new Map(computeTopicStats(data.attempts).map((s) => [topicKey(s.subjectId, s.topic), s]));
  const shown = topic ? quests.filter((q) => q.topic.trim().toLowerCase() === topic.toLowerCase()) : quests;

  return (
    <div>
      <PageHeader title={subject.name} subtitle={subject.description} back={{ to: "/subjects", label: "Subjects" }} />

      <section aria-labelledby="topics-heading" className="mb-6">
        <h2 id="topics-heading" className="mb-2 text-lg font-semibold">Topics</h2>
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {topics.map((t) => {
            const s = stats.get(topicKey(subject.id, t));
            const count = quests.filter((q) => q.topic.trim().toLowerCase() === t.toLowerCase()).length;
            const selected = topic?.toLowerCase() === t.toLowerCase();
            return (
              <li key={t}>
                <button
                  onClick={() => setTopic(selected ? null : t)}
                  aria-pressed={selected}
                  className={cn("flex min-h-14 w-full items-center justify-between gap-2 px-4 py-2 text-left hover:bg-accent", selected && "bg-accent")}
                >
                  <span>
                    <span className="block text-sm font-medium">{t}</span>
                    <span className="text-xs text-muted-foreground">
                      {count} quest{count === 1 ? "" : "s"}
                      {s ? ` · ${pct(s.accuracy)} of ${s.answered}` : ""}
                    </span>
                  </span>
                  <MasteryDots mastery={s?.mastery ?? 0} />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="sq-heading" className="space-y-2">
        <h2 id="sq-heading" className="text-lg font-semibold">{topic ? `${topic} quests` : "All quests"}</h2>
        {shown.length ? (
          shown.map((q) => <QuestCard key={q.id} quest={q} attempts={data.attempts} />)
        ) : (
          <EmptyState
            title={topic ? `No ${topic} quests yet` : "No quests in this subject yet"}
            body="Create a quest with your own practice questions."
            action={
              <Link to="/quests/new" search={{ subject: subject.id, topic: topic ?? undefined }} className="inline-flex min-h-11 items-center rounded-xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground">
                Create quest
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
