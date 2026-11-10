import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FinishQuiz } from "@/features/quizzes/FinishQuiz";
import { QuizResults } from "@/features/quizzes/QuizResults";
import { QuizHistory } from "@/features/quizzes/QuizHistory";
import { SourceReference } from "@/features/quizzes/SourceReference";
import { createSampleMcqVersion } from "@/data/sample-mcq";
import {
  startQuizSession,
  saveTestDraft,
  finalizeQuizSession,
  RevisionConflict,
  type QuizSession,
} from "@/domain/quiz-session";
const mocks = vi.hoisted(() => ({
  finish: vi.fn(),
  retry: vi.fn(),
  source: vi.fn(),
  list: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@/store/store", () => ({
  useStore: () => ({
    persistence: "durable",
    finishQuiz: mocks.finish,
    retryQuiz: mocks.retry,
    getSourceDocument: mocks.source,
    listQuizSessions: mocks.list,
  }),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  Link: ({
    children,
    to,
    params,
    search,
  }: {
    children: React.ReactNode;
    to: string;
    params?: { documentId?: string; sessionId?: string };
    search?: { page?: number };
  }) => (
    <a
      href={
        to
          .replace("$documentId", params?.documentId ?? "")
          .replace("$sessionId", params?.sessionId ?? "") +
        (search?.page ? `?page=${search.page}` : "")
      }
    >
      {children}
    </a>
  ),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
function draft() {
  return saveTestDraft(
    startQuizSession("s", createSampleMcqVersion(), "test", 1),
    0,
    "recall",
    { type: "mcq", optionId: "a" },
    2,
  );
}
it("confirms skips, waits for a committed result, and prevents duplicate finalization", async () => {
  let resolve!: (value: QuizSession) => void;
  mocks.finish.mockImplementation(
    () =>
      new Promise<QuizSession>((done) => {
        resolve = done;
      }),
  );
  const complete = vi.fn(),
    pending = vi.fn();
  const session = draft();
  render(
    <FinishQuiz
      session={session}
      disabled={false}
      onPending={pending}
      onComplete={complete}
      reload={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Finish Test" }));
  expect(screen.getByText(/4 will be skipped/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Submit quiz" }));
  expect(complete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Finish Test" }));
  fireEvent.click(screen.getByRole("button", { name: "Submit quiz" }));
  expect(mocks.finish).toHaveBeenCalledOnce();
  await act(async () => resolve(finalizeQuizSession(session, session.revision, 3)));
  expect(complete.mock.lastCall?.[0].result.percentage).toBe(20);
  expect(pending.mock.lastCall?.[0]).toBe(false);
});
it("retains saved answers after failed final submission and supports retry", async () => {
  const session = draft(),
    complete = vi.fn();
  mocks.finish
    .mockRejectedValueOnce(new Error("quota"))
    .mockResolvedValueOnce(finalizeQuizSession(session, 1, 3));
  render(
    <FinishQuiz
      session={session}
      disabled={false}
      onPending={vi.fn()}
      onComplete={complete}
      reload={vi.fn()}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Finish Test" }));
  fireEvent.click(screen.getByRole("button", { name: "Submit quiz" }));
  await screen.findByText(/Submission could not be confirmed/);
  expect(complete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Finish Test" }));
  fireEvent.click(screen.getByRole("button", { name: "Submit quiz" }));
  await waitFor(() => expect(complete).toHaveBeenCalledOnce());
});
it("requires reload on finalization conflict and disables submission with unsaved edits", async () => {
  const reload = vi.fn();
  mocks.finish.mockRejectedValue(new RevisionConflict());
  const ui = render(
    <FinishQuiz
      session={draft()}
      disabled={true}
      onPending={vi.fn()}
      onComplete={vi.fn()}
      reload={reload}
    />,
  );
  expect(screen.getByRole("button", { name: "Finish Test" })).toBeDisabled();
  ui.rerender(
    <FinishQuiz
      session={draft()}
      disabled={false}
      onPending={vi.fn()}
      onComplete={vi.fn()}
      reload={reload}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Finish Test" }));
  fireEvent.click(screen.getByRole("button", { name: "Submit quiz" }));
  await screen.findByText(/Answers changed in another tab/);
  expect(screen.getByRole("button", { name: "Finish Test" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Reload saved answers" }));
  expect(reload).toHaveBeenCalledOnce();
});
it("shows recorded totals and explanations, then routes retry only after creation", async () => {
  const session = draft();
  const done = finalizeQuizSession(session, 1, 3);
  mocks.retry.mockResolvedValue({ ...session, id: "retry" });
  render(<QuizResults session={done} />);
  expect(screen.getByText("Quiz results · 20%")).toBeVisible();
  expect(screen.getByText("1 correct · 0 incorrect · 4 skipped · 5 total")).toBeVisible();
  expect(screen.getAllByText("skipped")).toHaveLength(4);
  expect(screen.getByText(done.version.questions[0]!.explanation)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Start or resume another attempt" }));
  await waitFor(() =>
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/quiz-test/$sessionId",
      params: { sessionId: "retry" },
    }),
  );
});
it("shows missing source honestly, retains excerpt, and links an available source to its cited page", async () => {
  const source = { documentId: "pdf", page: 2, excerpt: "Retained original passage" };
  mocks.source.mockResolvedValueOnce(null);
  const missing = render(<SourceReference source={source} />);
  await screen.findByText(/Original PDF page unavailable/);
  expect(screen.getByText(source.excerpt)).toBeVisible();
  expect(screen.queryByRole("link")).toBeNull();
  missing.unmount();
  mocks.source.mockResolvedValueOnce({ name: "source.pdf", pageCount: 3 });
  render(<SourceReference source={source} />);
  expect(await screen.findByRole("link", { name: "Open source.pdf, page 2" })).toHaveAttribute(
    "href",
    "/documents/pdf?page=2",
  );
});
it("retries source-read errors without treating them as missing documents", async () => {
  mocks.source.mockRejectedValueOnce(new Error("storage")).mockResolvedValueOnce(null);
  render(<SourceReference source={{ documentId: "pdf", page: 1, excerpt: "Evidence" }} />);
  await screen.findByText("PDF availability could not be checked.");
  fireEvent.click(screen.getByRole("button", { name: "Retry source check" }));
  await screen.findByText(/Original PDF page unavailable/);
});
it("loads history with completed results and unfinished resume links after a read retry", async () => {
  const pending = draft(),
    done = finalizeQuizSession({ ...pending, id: "done" }, 1, 3);
  mocks.list.mockRejectedValueOnce(new Error("storage")).mockResolvedValueOnce([pending, done]);
  render(<QuizHistory />);
  await screen.findByText("Could not load quiz history.");
  fireEvent.click(screen.getByRole("button", { name: "Retry history" }));
  await screen.findByText("test · 20% · 1/5 correct");
  expect(screen.getByText("test · In progress — resume")).toBeVisible();
  expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toContain(
    "/quiz-results/done",
  );
});
