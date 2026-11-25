import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { Archive } from "@/features/archive/Archive";
import { AppShell } from "@/components/AppShell";
import { createSampleQuests } from "@/data/sample-quests";
import { createSampleMcqVersion } from "@/data/sample-mcq";
import { startQuizSession } from "@/domain/quiz-session";
import { isArchivedQuizId } from "@/domain/archive";
const mocks = vi.hoisted(() => ({ store: {} as Record<string, unknown> }));
vi.mock("@/store/store", () => ({ useStore: () => mocks.store }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children: ReactNode;
    to: string;
    "aria-label"?: string;
  }) => (
    <a href={to} aria-label={props["aria-label"]}>
      {children}
    </a>
  ),
}));
afterEach(cleanup);
it("limits the main navigation to New study and Library with separate Settings", () => {
  mocks.store = { persistence: "durable" };
  render(
    <AppShell>
      <p>Content</p>
    </AppShell>,
  );
  const links = within(screen.getByRole("navigation", { name: "Primary" })).getAllByRole("link");
  expect(links.map((a) => a.textContent)).toEqual(["New study", "Library"]);
  expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings");
});
it("keeps orphaned answers and archived unfinished sample sessions read-only", async () => {
  const quest = createSampleQuests()[0]!;
  const sample = createSampleMcqVersion();
  mocks.store = {
    ready: true,
    persistence: "durable",
    data: {
      quests: [quest],
      attempts: [
        {
          id: "orphan",
          questId: "gone",
          questTitle: "Deleted Quest",
          completedAt: null,
          answers: {
            a: {
              questionId: "a",
              response: { type: "predict", output: "saved response" },
              correct: true,
              hintsUsed: 0,
              revealed: false,
            },
          },
        },
      ],
    },
    snapshots: { orphan: { provenance: "missing", quest: null } },
    listSourceData: vi.fn().mockResolvedValue({ sources: [], revisions: [] }),
    listSourceMaterials: vi.fn().mockResolvedValue([]),
    listSavedQuizzes: vi.fn().mockResolvedValue([sample]),
    listQuizSessions: vi
      .fn()
      .mockResolvedValue([startQuizSession("sample-session", sample, "test", 1)]),
  };
  render(<Archive selected={{ attempt: "orphan", session: "sample-session" }} />);
  await screen.findByText(/Exam · Unfinished/);
  expect(screen.getByText("saved response")).toBeInTheDocument();
  expect(screen.getByText(/Recorded outcome: 1 correct out of 1 answered/)).toBeInTheDocument();
  expect(screen.getByText(/Original questions unavailable/)).toBeInTheDocument();
  expect(screen.queryByRole("button")).toBeNull();
  expect(screen.queryByRole("radio")).toBeNull();
  expect(screen.getByRole("link", { name: /Export everything/ })).toHaveAttribute(
    "href",
    "/settings",
  );
});
it("does not classify real saved quizzes by their titles or ordinary IDs", () => {
  expect(isArchivedQuizId("real-water-cycle")).toBe(false);
  expect(isArchivedQuizId("source-generated-real")).toBe(false);
  expect(isArchivedQuizId("source-sample-one")).toBe(true);
  expect(isArchivedQuizId(createSampleMcqVersion().id)).toBe(true);
});
