import { handleSourceGeneration } from "./source-route.server";
import { SOURCE_CONTRACT, SOURCE_CONSENT, type SourceRequest } from "@/domain/source-material";
import { checkGeneratedQuizQuality, checkGeneratedStudyQuality } from "@/domain/generation-quality";
import { validateGenerationInput, validateGeneratedQuiz } from "@/domain/generation";
import {
  validateStudyRequest,
  validateGeneratedStudy,
  type StudyRequest,
} from "@/domain/study-material";
import { GENERATION_CONSENT_VERSION } from "@/domain/generation-policy";
import {
  GenerationFailure,
  readGenerationRequest,
  withDeadline,
  publicGenerationFailure,
} from "./boundary.server";
import { generationResponse } from "./service.server";
import { AI_LIMITS, callGroq, groqPayload, GENERATION_MODEL } from "./provider.server";
import { UpstashLedger, type StudyLedger } from "./ledger.server";
import { disabledGenerationRoute } from "./routes.server";
export interface AiConfig {
  validationGlobalCap?: 20 | 50;
  key: string;
  redisUrl: string;
  redisToken: string;
  secret: string;
  origin: string;
  allowedFormats: ("quiz" | "reviewer" | "flashcards")[];
}
export function getAiConfig(bindings: unknown): AiConfig | null {
  const env = typeof bindings === "object" && bindings ? (bindings as Record<string, unknown>) : {};
  const value = (name: string) => {
    const bound = env[name];
    return typeof bound === "string"
      ? bound
      : typeof process !== "undefined"
        ? process.env[name]
        : undefined;
  };
  if (value("PROOFQUEST_GENERATION_ENABLED") !== "true") return null;
  const key = value("GROQ_API_KEY"),
    redisUrl = value("UPSTASH_REDIS_REST_URL"),
    redisToken = value("UPSTASH_REDIS_REST_TOKEN"),
    secret = value("PROOFQUEST_GUEST_SECRET"),
    origin = value("PROOFQUEST_ORIGIN");
  if (!key || !redisUrl || !redisToken || !secret || secret.length < 32 || !origin) return null;
  try {
    const url = new URL(origin);
    if (
      url.origin !== origin ||
      (url.protocol !== "https:" &&
        !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname)))
    )
      return null;
    const allowedFormats = (value("PROOFQUEST_APPROVED_FORMATS") ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter((item): item is "quiz" | "reviewer" | "flashcards" =>
        ["quiz", "reviewer", "flashcards"].includes(item),
      );
    return {
      validationGlobalCap:
        value("PROOFQUEST_VALIDATION_GLOBAL_CAP") === "50" &&
        ["127.0.0.1", "localhost"].includes(url.hostname)
          ? 50
          : 20,
      key,
      redisUrl,
      redisToken,
      secret,
      origin,
      allowedFormats: [...new Set(allowedFormats)],
    };
  } catch {
    return null;
  }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const bytes = (text: string) => new TextEncoder().encode(text);
const hex = (data: ArrayBuffer) =>
  Array.from(new Uint8Array(data), (n) => n.toString(16).padStart(2, "0")).join("");
async function signingKey(secret: string) {
  return crypto.subtle.importKey("raw", bytes(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}
export async function guestCookie(secret: string, now = Date.now()) {
  const payload = `${crypto.randomUUID()}.${Math.floor(now / 1000) + 604800}`;
  return `${payload}.${hex(await crypto.subtle.sign("HMAC", await signingKey(secret), bytes(payload)))}`;
}
export async function verifyGuest(token: string | undefined, secret: string, now = Date.now()) {
  if (!token || token.length > 160) return null;
  const [id, expires, signature] = token.split(".");
  if (
    !id ||
    !uuid.test(id) ||
    !expires ||
    !/^\d{10}$/.test(expires) ||
    Number(expires) <= Math.floor(now / 1000) ||
    !signature ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    token.split(".").length !== 3
  )
    return null;
  const valid = await crypto.subtle.verify(
    "HMAC",
    await signingKey(secret),
    Uint8Array.from(signature.match(/../g)!, (x) => parseInt(x, 16)),
    bytes(`${id}.${expires}`),
  );
  return valid ? id : null;
}
function cookieValue(request: Request) {
  return request.headers
    .get("cookie")
    ?.split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("pq_guest="))
    ?.slice(9);
}
const error = (code: string, message: string, status: number) =>
  generationResponse({ code, message }, status);
export interface AiDependencies {
  ledger: StudyLedger;
  generateSource?: (input: SourceRequest, signal: AbortSignal) => Promise<unknown>;
  generate: (input: StudyRequest, signal: AbortSignal) => Promise<unknown>;
}
export async function handleAiRoute(
  request: Request,
  bindings?: unknown,
  dependencies?: AiDependencies,
): Promise<Response | null> {
  const url = new URL(request.url);
  if (
    ![
      "/api/generation/config",
      "/api/generation",
      "/api/study-generation",
      "/api/source-generation",
    ].includes(url.pathname)
  )
    return null;
  let job: string | undefined;
  let ledger: StudyLedger | undefined;
  let reserved = false;
  try {
    const config = getAiConfig(bindings);
    if (!config) return disabledGenerationRoute(request);
    if (url.origin !== config.origin || request.headers.get("sec-fetch-site") === "cross-site")
      return error("invalid-request", "Use this site's study controls.", 403);
    const origin = request.headers.get("origin");
    if (
      (origin && origin !== config.origin) ||
      (request.method === "POST" && origin !== config.origin)
    )
      return error("invalid-request", "Use this site's study controls.", 403);
    const guest = await verifyGuest(cookieValue(request), config.secret);
    if (url.pathname === "/api/generation/config") {
      if (request.method !== "GET") return error("invalid-request", "Use GET.", 405);
      const response = generationResponse({
        enabled: config.allowedFormats.length > 0,
        sourceContract: SOURCE_CONTRACT,
        allowedFormats: config.allowedFormats,
        provider: `Groq (${GENERATION_MODEL})`,
        retention:
          "Groq may retain reliability/abuse logs for up to 30 days, or longer where legally required, depending on account settings. Generated content and source excerpts are stored in Upstash for up to 24 hours for retry recovery. Usage counters expire within 48 hours.",
        maxInputBytes: AI_LIMITS.inputBytes,
        guestDailyLimit: AI_LIMITS.guestDaily,
      });
      if (!guest)
        response.headers.set(
          "set-cookie",
          `pq_guest=${await guestCookie(config.secret)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${url.protocol === "https:" ? "; Secure" : ""}`,
        );
      return response;
    }
    if (request.method !== "POST") return error("invalid-request", "Use POST.", 405);
    const key = request.headers.get("idempotency-key");
    if (
      !guest ||
      !key ||
      !uuid.test(key) ||
      request.headers.get("x-generation-consent") !==
        (url.pathname === "/api/source-generation" ? SOURCE_CONSENT : GENERATION_CONSENT_VERSION)
    )
      return error("invalid-request", "Reload and confirm the selected text transfer.", 400);
    if (url.pathname === "/api/source-generation")
      return handleSourceGeneration(request, config, guest, key, dependencies);
    const input = await readGenerationRequest(request, 30000, (raw) => {
      if (url.pathname === "/api/generation") {
        const quiz = validateGenerationInput(raw);
        return validateStudyRequest({
          documentId: quiz.documentId,
          pages: quiz.pages,
          format: "quiz",
        });
      }
      const study = validateStudyRequest(raw);
      if (study.format === "quiz") throw new GenerationFailure("invalid-request");
      return study;
    });
    if (!config.allowedFormats.includes(input.format))
      return error(
        "unavailable",
        "This study format has not passed this host's quality acceptance.",
        503,
      );
    groqPayload(input); // Enforce provider-specific byte/token reservation BEFORE counting or calling.
    const fingerprint = hex(await crypto.subtle.digest("SHA-256", bytes(JSON.stringify(input))));
    job = `${guest}:${key}`;
    ledger =
      dependencies?.ledger ??
      new UpstashLedger(
        config.redisUrl,
        config.redisToken,
        undefined,
        undefined,
        config.validationGlobalCap,
      );
    const reservation = await ledger.reserve(job, guest, fingerprint);
    if (reservation.status === "complete") {
      const cached = validateCachedResult(reservation.result, input);
      if ("version" in cached) checkGeneratedQuizQuality(cached.version);
      else checkGeneratedStudyQuality(cached.material);
      return generationResponse(cached);
    }
    if (reservation.status !== "reserved")
      return error(
        reservation.status,
        reservation.status === "limited"
          ? "Generation capacity is busy or exhausted. Wait at least 65 seconds, or try again tomorrow if the daily allowance is used."
          : "This request cannot start again. Retry pending requests or start a new request after reviewing the source.",
        reservation.status === "limited" ? 429 : 409,
      );
    reserved = true;
    const result = await withDeadline(
      async (signal) => {
        const output = await (
          dependencies?.generate ?? ((source, abort) => callGroq(config.key, source, abort))
        )(structuredClone(input), signal);
        if (signal.aborted) throw new GenerationFailure("cancelled");
        const id = `generated-${key}`;
        if (input.format === "quiz")
          return {
            version: checkGeneratedQuizQuality(
              validateGeneratedQuiz(
                output,
                { documentId: input.documentId, pages: input.pages, questionCount: 5 },
                { id, quizId: id, title: "Quiz from selected PDF pages", createdAt: Date.now() },
              ),
            ),
          };
        return {
          material: checkGeneratedStudyQuality(
            validateGeneratedStudy(output, input, {
              id,
              title:
                input.format === "reviewer"
                  ? "Reviewer from selected PDF pages"
                  : "Flashcards from selected PDF pages",
              createdAt: Date.now(),
            }),
          ),
        };
      },
      { signal: request.signal },
    );
    await ledger.complete(job, result);
    return generationResponse(result);
  } catch (failure) {
    if (reserved && ledger && job) {
      try {
        await ledger.fail(job);
      } catch {
        /* Keep charged reservation; never log secrets or source text. */
      }
    }
    const safe = publicGenerationFailure(failure);
    return generationResponse(
      safe,
      safe.code === "provider-limited"
        ? 429
        : safe.code === "payload-too-large"
          ? 413
          : safe.code === "invalid-request"
            ? 400
            : safe.code === "timeout"
              ? 504
              : safe.code === "cancelled"
                ? 499
                : 503,
    );
  }
}
function validateCachedResult(value: unknown, input: StudyRequest) {
  // Cached JSON is untrusted as well: revalidate against this exact source and format.
  const record = value as Record<string, unknown>;
  if (input.format === "quiz") {
    const version = record?.["version"] as import("@/domain/quiz").QuizVersion;
    if (!version || !Array.isArray(version.questions))
      throw new GenerationFailure("invalid-output");
    return {
      version: validateGeneratedQuiz(
        {
          questions: version.questions.map((q) => {
            if (q.type !== "mcq" || q.sources.some((s) => s.documentId !== input.documentId))
              throw new GenerationFailure("invalid-output");
            return {
              prompt: q.prompt,
              options: q.options,
              correctOptionId: q.correctOptionId,
              explanation: q.explanation,
              sources: q.sources.map((s) => ({ page: s.page, excerpt: s.excerpt })),
            };
          }),
        },
        { documentId: input.documentId, pages: input.pages, questionCount: 5 },
        {
          id: version.id,
          quizId: version.quizId,
          title: version.title,
          createdAt: version.createdAt,
        },
      ),
    };
  }
  const material = record?.["material"] as import("@/domain/study-material").StudyMaterial;
  if (!material || material.documentId !== input.documentId)
    throw new GenerationFailure("invalid-output");
  const { id, title, createdAt, documentId: _documentId, ...output } = material;
  return { material: validateGeneratedStudy(output, input, { id, title, createdAt }) };
}
