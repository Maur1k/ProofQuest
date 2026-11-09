import {
  hasPdfSignature,
  validatePdfSelection,
  type PdfFileMetadata,
  type PdfImportLimits,
  type PdfInputResult,
} from "@/domain/document-import";

export interface PdfFileCandidate extends PdfFileMetadata {
  slice(start: number, end: number): Pick<Blob, "arrayBuffer">;
}

/** Reads only five bytes, without starting a parser, allocating a full PDF, or storing anything. */
export async function inspectPdfSelection(
  files: readonly PdfFileCandidate[],
  limits: PdfImportLimits,
  signal: AbortSignal,
): Promise<PdfInputResult<PdfFileMetadata>> {
  if (signal.aborted) return { ok: false, code: "cancelled" };
  const selection = validatePdfSelection(files, limits);
  if (!selection.ok) return selection;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: PdfInputResult<PdfFileMetadata>) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener("abort", onAbort);
      resolve(result);
    };
    const onAbort = () => finish({ ok: false, code: "cancelled" });
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }
    try {
      void files[0]!
        .slice(0, 5)
        .arrayBuffer()
        .then(
          (buffer) => {
            if (signal.aborted) {
              onAbort();
              return;
            }
            finish(
              hasPdfSignature(new Uint8Array(buffer)) ? selection : { ok: false, code: "not-pdf" },
            );
          },
          () => finish({ ok: false, code: signal.aborted ? "cancelled" : "unreadable-file" }),
        );
    } catch {
      finish({ ok: false, code: signal.aborted ? "cancelled" : "unreadable-file" });
    }
  });
}
