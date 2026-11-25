import { SOURCE_PROMPT_VERSION } from "@/domain/source-material";
import { GENERATION_MODEL } from "./provider.server";
import {
  sourceRequestSchema,
  checkSourceMaterial,
  SOURCE_CONTRACT,
  type SourceRequest,
} from "@/domain/source-material";
import { sourcePayload, generateSource } from "./source-provider.server";
import { UpstashLedger, type StudyLedger } from "./ledger.server";
import {
  readGenerationRequest,
  withDeadline,
  GenerationFailure,
  publicGenerationFailure,
} from "./boundary.server";
import { generationResponse } from "./service.server";
import type { AiConfig } from "./runtime.server";
export interface SourceDependencies {
  ledger: StudyLedger;
  generateSource?: (input: SourceRequest, signal: AbortSignal) => Promise<unknown>;
}
export async function handleSourceGeneration(
  request: Request,
  config: AiConfig,
  guest: string,
  key: string,
  deps?: SourceDependencies,
) {
  const ledger =
    deps?.ledger ??
    new UpstashLedger(
      config.redisUrl,
      config.redisToken,
      undefined,
      undefined,
      config.validationGlobalCap,
    );
  const job = `${guest}:${key}`;
  let reserved = false;
  try {
    const input = await readGenerationRequest(request, 30000, (raw) => {
      const parsed = sourceRequestSchema.safeParse(raw);
      if (!parsed.success) throw new GenerationFailure("invalid-request");
      return parsed.data;
    });
    if (input.source.kind === "sample" || !config.allowedFormats.includes(input.format))
      throw new GenerationFailure("unavailable");
    sourcePayload(input);
    const fingerprint = Array.from(
      new Uint8Array(
        await crypto.subtle.digest(
          "SHA-256",
          new TextEncoder().encode(
            JSON.stringify({
              operation: "generate-source",
              model: GENERATION_MODEL,
              promptVersion: SOURCE_PROMPT_VERSION,
              validationVersion: "single-answer-v1",
              input,
            }),
          ),
        ),
      ),
      (n) => n.toString(16).padStart(2, "0"),
    ).join("");
    const reservation = await ledger.reserve(job, guest, fingerprint);
    if (reservation.status === "complete") {
      const material = checkSourceMaterial(reservation.result);
      if (
        JSON.stringify(material.request) !== JSON.stringify(input) ||
        material.id !== `source-generated-${key}`
      )
        throw new GenerationFailure("invalid-output");
      return generationResponse({ material });
    }
    if (reservation.status !== "reserved")
      return generationResponse(
        {
          code: reservation.status,
          message: "Retry the same pending request, or wait for available allowance.",
        },
        reservation.status === "limited" ? 429 : 409,
      );
    reserved = true;
    const output = await withDeadline(
      (signal) =>
        (deps?.generateSource ?? ((input, abort) => generateSource(config.key, input, abort)))(
          input,
          signal,
        ),
      { signal: request.signal },
    );
    let material;
    try {
      material = checkSourceMaterial({
        contract: SOURCE_CONTRACT,
        id: `source-generated-${key}`,
        title: input.source.title,
        createdAt: Date.now(),
        request: input,
        generation: {
          provider: "groq",
          model: GENERATION_MODEL,
          promptVersion: SOURCE_PROMPT_VERSION,
          validationVersion: "single-answer-v1",
          reviewStatus: "structural-pass",
        },
        output,
      });
    } catch {
      throw new GenerationFailure("invalid-output");
    }
    await ledger.complete(job, material);
    return generationResponse({ material });
  } catch (failure) {
    if (reserved)
      try {
        await ledger.fail(job);
      } catch {
        /* Keep reservation charged. */
      }
    const safe = publicGenerationFailure(failure);
    return generationResponse(
      safe,
      safe.code === "payload-too-large"
        ? 413
        : safe.code === "invalid-request"
          ? 400
          : safe.code === "provider-limited"
            ? 429
            : 503,
    );
  }
}
