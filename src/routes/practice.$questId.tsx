import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/practice/$questId")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/archive", search: { quest: params.questId }, replace: true });
  },
});
