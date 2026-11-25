import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/results/$questId")({
  validateSearch: (s: Record<string, unknown>) => ({
    attempt: typeof s["attempt"] === "string" ? s["attempt"] : undefined,
  }),
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: "/archive",
      search: { quest: params.questId, ...(search.attempt ? { attempt: search.attempt } : {}) },
      replace: true,
    });
  },
});
