import { afterEach, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { DocumentReader } from "@/features/documents/DocumentReader";
const mocks = vi.hoisted(() => ({ load: vi.fn(), render: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/store/store", () => ({ useStore: () => ({ ready: true, persistence: "durable" }) }));
vi.mock("@/features/documents/DocumentLibrary", () => ({ documentButton: "button" }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock("@/features/documents/service", () => ({
  documentStorage: (work: (repo: unknown) => unknown) => work({ getDocumentBundle: mocks.load }),
}));
vi.mock("@/features/documents/pdfjs-adapter", () => ({ renderPdfPage: mocks.render }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
it("opens the cited original page even if text was not selected", async () => {
  mocks.load.mockResolvedValue({
    document: { id: "doc", name: "source.pdf", pageCount: 3, blob: new Blob() },
    pages: [{ page: 1, text: "First page", warnings: [] }],
  });
  render(<DocumentReader documentId="doc" initialPage={2} />);
  await waitFor(() => expect(screen.getByLabelText("Page number")).toHaveValue(2));
  expect(screen.getByText(/This page was not selected/)).toBeVisible();
  await waitFor(() => expect(mocks.render.mock.lastCall?.[1]).toBe(2));
});
it("keeps page navigation in bounds when the requested page no longer exists", async () => {
  mocks.load.mockResolvedValue({
    document: { id: "doc", name: "source.pdf", pageCount: 1, blob: new Blob() },
    pages: [{ page: 1, text: "First page", warnings: [] }],
  });
  render(<DocumentReader documentId="doc" initialPage={99} />);
  await waitFor(() => expect(screen.getByLabelText("Page number")).toHaveValue(1));
});
