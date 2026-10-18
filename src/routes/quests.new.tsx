import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import { LoadingState } from "@/components/common";
import { QuestEditor, blankQuestion } from "@/components/QuestEditor";
import { getSubject } from "@/domain/subjects";
import { SUBJECT_IDS, type QuestDraft, type SubjectId } from "@/domain/types";

export const Route = createFileRoute("/quests/new")({
  validateSearch: (s: Record<string, unknown>): { subject?: SubjectId; topic?: string } => ({
    subject: (SUBJECT_IDS as readonly unknown[]).includes(s.subject) ? (s.subject as SubjectId) : undefined,
    topic: typeof s.topic === "string" && s.topic ? s.topic.slice(0, 40) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create quest — ProofQuest" },
      { name: "description", content: "Write your own predict-output, trace and fix-the-bug questions." },
      { property: "og:title", content: "Create quest — ProofQuest" },
      { property: "og:description", content: "Write your own programming practice questions." },
    ],
  }),
  component: NewQuest,
});

function NewQuest() {
  const { ready, createQuest } = useStore();
  const { subject, topic } = Route.useSearch();
  if (!ready) return <LoadingState />;
  const subjectId = subject ?? "fundamentals";
  const initial: QuestDraft = {
    title: "",
    subjectId,
    topic: topic ?? getSubject(subjectId)?.topics[0] ?? "",
    difficulty: "easy",
    questions: [blankQuestion("predict")],
  };
  return <QuestEditor key={`${subjectId}-${topic ?? ""}`} heading="New quest" initial={initial} onSave={createQuest} />;
}
