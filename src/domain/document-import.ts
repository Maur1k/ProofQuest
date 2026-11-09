/** Provisional experiment bounds, not validated device capacity or active product defaults. */
export const PROVISIONAL_PDF_LIMITS = {
  maxFileBytes: 20 * 1024 * 1024,
  maxSelectedPages: 30,
} as const;

export interface PdfImportLimits {
  maxFileBytes: number;
  maxSelectedPages: number;
}
export type PdfInputError =
  | "no-file"
  | "multiple-files"
  | "empty-file"
  | "file-too-large"
  | "not-pdf"
  | "unreadable-file"
  | "cancelled"
  | "invalid-page-count"
  | "empty-selection"
  | "invalid-page-selection"
  | "page-out-of-range"
  | "too-many-pages";
export type PdfInputResult<T> = { ok: true; value: T } | { ok: false; code: PdfInputError };
export interface PdfFileMetadata {
  name: string;
  size: number;
  type: string;
}

export const PDF_INPUT_MESSAGES: Record<PdfInputError, string> = {
  "no-file": "Choose a PDF to continue.",
  "multiple-files": "Choose one PDF at a time.",
  "empty-file": "This file is empty. Choose another PDF.",
  "file-too-large": "This PDF exceeds the current file-size limit.",
  "not-pdf": "Choose a PDF file. Renaming another file to .pdf is not enough.",
  "unreadable-file": "This file could not be read. Try choosing it again.",
  cancelled: "Import cancelled. No document was saved.",
  "invalid-page-count": "The PDF page count could not be read.",
  "empty-selection": "Select at least one page.",
  "invalid-page-selection": "Enter page numbers or ranges, such as 1-3, 5.",
  "page-out-of-range": "A selected page is outside this PDF.",
  "too-many-pages": "Select fewer pages to stay within the current limit.",
};

export function validatePdfLimits(limits: PdfImportLimits): void {
  if (
    !Number.isSafeInteger(limits.maxFileBytes) ||
    limits.maxFileBytes < 5 ||
    !Number.isSafeInteger(limits.maxSelectedPages) ||
    limits.maxSelectedPages < 1
  )
    throw new Error("PDF limits must be positive safe integers with room for a file signature");
}

/** Both file-picker and drop handlers must pass their whole selection here. */
export function validatePdfSelection(
  files: readonly PdfFileMetadata[],
  limits: PdfImportLimits,
): PdfInputResult<PdfFileMetadata> {
  validatePdfLimits(limits);
  if (!files.length) return { ok: false, code: "no-file" };
  if (files.length !== 1) return { ok: false, code: "multiple-files" };
  const file = files[0]!;
  if (!Number.isSafeInteger(file.size) || file.size < 0)
    return { ok: false, code: "unreadable-file" };
  if (file.size === 0) return { ok: false, code: "empty-file" };
  if (file.size > limits.maxFileBytes) return { ok: false, code: "file-too-large" };
  // OS/browser MIME metadata is only a hint. The byte signature is checked separately.
  if (!/\.pdf$/i.test(file.name) && file.type.toLowerCase() !== "application/pdf")
    return { ok: false, code: "not-pdf" };
  return { ok: true, value: { name: file.name, size: file.size, type: file.type } };
}

/** A signature match is preflight only; PDF.js must still validate the document structure. */
export function hasPdfSignature(bytes: Uint8Array): boolean {
  return bytes.length >= 5 && [37, 80, 68, 70, 45].every((value, index) => bytes[index] === value);
}

/** Returns sorted unique page numbers. Never silently truncates or selects omitted pages. */
export function parseSelectedPages(
  input: string,
  pageCount: number,
  limits: PdfImportLimits,
): PdfInputResult<number[]> {
  validatePdfLimits(limits);
  if (!Number.isSafeInteger(pageCount) || pageCount < 1)
    return { ok: false, code: "invalid-page-count" };
  if (!input.trim()) return { ok: false, code: "empty-selection" };
  if (input.length > 4096) return { ok: false, code: "invalid-page-selection" };
  const pages = new Set<number>();
  for (const token of input.split(",")) {
    const match = /^\s*(\d+)\s*(?:-\s*(\d+)\s*)?$/.exec(token);
    if (!match) return { ok: false, code: "invalid-page-selection" };
    const first = Number(match[1]),
      last = Number(match[2] ?? match[1]);
    if (!Number.isSafeInteger(first) || !Number.isSafeInteger(last) || first > last)
      return { ok: false, code: "invalid-page-selection" };
    if (first < 1 || last > pageCount) return { ok: false, code: "page-out-of-range" };
    // Check the range size before iterating, including deliberately huge inputs.
    if (last - first + 1 > limits.maxSelectedPages) return { ok: false, code: "too-many-pages" };
    for (let page = first; page <= last; page++) {
      pages.add(page);
      if (pages.size > limits.maxSelectedPages) return { ok: false, code: "too-many-pages" };
    }
  }
  return { ok: true, value: [...pages].sort((a, b) => a - b) };
}
