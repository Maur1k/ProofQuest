import {
  GenerationValidationError,
  validateGeneratedQuiz,
  validateGenerationInput,
  type QuestionGenerator,
} from "@/domain/generation";

/** Unconnected server helpers. These do not authorize spending or expose an endpoint. */
export const GENERATION_SERVER_LIMITS = Object.freeze({
  requestBytes: 256_000,
  deadlineMs: 30_000,
});
const messages = {
  "invalid-request": "The generation request is invalid.",
  "payload-too-large": "The selected text exceeds the request limit.",
  "invalid-output": "The generated questions could not be verified.",
  unavailable: "Generation is unavailable. Please try again later.",
  timeout: "Generation timed out. No result was accepted.",
  cancelled: "Generation was cancelled. No result was accepted.",
} as const;
export type GenerationFailureCode = keyof typeof messages;
export class GenerationFailure extends Error {
  constructor(readonly code: GenerationFailureCode) {
    super(messages[code]);
    this.name = "GenerationFailure";
  }
}
/** Deliberately exclude causes, request text, vendor bodies and stack traces. */
export function publicGenerationFailure(error: unknown): {
  code: GenerationFailureCode;
  message: string;
} {
  const code = error instanceof GenerationFailure ? error.code : "unavailable";
  return { code, message: messages[code] };
}
function sanitized(error: unknown): GenerationFailure {
  if (error instanceof GenerationFailure) return new GenerationFailure(error.code);
  if (error instanceof GenerationValidationError)
    return new GenerationFailure(
      error.code === "invalid-input" ? "invalid-request" : "invalid-output",
    );
  return new GenerationFailure("unavailable");
}
interface DeadlineOptions {
  signal?: AbortSignal;
  deadlineMs?: number;
}
async function withDeadline<T>(
  work: (signal: AbortSignal) => Promise<T>,
  options: DeadlineOptions,
): Promise<T> {
  const deadline = options.deadlineMs ?? GENERATION_SERVER_LIMITS.deadlineMs;
  if (!Number.isSafeInteger(deadline) || deadline < 1 || deadline > 60_000)
    throw new GenerationFailure("invalid-request");
  if (options.signal?.aborted) throw new GenerationFailure("cancelled");
  const controller = new AbortController();
  let rejectAbort!: (error: GenerationFailure) => void;
  const interrupted = new Promise<never>((_, reject) => {
    rejectAbort = reject;
  });
  const interrupt = (code: "timeout" | "cancelled") => {
    rejectAbort(new GenerationFailure(code));
    controller.abort(); // Never propagate caller/provider-controlled abort reasons.
  };
  const onAbort = () => interrupt("cancelled");
  options.signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => interrupt("timeout"), deadline);
  try {
    const value = await Promise.race([
      Promise.resolve().then(() => work(controller.signal)),
      interrupted,
    ]);
    if (controller.signal.aborted)
      throw new GenerationFailure(options.signal?.aborted ? "cancelled" : "timeout");
    return value;
  } catch (error) {
    throw sanitized(error);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onAbort);
  }
}

/** Bound streamed bytes before JSON parsing; Content-Length is never the sole check. */
export async function readGenerationRequest(
  request: Request,
  deadlineMs: number = GENERATION_SERVER_LIMITS.deadlineMs,
) {
  return withDeadline(
    async (signal) => {
      if (signal.aborted) throw new GenerationFailure("cancelled");
      if (
        request.method !== "POST" ||
        request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !==
          "application/json" ||
        !request.body
      )
        throw new GenerationFailure("invalid-request");
      const encoding = request.headers.get("content-encoding");
      if (encoding && encoding.toLowerCase() !== "identity")
        throw new GenerationFailure("invalid-request");
      const declared = request.headers.get("content-length");
      if (declared !== null) {
        if (!/^\d+$/.test(declared) || !Number.isSafeInteger(Number(declared)))
          throw new GenerationFailure("invalid-request");
        if (Number(declared) > GENERATION_SERVER_LIMITS.requestBytes)
          throw new GenerationFailure("payload-too-large");
      }
      const reader = request.body.getReader();
      const cancel = () => {
        void reader.cancel().catch(() => {});
      };
      signal.addEventListener("abort", cancel, { once: true });
      const decoder = new TextDecoder("utf-8", { fatal: true });
      let bytes = 0;
      const parts: string[] = [];
      try {
        while (true) {
          const chunk = await reader.read();
          if (signal.aborted) throw new GenerationFailure("cancelled");
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > GENERATION_SERVER_LIMITS.requestBytes)
            throw new GenerationFailure("payload-too-large");
          parts.push(decoder.decode(chunk.value, { stream: true }));
        }
        parts.push(decoder.decode());
        let input: unknown;
        try {
          input = JSON.parse(parts.join(""));
        } catch {
          throw new GenerationFailure("invalid-request");
        }
        return validateGenerationInput(input);
      } catch (error) {
        cancel();
        if (error instanceof TypeError || error instanceof SyntaxError)
          throw new GenerationFailure("invalid-request");
        throw error;
      } finally {
        signal.removeEventListener("abort", cancel);
        reader.releaseLock();
      }
    },
    { signal: request.signal, deadlineMs },
  );
}

/** For a later server orchestrator only, AFTER consent and durable budget reservation.
 * No route imports this helper. No provider is configured. Success is not persisted here.
 * The adapter must cap response bytes and tokens; cancellation cannot guarantee no billing.
 */
export async function runGeneration(
  provider: QuestionGenerator,
  input: unknown,
  metadata: Parameters<typeof validateGeneratedQuiz>[2],
  options: DeadlineOptions = {},
) {
  return withDeadline(async (signal) => {
    if (signal.aborted) throw new GenerationFailure("cancelled");
    const validated = validateGenerationInput(input);
    // Retain the validated source for evidence checks even if an adapter mutates its argument.
    const output = await provider.generate(structuredClone(validated), signal);
    if (signal.aborted) throw new GenerationFailure("cancelled");
    return validateGeneratedQuiz(output, validated, metadata);
  }, options);
}
