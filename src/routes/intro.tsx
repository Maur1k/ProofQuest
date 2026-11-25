import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/intro")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
