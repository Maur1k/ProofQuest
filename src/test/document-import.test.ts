// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import {
  hasPdfSignature,
  parseSelectedPages,
  PROVISIONAL_PDF_LIMITS as limits,
  validatePdfSelection,
} from "@/domain/document-import";
import { inspectPdfSelection, type PdfFileCandidate } from "@/features/documents/preflight";

const metadata = { name: "lesson.pdf", type: "application/pdf", size: 100 };
describe("PDF input validation", () => {
  it("accepts exactly the provisional byte boundary and rejects one byte above", () => {
    expect(validatePdfSelection([{ ...metadata, size: limits.maxFileBytes }], limits).ok).toBe(
      true,
    );
    expect(validatePdfSelection([{ ...metadata, size: limits.maxFileBytes + 1 }], limits)).toEqual({
      ok: false,
      code: "file-too-large",
    });
  });
  it.each([
    [[], "no-file"],
    [[metadata, metadata], "multiple-files"],
    [[{ ...metadata, size: 0 }], "empty-file"],
    [[{ ...metadata, size: NaN }], "unreadable-file"],
    [[{ ...metadata, name: "photo.png", type: "image/png" }], "not-pdf"],
  ] as const)("rejects invalid selection %j", (files, code) => {
    expect(validatePdfSelection(files, limits)).toEqual({ ok: false, code });
  });
  it("allows .PDF with missing MIME and PDF MIME with missing extension", () => {
    expect(validatePdfSelection([{ ...metadata, name: "LESSON.PDF", type: "" }], limits).ok).toBe(
      true,
    );
    expect(validatePdfSelection([{ ...metadata, name: "download" }], limits).ok).toBe(true);
  });
  it("checks bytes without claiming a structurally valid PDF", () => {
    expect(hasPdfSignature(new TextEncoder().encode("%PDF-"))).toBe(true);
    expect(hasPdfSignature(new TextEncoder().encode("photo"))).toBe(false);
    expect(hasPdfSignature(new Uint8Array(4))).toBe(false);
  });
});
describe("deliberate page selection", () => {
  it("sorts and deduplicates ranges without filling omitted gaps", () => {
    expect(parseSelectedPages(" 5, 1-3, 2 , 9 ", 100, limits)).toEqual({
      ok: true,
      value: [1, 2, 3, 5, 9],
    });
  });
  it("accepts thirty selected pages in a larger document and rejects thirty-one", () => {
    expect(parseSelectedPages("71-100", 100, limits)).toEqual({
      ok: true,
      value: Array.from({ length: 30 }, (_, i) => i + 71),
    });
    expect(parseSelectedPages("1-30,100", 100, limits)).toEqual({
      ok: false,
      code: "too-many-pages",
    });
  });
  it.each(["3-1", "1.5", "1,", "1,,2", "all", "1e2", "9007199254740992"])(
    "rejects ambiguous input %s",
    (input) => {
      expect(parseSelectedPages(input, 100, limits)).toEqual({
        ok: false,
        code: "invalid-page-selection",
      });
    },
  );
  it("rejects zero, missing pages and empty selections", () => {
    expect(parseSelectedPages("0", 5, limits)).toEqual({ ok: false, code: "page-out-of-range" });
    expect(parseSelectedPages("6", 5, limits)).toEqual({ ok: false, code: "page-out-of-range" });
    expect(parseSelectedPages(" ", 5, limits)).toEqual({ ok: false, code: "empty-selection" });
    expect(parseSelectedPages("1", 0, limits)).toEqual({ ok: false, code: "invalid-page-count" });
  });
  it("rejects huge ranges before allocating page arrays", () => {
    expect(parseSelectedPages("1-9007199254740991", Number.MAX_SAFE_INTEGER, limits)).toEqual({
      ok: false,
      code: "too-many-pages",
    });
  });
});
function candidate(text = "%PDF-1.7"): PdfFileCandidate {
  const blob = new Blob([text]);
  return { ...metadata, size: blob.size, slice: vi.fn((start, end) => blob.slice(start, end)) };
}
describe("bounded file preflight", () => {
  it("reads only the signature and does not trust a renamed file", async () => {
    const file = candidate();
    expect((await inspectPdfSelection([file], limits, new AbortController().signal)).ok).toBe(true);
    expect(file.slice).toHaveBeenCalledExactlyOnceWith(0, 5);
    expect(
      await inspectPdfSelection([candidate("not a PDF")], limits, new AbortController().signal),
    ).toEqual({ ok: false, code: "not-pdf" });
  });
  it("rejects oversized files before reading", async () => {
    const file = { ...candidate(), size: limits.maxFileBytes + 1 };
    await inspectPdfSelection([file], limits, new AbortController().signal);
    expect(file.slice).not.toHaveBeenCalled();
  });
  it("does not read after cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    const file = candidate();
    expect(await inspectPdfSelection([file], limits, controller.signal)).toEqual({
      ok: false,
      code: "cancelled",
    });
    expect(file.slice).not.toHaveBeenCalled();
  });
  it("settles cancellation promptly and ignores a late read result", async () => {
    let complete!: (buffer: ArrayBuffer) => void;
    const file = {
      ...metadata,
      slice: () => ({
        arrayBuffer: () =>
          new Promise<ArrayBuffer>((resolve) => {
            complete = resolve;
          }),
      }),
    };
    const controller = new AbortController();
    const result = inspectPdfSelection([file], limits, controller.signal);
    controller.abort();
    expect(await result).toEqual({ ok: false, code: "cancelled" });
    complete(new ArrayBuffer(5));
    expect(await result).toEqual({ ok: false, code: "cancelled" });
  });
  it("reports read failure without exposing underlying exception details", async () => {
    const file = {
      ...metadata,
      slice: () => ({
        arrayBuffer: async () => {
          throw new Error("private OS path");
        },
      }),
    };
    expect(await inspectPdfSelection([file], limits, new AbortController().signal)).toEqual({
      ok: false,
      code: "unreadable-file",
    });
  });
});
