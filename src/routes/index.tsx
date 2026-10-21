import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Plus, Target } from "lucide-react";
import { useStore } from "@/store/store";
import { Card, EmptyState, LoadingState, MasteryDots, ProgressBar } from "@/components/common";
import { QuestCard } from "@/components/QuestCard";
import { SUBJECTS, getSubject } from "@/domain/subjects";
import {
  computeTopicStats,
  continueTarget,
  flattenAnswers,
  pct,
  summarize,
  suggestFocus,
} from "@/domain/stats";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ProofQuest — Practice code by predicting, tracing and debugging" },
      {
        name: "description",
        content:
          "Your personal study dashboard: continue a quest, see your focus topic, and create new practice quests.",
      },
      {
        property: "og:title",
        content: "ProofQuest — Practice code by predicting, tracing and debugging",
      },
      {
        property: "og:description",
        content: "Self-made programming quests: predict output, trace variables, fix bugs.",
      },
    ],
  }),
  component: Home,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Home() {
  const { ready, data } = useStore();
  if (!ready) return <LoadingState />;
  const { quests, attempts } = data;
  const overall = summarize(flattenAnswers(attempts));
  const completed = attempts.filter((a) => a.completedAt !== null).length;
  const cont = continueTarget(quests, attempts);
  const topicStats = computeTopicStats(attempts);
  const focus = suggestFocus(topicStats);
  const focusQuest = focus
    ? quests.find(
        (q) =>
          q.subjectId === focus.subjectId &&
          q.topic.trim().toLowerCase() === focus.topic.trim().toLowerCase(),
      )
    : undefined;
  const recent = [...quests].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 3);

  return (
    <div className="space-y-6 pt-6">
      <header>
        <p className="text-sm text-muted-foreground">{greeting()}</p>
        <h1 className="text-3xl font-bold">Ready to prove it?</h1>
      </header>

      <section aria-label="Study summary" className="grid grid-cols-3 gap-2">
        {[
          { label: "Answered", value: String(overall.answered) },
          { label: "Accuracy", value: overall.answered ? pct(overall.accuracy) : "—" },
          { label: "Quests done", value: String(completed) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-3">
            <p className="font-display text-xl font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <section aria-labelledby="continue-heading" className="space-y-2">
        <h2 id="continue-heading" className="text-lg font-semibold">
          Continue learning
        </h2>
        {cont ? (
          <Link
            to="/practice/$questId"
            params={{ questId: cont.quest.id }}
            className="block rounded-2xl border border-primary/40 bg-gradient-surface p-4 transition-colors hover:border-primary"
          >
            <p className="text-xs text-muted-foreground">
              {getSubject(cont.quest.subjectId)?.short} · {cont.quest.topic}
            </p>
            <p className="mt-0.5 text-base font-semibold">{cont.quest.title}</p>
            <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Question {Math.min(cont.attempt.currentIndex, cont.quest.questions.length - 1) + 1}{" "}
                of {cont.quest.questions.length}
              </span>
              <span className="inline-flex items-center gap-1 font-semibold text-primary">
                Resume <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </div>
            <div className="mt-2">
              <ProgressBar
                value={Object.keys(cont.attempt.answers).length / cont.quest.questions.length}
                label="Quest progress"
              />
            </div>
          </Link>
        ) : (
          <Card className="text-sm text-muted-foreground">
            No quest in progress. Start one from your library below.
          </Card>
        )}
        {focus && (
          <Card className="flex items-center gap-3">
            <Target className="h-5 w-5 shrink-0 text-warning" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                Suggested focus · lowest accuracy so far
              </p>
              <p className="truncate text-sm font-semibold">
                {focus.topic} · {pct(focus.accuracy)} ({focus.correct}/{focus.answered})
              </p>
            </div>
            {focusQuest && focusQuest.questions.length > 0 && (
              <Link
                to="/practice/$questId"
                params={{ questId: focusQuest.id }}
                className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-primary hover:bg-accent"
              >
                Practice
              </Link>
            )}
          </Card>
        )}
      </section>

      <Link
        to="/quests/new"
        search={{}}
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-primary text-base font-semibold text-primary-foreground shadow-glow"
      >
        <Plus className="h-5 w-5" aria-hidden /> Create a quest
      </Link>

      <Link
        to="/study"
        className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/60"
      >
        <span>
          <span className="block text-sm font-semibold text-foreground">Study Library</span>
          <span className="block text-xs text-muted-foreground">
            Demo: turn a sample lesson into a quest preview
          </span>
        </span>
        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning">
          Demo
        </span>
      </Link>

      <section aria-labelledby="subjects-heading" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 id="subjects-heading" className="text-lg font-semibold">
            Subjects
          </h2>
          <Link to="/subjects" className="inline-flex min-h-11 items-center text-sm text-primary">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SUBJECTS.map((s) => {
            const count = quests.filter((q) => q.subjectId === s.id).length;
            const ts = topicStats.filter((t) => t.subjectId === s.id);
            const sum = summarize(flattenAnswers(attempts.filter((a) => a.subjectId === s.id)));
            const mastery = ts.length
              ? Math.round(ts.reduce((n, t) => n + t.mastery, 0) / ts.length)
              : 0;
            return (
              <Link
                key={s.id}
                to="/subjects/$subjectId"
                params={{ subjectId: s.id }}
                className="rounded-2xl border border-border bg-card p-3 transition-colors hover:border-primary/60"
              >
                <p className="text-sm font-semibold leading-tight">{s.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {count} quest{count === 1 ? "" : "s"}
                  {sum.answered > 0 && ` · ${pct(sum.accuracy)}`}
                </p>
                <div className="mt-2">
                  <MasteryDots mastery={mastery} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="recent-heading" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 id="recent-heading" className="text-lg font-semibold">
            Recent quests
          </h2>
          <Link
            to="/quests"
            search={{}}
            className="inline-flex min-h-11 items-center text-sm text-primary"
          >
            Library
          </Link>
        </div>
        {recent.length ? (
          <div className="space-y-2">
            {recent.map((q) => (
              <QuestCard key={q.id} quest={q} attempts={attempts} showActions={false} />
            ))}
          </div>
        ) : (
          <EmptyState title="No quests yet" body="Create your first quest to start practicing." />
        )}
      </section>
    </div>
  );
}
