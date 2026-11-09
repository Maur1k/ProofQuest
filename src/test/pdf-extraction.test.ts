import { describe, expect, it, vi } from "vitest";
import { extractPages, previewScale } from "@/features/documents/extraction";
import { pdfFailure } from "@/features/documents/errors";
import { PDF_DEVELOPMENT_LIMITS } from "@/features/documents/policy";
function fixture(texts: string[]) {
  const cleanup = vi.fn();
  const getPage = vi.fn(async (n: number) => ({
    getTextContent: async () => ({ items: [{ str: texts[n - 1]!, hasEOL: true }] }),
    cleanup,
  }));
  return { numPages: texts.length, getPage, cleanup };
}
const text = "A useful synthetic lesson contains enough readable text to support studying.";
describe("incremental PDF extraction", () => {
  it("preserves original page numbers and unicode, reports progress and cleans each page", async () => {
    const pdf = fixture([text, "omitted", text + " 日本語"]);
    const progress = vi.fn();
    const pages = await extractPages(pdf, [1, 3], new AbortController().signal, progress);
    expect(pages.map((p) => p.page)).toEqual([1, 3]);
    expect(pages[1]!.text).toContain("日本語");
    expect(pdf.getPage.mock.calls).toEqual([[1], [3]]);
    expect(pdf.cleanup).toHaveBeenCalledTimes(2);
    expect(progress.mock.calls).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
  it("warns on low text mixed pages but rejects an entirely unusable selection", async () => {
    const pdf = fixture([text, ""]);
    const pages = await extractPages(pdf, [1, 2], new AbortController().signal, () => {});
    expect(pages[1]!.warnings).toHaveLength(1);
    await expect(
      extractPages(pdf, [2], new AbortController().signal, () => {}),
    ).rejects.toMatchObject({ code: "no-text" });
  });
  it("stops after cancellation without reading the next page", async () => {
    const pdf = fixture([text, text]);
    const controller = new AbortController();
    await expect(
      extractPages(pdf, [1, 2], controller.signal, () => controller.abort()),
    ).rejects.toMatchObject({ code: "cancelled" });
    expect(pdf.getPage).toHaveBeenCalledTimes(1);
    expect(pdf.cleanup).toHaveBeenCalledTimes(1);
  });
  it("rejects overlarge text and still cleans the page", async () => {
    const pdf = fixture(["x".repeat(PDF_DEVELOPMENT_LIMITS.maxCharacters + 1)]);
    await expect(
      extractPages(pdf, [1], new AbortController().signal, () => {}),
    ).rejects.toMatchObject({ code: "text-limit" });
    expect(pdf.cleanup).toHaveBeenCalledOnce();
  });
  it.each([[], [0], [2], [1, 1]].map((selected) => ({ selected })))(
    "rejects invalid selections %j before reading",
    async ({ selected }) => {
      const pdf = fixture([text]);
      await expect(
        extractPages(pdf, selected, new AbortController().signal, () => {}),
      ).rejects.toMatchObject({ code: "invalid" });
      expect(pdf.getPage).not.toHaveBeenCalled();
    },
  );
  it("bounds very tall and wide canvas previews", () => {
    for (const [w, h] of [
      [612, 792],
      [100000, 1],
      [1, 100000],
      [10000, 10000],
    ]) {
      const scale = previewScale(w!, h!);
      expect(w! * scale).toBeLessThanOrEqual(2048);
      expect(h! * scale).toBeLessThanOrEqual(2048);
      expect(w! * h! * scale * scale).toBeLessThanOrEqual(1000001);
    }
    expect(() => previewScale(Infinity, 1)).toThrow();
  });
  it("does not disclose raw parser details", () => {
    expect(pdfFailure(new Error("private document text")).message).not.toContain(
      "private document text",
    );
    expect(pdfFailure(Object.assign(new Error("secret"), { name: "PasswordException" })).code).toBe(
      "password",
    );
  });
});
