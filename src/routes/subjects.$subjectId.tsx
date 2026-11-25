import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/subjects/$subjectId")({
  beforeLoad: () => {
    throw redirect({ to: "/archive", search: {}, replace: true });
  },
});
