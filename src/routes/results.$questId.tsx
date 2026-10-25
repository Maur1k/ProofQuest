import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Eye, Lightbulb, XCircle } from "lucide-react";
import { useStore } from "@/store/store";
import { Card, CodeBlock, EmptyState, LoadingState, PageHeader, Pill } from "@/components/common";
import { ExpectedAnswer } from "@/components/QuestionPractice";
import { Button } from "@/components/ui/button";
import { attemptSummary, latestCompleted, pct } from "@/domain/stats";
import type { AnswerResponse } from "@/domain/types";

export const Route = createFileRoute("/results/$questId")({
  validateSearch: (s: Record<string, unknown>): { attempt?: string | undefined } => ({
    attempt: typeof s["attempt"] === "string" ? s["attempt"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Results — ProofQuest" },
      {
        name: "description",
        content: "Review your answers, accuracy and explanations for a quest attempt.",
      },
      { property: "og:title", content: "Results — ProofQuest" },
      { property: "og:description", content: "Review your answers, accuracy and explanations." },
    ],
  }),
  component: Results,
});

function YourAnswer({ response }: { response: AnswerResponse }) {
  if (response.type === "predict") return <CodeBlock code={response.output || "(empty)"} />;
  if (response.type === "fix") return <CodeBlock code={response.code || "(empty)"} />;
  return (
    <CodeBlock code={response.cells.map((r) => r.map((c) => c || "·").join(" | ")).join("\n")} />
  );
}

function Results() {
  const { questId } = Route.useParams();
  const { attempt: attemptId } = Route.useSearch();
  const navigate = useNavigate();
  const { ready, data, startAttempt } = useStore();
  if (!ready) return <LoadingState />;

  const quest = data.quests.find((q) => q.id === questId);
  const attempt = attemptId
    ? data.attempts.find(
        (a) => a.id === attemptId && a.questId === questId && a.completedAt !== null,
      )
    : latestCompleted(questId, data.attempts);

  if (!attempt)
    return (
      <div className="pt-10">
        <EmptyState
          title="No results yet"
          body="Finish this quest to see your results."
          action={
            <Link to="/quests" search={{}} className="text-primary">
              Back to library
            </Link>
          }
        />
      </div>
    );

  const s = attemptSummary(attempt);
  const questions = quest ? quest.questions.filter((q) => attempt.answers[q.id]) : [];

  return (
    <div className="mx-auto max-w-4xl space-y-5 break-words [overflow-wrap:anywhere]">
      <PageHeader
        title="Results"
        subtitle={attempt.questTitle}
        back={{ to: "/quests", label: "Library" }}
      />
      <section
        aria-label="Score"
        className="rounded-2xl border border-border bg-gradient-surface p-5 text-center"
      >
        <p className="font-display text-5xl font-bold">{pct(s.accuracy)}</p>
        <p className="mt-1 text-sm text-muted-foreground">accuracy</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-success/15 p-2 text-success">
            <p className="font-display text-xl font-bold">{s.correct}</p>
            <p className="text-xs">correct</p>
          </div>
          <div className="rounded-xl bg-destructive/15 p-2 text-destructive">
            <p className="font-display text-xl font-bold">{s.incorrect}</p>
            <p className="text-xs">incorrect or revealed</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {quest && quest.questions.length > 0 ? (
          <Button
            onClick={() => {
              startAttempt(quest.id);
              navigate({ to: "/practice/$questId", params: { questId: quest.id } });
            }}
          >
            Retry quest
          </Button>
        ) : (
          <Button disabled>Quest deleted</Button>
        )}
        <Button variant="outline" asChild>
          <Link to="/quests" search={{}}>
            Return to library
          </Link>
        </Button>
      </div>

      <section aria-labelledby="review-heading" className="space-y-3">
        <h2 id="review-heading" className="text-lg font-semibold">
          Review
        </h2>
        {!quest && (
          <Card className="text-sm text-muted-foreground">
            This quest was deleted, so individual questions can't be shown.
          </Card>
        )}
        {questions.map((q, i) => {
          const r = attempt.answers[q.id];
          if (!r) return null;
          const good = r.correct && !r.revealed;
          return (
            <details
              key={q.id}
              className="group rounded-2xl border border-border bg-card"
              open={!good}
            >
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-2">
                {r.revealed ? (
                  <Eye className="h-5 w-5 shrink-0 text-muted-foreground" aria-label="Revealed" />
                ) : good ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-success" aria-label="Correct" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-destructive" aria-label="Incorrect" />
                )}
                <span className="min-w-0 flex-1 text-sm font-medium">
                  Q{i + 1}. {q.prompt}
                </span>
                {r.hintsUsed > 0 && (
                  <Pill tone="warning">
                    <Lightbulb className="mr-1 h-3 w-3" aria-hidden /> {r.hintsUsed}
                  </Pill>
                )}
              </summary>
              <div className="space-y-3 px-4 pb-4">
                {q.type !== "fix" && <CodeBlock code={q.code} language={q.language} />}
                <div>
                  <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Your answer
                  </p>
                  <YourAnswer response={r.response} />
                </div>
                <ExpectedAnswer question={q} />
                <p className="text-sm leading-relaxed">{q.explanation}</p>
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}
