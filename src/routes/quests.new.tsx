import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/quests/new")({
  beforeLoad: () => {
    throw redirect({ to: "/archive", search: {}, replace: true });
  },
});
