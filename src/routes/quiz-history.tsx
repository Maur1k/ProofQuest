import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/quiz-history")({
  beforeLoad: () => {
    throw redirect({ to: "/library", search: {}, replace: true });
  },
});
