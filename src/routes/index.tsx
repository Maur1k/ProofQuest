import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpenText, Plus, Target } from "lucide-react";
import { ART } from "@/onboarding/slides";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

  const continueCard = cont && (
    <section aria-labelledby="continue-heading" className="space-y-2">
      <h2 id="continue-heading" className="text-lg font-semibold">
        Continue learning
      </h2>
      <Link
        to="/practice/$questId"
        params={{ questId: cont.quest.id }}
        className="block rounded-2xl border border-primary/40 bg-gradient-surface p-4 transition-colors hover:border-primary"
      >
        <p className="text-xs text-muted-foreground">
          {getSubject(cont.quest.subjectId)?.short} · {cont.quest.topic}
        </p>
        <p className="mt-0.5 break-words text-base font-semibold">{cont.quest.title}</p>
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Question {Math.min(cont.attempt.currentIndex, cont.quest.questions.length - 1) + 1} of{" "}
            {cont.quest.questions.length}
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
    </section>
  );

  return (
    <div className="space-y-6 pt-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{greeting()}</p>
          <h1 className="text-3xl font-bold">Ready to prove it?</h1>
        </div>
      </header>

      <p className="text-sm text-muted-foreground">
        No account needed. Your quests and progress stay in this browser.
      </p>

      {continueCard}

      <section
        aria-labelledby="study-intro-h"
        className="relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-gradient-surface p-4 md:p-6"
      >
        <div className="min-w-0 flex-1">
          <h2 id="study-intro-h" className="text-lg font-semibold">
            Understand it, then practice it
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open a sample lesson in one tap and preview practice questions.
          </p>
          <Link
            to="/study"
            className={
              cont
                ? "mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl border border-primary/60 px-4 text-sm font-semibold text-foreground hover:bg-accent"
                : "mt-3 inline-flex min-h-12 items-center gap-2 rounded-xl bg-gradient-primary px-5 text-base font-semibold text-primary-foreground shadow-glow"
            }
          >
            <BookOpenText className="h-5 w-5" aria-hidden /> Start studying
          </Link>
          <p className="mt-2 text-[11px] font-medium text-warning">Demo · sample lessons only</p>
        </div>
        <img
          src={ART.study}
          alt=""
          width={112}
          height={112}
          className="h-20 w-20 shrink-0 object-contain sm:h-28 sm:w-28 md:h-40 md:w-40"
        />
      </section>

      <section aria-label="Study summary" className="grid grid-cols-3 gap-2 md:gap-4">
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

      {!cont && (
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

      <Link
        to="/quests/new"
        search={{}}
        className="flex min-h-12 flex-wrap items-center justify-center gap-2 rounded-2xl px-4 py-3 border border-input bg-card text-sm font-semibold text-foreground hover:border-primary/60"
      >
        <Plus className="h-5 w-5 text-primary" aria-hidden /> Create quest manually
        <span className="text-xs font-normal text-muted-foreground">· saved to your library</span>
      </Link>

      <div className="grid gap-6 xl:grid-cols-2">
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
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              {recent.map((q) => (
                <QuestCard key={q.id} quest={q} attempts={attempts} showActions={false} />
              ))}
            </div>
          ) : (
            <EmptyState title="No quests yet" body="Create your first quest to start practicing." />
          )}
        </section>
      </div>

      <nav
        aria-label="More"
        className="flex flex-wrap items-center justify-center gap-x-4 border-t border-border pt-3 text-sm"
      >
        <Link
          to="/intro"
          className="inline-flex min-h-11 items-center text-muted-foreground hover:text-foreground"
        >
          Replay introduction
        </Link>
      </nav>
    </div>
  );
}
