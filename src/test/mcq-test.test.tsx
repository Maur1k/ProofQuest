import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TestSession } from "@/features/quizzes/TestSession";
import { TestPage } from "@/features/quizzes/TestPage";
import { SamplePracticeEntry } from "@/features/quizzes/SamplePracticeEntry";
import { createSampleMcqVersion } from "@/data/sample-mcq";
import { presentTestDraft } from "@/domain/test-presentation";
import {
  startQuizSession,
  saveTestDraft,
  finalizeQuizSession,
  RevisionConflict,
  type QuizSession,
} from "@/domain/quiz-session";
const mocks = vi.hoisted(() => ({
  blocker: vi.fn(),
  navigate: vi.fn(),
  start: vi.fn(),
  load: vi.fn(),
  save: vi.fn(),
  persistence: "durable",
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useBlocker: (options: unknown) => {
    mocks.blocker(options);
    return {};
  },
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/store/store", () => ({
  useStore: () => ({
    persistence: mocks.persistence,
    busy: false,
    startSampleTest: mocks.start,
    loadQuizSession: mocks.load,
    saveTestChoice: mocks.save,
  }),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  mocks.persistence = "durable";
});
function fresh() {
  return startQuizSession("test", createSampleMcqVersion(), "test", 1);
}
function select(index: number) {
  fireEvent.click(screen.getAllByRole("radio")[index]!);
}
function save(session: QuizSession, id: string, option: string | null) {
  return Promise.resolve(
    saveTestDraft(
      session,
      session.revision,
      id,
      { type: "mcq", optionId: option },
      session.updatedAt + 1,
    ),
  );
}
it("blocks duplicate saves and navigation while committing, without exposing solutions", async () => {
  const initial = fresh();
  let resolve!: (value: QuizSession) => void;
  const pending = vi.fn(
    () =>
      new Promise<QuizSession>((done) => {
        resolve = done;
      }),
  );
  render(<TestSession initial={initial} save={pending} reload={vi.fn()} />);
  select(0);
  const form = screen.getByRole("button", { name: "Save answer" }).closest("form")!;
  fireEvent.submit(form);
  fireEvent.submit(form);
  expect(pending).toHaveBeenCalledOnce();
  expect(screen.getByRole("button", { name: "Next question" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Clear choice" })).toBeDisabled();
  expect(screen.getByText("0 of 5 answers saved")).toBeVisible();
  await act(async () => resolve(await save(initial, "recall", "a")));
  expect(screen.getByText("1 of 5 answers saved")).toBeVisible();
  expect(screen.getAllByRole("radio")[0]).toBeEnabled();
  expect(screen.queryByText("Correct answer:")).not.toBeInTheDocument();
  expect(screen.queryByText(initial.version.questions[0]!.explanation)).not.toBeInTheDocument();
  expect(mocks.blocker.mock.lastCall?.[0].shouldBlockFn()).toBe(false);
});
it("retains failed edits, supports retry and explicit discard, and saves clearing", async () => {
  const saver = vi.fn().mockRejectedValueOnce(new Error("quota")).mockImplementation(save);
  render(<TestSession initial={fresh()} save={saver} reload={vi.fn()} />);
  select(0);
  fireEvent.click(screen.getByRole("button", { name: "Save answer" }));
  await screen.findByText(/Your changes were not saved/);
  expect(screen.getAllByRole("radio")[0]).toBeChecked();
  expect(mocks.blocker.mock.lastCall?.[0].shouldBlockFn()).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Retry saving" }));
  await screen.findByText("Answer saved in this browser. You can still change it.");
  select(1);
  fireEvent.click(screen.getByRole("button", { name: "Discard changes" }));
  expect(screen.getAllByRole("radio")[0]).toBeChecked();
  select(1);
  fireEvent.click(screen.getByRole("button", { name: "Save answer" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "Save answer" })).toBeDisabled());
  expect(screen.getAllByRole("radio")[1]).toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: "Clear choice" }));
  expect(screen.getAllByRole("radio").every((input) => !(input as HTMLInputElement).checked)).toBe(
    true,
  );
  expect(screen.getByText("1 of 5 answers saved")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Save answer" }));
  await screen.findByText("0 of 5 answers saved");
  expect(saver.mock.lastCall?.[2]).toBeNull();
});
it("requires confirmed reload after a revision conflict", async () => {
  const reload = vi.fn();
  render(
    <TestSession
      initial={fresh()}
      save={vi.fn().mockRejectedValue(new RevisionConflict())}
      reload={reload}
    />,
  );
  select(0);
  fireEvent.click(screen.getByRole("button", { name: "Save answer" }));
  await screen.findByText(/This Test changed in another tab/);
  expect(screen.getByRole("button", { name: "Retry saving" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Load latest saved answers" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(reload).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Load latest saved answers" }));
  fireEvent.click(screen.getByRole("button", { name: "Load latest" }));
  expect(reload).toHaveBeenCalledOnce();
});
it("resumes at an unanswered or cleared question, supports saved-order navigation and keeps all drafts unsubmitted", async () => {
  let session = await save(fresh(), "recall", "a");
  const first = render(<TestSession initial={session} save={save} reload={vi.fn()} />);
  expect(screen.getByText("Question 2 of 5")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Question 1, saved" }));
  expect(screen.getAllByRole("radio")[0]).toBeChecked();
  first.unmount();
  for (const id of session.questionOrder) session = await save(session, id, "a");
  const full = render(<TestSession initial={session} save={save} reload={vi.fn()} />);
  expect(screen.getByText(/This Test has not been submitted/)).toBeVisible();
  expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  full.unmount();
  session = await save(session, "evidence", null);
  session.questionOrder.reverse();
  const projected = presentTestDraft(session);
  expect(projected.answered).toBe(4);
  expect(projected.questions[projected.resumeIndex]!.id).toBe("evidence");
  expect(() => presentTestDraft(finalizeQuizSession(session, session.revision, 99))).toThrow();
});
it("loads saved answers after a failed read, opens completed results and rejects wrong-mode sessions", async () => {
  mocks.load.mockRejectedValueOnce(new Error("unavailable")).mockResolvedValueOnce(fresh());
  const page = render(<TestPage sessionId="test" />);
  await screen.findByText(/Could not load saved Test answers/);
  fireEvent.click(screen.getByRole("button", { name: "Retry loading" }));
  await screen.findByText("Question 1 of 5");
  page.unmount();
  mocks.load.mockResolvedValueOnce(finalizeQuizSession(fresh(), 0, 2));
  const completed = render(<TestPage sessionId="test" />);
  await screen.findByText("Quiz results · 0%");
  expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  completed.unmount();
  mocks.load.mockResolvedValueOnce(startQuizSession("p", createSampleMcqVersion(), "practice", 1));
  render(<TestPage sessionId="p" />);
  await screen.findByText(/MCQ Test is unavailable/);
});
it("gates Test loading in temporary mode", () => {
  mocks.persistence = "temporary";
  render(<TestPage sessionId="test" />);
  expect(screen.getByText(/Saved browser storage is required/)).toBeVisible();
  expect(mocks.load).not.toHaveBeenCalled();
});
it("starts Test only from the explicit entry and navigates after the session commits", async () => {
  let resolve!: (session: QuizSession) => void;
  mocks.start.mockImplementation(
    () =>
      new Promise<QuizSession>((done) => {
        resolve = done;
      }),
  );
  render(<SamplePracticeEntry />);
  expect(mocks.start).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Start or resume Test" }));
  expect(mocks.navigate).not.toHaveBeenCalled();
  await act(async () => resolve(fresh()));
  expect(mocks.navigate).toHaveBeenCalledWith({
    to: "/quiz-test/$sessionId",
    params: { sessionId: "test" },
  });
});
