import { z } from "zod";
import { mcqSchema, quizVersionSchema, type QuizVersion } from "./quiz";

/** Provisional text guards, not provider token limits or validated mobile capacity. */
export const GENERATION_LIMITS = Object.freeze({
  selectedPages: 10,
  inputCharacters: 60_000,
  outputCharacters: 100_000,
  questions: 5,
});
const inputSchema = z
  .object({
    documentId: z.string().trim().min(1).max(200),
    pages: z
      .array(
        z
          .object({
            page: z.number().int().positive().safe(),
            text: z.string().trim().min(1).max(GENERATION_LIMITS.inputCharacters),
          })
          .strict(),
      )
      .min(1)
      .max(GENERATION_LIMITS.selectedPages),
    questionCount: z.literal(5),
  })
  .strict();
export type GenerationInput = z.infer<typeof inputSchema>;

/** Future server adapter boundary. No adapter or external call is enabled here.
 * Callers must enforce consent, body/token caps, quotas and deadlines before use.
 * Adapters must treat page text as untrusted content, honor cancellation, and return
 * structured output for validateGeneratedQuiz; provider responses are never trusted.
 */
export interface QuestionGenerator {
  generate(input: GenerationInput, signal: AbortSignal): Promise<unknown>;
}

export class GenerationValidationError extends Error {
  constructor(readonly code: "invalid-input" | "invalid-output") {
    super(
      code === "invalid-input"
        ? "Selected text is not valid for generation."
        : "Generated questions failed validation.",
    );
    this.name = "GenerationValidationError";
  }
}
export function validateGenerationInput(value: unknown): GenerationInput {
  const parsed = inputSchema.safeParse(value);
  if (!parsed.success) throw new GenerationValidationError("invalid-input");
  const input = parsed.data;
  const characters = input.pages.reduce((count, page) => count + page.text.length, 0);
  if (
    new Set(input.pages.map((page) => page.page)).size !== input.pages.length ||
    characters > GENERATION_LIMITS.inputCharacters ||
    input.pages.reduce((count, page) => count + page.text.replace(/\s/g, "").length, 0) < 40
  )
    throw new GenerationValidationError("invalid-input");
  return input;
}
const citationSchema = z
  .object({ page: z.number().int().positive().safe(), excerpt: z.string().trim().min(1).max(4000) })
  .strict();
const outputSchema = z
  .object({
    questions: z
      .array(
        mcqSchema
          .innerType()
          .omit({ id: true, type: true, hints: true, sources: true })
          .extend({
            sources: z.array(citationSchema).min(1).max(10),
          })
          .strict(),
      )
      .length(GENERATION_LIMITS.questions),
  })
  .strict();
const metadataSchema = quizVersionSchema.innerType().omit({ questions: true });
type QuizMetadata = z.infer<typeof metadataSchema>;
const normalize = (text: string) => text.replace(/\s+/g, " ").trim();

/** Syntactic/evidence-location validation only; does not establish factual support.
 * Version identity is supplied by the application, never by the model.
 * Returns a detached value and never persists or partially accepts output.
 */
export function validateGeneratedQuiz(
  raw: unknown,
  request: unknown,
  metadata: QuizMetadata,
): QuizVersion {
  const input = validateGenerationInput(request);
  try {
    let value: unknown = raw;
    if (typeof raw === "string") {
      if (raw.length > GENERATION_LIMITS.outputCharacters) throw new Error();
      value = JSON.parse(raw);
    } else {
      const serialized = JSON.stringify(raw);
      if (!serialized || serialized.length > GENERATION_LIMITS.outputCharacters) throw new Error();
      value = JSON.parse(serialized);
    }
    const output = outputSchema.parse(value);
    const prompts = output.questions.map((q) => normalize(q.prompt).toLowerCase());
    if (new Set(prompts).size !== prompts.length) throw new Error();
    const pages = new Map(input.pages.map((page) => [page.page, normalize(page.text)]));
    const questions = output.questions.map((question, index) => {
      const options = question.options.map((option) => normalize(option.text).toLowerCase());
      if (new Set(options).size !== options.length) throw new Error();
      const citations = new Set<string>();
      for (const source of question.sources) {
        const excerpt = normalize(source.excerpt);
        const key = JSON.stringify([source.page, excerpt]);
        if (!pages.get(source.page)?.includes(excerpt) || citations.has(key)) throw new Error();
        citations.add(key);
      }
      return {
        ...question,
        id: `q${index + 1}`,
        type: "mcq" as const,
        hints: [],
        sources: question.sources.map((source) => ({ ...source, documentId: input.documentId })),
      };
    });
    return quizVersionSchema.parse({ ...metadataSchema.parse(metadata), questions });
  } catch {
    // Do not attach causes or raw Zod/provider values: upstream reporters traverse causes.
    throw new GenerationValidationError("invalid-output");
  }
}
