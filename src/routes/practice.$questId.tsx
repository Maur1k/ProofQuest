import { useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import { EmptyState, LoadingState, PageHeader, ProgressBar } from "@/components/common";
import { QuestionPractice } from "@/components/QuestionPractice";
import { unfinishedAttempt } from "@/domain/stats";

export const Route = createFileRoute("/practice/$questId")({
  head: () => ({
    meta: [
      { title: "Practice — ProofQuest" },
      {
        name: "description",
        content: "Answer one question at a time: predict, trace, or fix the code.",
      },
      { property: "og:title", content: "Practice — ProofQuest" },
      {
        property: "og:description",
        content: "Answer one question at a time: predict, trace, or fix the code.",
      },
    ],
  }),
  component: Practice,
});

function Practice() {
  const { questId } = Route.useParams();
  const navigate = useNavigate();
  const {
    ready,
    data,
    snapshots,
    busy,
    persistence,
    startAttempt,
    showHint,
    recordAnswer,
    setIndex,
    completeAttempt,
  } = useStore();
  const attempt = unfinishedAttempt(questId, data.attempts);
  const quest =
    (attempt ? snapshots[attempt.id]?.quest : null) ?? data.quests.find((q) => q.id === questId);
  const finishing = useRef(false);
  const autoStarted = useRef<string | null>(null);

  useEffect(() => {
    if (
      ready &&
      !busy &&
      persistence !== "blocked" &&
      quest &&
      quest.questions.length > 0 &&
      !attempt &&
      !finishing.current &&
      autoStarted.current !== quest.id
    ) {
      autoStarted.current = quest.id;
      void startAttempt(quest.id);
    }
  }, [ready, busy, persistence, quest, attempt, startAttempt]);

  if (!ready) return <LoadingState />;
  if (!quest)
    return (
      <div className="pt-10">
        <EmptyState
          title="Quest not found"
          body="It may have been deleted."
          action={
            <Link to="/quests" search={{}} className="text-primary">
              Back to library
            </Link>
          }
        />
      </div>
    );
  if (quest.questions.length === 0)
    return (
      <div className="pt-10">
        <EmptyState
          title="This quest has no questions"
          body="Add at least one question before practicing."
          action={
            <Link to="/quests/$questId/edit" params={{ questId }} className="text-primary">
              Edit quest
            </Link>
          }
        />
      </div>
    );
  if (!attempt)
    return (
      <EmptyState
        title="Start practice"
        body="Your answers will be saved after each successful write."
        action={
          <button
            className="min-h-11 text-primary"
            disabled={busy || persistence === "blocked"}
            onClick={() => void startAttempt(quest.id)}
          >
            Start or retry
          </button>
        }
      />
    );

  const total = quest.questions.length;
  const index = Math.min(attempt.currentIndex, total - 1);
  const question = quest.questions[index];
  if (!question) return <LoadingState />;
  const record = attempt.answers[question.id];
  const hintsShown = record ? record.hintsUsed : (attempt.hintsShown[question.id] ?? 0);
  const answeredCount = quest.questions.filter((q) => attempt.answers[q.id]).length;

  const next = async () => {
    if (busy || finishing.current) return;
    if (index >= total - 1) {
      finishing.current = true;
      if (!(await completeAttempt(attempt.id))) {
        finishing.current = false;
        return;
      }
      navigate({ to: "/results/$questId", params: { questId }, search: { attempt: attempt.id } });
    } else {
      if (await setIndex(attempt.id, index + 1)) window.scrollTo({ top: 0 });
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={quest.title}
        subtitle={`Question ${index + 1} of ${total}`}
        back={{ to: "/quests", label: "Save & exit" }}
      />
      <div className="mb-5">
        <ProgressBar value={answeredCount / total} label="Quest progress" />
      </div>
      <fieldset disabled={busy} className="min-w-0">
        <QuestionPractice
          key={`${attempt.id}-${question.id}`}
          question={question}
          record={record}
          hintsShown={hintsShown}
          isLast={index >= total - 1}
          onHint={(count) => showHint(attempt.id, question.id, count)}
          onSubmit={({ response, correct, revealed }) =>
            recordAnswer(attempt.id, {
              questionId: question.id,
              response,
              correct,
              revealed,
              hintsUsed: hintsShown,
            })
          }
          onNext={next}
        />
      </fieldset>
    </div>
  );
}
