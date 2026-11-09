import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { DocumentLibrary } from "@/features/documents/DocumentLibrary";
const mocks = vi.hoisted(() => ({
  inspect: vi.fn(),
  prepare: vi.fn(),
  add: vi.fn(),
  preflight: vi.fn(),
  block: vi.fn(),
}));
vi.mock("@/store/store", () => ({ useStore: () => ({ ready: true, persistence: "durable" }) }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: ReactNode }) => <a>{children}</a>,
  useBlocker: (options: unknown) => {
    mocks.block(options);
    return { status: "idle" };
  },
}));
vi.mock("@/features/documents/preflight", () => ({ inspectPdfSelection: mocks.preflight }));
vi.mock("@/features/documents/service", () => ({
  inspectDocument: mocks.inspect,
  prepareDocument: mocks.prepare,
  documentStorage: (work: (repo: unknown) => unknown) =>
    work({ listDocuments: async () => [], addDocument: mocks.add }),
}));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("retains review after failed save, guards navigation, and reports success only after retry commits", async () => {
  mocks.preflight.mockResolvedValue({ ok: true, value: {} });
  mocks.inspect.mockResolvedValue(3);
  const document = { id: "doc", name: "fixture.pdf", pageCount: 3, extractedPages: [1, 3] };
  mocks.prepare.mockResolvedValue({
    document,
    pages: [1, 3].map((page) => ({ page, text: "Readable text", warnings: [] })),
  });
  mocks.add.mockRejectedValueOnce(new Error("quota")).mockResolvedValueOnce(undefined);
  render(<DocumentLibrary />);
  fireEvent.change(screen.getByLabelText("Choose PDF or drop one here"), {
    target: { files: [new File(["%PDF-"], "fixture.pdf")] },
  });
  await screen.findByLabelText("Pages to extract (for example 1-3, 5)");
  fireEvent.change(screen.getByLabelText("Pages to extract (for example 1-3, 5)"), {
    target: { value: "1,3" },
  });
  fireEvent.click(screen.getByText("Extract selected pages"));
  await screen.findByText("Review extraction");
  fireEvent.click(screen.getByText("Save PDF to library"));
  await screen.findByText(/PDF was not saved/);
  expect(screen.getByText("Review extraction")).toBeVisible();
  expect(mocks.block.mock.lastCall?.[0].shouldBlockFn()).toBe(true);
  expect(screen.queryByText(/PDF saved in this browser/)).toBeNull();
  fireEvent.click(screen.getByText("Save PDF to library"));
  await screen.findByText(/PDF saved in this browser/);
  expect(mocks.add).toHaveBeenCalledTimes(2);
  expect(mocks.block.mock.lastCall?.[0].shouldBlockFn()).toBe(false);
});
it("ignores an opening operation that finishes after cancellation", async () => {
  mocks.preflight.mockResolvedValue({ ok: true, value: {} });
  let resolve!: (pages: number) => void;
  mocks.inspect.mockReturnValue(
    new Promise<number>((r) => {
      resolve = r;
    }),
  );
  render(<DocumentLibrary />);
  fireEvent.change(screen.getByLabelText("Choose PDF or drop one here"), {
    target: { files: [new File(["%PDF-"], "fixture.pdf")] },
  });
  await waitFor(() => expect(mocks.inspect).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByText("Cancel import"));
  resolve(3);
  await screen.findByText("Import cancelled. No document was saved.");
  expect(screen.queryByLabelText("Pages to extract (for example 1-3, 5)")).toBeNull();
  expect(mocks.add).not.toHaveBeenCalled();
});
