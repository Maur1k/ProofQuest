import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { UnifiedLibrary } from "@/features/library/UnifiedLibrary";
const mocks = vi.hoisted(() => ({
  data: vi.fn(),
  docs: vi.fn(),
  materials: vi.fn(),
  legacy: vi.fn(),
  quizzes: vi.fn(),
  sessions: vi.fn(),
  start: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@/store/store", () => ({
  useStore: () => ({
    ready: true,
    persistence: "durable",
    listSourceData: mocks.data,
    listSourceMaterials: mocks.materials,
    listStudyMaterials: mocks.legacy,
    listSavedQuizzes: mocks.quizzes,
    listQuizSessions: mocks.sessions,
    startSavedQuiz: mocks.start,
  }),
}));
vi.mock("@/features/documents/service", () => ({ documentStorage: () => mocks.docs() }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));
afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  mocks.data.mockResolvedValue({ sources: [], revisions: [] });
  for (const fn of [mocks.docs, mocks.materials, mocks.legacy, mocks.quizzes, mocks.sessions])
    fn.mockResolvedValue([]);
});
it("shows an empty Library without sample creation paths", async () => {
  render(<UnifiedLibrary />);
  expect(await screen.findByText(/Your Library is empty/)).toBeInTheDocument();
  expect(screen.queryByText(/sample/i)).toBeNull();
});
it("opens source sections and reports missing originals without deleting retained text", async () => {
  mocks.data.mockResolvedValue({
    sources: [{ id: "pdf-source", kind: "pdf", title: "Biology", currentRevisionId: "r" }],
    revisions: [],
  });
  render(<UnifiedLibrary sourceKey="source:pdf-source" />);
  expect(await screen.findByRole("heading", { name: "Biology" })).toBeInTheDocument();
  expect(screen.getByText(/Original PDF is unavailable/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Results" }));
  expect(screen.getByText(/No saved attempts/)).toBeInTheDocument();
});
it("allows retrying a failed read", async () => {
  mocks.docs.mockRejectedValueOnce(new Error("storage"));
  render(<UnifiedLibrary />);
  fireEvent.click(await screen.findByRole("button", { name: "Retry loading Library" }));
  expect(await screen.findByText(/Your Library is empty/)).toBeInTheDocument();
});
