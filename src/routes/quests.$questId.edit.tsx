import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/store/store";
import { EmptyState, LoadingState } from "@/components/common";
import { QuestEditor } from "@/components/QuestEditor";

export const Route = createFileRoute("/quests/$questId/edit")({
  head: () => ({
    meta: [
      { title: "Edit quest — ProofQuest" },
      { name: "description", content: "Edit a practice quest's details and questions." },
      { property: "og:title", content: "Edit quest — ProofQuest" },
      { property: "og:description", content: "Edit a practice quest's details and questions." },
    ],
  }),
  component: EditQuest,
});

function EditQuest() {
  const { questId } = Route.useParams();
  const { ready, data, updateQuest } = useStore();
  if (!ready) return <LoadingState />;
  const quest = data.quests.find((q) => q.id === questId);
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
  const { id, createdAt, updatedAt, ...draft } = quest;
  void createdAt;
  void updatedAt;
  return (
    <QuestEditor
      key={id}
      heading="Edit quest"
      initial={draft}
      onSave={(d) => {
        updateQuest(id, d);
        return id;
      }}
    />
  );
}
