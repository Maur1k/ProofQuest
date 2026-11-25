import { afterEach, beforeEach, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { webcrypto } from "node:crypto";
import { NewStudy } from "@/features/new-study/NewStudy";
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  add: vi.fn(),
  bundle: vi.fn(),
  inspect: vi.fn(),
  prepare: vi.fn(),
  preflight: vi.fn(),
  list: vi.fn(),
  save: vi.fn(),
  block: vi.fn(),
  materials: vi.fn(),
  start: vi.fn(),
  navigate: vi.fn(),
}));
vi.mock("@/store/store", () => ({
  useStore: () => ({
    ready: true,
    persistence: "durable",
    listSourceData: mocks.list,
    saveSourceRevision: mocks.save,
    listSourceMaterials: mocks.materials,
    startSavedQuiz: mocks.start,
  }),
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => mocks.navigate,
  useBlocker: (options: unknown) => {
    mocks.block(options);
    return {};
  },
}));
vi.mock("@/features/documents/preflight", () => ({ inspectPdfSelection: mocks.preflight }));
vi.mock("@/features/documents/service", () => ({
  inspectDocument: mocks.inspect,
  prepareDocument: mocks.prepare,
  documentStorage: (work: (repo: unknown) => unknown) =>
    work({ getDocument: mocks.get, addDocument: mocks.add, getDocumentBundle: mocks.bundle }),
}));
vi.mock("@/features/documents/PagePreview", () => ({ PagePreview: () => null }));
beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  mocks.list.mockResolvedValue({ sources: [], revisions: [] });
  mocks.materials.mockResolvedValue([]);
  mocks.save.mockImplementation(async (source) => ({
    id: source.sourceId,
    revision: 0,
    currentRevisionId: source.id,
    title: source.title,
    kind: source.kind,
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        enabled: false,
        provider: "",
        retention: "",
        maxInputBytes: 3500,
        guestDailyLimit: 3,
      }),
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});
function enter() {
  render(<NewStudy />);
  fireEvent.click(screen.getByRole("radio", { name: "Paste text" }));
  fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Biology" } });
  fireEvent.change(screen.getByLabelText("Source text"), {
    target: {
      value: "Plants absorb sunlight to make food. Water supports essential biological processes.",
    },
  });
}
it.each(["Flashcards", "Quiz", "Exam", "Reviewer"])(
  "saves locally then opens %s review with useful unavailable state",
  async (mode) => {
    enter();
    expect(screen.getByText(/Continue saves your source/)).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Choose study mode" });
    expect(mocks.save).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("radio", { name: new RegExp(mode) }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Review and create" });
    await screen.findByText(
      "AI generation is currently unavailable. Your material is saved in Library.",
    );
    expect(screen.getByRole("link", { name: "Open Library" })).toHaveAttribute("href", "/library");
    expect(screen.queryByRole("button", { name: "Start a new request" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("radio", { name: new RegExp(mode) })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("Source text")).toHaveValue(
      "Plants absorb sunlight to make food. Water supports essential biological processes.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "Choose study mode" });
    expect(mocks.save).toHaveBeenCalledOnce();
  },
);
it("keeps the draft and first step when saving fails", async () => {
  mocks.save.mockRejectedValueOnce(new Error("quota"));
  enter();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("Title")).toHaveValue("Biology");
  expect(screen.getByRole("heading", { name: "Add material" })).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Retry saving" }));
  await screen.findByRole("heading", { name: "Choose study mode" });
  expect(mocks.save).toHaveBeenCalledTimes(2);
});
it("asks before discarding a typed draft when switching input type", () => {
  enter();
  fireEvent.click(screen.getByRole("radio", { name: "Upload PDF" }));
  expect(screen.getByRole("alertdialog")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Keep working" }));
  expect(screen.getByLabelText("Title")).toHaveValue("Biology");
});

it("retries a source save after PDF commit without duplicating the PDF", async () => {
  const document = {
    id: "pdf",
    name: "Biology.pdf",
    pageCount: 1,
    extractedPages: [1],
    createdAt: 1,
    checksum: "a".repeat(64),
    blob: new Blob(["pdf"]),
  };
  mocks.preflight.mockResolvedValue({ ok: true });
  mocks.inspect.mockResolvedValue(1);
  mocks.prepare.mockResolvedValue({
    document,
    pages: [
      {
        documentId: "pdf",
        page: 1,
        text: "Plants absorb sunlight to make food. Water supports plant growth.",
        warnings: [],
      },
    ],
  });
  mocks.get.mockResolvedValueOnce(undefined).mockResolvedValue(document);
  mocks.add.mockResolvedValue(undefined);
  mocks.save.mockRejectedValueOnce(new Error("source quota"));
  render(<NewStudy />);
  fireEvent.change(screen.getByLabelText("Choose PDF or drop one here"), {
    target: { files: [new File(["pdf"], "Biology.pdf")] },
  });
  await screen.findByLabelText("Pages to extract (for example 1-3, 5)");
  fireEvent.click(screen.getByText("Extract selected pages"));
  await screen.findByText("Review extraction");
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("alert");
  expect(mocks.add).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByRole("button", { name: "Retry saving" }));
  await screen.findByRole("heading", { name: "Choose study mode" });
  expect(mocks.add).toHaveBeenCalledOnce();
  expect(mocks.save).toHaveBeenCalledTimes(2);
});
it("offers the same saved questions for Quiz and Exam without an AI call", async () => {
  mocks.materials.mockImplementation(async () => {
    const source = mocks.save.mock.calls[0]?.[0];
    return source
      ? [
          {
            id: "matching",
            generation: { provider: "groq" },
            request: { source },
            output: { format: "quiz" },
          },
          {
            id: "old",
            generation: { provider: "groq" },
            request: { source: { ...source, id: "older" } },
            output: { format: "quiz" },
          },
        ]
      : [];
  });
  mocks.start.mockResolvedValue({ id: "session" });
  enter();
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("heading", { name: "Choose study mode" });
  fireEvent.click(screen.getByRole("radio", { name: /Quiz/ }));
  fireEvent.click(await screen.findByRole("button", { name: "Open saved material" }));
  await waitFor(() => expect(mocks.start).toHaveBeenLastCalledWith("matching", "practice"));
  fireEvent.click(screen.getByRole("radio", { name: /Exam/ }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Open saved material" })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Open saved material" }));
  await waitFor(() => expect(mocks.start).toHaveBeenLastCalledWith("matching", "test"));
  expect(fetch).not.toHaveBeenCalled();
});
it("reports a missing original PDF instead of advancing an empty source", async () => {
  mocks.bundle.mockResolvedValue(undefined);
  render(<NewStudy documentId="gone" />);
  await screen.findByText(/Original PDF is unavailable/);
  expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  expect(mocks.save).not.toHaveBeenCalled();
});

it("reopens an existing PDF source revision without saving a duplicate", async () => {
  const source = {
    kind: "pdf",
    id: "pdf-revision",
    sourceId: "pdf:doc",
    documentId: "doc",
    documentChecksum: "a".repeat(64),
    title: "Existing PDF",
    createdAt: 1,
    contentHash: "a".repeat(64),
    segments: [
      {
        id: "page-1",
        documentId: "doc",
        page: 1,
        label: "Page 1",
        text: "Plants absorb sunlight to make food. Water supports plant growth.",
      },
    ],
  };
  mocks.list.mockResolvedValue({
    sources: [
      {
        id: source.sourceId,
        currentRevisionId: source.id,
        title: source.title,
        kind: "pdf",
        revision: 0,
      },
    ],
    revisions: [source],
  });
  mocks.bundle.mockResolvedValue(undefined);
  render(<NewStudy documentId="doc" />);
  await screen.findByText(/Retained extracted text is still available/);
  await waitFor(() => expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await screen.findByRole("heading", { name: "Choose study mode" });
  expect(mocks.save).not.toHaveBeenCalled();
  expect(mocks.add).not.toHaveBeenCalled();
});
