// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import {
  readGenerationRequest,
  runGeneration,
  publicGenerationFailure,
  GENERATION_SERVER_LIMITS,
} from "@/server/generation/boundary.server";
const text =
  "Active recall means retrieving information from memory. The original source can be checked for evidence.";
const input = () => ({ documentId: "doc", pages: [{ page: 1, text }], questionCount: 5 });
const metadata = { id: "v", quizId: "q", title: "Study", createdAt: 1 };
const output = () => ({
  questions: Array.from({ length: 5 }, (_, i) => ({
    prompt: `Question ${i}?`,
    options: [
      { id: "a", text: "Recall" },
      { id: "b", text: "Copy" },
      { id: "c", text: "Sleep" },
      { id: "d", text: "Erase" },
    ],
    correctOptionId: "a",
    explanation: "Recall retrieves information.",
    sources: [{ page: 1, excerpt: "Active recall means retrieving information from memory." }],
  })),
});
function request(body: string, headers: Record<string, string> = {}) {
  return new Request("https://local.test/generate", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it("reads valid selected text and rejects unsupported request forms before generation", async () => {
  expect(await readGenerationRequest(request(JSON.stringify(input())))).toEqual(input());
  for (const req of [
    new Request("https://local.test"),
    request("{}", { "content-type": "text/plain" }),
    request("{}", { "content-encoding": "gzip" }),
    request("{}", { "content-length": "bad" }),
    request("{"),
    request(JSON.stringify({ ...input(), apiKey: "not-allowed" })),
  ])
    await expect(readGenerationRequest(req)).rejects.toMatchObject({ code: "invalid-request" });
});
it("enforces actual UTF-8 bytes even when Content-Length claims a smaller payload", async () => {
  await expect(
    readGenerationRequest(
      request("{}", { "content-length": String(GENERATION_SERVER_LIMITS.requestBytes + 1) }),
    ),
  ).rejects.toMatchObject({ code: "payload-too-large" });
  const body = JSON.stringify({ ...input(), pages: [{ page: 1, text: "😀".repeat(70_000) }] });
  await expect(
    readGenerationRequest(request(body, { "content-length": "2" })),
  ).rejects.toMatchObject({ code: "payload-too-large" });
});
it("decodes split UTF-8 chunks and cancels a stalled request at the deadline", async () => {
  const encoded = new TextEncoder().encode(
    JSON.stringify({ ...input(), pages: [{ page: 1, text: text + " 😀" }] }),
  );
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      for (const byte of encoded) c.enqueue(new Uint8Array([byte]));
      c.close();
    },
  });
  const streamed = new Request("https://local.test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: stream,
    duplex: "half",
  } as RequestInit);
  expect((await readGenerationRequest(streamed)).pages[0]!.text).toContain("😀");
  vi.useFakeTimers();
  const cancel = vi.fn();
  const stalled = new Request("https://local.test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: new ReadableStream({ cancel }),
    duplex: "half",
  } as RequestInit);
  const result = readGenerationRequest(stalled, 10);
  const assertion = expect(result).rejects.toMatchObject({ code: "timeout" });
  await vi.advanceTimersByTimeAsync(11);
  await assertion;
  expect(cancel).toHaveBeenCalledOnce();
});
it("validates provider output and prevents adapter mutation from changing accepted evidence", async () => {
  const generate = vi.fn().mockResolvedValue(output());
  expect((await runGeneration({ generate }, input(), metadata)).questions).toHaveLength(5);
  const mutated = {
    generate: vi.fn(async (value: ReturnType<typeof input>) => {
      value.pages[0]!.text = "Invented";
      const result = output();
      result.questions[0]!.sources[0]!.excerpt = "Invented";
      return result;
    }),
  };
  await expect(runGeneration(mutated, input(), metadata)).rejects.toMatchObject({
    code: "invalid-output",
  });
});
it("never calls the provider for invalid or already-cancelled input", async () => {
  const generate = vi.fn();
  await expect(runGeneration({ generate }, {}, metadata)).rejects.toMatchObject({
    code: "invalid-request",
  });
  const abort = new AbortController();
  abort.abort("PRIVATE_REASON");
  await expect(
    runGeneration({ generate }, input(), metadata, { signal: abort.signal }),
  ).rejects.toMatchObject({ code: "cancelled" });
  expect(generate).not.toHaveBeenCalled();
});
it("times out an uncooperative provider, aborts it and ignores late output", async () => {
  vi.useFakeTimers();
  let resolve!: (output: unknown) => void;
  let providerSignal!: AbortSignal;
  const generate = vi.fn((_input, signal) => {
    providerSignal = signal;
    return new Promise((done) => {
      resolve = done;
    });
  });
  const result = runGeneration({ generate }, input(), metadata, { deadlineMs: 10 });
  const assertion = expect(result).rejects.toMatchObject({ code: "timeout" });
  await vi.advanceTimersByTimeAsync(11);
  await assertion;
  expect(providerSignal.aborted).toBe(true);
  resolve(output());
  await Promise.resolve();
  expect(generate).toHaveBeenCalledOnce();
});
it("propagates cancellation without exposing caller reasons or provider failure bodies", async () => {
  const sentinel = "PRIVATE_PDF_AND_FAKE_SECRET";
  const abort = new AbortController();
  const generate = vi.fn(() => new Promise<unknown>(() => {}));
  const result = runGeneration({ generate }, input(), metadata, { signal: abort.signal });
  const assertion = expect(result).rejects.toMatchObject({ code: "cancelled" });
  abort.abort(sentinel);
  await assertion;
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    await runGeneration(
      {
        generate: async () => {
          throw new Error(sentinel, { cause: new Error(sentinel) });
        },
      },
      input(),
      metadata,
    );
    throw new Error("expected rejection");
  } catch (error) {
    expect(publicGenerationFailure(error)).toEqual({
      code: "unavailable",
      message: "Generation is unavailable. Please try again later.",
    });
    expect(String(error) + JSON.stringify(error)).not.toContain(sentinel);
    expect((error as Error).cause).toBeUndefined();
  }
  expect(log).not.toHaveBeenCalled();
});
