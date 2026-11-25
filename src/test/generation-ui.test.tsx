import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GenerateQuiz } from "@/features/generation/GenerateQuiz";
import { createSampleMcqVersion } from "@/data/sample-mcq";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  save: vi.fn(),
  navigate: vi.fn(),
  block: vi.fn(),
  studyRequest: vi.fn(),
  studySave: vi.fn(),
}));
vi.mock("@/store/store", () => ({
  useStore: () => ({ commitGeneratedQuiz: mocks.save, saveStudyMaterial: mocks.studySave }),
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  useBlocker: (options: unknown) => {
    mocks.block(options);
    return {};
  },
}));
vi.mock("@/features/generation/client", async (original) => ({
  ...(await original<typeof import("@/features/generation/client")>()),
  requestGeneratedQuiz: mocks.request,
  requestGeneratedStudy: mocks.studyRequest,
}));
const text =
  "Active recall means retrieving information from memory. The original source contains the evidence.";
const doc = {
  id: "doc",
  name: "private.pdf",
  pageCount: 2,
  checksum: "a".repeat(64),
  createdAt: 1,
  blob: new Blob(["pdf"]),
};
const pages = [
  { documentId: "doc", page: 1, text, warnings: [] },
  { documentId: "doc", page: 2, text: "UNSELECTED_SENTINEL " + text, warnings: [] },
];
function setup(enabled = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        enabled,
        provider: "Test provider",
        retention: "Results expire after one day.",
        maxInputBytes: 256000,
        guestDailyLimit: 3,
      }),
    }),
  );
  return render(<GenerateQuiz document={doc} pages={pages} />);
}
afterEach(() => {
  cleanup();
  sessionStorage.clear();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
});
it("keeps generation disabled when the host has no configured service", async () => {
  setup(false);
  await screen.findByText(/AI generation is not configured/);
  expect(mocks.request).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "Generate five questions" })).not.toBeInTheDocument();
});
it("requires explicit consent and sends only selected text, preserving a returned quiz across save retry", async () => {
  mocks.request.mockResolvedValue(createSampleMcqVersion());
  mocks.save.mockRejectedValueOnce(new Error("quota")).mockResolvedValueOnce({ id: "session" });
  setup();
  const button = await screen.findByRole("button", { name: "Generate five questions" });
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: /Page 1/ }));
  expect(button).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: /I have permission/ }));
  fireEvent.click(button);
  await screen.findByText(/Study material could not be saved/);
  expect(mocks.request.mock.calls[0]![0]).toEqual({
    documentId: "doc",
    questionCount: 5,
    pages: [{ page: 1, text }],
  });
  expect(JSON.stringify(mocks.request.mock.calls[0]![0])).not.toContain("UNSELECTED_SENTINEL");
  expect(JSON.stringify(mocks.request.mock.calls[0]![0])).not.toContain("private.pdf");
  fireEvent.click(screen.getByRole("button", { name: "Retry saving material" }));
  await waitFor(() =>
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/quiz-practice/$sessionId",
      params: { sessionId: "session" },
    }),
  );
  expect(mocks.request).toHaveBeenCalledOnce();
});
it("does not save a late result after cancellation", async () => {
  let resolve!: (value: unknown) => void;
  mocks.request.mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  setup();
  await screen.findByRole("button", { name: "Generate five questions" });
  fireEvent.click(screen.getByRole("checkbox", { name: /Page 1/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I have permission/ }));
  fireEvent.click(screen.getByRole("button", { name: "Generate five questions" }));
  expect(mocks.block.mock.lastCall?.[0].shouldBlockFn()).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Cancel generation" }));
  resolve(createSampleMcqVersion());
  await screen.findByRole("button", { name: "Retry saving material" });
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.navigate).not.toHaveBeenCalled();
});

it("shows four selectable formats even while generation is unavailable", async () => {
  setup(false);
  await screen.findByText(/AI generation is not configured/);
  const radios = screen.getAllByRole("radio");
  expect(radios).toHaveLength(4);
  for (const radio of radios) {
    fireEvent.click(radio);
    expect(radio).toBeChecked();
  }
  expect(mocks.request).not.toHaveBeenCalled();
  expect(mocks.studyRequest).not.toHaveBeenCalled();
});
it("maps Exam to Test mode without changing the five-question request", async () => {
  mocks.request.mockResolvedValue(createSampleMcqVersion());
  mocks.save.mockResolvedValue({ id: "exam" });
  setup();
  await screen.findByRole("button", { name: "Generate five questions" });
  fireEvent.click(screen.getByRole("radio", { name: /^Exam/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /Page 1/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I have permission/ }));
  fireEvent.click(screen.getByRole("button", { name: "Generate five questions" }));
  await waitFor(() => expect(mocks.save.mock.calls[0]?.[3]).toBe("test"));
  expect(mocks.studyRequest).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/quiz-test/$sessionId",
      params: { sessionId: "exam" },
    }),
  );
});
it.each(["flashcards", "reviewer"])(
  "sends only the selected %s format and retries saving without generating again",
  async (format) => {
    mocks.studyRequest.mockResolvedValue({ id: "material", format });
    mocks.studySave
      .mockRejectedValueOnce(new Error("quota"))
      .mockResolvedValueOnce({ id: "material" });
    setup();
    await screen.findByRole("button", { name: "Generate five questions" });
    fireEvent.click(screen.getByRole("checkbox", { name: /Page 1/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /I have permission/ }));
    fireEvent.click(
      screen.getByRole("radio", { name: format === "flashcards" ? /^Flashcards/ : /^Reviewer/ }),
    );
    const button = screen.getByRole("button", { name: `Generate ${format}` });
    expect(button).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I have permission/ }));
    fireEvent.click(button);
    await screen.findByText(/Study material could not be saved/);
    expect(mocks.studyRequest.mock.calls[0]![0]).toEqual({
      documentId: "doc",
      format,
      pages: [{ page: 1, text }],
    });
    expect(mocks.request).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Retry saving material" }));
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/materials", search: { id: "material" } }),
    );
    expect(mocks.studyRequest).toHaveBeenCalledOnce();
  },
);

it("prevents unaccepted formats from generating while allowing an accepted format to be selected", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        enabled: true,
        allowedFormats: ["reviewer"],
        provider: "Test provider",
        retention: "One day",
        maxInputBytes: 3500,
        guestDailyLimit: 3,
      }),
    }),
  );
  render(<GenerateQuiz document={doc} pages={pages} />);
  await screen.findByText(/This format is awaiting validation/);
  expect(screen.getByRole("radio", { name: /^Quiz/ })).toBeDisabled();
  expect(screen.getByRole("radio", { name: /^Exam/ })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: /Page 1/ }));
  fireEvent.click(screen.getByRole("checkbox", { name: /I have permission/ }));
  expect(screen.getByRole("button", { name: "Generate five questions" })).toBeDisabled();
  fireEvent.click(screen.getByRole("radio", { name: /^Reviewer/ }));
  expect(screen.queryByText(/This format is awaiting validation/)).not.toBeInTheDocument();
  expect(mocks.request).not.toHaveBeenCalled();
  expect(mocks.studyRequest).not.toHaveBeenCalled();
});

it("retains the old endpoint only for existing request recovery", async () => {
  setup(false).unmount();
  render(<GenerateQuiz document={doc} pages={pages} recoveryOnly />);
  await waitFor(() =>
    expect(screen.queryByRole("heading", { name: "Recover an unfinished PDF request" })).toBeNull(),
  );
  expect(screen.queryByRole("button", { name: /Generate/ })).toBeNull();
  expect(mocks.request).not.toHaveBeenCalled();
});
