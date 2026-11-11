import { z } from "zod";
import { GENERATION_CONSENT_VERSION } from "@/domain/generation-policy";
import { type GenerationInput } from "@/domain/generation";
import { quizVersionSchema } from "@/domain/quiz";
export const availabilitySchema = z
  .object({
    enabled: z.boolean(),
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
  pending: "This request is still running. Retry the same request shortly.",
  failed: "This request ended without a result. Start a new request if you want to try again.",
  conflict: "The selected text changed. Review it and start a new request.",
  limited: "Generation allowance reached. Try later; saved quizzes remain available.",
  "payload-too-large": "Select fewer pages for this service.",
  "invalid-output": "The generated questions did not pass verification. No quiz was saved.",
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
