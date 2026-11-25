import { z } from "zod";
import { sourceRevisionSchema, citeSegment, type SourceRevision } from "./study-source";
import { mcqSchema, quizVersionSchema, type QuizVersion } from "./quiz";
import { checkGeneratedQuizQuality } from "./generation-quality";
export const SOURCE_PROMPT_VERSION = "source-evidence-v2";
export const SOURCE_CONTRACT = "source-material-v1";
export const SOURCE_CONSENT = "source-transfer-2026-11-18";
const id = z.string().min(1).max(200),
  text = z.string().trim().min(1).max(4000);
export const sourceRequestSchema = z
  .object({
    contract: z.literal(SOURCE_CONTRACT),
    source: sourceRevisionSchema,
    format: z.enum(["quiz", "reviewer", "flashcards"]),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (
      r.source.segments.length > 10 ||
      r.source.segments.reduce((n, s) => n + s.text.replace(/\s/g, "").length, 0) < 40
    )
      ctx.addIssue({
        code: "custom",
        message: "Select 1–10 nonempty source segments with enough text",
      });
  });
export type SourceRequest = z.infer<typeof sourceRequestSchema>;
const ref = z.object({ segmentId: id, excerpt: text }).strict();
const question = mcqSchema
  .innerType()
  .omit({ id: true, type: true, hints: true, sources: true })
  .extend({ sources: z.array(ref).min(1).max(10) })
  .strict();
const excluded = z
  .array(
    z
      .object({
        segmentId: id,
        reason: z.enum(["image-required", "answer-not-supported", "insufficient-text"]),
      })
      .strict(),
  )
  .max(30);
const evidence = z.object({ evidenceId: id }).strict();
export const sourceOutputSchema = z.discriminatedUnion("format", [
  z.object({ format: z.literal("quiz"), questions: z.array(question).length(5) }).strict(),
  z
    .object({
      format: z.literal("flashcards"),
      cards: z
        .array(z.object({ front: text, evidenceId: id }).strict())
        .min(1)
        .max(20),
      excluded,
    })
    .strict(),
  z
    .object({
      format: z.literal("reviewer"),
      sections: z
        .array(z.object({ heading: text, points: z.array(evidence).min(1).max(5) }).strict())
        .min(1)
        .max(2),
      terms: z.array(z.object({ term: text, evidenceId: id }).strict()).max(3),
      comparisons: z
        .array(
          z
            .object({
              heading: text,
              rows: z
                .array(z.object({ label: text, evidenceId: id }).strict())
                .min(2)
                .max(10),
            })
            .strict(),
        )
        .max(5),
      excluded,
    })
    .strict(),
]);
export function sourcePassages(source: SourceRevision) {
  return source.segments.flatMap((segment) =>
    segment.text
      .split(/(?<=[.!?])\s+(?=[A-Z"“])/u)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((text, i) => ({ id: `${segment.id}:s${i + 1}`, segmentId: segment.id, text })),
  );
}
const rawMaterial = z
  .object({
    contract: z.literal(SOURCE_CONTRACT),
    id,
    title: z.string().trim().min(1).max(200),
    createdAt: z.number().finite().nonnegative(),
    request: sourceRequestSchema,
    generation: z
      .object({
        provider: z.enum(["groq", "sample"]),
        model: z.string().max(100),
        promptVersion: z.enum(["source-evidence-v1", "source-evidence-v2"]),
        validationVersion: z.literal("single-answer-v1"),
        reviewStatus: z.enum(["structural-pass", "authored-sample"]),
      })
      .strict(),
    output: sourceOutputSchema,
  })
  .strict();
function validateEvidence(material: z.infer<typeof rawMaterial>) {
  const { source, format } = material.request;
  if (material.output.format !== format) throw new Error("Format mismatch");
  const passages = new Map(sourcePassages(source).map((p) => [p.id, p]));
  const resolve = (id: string) => {
    const p = passages.get(id);
    if (!p) throw new Error("Unknown evidence");
    return citeSegment(source, p.segmentId, p.text);
  };
  if (material.output.format === "quiz") {
    const prompts = new Set<string>();
    for (const q of material.output.questions) {
      const key = q.prompt.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim();
      if (prompts.has(key)) throw new Error("Duplicate question");
      prompts.add(key);
      mcqSchema.parse({ ...q, id: "check", type: "mcq", hints: [], sources: [] });
      const seen = new Set<string>();
      for (const ref of q.sources) {
        citeSegment(source, ref.segmentId, ref.excerpt);
        const key = JSON.stringify(ref);
        if (seen.has(key)) throw new Error("Duplicate citation");
        seen.add(key);
      }
    }
  } else {
    for (const item of material.output.excluded)
      if (!source.segments.some((s) => s.id === item.segmentId))
        throw new Error("Unknown exclusion");
    if (material.output.format === "flashcards") {
      const fronts = new Set<string>();
      material.output.cards.forEach((c) => {
        const key = c.front.toLowerCase().trim();
        if (fronts.has(key)) throw new Error("Duplicate card");
        fronts.add(key);
        resolve(c.evidenceId);
      });
    } else {
      material.output.sections.forEach((s) => s.points.forEach((p) => resolve(p.evidenceId)));
      material.output.terms.forEach((t) => resolve(t.evidenceId));
      material.output.comparisons.forEach((c) => c.rows.forEach((row) => resolve(row.evidenceId)));
    }
  }
  if (
    (source.kind === "sample") !== (material.generation.provider === "sample") ||
    (material.generation.provider === "sample") !==
      (material.generation.reviewStatus === "authored-sample")
  )
    throw new Error("Invalid provenance");
  return material;
}
export const sourceMaterialSchema = rawMaterial.transform((m, ctx) => {
  try {
    return validateEvidence(m);
  } catch {
    ctx.addIssue({ code: "custom", message: "Invalid revision-linked material" });
    return z.NEVER;
  }
});
export type SourceMaterial = z.infer<typeof sourceMaterialSchema>;
/** Legacy session/grading contracts remain intact; revision evidence lives in the immutable envelope. */
export function sourceQuizVersion(material: SourceMaterial): QuizVersion {
  if (material.output.format !== "quiz") throw new Error("Quiz required");
  return quizVersionSchema.parse({
    id: material.id,
    quizId: material.id,
    title: material.title,
    createdAt: material.createdAt,
    questions: material.output.questions.map((q, i) => ({
      ...q,
      id: `q${i + 1}`,
      type: "mcq",
      hints: [],
      sources: [],
    })),
  });
}
export function checkSourceMaterial(raw: unknown): SourceMaterial {
  const m = sourceMaterialSchema.parse(raw);
  if (m.output.format === "quiz") {
    const version = sourceQuizVersion(m);
    // Quality checks consume excerpt text only. No synthetic PDF reference is created or saved.
    checkGeneratedQuizQuality({
      ...version,
      questions: m.output.questions.map((q, i) => ({
        ...q,
        id: `q${i + 1}`,
        type: "mcq" as const,
        hints: [],
        sources: q.sources,
      })),
    });
  }
  return m;
}
export function sourceMaterialCitations(material: SourceMaterial, questionId: string) {
  if (material.output.format !== "quiz") return [];
  const q = material.output.questions.find((_, i) => `q${i + 1}` === questionId);
  return q?.sources.map((s) => citeSegment(material.request.source, s.segmentId, s.excerpt)) ?? [];
}
