import { GENERATION_CONSENT_VERSION } from "@/domain/generation-policy";
import type { QuestionGenerator } from "@/domain/generation";
import { quizVersionSchema, type QuizVersion } from "@/domain/quiz";
import { readGenerationRequest, runGeneration, publicGenerationFailure } from "./boundary.server";

export type Reservation =
  | { status: "reserved" }
  | { status: "complete"; version: QuizVersion }
  | { status: "pending" | "failed" | "limited" | "conflict" };
/** Production implementations must reserve atomically and durably across all active hosts. */
export interface GenerationLedger {
  reserve(jobId: string, guestId: string, fingerprint: string): Promise<Reservation>;
  complete(jobId: string, version: QuizVersion): Promise<void>;
  fail(jobId: string): Promise<void>;
}
export interface GenerationRuntime {
  provider: QuestionGenerator;
  ledger: GenerationLedger;
  maxInputBytes: number;
}
export function generationResponse(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
  });
}
const safeError = (code: string, message: string, status: number) =>
  generationResponse({ code, message }, status);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function generateForGuest(
  request: Request,
  guestId: string,
  runtime: GenerationRuntime,
) {
  let jobId: string | null = null;
  let reserved = false;
  try {
    const key = request.headers.get("idempotency-key");
    if (
      !uuid.test(guestId) ||
      !key ||
      !uuid.test(key) ||
      request.headers.get("x-generation-consent") !== GENERATION_CONSENT_VERSION
    )
      return safeError("invalid-request", "Confirm the text transfer before generation.", 400);
    const input = await readGenerationRequest(request);
    const encoded = new TextEncoder().encode(JSON.stringify(input));
    if (encoded.byteLength > runtime.maxInputBytes)
      return safeError(
        "payload-too-large",
        "Select fewer pages or less text for this service.",
        413,
      );
    const hash = await crypto.subtle.digest("SHA-256", encoded);
    const fingerprint = Array.from(new Uint8Array(hash), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    jobId = `${guestId}:${key}`;
    const reservation = await runtime.ledger.reserve(jobId, guestId, fingerprint);
    if (reservation.status === "complete")
      return generationResponse({ version: quizVersionSchema.parse(reservation.version) });
    if (reservation.status === "pending")
      return safeError(
        "pending",
        "This request is still running. Retry this same request shortly.",
        409,
      );
    if (reservation.status === "failed")
      return safeError(
        "failed",
        "This request ended without a saved result. Start a new request to try again; it uses another allowance.",
        409,
      );
    if (reservation.status === "conflict")
      return safeError(
        "conflict",
        "The request changed. Start a new request after reviewing the selected pages.",
        409,
      );
    if (reservation.status === "limited")
      return safeError(
        "limited",
        "The generation allowance is temporarily exhausted. Existing quizzes remain available.",
        429,
      );
    reserved = true;
    const version = await runGeneration(
      runtime.provider,
      input,
      {
        id: `generated-${key}`,
        quizId: `generated-${key}`,
        title: "Quiz from selected PDF pages",
        createdAt: Date.now(),
      },
      { signal: request.signal },
    );
    // Failure to durably record success must never return an untracked success to the client.
    await runtime.ledger.complete(jobId, version);
    return generationResponse({ version });
  } catch (error) {
    if (reserved && jobId) {
      try {
        await runtime.ledger.fail(jobId);
      } catch {
        /* Fail closed; do not log private values or retry the provider. */
      }
    }
    const failure = publicGenerationFailure(error);
    const status =
      failure.code === "invalid-request"
        ? 400
        : failure.code === "payload-too-large"
          ? 413
          : failure.code === "timeout"
            ? 504
            : failure.code === "cancelled"
              ? 499
              : 503;
    return generationResponse(failure, status);
  }
}
