import { createFileRoute, redirect } from "@tanstack/react-router";

// Preserve old bookmarks without displaying prototype credential forms.
export const Route = createFileRoute("/welcome")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});
