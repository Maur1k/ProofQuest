import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/study/ready")({
  beforeLoad: () => {
    throw redirect({ to: "/archive", search: {}, replace: true });
  },
});
