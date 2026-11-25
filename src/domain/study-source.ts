import { z } from "zod";

const id = z.string().trim().min(1).max(200);
const title = z.string().trim().min(1).max(200);
const time = z.number().finite().nonnegative();
const text = z.string().trim().min(1).max(60_000);
const paragraph = z.object({ id, label: title, text }).strict();
const page = paragraph
  .extend({ documentId: id, page: z.number().int().positive().safe() })
  .strict();
const common = {
  id,
  sourceId: id,
  title,
  createdAt: time,
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
};
export const sourceRevisionSchema = z
  .discriminatedUnion("kind", [
    z
      .object({
        ...common,
        kind: z.literal("pdf"),
        documentId: id,
        documentChecksum: z.string().regex(/^[a-f0-9]{64}$/),
        segments: z.array(page).min(1).max(30),
      })
      .strict(),
    z
      .object({ ...common, kind: z.literal("text"), segments: z.array(paragraph).min(1).max(100) })
      .strict(),
    z
      .object({
        ...common,
        kind: z.literal("sample"),
        sampleId: id,
        segments: z.array(paragraph).min(1).max(100),
      })
      .strict(),
  ])
  .superRefine((revision, ctx) => {
    if (
      new Set(revision.segments.map((s) => s.id)).size !== revision.segments.length ||
      revision.segments.reduce((n, s) => n + s.text.length, 0) > 60_000
    )
      ctx.addIssue({ code: "custom", message: "Invalid source coverage" });
    if (
      revision.kind === "pdf" &&
      (revision.segments.some((s) => s.documentId !== revision.documentId) ||
        new Set(revision.segments.map((s) => s.page)).size !== revision.segments.length)
    )
      ctx.addIssue({ code: "custom", message: "Invalid PDF mapping" });
  });
export type SourceRevision = z.infer<typeof sourceRevisionSchema>;
export const studySourceSchema = z
  .object({
    id,
    kind: z.enum(["pdf", "text", "sample"]),
    title,
    revision: z.number().int().nonnegative().safe(),
    currentRevisionId: id,
    createdAt: time,
  })
  .strict();
export type StudySource = z.infer<typeof studySourceSchema>;

/** PDF page numbers remain real; text and samples have paragraph references only. */
export const revisionCitationSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("pdf"),
      sourceId: id,
      revisionId: id,
      segmentId: id,
      documentId: id,
      page: z.number().int().positive(),
      excerpt: text,
    })
    .strict(),
  z
    .object({
      kind: z.literal("text"),
      sourceId: id,
      revisionId: id,
      segmentId: id,
      label: title,
      excerpt: text,
    })
    .strict(),
  z
    .object({
      kind: z.literal("sample"),
      sourceId: id,
      revisionId: id,
      segmentId: id,
      label: title,
      excerpt: text,
    })
    .strict(),
]);
export type RevisionCitation = z.infer<typeof revisionCitationSchema>;
export function citeSegment(
  revision: SourceRevision,
  segmentId: string,
  excerpt: string,
): RevisionCitation {
  const segment = revision.segments.find((s) => s.id === segmentId);
  if (!segment || !excerpt.trim() || !segment.text.includes(excerpt))
    throw new Error("Unsupported source excerpt");
  const base = { sourceId: revision.sourceId, revisionId: revision.id, segmentId, excerpt };
  if (revision.kind === "pdf") {
    const pdfPage = revision.segments.find((s) => s.id === segmentId)!;
    return revisionCitationSchema.parse({
      ...base,
      kind: "pdf",
      documentId: revision.documentId,
      page: pdfPage.page,
    });
  }
  return revisionCitationSchema.parse({ ...base, kind: revision.kind, label: segment.label });
}
export function selectSource(revision: SourceRevision, ids: string[]) {
  const parsed = sourceRevisionSchema.parse(revision);
  if (
    !ids.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !parsed.segments.some((s) => s.id === id))
  )
    throw new Error("Select existing source segments");
  // Canonical document order, irrespective of checkbox click order.
  return { ...parsed, segments: parsed.segments.filter((s) => ids.includes(s.id)) };
}
export function sourceContent(revision: SourceRevision): string {
  return JSON.stringify({
    kind: revision.kind,
    segments: revision.segments,
    ...(revision.kind === "pdf"
      ? { documentId: revision.documentId, documentChecksum: revision.documentChecksum }
      : {}),
    ...(revision.kind === "sample" ? { sampleId: revision.sampleId } : {}),
  });
}
export function sourceSelectionKey(
  revision: SourceRevision,
  ids: string[],
  format: string,
): string {
  const selection = selectSource(revision, ids);
  return JSON.stringify({
    contract: "study-source-v1",
    prompt: "source-evidence-v1",
    sourceId: revision.sourceId,
    revisionId: revision.id,
    contentHash: revision.contentHash,
    segments: selection.segments.map((s) => s.id),
    format: format === "exam" ? "quiz" : format,
    questionCount: 5,
  });
}
export function validateSourceGraph(sources: StudySource[], revisions: SourceRevision[]): void {
  if (
    new Set(sources.map((s) => s.id)).size !== sources.length ||
    new Set(revisions.map((s) => s.id)).size !== revisions.length
  )
    throw new Error("Duplicate study source IDs");
  for (const source of sources) {
    const revision = revisions.find((r) => r.id === source.currentRevisionId);
    if (
      !revision ||
      revision.sourceId !== source.id ||
      revision.kind !== source.kind ||
      revision.title !== source.title
    )
      throw new Error("Invalid source revision link");
  }
  for (const revision of revisions) {
    const source = sources.find((s) => s.id === revision.sourceId);
    if (!source || source.kind !== revision.kind || revision.createdAt < source.createdAt)
      throw new Error("Orphan or conflicting source revision");
  }
}
