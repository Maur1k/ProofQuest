import { getDocument, PDFWorker, version, type PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { checkCancelled, pdfFailure, PdfFailure } from "./errors";
import { previewScale } from "./extraction";
import { PDF_DEVELOPMENT_LIMITS } from "./policy";

/** One short-lived real worker per operation. Never used during SSR or for network PDFs. */
export async function withPdf<T>(
  blob: Blob,
  outerSignal: AbortSignal,
  work: (pdf: PDFDocumentProxy, signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let port: Worker | undefined;
  let worker: PDFWorker | undefined;
  let task: ReturnType<typeof getDocument> | undefined;
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    // Destruction can reject after the real worker has already been terminated.
    if (task) void task.destroy().catch(() => {});
    worker?.destroy();
    port?.terminate();
  };
  const onCancel = () => controller.abort(new PdfFailure("cancelled"));
  outerSignal.addEventListener("abort", onCancel, { once: true });
  if (outerSignal.aborted) onCancel();
  const timer = setTimeout(
    () => controller.abort(new PdfFailure("timeout")),
    PDF_DEVELOPMENT_LIMITS.deadlineMs,
  );
  let abortHandler: (() => void) | undefined;
  try {
    checkCancelled(controller.signal);
    if (!blob.size || blob.size > PDF_DEVELOPMENT_LIMITS.maxFileBytes)
      throw new PdfFailure("invalid");
    const aborted = new Promise<never>((_, reject) => {
      abortHandler = () => {
        dispose();
        reject(controller.signal.reason);
      };
      controller.signal.addEventListener("abort", abortHandler, { once: true });
    });
    const operation = async () => {
      const data = new Uint8Array(await blob.arrayBuffer());
      checkCancelled(controller.signal);
      port = new Worker(workerUrl, { type: "module" });
      worker = PDFWorker.create({ port });
      await worker.promise;
      checkCancelled(controller.signal);
      const assets = `/pdfjs/${version}/`;
      task = getDocument({
        data,
        worker,
        stopAtErrors: true,
        verbosity: 0,
        cMapUrl: `${assets}cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${assets}standard_fonts/`,
        wasmUrl: `${assets}wasm/`,
        useSystemFonts: true,
      });
      const pdf = await task.promise;
      checkCancelled(controller.signal);
      return work(pdf, controller.signal);
    };
    return await Promise.race([operation(), aborted]);
  } catch (error) {
    throw pdfFailure(error);
  } finally {
    clearTimeout(timer);
    outerSignal.removeEventListener("abort", onCancel);
    if (abortHandler) controller.signal.removeEventListener("abort", abortHandler);
    dispose();
  }
}

export async function renderPdfPage(
  blob: Blob,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  signal: AbortSignal,
) {
  await withPdf(blob, signal, async (pdf, activeSignal) => {
    if (!Number.isSafeInteger(pageNumber) || pageNumber < 1 || pageNumber > pdf.numPages)
      throw new PdfFailure("invalid");
    const page = await pdf.getPage(pageNumber);
    try {
      checkCancelled(activeSignal);
      const original = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: previewScale(original.width, original.height) });
      canvas.width = Math.max(1, Math.floor(viewport.width));
      canvas.height = Math.max(1, Math.floor(viewport.height));
      const context = canvas.getContext("2d");
      if (!context) throw new PdfFailure("unavailable");
      const render = page.render({ canvas, canvasContext: context, viewport, annotationMode: 0 });
      const cancel = () => render.cancel();
      activeSignal.addEventListener("abort", cancel, { once: true });
      try {
        await render.promise;
        checkCancelled(activeSignal);
      } finally {
        activeSignal.removeEventListener("abort", cancel);
      }
    } finally {
      page.cleanup();
    }
  });
}
