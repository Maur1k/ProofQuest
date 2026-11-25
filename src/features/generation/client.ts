import { z } from "zod";
import { validateGeneratedStudy, type StudyRequest } from "@/domain/study-material";
import { GENERATION_CONSENT_VERSION } from "@/domain/generation-policy";
import { type GenerationInput } from "@/domain/generation";
import { quizVersionSchema } from "@/domain/quiz";
export const availabilitySchema = z
  .object({
    enabled: z.boolean(),
    sourceContract: z.literal("source-material-v1").optional(),
    allowedFormats: z.array(z.enum(["quiz", "reviewer", "flashcards"])).optional(),
    provider: z.string().max(100),
    retention: z.string().max(1000),
    maxInputBytes: z.number().int().positive(),
    guestDailyLimit: z.number().int().nonnegative(),
  })
  .strict();
export class GenerationClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "GenerationClientError";
  }
}
const messages: Record<string, string> = {
  "provider-limited":
    "The AI provider allowance is used. Try later; saved materials remain available.",
  pending: "This request is still running. Retry the same request shortly.",
  failed: "This request ended without a result. Start a new request if you want to try again.",
  conflict: "The selected text changed. Review it and start a new request.",
  limited:
    "Generation is busy or the allowance is used. Wait at least 65 seconds before retrying; daily allowances reset at 00:00 UTC. Saved materials remain available.",
  "payload-too-large": "Select fewer pages for this service.",
  "invalid-output": "The generated material did not pass verification. Nothing was saved.",
  timeout: "Generation timed out. Retry this same request to check its status.",
  cancelled: "Generation was cancelled.",
  unavailable: "Generation is currently unavailable. Retry later.",
};
export async function requestGeneratedQuiz(
  input: GenerationInput,
  requestId: string,
  signal: AbortSignal,
) {
  let response: Response;
  try {
    response = await fetch("/api/generation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": requestId,
        "x-generation-consent": GENERATION_CONSENT_VERSION,
      },
      body: JSON.stringify(input),
      signal,
    });
  } catch {
    throw new GenerationClientError(
      signal.aborted ? "cancelled" : "unavailable",
      signal.aborted ? messages["cancelled"]! : messages["unavailable"]!,
    );
  }
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const parsed = z.object({ code: z.string() }).safeParse(value);
    const code = parsed.success ? parsed.data.code : "unavailable";
    throw new GenerationClientError(code, messages[code] ?? messages["unavailable"]!);
  }
  const parsed = z.object({ version: quizVersionSchema }).strict().safeParse(value);
  if (!parsed.success)
    throw new GenerationClientError("invalid-output", messages["invalid-output"]!);
  return parsed.data.version;
}

export async function requestGeneratedStudy(
  input: StudyRequest,
  requestId: string,
  signal: AbortSignal,
) {
  let response: Response;
  try {
    response = await fetch("/api/study-generation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": requestId,
        "x-generation-consent": GENERATION_CONSENT_VERSION,
      },
      body: JSON.stringify(input),
      signal,
    });
  } catch {
    throw new GenerationClientError(
      signal.aborted ? "cancelled" : "unavailable",
      signal.aborted ? messages["cancelled"]! : messages["unavailable"]!,
    );
  }
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const error = z.object({ code: z.string() }).safeParse(value);
    const code = error.success ? error.data.code : "unavailable";
    throw new GenerationClientError(code, messages[code] ?? messages["unavailable"]!);
  }
  try {
    const { material } = z
      .object({ material: z.record(z.unknown()) })
      .strict()
      .parse(value);
    const { id, title, createdAt, documentId, ...output } = material;
    const header = z
      .object({ id: z.string(), title: z.string(), createdAt: z.number() })
      .parse({ id, title, createdAt });
    if (documentId !== input.documentId) throw new Error();
    return validateGeneratedStudy(output, input, header);
  } catch {
    throw new GenerationClientError(
      "invalid-output",
      "Generated study material failed verification. Nothing was saved.",
    );
  }
}
