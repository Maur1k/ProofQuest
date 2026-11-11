import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { GenerateQuiz } from "@/features/generation/GenerateQuiz";
import { createSampleMcqVersion } from "@/data/sample-mcq";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  save: vi.fn(),
  navigate: vi.fn(),
  block: vi.fn(),
}));
vi.mock("@/store/store", () => ({ useStore: () => ({ commitGeneratedQuiz: mocks.save }) }));
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
  await screen.findByText(/Quiz could not be saved/);
  expect(mocks.request.mock.calls[0]![0]).toEqual({
    documentId: "doc",
    questionCount: 5,
    pages: [{ page: 1, text }],
  });
  expect(JSON.stringify(mocks.request.mock.calls[0]![0])).not.toContain("UNSELECTED_SENTINEL");
  expect(JSON.stringify(mocks.request.mock.calls[0]![0])).not.toContain("private.pdf");
  fireEvent.click(screen.getByRole("button", { name: "Retry saving quiz" }));
  await waitFor(() =>
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/quiz-test/$sessionId",
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
  await screen.findByRole("button", { name: "Retry saving quiz" });
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.navigate).not.toHaveBeenCalled();
});
