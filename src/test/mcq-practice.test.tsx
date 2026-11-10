import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PracticeSession } from "@/features/quizzes/PracticePage";
import { SamplePracticeEntry } from "@/features/quizzes/SamplePracticeEntry";
import { createSampleMcqVersion } from "@/data/sample-mcq";
import {
  RevisionConflict,
  startQuizSession,
  submitPracticeAnswer,
  type QuizSession,
} from "@/domain/quiz-session";
const mocks = vi.hoisted(() => ({
  blocker: vi.fn(),
  navigate: vi.fn(),
  start: vi.fn(),
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
    startSamplePractice: mocks.start,
  }),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.persistence = "durable";
});
function fresh() {
  return startQuizSession("practice", createSampleMcqVersion(), "practice", 1);
}
function select(index: number) {
  fireEvent.click(screen.getAllByRole("radio")[index]!);
}
it("keeps feedback hidden until commit, locks duplicate saves and restores controls afterward", async () => {
  const initial = fresh();
  let resolve!: (session: QuizSession) => void;
  const save = vi.fn(
    () =>
      new Promise<QuizSession>((done) => {
        resolve = done;
      }),
  );
  render(<PracticeSession initial={initial} save={save} reload={vi.fn()} />);
  expect(screen.getByRole("button", { name: "Submit answer" })).toBeDisabled();
  select(1);
  select(0);
  fireEvent.submit(screen.getByRole("button", { name: "Submit answer" }).closest("form")!);
  fireEvent.submit(screen.getByRole("button", { name: "Saving answer…" }).closest("form")!);
  expect(save).toHaveBeenCalledTimes(1);
  expect(save).toHaveBeenCalledWith(initial, "recall", "a");
  expect(screen.queryByText("Correct answer:")).not.toBeInTheDocument();
  expect(screen.getAllByRole("radio")[0]).toBeDisabled();
  await act(async () =>
    resolve(submitPracticeAnswer(initial, 0, "recall", { type: "mcq", optionId: "a" }, 2)),
  );
  expect(screen.getByText("Correct · Answer saved")).toBeVisible();
  expect(screen.getAllByRole("radio")[0]).toBeDisabled();
  expect(mocks.blocker.mock.lastCall?.[0].shouldBlockFn()).toBe(false);
});
it("retains unsaved choice and leave guard after failure and retries safely", async () => {
  const initial = fresh();
  const save = vi
    .fn()
    .mockRejectedValueOnce(new Error("quota"))
    .mockResolvedValueOnce(
      submitPracticeAnswer(initial, 0, "recall", { type: "mcq", optionId: "b" }, 2),
    );
  render(<PracticeSession initial={initial} save={save} reload={vi.fn()} />);
  select(1);
  fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
  await screen.findByText(/Your answer was not saved/);
  expect(screen.getAllByRole("radio")[1]).toBeChecked();
  expect(screen.queryByText("Correct answer:")).not.toBeInTheDocument();
  expect(mocks.blocker.mock.lastCall?.[0].shouldBlockFn()).toBe(true);
  expect(screen.getByRole("button", { name: "Next question" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Retry submission" }));
  await screen.findByText("Not quite · Answer saved");
  expect(save).toHaveBeenCalledTimes(2);
});
it("requires an explicit reload after a revision conflict and confirms discarding the choice", async () => {
  const reload = vi.fn();
  const save = vi.fn().mockRejectedValue(new RevisionConflict());
  render(<PracticeSession initial={fresh()} save={save} reload={reload} />);
  select(0);
  fireEvent.click(screen.getByRole("button", { name: "Submit answer" }));
  await screen.findByText(/This session changed in another tab/);
  expect(screen.getByRole("button", { name: "Retry submission" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Load latest saved answers" }));
  expect(reload).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Load latest" }));
  expect(reload).toHaveBeenCalledOnce();
});
it("resumes at the first unanswered question and preserves readonly prior feedback", () => {
  const saved = submitPracticeAnswer(fresh(), 0, "recall", { type: "mcq", optionId: "a" }, 2);
  render(
    <PracticeSession initial={JSON.parse(JSON.stringify(saved))} save={vi.fn()} reload={vi.fn()} />,
  );
  expect(screen.getByText("Question 2 of 5")).toBeVisible();
  expect(screen.queryByText("Correct answer:")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Previous question" }));
  expect(screen.getByText("Correct · Answer saved")).toBeVisible();
  expect(screen.getAllByRole("radio")[0]).toBeChecked();
});
it("lets all saved answers be reviewed without fabricating final results", () => {
  let session = fresh();
  for (const id of session.questionOrder)
    session = submitPracticeAnswer(
      session,
      session.revision,
      id,
      { type: "mcq", optionId: "a" },
      session.updatedAt + 1,
    );
  render(<PracticeSession initial={session} save={vi.fn()} reload={vi.fn()} />);
  expect(screen.getByText(/All answers are saved/)).toBeVisible();
  expect(screen.getByRole("button", { name: "Next question" })).toBeEnabled();
});
it("only creates the sample on explicit start and navigates after persistence", async () => {
  let resolve!: (session: QuizSession) => void;
  mocks.start.mockImplementation(
    () =>
      new Promise<QuizSession>((done) => {
        resolve = done;
      }),
  );
  render(<SamplePracticeEntry />);
  expect(mocks.start).not.toHaveBeenCalled();
  const button = screen.getByRole("button", { name: "Start or resume Practice" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(mocks.start).toHaveBeenCalledOnce();
  expect(mocks.navigate).not.toHaveBeenCalled();
  await act(async () => resolve(fresh()));
  await waitFor(() =>
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/quiz-practice/$sessionId",
      params: { sessionId: "practice" },
    }),
  );
});
it("does not start a durable quiz in temporary mode", () => {
  mocks.persistence = "temporary";
  render(<SamplePracticeEntry />);
  expect(screen.getByRole("button", { name: "Start or resume Practice" })).toBeDisabled();
  expect(mocks.start).not.toHaveBeenCalled();
});
