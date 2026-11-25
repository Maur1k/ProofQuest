import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/quests/$questId/edit")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/archive", search: { quest: params.questId }, replace: true });
  },
});
