import { z } from "zod";
import type { StudyRequest } from "@/domain/study-material";
import { GenerationFailure } from "./boundary.server";

/** References are assigned by the server, never guessed/repaired by a model. */
export function sourceEvidence(input: StudyRequest) {
  return input.pages.flatMap((page) =>
    page.text
      .split(/(?<=[.!?])\s+(?=[A-Z"“])/u)
      .map((text) => text.trim())
      .filter(Boolean)
      .map((text, index) => ({ id: `p${page.page}-s${index + 1}`, page: page.page, text })),
  );
}
const id = z.string().min(1).max(60);
const heading = z.string().min(1).max(200);
const ref = z.object({ evidenceId: id }).strict();
const exclusions = z
  .array(
    z
      .object({
        page: z.number().int().positive(),
        reason: z.enum(["image-required", "answer-not-supported", "insufficient-text"]),
      })
      .strict(),
  )
  .max(30);
const schema = z.discriminatedUnion("format", [
  z
    .object({
      format: z.literal("flashcards"),
      cards: z
        .array(z.object({ front: z.string().min(1).max(4000), evidenceId: id }).strict())
        .min(1)
        .max(20),
      excluded: exclusions,
    })
    .strict(),
  z
    .object({
      format: z.literal("reviewer"),
      sections: z
        .array(z.object({ heading, points: z.array(ref).min(1).max(5) }).strict())
        .min(1)
        .max(2),
      terms: z.array(z.object({ term: heading, evidenceId: id }).strict()).max(3),
      comparisons: z
        .array(
          z
            .object({
              heading,
              rows: z
                .array(z.object({ label: heading, evidenceId: id }).strict())
                .min(2)
                .max(10),
            })
            .strict(),
        )
        .max(5),
      excluded: exclusions,
    })
    .strict(),
]);
export function materializeEvidence(raw: unknown, input: StudyRequest): unknown {
  const parsed = schema.safeParse(raw);
  if (!parsed.success || parsed.data.format !== input.format)
    throw new GenerationFailure("invalid-output");
  const evidence = new Map(sourceEvidence(input).map((item) => [item.id, item]));
  const resolve = (evidenceId: string) => {
    const item = evidence.get(evidenceId);
    if (!item) throw new GenerationFailure("invalid-output");
    return { text: item.text, sources: [{ page: item.page, excerpt: item.text }] };
  };
  const output = parsed.data;
  if (output.format === "flashcards")
    return {
      ...output,
      cards: output.cards.map((card) => {
        const item = resolve(card.evidenceId);
        return { front: card.front, back: item.text, sources: item.sources };
      }),
    };
  return {
    ...output,
    sections: output.sections.map((section) => ({
      heading: section.heading,
      points: section.points.map((point) => resolve(point.evidenceId)),
    })),
    terms: output.terms.map((term) => {
      const item = resolve(term.evidenceId);
      return { term: term.term, definition: item.text, sources: item.sources };
    }),
    comparisons: output.comparisons.map((comparison) => ({
      heading: comparison.heading,
      rows: comparison.rows.map((row) => {
        const item = resolve(row.evidenceId);
        return { label: row.label, detail: item.text, sources: item.sources };
      }),
    })),
  };
}
