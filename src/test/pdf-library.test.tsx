import { afterEach, it, expect, vi } from "vitest";
import { cleanup, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PdfInput } from "@/features/new-study/PdfInput";
const mocks = vi.hoisted(() => ({ preflight: vi.fn(), inspect: vi.fn(), prepare: vi.fn() }));
vi.mock("@/features/documents/preflight", () => ({ inspectPdfSelection: mocks.preflight }));
vi.mock("@/features/documents/service", () => ({
  inspectDocument: mocks.inspect,
  prepareDocument: mocks.prepare,
}));
vi.mock("@/features/documents/PagePreview", () => ({ PagePreview: () => null }));
afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});
it("requires explicit page selection for oversized PDFs and never truncates", async () => {
  mocks.preflight.mockResolvedValue({ ok: true });
  mocks.inspect.mockResolvedValue(20);
  render(
    <PdfInput
      value={null}
      onChange={vi.fn()}
      onBusyChange={vi.fn()}
      onDirtyChange={vi.fn()}
      disabled={false}
    />,
  );
  fireEvent.change(screen.getByLabelText("Choose PDF or drop one here"), {
    target: { files: [new File(["pdf"], "file.pdf")] },
  });
  const pages = await screen.findByLabelText("Pages to extract (for example 1-3, 5)");
  expect(pages).toHaveValue("");
  fireEvent.change(pages, { target: { value: "1-20" } });
  fireEvent.click(screen.getByText("Extract selected pages"));
  await screen.findByRole("alert");
  expect(mocks.prepare).not.toHaveBeenCalled();
});
it("ignores inspection completion after cancellation", async () => {
  mocks.preflight.mockResolvedValue({ ok: true });
  let resolve!: (n: number) => void;
  mocks.inspect.mockReturnValue(
    new Promise<number>((r) => {
      resolve = r;
    }),
  );
  render(
    <PdfInput
      value={null}
      onChange={vi.fn()}
      onBusyChange={vi.fn()}
      onDirtyChange={vi.fn()}
      disabled={false}
    />,
  );
  fireEvent.change(screen.getByLabelText("Choose PDF or drop one here"), {
    target: { files: [new File(["pdf"], "file.pdf")] },
  });
  await waitFor(() => expect(mocks.inspect).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByText("Cancel import"));
  resolve(3);
  await screen.findByText("Import cancelled. Nothing was saved.");
  expect(screen.queryByLabelText("Pages to extract (for example 1-3, 5)")).toBeNull();
});
