import { checkCancelled, PdfFailure } from "./errors";
import { PDF_DEVELOPMENT_LIMITS } from "./policy";
export interface ExtractedPage {
  page: number;
  text: string;
  warnings: string[];
}

export async function extractPages(
  pdf: {
    numPages: number;
    getPage(number: number): Promise<{
      getTextContent(): Promise<{
        items: Array<{ str: string; hasEOL?: boolean } | { type: string }>;
      }>;
      cleanup(): unknown;
    }>;
  },
  selected: readonly number[],
  signal: AbortSignal,
  onProgress: (done: number, total: number) => void,
): Promise<ExtractedPage[]> {
  if (
    !selected.length ||
    selected.length > PDF_DEVELOPMENT_LIMITS.maxSelectedPages ||
    new Set(selected).size !== selected.length ||
    selected.some((page) => !Number.isSafeInteger(page) || page < 1 || page > pdf.numPages)
  )
    throw new PdfFailure("invalid");
  const result: ExtractedPage[] = [];
  let characters = 0;
  for (const number of selected) {
    checkCancelled(signal);
    const page = await pdf.getPage(number);
    try {
      const content = await page.getTextContent();
      checkCancelled(signal);
      const parts: string[] = [];
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const part = item.str + (item.hasEOL ? "\n" : " ");
        characters += part.length;
        if (characters > PDF_DEVELOPMENT_LIMITS.maxCharacters) throw new PdfFailure("text-limit");
        parts.push(part);
      }
      const text = parts.join("").trim();
      result.push({
        page: number,
        text,
        warnings:
          text.replace(/\s/g, "").length < 40
            ? [
                "Little readable text on this page. Images, diagrams or scanned text may be missing.",
              ]
            : [],
      });
      if (
        new TextEncoder().encode(JSON.stringify(result)).byteLength >
        PDF_DEVELOPMENT_LIMITS.maxTextBytes
      )
        throw new PdfFailure("text-limit");
      onProgress(result.length, selected.length);
    } finally {
      page.cleanup();
    }
  }
  checkCancelled(signal);
  if (result.every((page) => page.text.replace(/\s/g, "").length < 40))
    throw new PdfFailure("no-text");
  return result;
}

export function previewScale(width: number, height: number): number {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0)
    throw new PdfFailure("invalid");
  return Math.min(
    1.5,
    900 / width,
    PDF_DEVELOPMENT_LIMITS.maxCanvasDimension / width,
    PDF_DEVELOPMENT_LIMITS.maxCanvasDimension / height,
    Math.sqrt(PDF_DEVELOPMENT_LIMITS.maxCanvasPixels / (width * height)),
  );
}
