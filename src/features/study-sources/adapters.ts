import { sourceRevisionSchema, type SourceRevision } from "@/domain/study-source";
import { sourceDigest } from "@/data/source-repository";
import type { DocumentRecord, PageRecord } from "@/data/records";
export const WATER_SAMPLE = {
  id: "water-cycle-v1",
  title: "Water cycle — sample",
  text: "Evaporation changes liquid water into water vapor.\n\nCondensation changes water vapor into liquid droplets.\n\nPrecipitation is water falling from clouds as rain, snow, sleet or hail.\n\nPlants release water vapor through transpiration.\n\nSunlight supplies energy for evaporation.",
};
async function seal(raw: unknown): Promise<SourceRevision> {
  const revision = sourceRevisionSchema.parse(raw);
  return { ...revision, contentHash: await sourceDigest(revision) };
}
export function textSource(
  title: string,
  text: string,
  sourceId: string = crypto.randomUUID(),
  sample = false,
) {
  if (text.length > 60_000)
    throw new Error(
      "Source text exceeds 60,000 characters. Split it deliberately; nothing was truncated.",
    );
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n[ \t]*\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return seal({
    id: crypto.randomUUID(),
    sourceId,
    title,
    createdAt: Date.now(),
    contentHash: "0".repeat(64),
    kind: sample ? "sample" : "text",
    ...(sample ? { sampleId: WATER_SAMPLE.id } : {}),
    segments: paragraphs.map((text, i) => ({
      id: `paragraph-${i + 1}`,
      label: `Paragraph ${i + 1}`,
      text,
    })),
  });
}
/** Reference existing pages without copying the PDF blob. Blank pages are not usable text. */
export function pdfSource(document: DocumentRecord, pages: PageRecord[]) {
  if (pages.some((p) => p.documentId !== document.id || p.page > document.pageCount))
    throw new Error("Invalid PDF pages");
  return seal({
    id: crypto.randomUUID(),
    sourceId: `pdf:${document.id}`,
    kind: "pdf",
    title: document.name.slice(0, 200),
    documentId: document.id,
    documentChecksum: document.checksum,
    createdAt: Date.now(),
    contentHash: "0".repeat(64),
    segments: [...pages]
      .sort((a, b) => a.page - b.page)
      .filter((p) => p.text.trim())
      .map((p) => ({
        id: `page-${p.page}`,
        documentId: document.id,
        page: p.page,
        label: `Page ${p.page}`,
        text: p.text.trim(),
      })),
  });
}
