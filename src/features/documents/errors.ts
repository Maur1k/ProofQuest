export type PdfFailureCode =
  "cancelled" | "timeout" | "password" | "invalid" | "no-text" | "text-limit" | "unavailable";
export const PDF_FAILURE_MESSAGES: Record<PdfFailureCode, string> = {
  cancelled: "Import cancelled. No document was saved.",
  timeout: "Reading took too long. Try a smaller PDF or fewer pages.",
  password:
    "This PDF is password protected. Choose an unprotected copy; password entry is not supported yet.",
  invalid: "This PDF could not be opened. Choose a valid, readable PDF.",
  "no-text":
    "The selected pages have no usable text layer. They may be scanned images. OCR is not available yet; try other pages or a text PDF.",
  "text-limit":
    "The selected pages contain too much text for this development build. Select fewer pages.",
  unavailable: "The PDF reader could not complete this operation. Try opening the file again.",
};
export class PdfFailure extends Error {
  constructor(readonly code: PdfFailureCode) {
    super(PDF_FAILURE_MESSAGES[code]);
  }
}
export function pdfFailure(error: unknown): PdfFailure {
  if (error instanceof PdfFailure) return error;
  const name = error instanceof Error ? error.name : "";
  return new PdfFailure(
    name === "PasswordException"
      ? "password"
      : name === "InvalidPDFException" || name === "FormatError"
        ? "invalid"
        : name === "AbortError" || name === "RenderingCancelledException"
          ? "cancelled"
          : "unavailable",
  );
}
export function checkCancelled(signal: AbortSignal): void {
  if (signal.aborted)
    throw signal.reason instanceof PdfFailure ? signal.reason : new PdfFailure("cancelled");
}
