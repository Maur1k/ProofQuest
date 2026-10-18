import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import { Card, EmptyState, LoadingState, MasteryDots, PageHeader, Pill, ProgressBar } from "@/components/common";
import { SUBJECTS, getSubject } from "@/domain/subjects";
import { attemptSummary, computeTopicStats, flattenAnswers, pct, summarize, suggestFocus } from "@/domain/stats";

export const Route = createFileRoute("/progress")({
  head: () => ({
    meta: [
      { title: "Progress — ProofQuest" },
      { name: "description", content: "Accuracy and mastery by subject and topic, plus your attempt history." },
      { property: "og:title", content: "Progress — ProofQuest" },
      { property: "og:description", content: "Accuracy and mastery by subject and topic." },
    ],
  }),
  component: Progress,
});

function fmt(ts: number) {
  return new Date(ts).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Progress() {
  const { ready, data } = useStore();
  if (!ready) return <LoadingState />;
  const answers = flattenAnswers(data.attempts);
  const overall = summarize(answers);
  const topics = computeTopicStats(data.attempts).sort((a, b) => a.accuracy - b.accuracy);
  const focus = suggestFocus(topics);
  const history = [...data.attempts].sort((a, b) => b.updatedAt - a.updatedAt);

  if (answers.length === 0 && history.length === 0)
    return (
      <div>
        <PageHeader title="Progress" />
        <EmptyState
          title="No practice recorded yet"
          body="Answer some questions and your accuracy and mastery will appear here."
          action={<Link to="/quests" search={{}} className="inline-flex min-h-11 items-center rounded-xl bg-gradient-primary px-4 text-sm font-semibold text-primary-foreground">Open library</Link>}
        />
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader title="Progress" subtitle={`${overall.answered} answers · ${pct(overall.accuracy)} accuracy`} />

      <Card className="text-xs text-muted-foreground">
        Mastery rises by one for each correct answer without hints or reveals, stays the same with hints, and drops by one for wrong or revealed answers (0–5).
        {focus && (
          <span className="mt-1 block text-foreground">
            Suggested focus: <strong>{focus.topic}</strong> ({pct(focus.accuracy)})
          </span>
        )}
      </Card>

      <section aria-labelledby="by-subject" className="space-y-2">
        <h2 id="by-subject" className="text-lg font-semibold">By subject</h2>
        <div className="space-y-2">
          {SUBJECTS.map((s) => {
            const sum = summarize(answers.filter((a) => a.subjectId === s.id));
            return (
              <Card key={s.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{sum.answered ? `${pct(sum.accuracy)} · ${sum.correct}/${sum.answered}` : "—"}</span>
                </div>
                <ProgressBar value={sum.accuracy} label={`${s.name} accuracy`} />
              </Card>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="by-topic" className="space-y-2">
        <h2 id="by-topic" className="text-lg font-semibold">By topic</h2>
        {topics.length ? (
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {topics.map((t) => (
              <li key={`${t.subjectId}-${t.topic}`} className="flex items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{t.topic}</p>
                  <p className="text-xs text-muted-foreground">{getSubject(t.subjectId)?.short} · {pct(t.accuracy)} ({t.correct}/{t.answered})</p>
                </div>
                <MasteryDots mastery={t.mastery} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No topics yet" body="Answer a question to start tracking topics." />
        )}
      </section>

      <section aria-labelledby="history" className="space-y-2">
        <h2 id="history" className="text-lg font-semibold">Attempt history</h2>
        <ul className="space-y-2">
          {history.map((a) => {
            const s = attemptSummary(a);
            const inner = (
              <>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.questTitle}</p>
                  <p className="text-xs text-muted-foreground">{fmt(a.updatedAt)} · {s.correct}/{s.answered} correct</p>
                </div>
                {a.completedAt ? <Pill tone="success">{pct(s.accuracy)}</Pill> : <Pill tone="primary">In progress</Pill>}
              </>
            );
            const cls = "flex min-h-14 items-center justify-between gap-2 rounded-2xl border border-border bg-card px-4 py-2";
            const questExists = data.quests.some((q) => q.id === a.questId);
            return (
              <li key={a.id}>
                {a.completedAt ? (
                  <Link to="/results/$questId" params={{ questId: a.questId }} search={{ attempt: a.id }} className={`${cls} hover:border-primary/60`}>{inner}</Link>
                ) : questExists ? (
                  <Link to="/practice/$questId" params={{ questId: a.questId }} className={`${cls} hover:border-primary/60`}>{inner}</Link>
                ) : (
                  <div className={cls}>{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
