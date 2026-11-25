import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/study/configure/$lessonId")({
  beforeLoad: () => {
    throw redirect({ to: "/archive", search: {}, replace: true });
  },
});
