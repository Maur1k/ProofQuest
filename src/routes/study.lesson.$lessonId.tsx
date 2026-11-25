import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/study/lesson/$lessonId")({
  beforeLoad: () => {
    throw redirect({ to: "/archive", search: {}, replace: true });
  },
});
