// @vitest-environment node
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { withPdf } from "@/features/documents/pdfjs-adapter";
import { PDF_DEVELOPMENT_LIMITS } from "@/features/documents/policy";
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  create: vi.fn(),
  terminate: vi.fn(),
  destroy: vi.fn(),
  taskDestroy: vi.fn(),
}));
vi.mock("pdfjs-dist", () => ({
  getDocument: mocks.get,
  PDFWorker: { create: mocks.create },
  version: "6.4.299",
}));
vi.mock("pdfjs-dist/build/pdf.worker.min.mjs?url", () => ({
  default: "/assets/pdf.worker.test.mjs",
}));
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    "Worker",
    class {
      terminate = mocks.terminate;
    },
  );
  mocks.create.mockReturnValue({ promise: Promise.resolve(), destroy: mocks.destroy });
  mocks.taskDestroy.mockResolvedValue(undefined);
  mocks.get.mockReturnValue({
    promise: Promise.resolve({ numPages: 3 }),
    destroy: mocks.taskDestroy,
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});
const blob = new Blob(["%PDF- synthetic worker test"]);
it("destroys the task and real worker after every successful repeated open", async () => {
  for (let i = 0; i < 20; i++)
    expect(await withPdf(blob, new AbortController().signal, async (pdf) => pdf.numPages)).toBe(3);
  expect(mocks.destroy).toHaveBeenCalledTimes(20);
  expect(mocks.taskDestroy).toHaveBeenCalledTimes(20);
  expect(mocks.terminate).toHaveBeenCalledTimes(20);
  expect(vi.getTimerCount()).toBe(0);
});
it("terminates a parser that never settles when its deadline expires", async () => {
  mocks.get.mockReturnValue({ promise: new Promise(() => {}), destroy: mocks.taskDestroy });
  const result = withPdf(blob, new AbortController().signal, async () => null);
  const failure = expect(result).rejects.toMatchObject({ code: "timeout" });
  await vi.advanceTimersByTimeAsync(PDF_DEVELOPMENT_LIMITS.deadlineMs);
  await failure;
  expect(mocks.terminate).toHaveBeenCalledOnce();
  expect(mocks.taskDestroy).toHaveBeenCalledOnce();
});
it("cancels before worker creation while a file read is pending", async () => {
  let finish!: (buffer: ArrayBuffer) => void;
  const pending = {
    size: 10,
    arrayBuffer: () =>
      new Promise<ArrayBuffer>((resolve) => {
        finish = resolve;
      }),
  } as Blob;
  const controller = new AbortController();
  const result = withPdf(pending, controller.signal, async () => null);
  controller.abort();
  await expect(result).rejects.toMatchObject({ code: "cancelled" });
  finish(new ArrayBuffer(10));
  await Promise.resolve();
  expect(mocks.create).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
it("cancels an active operation and releases its worker", async () => {
  const controller = new AbortController();
  await expect(
    withPdf(blob, controller.signal, async () => {
      controller.abort();
      return new Promise(() => {});
    }),
  ).rejects.toMatchObject({ code: "cancelled" });
  expect(mocks.terminate).toHaveBeenCalledOnce();
  expect(mocks.taskDestroy).toHaveBeenCalledOnce();
});
it("maps parser failure without exposing document details and cleans resources", async () => {
  mocks.get.mockReturnValue({
    promise: Promise.reject(
      Object.assign(new Error("private text"), { name: "PasswordException" }),
    ),
    destroy: mocks.taskDestroy,
  });
  await expect(withPdf(blob, new AbortController().signal, async () => null)).rejects.toMatchObject(
    { code: "password" },
  );
  expect(mocks.terminate).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});
