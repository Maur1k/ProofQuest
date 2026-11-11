import { z } from "zod";
import {
  GENERATION_LIMITS,
  GenerationValidationError,
  validateGenerationInput,
} from "./generation";

export const studyFormatSchema = z.enum(["quiz", "reviewer", "flashcards"]);
export type StudyFormat = z.infer<typeof studyFormatSchema>;
export const studyRequestSchema = z
  .object({
    format: studyFormatSchema,
    documentId: z.string(),
    pages: z.array(z.object({ page: z.number(), text: z.string() }).strict()),
  })
  .strict();

/** Formats share the selected-text limits; no subject taxonomy is imposed. */
export function validateStudyRequest(raw: unknown) {
  const result = studyRequestSchema.safeParse(raw);
  if (!result.success) throw new GenerationValidationError("invalid-input");
  const { format, ...source } = result.data;
  const { questionCount: _count, ...input } = validateGenerationInput({
    ...source,
    questionCount: 5,
  });
  return { ...input, format };
}
export type StudyRequest = ReturnType<typeof validateStudyRequest>;
export interface StudyGenerator {
  generate(input: StudyRequest, signal: AbortSignal): Promise<unknown>;
}

const text = z.string().trim().min(1).max(4000);
const heading = z.string().trim().min(1).max(200);
const citation = z.object({ page: z.number().int().positive().safe(), excerpt: text }).strict();
const sources = z.array(citation).min(1).max(10);
const excluded = z
  .array(
    z
      .object({
        page: z.number().int().positive().safe(),
        reason: z.enum(["image-required", "answer-not-supported", "insufficient-text"]),
      })
      .strict(),
  )
  .max(30);
const fact = z.object({ text, sources }).strict();
const reviewerSchema = z
  .object({
    format: z.literal("reviewer"),
    sections: z
      .array(z.object({ heading, points: z.array(fact).min(1).max(10) }).strict())
      .min(1)
      .max(10),
    terms: z.array(z.object({ term: heading, definition: text, sources }).strict()).max(20),
    comparisons: z
      .array(
        z
          .object({
            heading,
            rows: z
              .array(z.object({ label: heading, detail: text, sources }).strict())
              .min(2)
              .max(10),
          })
          .strict(),
      )
      .max(5),
    excluded,
  })
  .strict();
const flashcardsSchema = z
  .object({
    format: z.literal("flashcards"),
    cards: z
      .array(z.object({ front: text, back: text, sources }).strict())
      .min(1)
      .max(20),
    excluded,
  })
  .strict();
const outputSchema = z.discriminatedUnion("format", [reviewerSchema, flashcardsSchema]);
const metadataSchema = z
  .object({
    id: z.string().trim().min(1).max(200),
    title: heading,
    createdAt: z.number().finite().nonnegative(),
  })
  .strict();
type StudyMetadata = z.infer<typeof metadataSchema>;
const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

/** Rejects malformed or untraceable output; citation matching is not a factual accuracy check.
 * All source text is untrusted data, never instructions. No network or storage side effects.
 * Quiz output continues through validateGeneratedQuiz and the existing quiz contracts.
 */
export function validateGeneratedStudy(raw: unknown, request: unknown, metadata: StudyMetadata) {
  const input = validateStudyRequest(request);
  try {
    if (typeof raw === "string") {
      if (raw.length > GENERATION_LIMITS.outputCharacters) throw new Error();
      raw = JSON.parse(raw) as unknown;
    }
    const output = outputSchema.parse(raw);
    if (
      JSON.stringify(output).length > GENERATION_LIMITS.outputCharacters ||
      output.format !== input.format
    )
      throw new Error();
    const pages = new Map(input.pages.map((page) => [page.page, normalize(page.text)]));
    const checkSources = (refs: z.infer<typeof sources>) => {
      const seen = new Set<string>();
      for (const ref of refs) {
        const excerpt = normalize(ref.excerpt);
        const key = `${ref.page}:${excerpt}`;
        if (!pages.get(ref.page)?.includes(excerpt) || seen.has(key)) throw new Error();
        seen.add(key);
      }
    };
    const distinct = (values: string[]) => {
      if (new Set(values.map((value) => normalize(value).toLowerCase())).size !== values.length)
        throw new Error();
    };
    for (const item of output.excluded) if (!pages.has(item.page)) throw new Error();
    distinct(output.excluded.map((item) => `${item.page}:${item.reason}`));
    if (output.format === "flashcards") {
      distinct(output.cards.map((card) => card.front));
      output.cards.forEach((card) => checkSources(card.sources));
    } else {
      distinct(output.sections.map((section) => section.heading));
      distinct(output.terms.map((term) => term.term));
      distinct(output.comparisons.map((comparison) => comparison.heading));
      output.sections.forEach((section) => {
        distinct(section.points.map((point) => point.text));
        section.points.forEach((point) => checkSources(point.sources));
      });
      output.terms.forEach((term) => checkSources(term.sources));
      output.comparisons.forEach((comparison) => {
        distinct(comparison.rows.map((row) => row.label));
        comparison.rows.forEach((row) => checkSources(row.sources));
      });
    }
    return { ...metadataSchema.parse(metadata), documentId: input.documentId, ...output };
  } catch {
    throw new GenerationValidationError("invalid-output");
  }
}
export type StudyMaterial = ReturnType<typeof validateGeneratedStudy>;
