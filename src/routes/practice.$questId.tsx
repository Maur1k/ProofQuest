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
  const { ready, data, startAttempt, showHint, recordAnswer, setIndex, completeAttempt } =
    useStore();
  const quest = data.quests.find((q) => q.id === questId);
  const attempt = unfinishedAttempt(questId, data.attempts);
  const finishing = useRef(false);

  useEffect(() => {
    if (ready && quest && quest.questions.length > 0 && !attempt && !finishing.current)
      startAttempt(quest.id);
  }, [ready, quest, attempt, startAttempt]);

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
  if (!attempt) return <LoadingState />;

  const total = quest.questions.length;
  const index = Math.min(attempt.currentIndex, total - 1);
  const question = quest.questions[index];
  if (!question) return <LoadingState />;
  const record = attempt.answers[question.id];
  const hintsShown = record ? record.hintsUsed : (attempt.hintsShown[question.id] ?? 0);
  const answeredCount = quest.questions.filter((q) => attempt.answers[q.id]).length;

  const next = () => {
    if (index >= total - 1) {
      finishing.current = true;
      completeAttempt(attempt.id);
      navigate({ to: "/results/$questId", params: { questId }, search: { attempt: attempt.id } });
    } else {
      setIndex(attempt.id, index + 1);
      window.scrollTo({ top: 0 });
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
    </div>
  );
}
