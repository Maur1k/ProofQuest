// @vitest-environment node
import { expect, it, vi } from "vitest";
import { handleAiRoute, guestCookie, verifyGuest } from "@/server/generation/runtime.server";
import { callGroq, groqPayload, boundedJson } from "@/server/generation/provider.server";
import { UpstashLedger } from "@/server/generation/ledger.server";
const origin = "http://127.0.0.1:4191";
const config = {
  PROOFQUEST_GENERATION_ENABLED: "true",
  PROOFQUEST_APPROVED_FORMATS: "quiz,reviewer,flashcards",
  PROOFQUEST_ORIGIN: origin,
  GROQ_API_KEY: "SECRET_SENTINEL",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "REDIS_SECRET",
  PROOFQUEST_GUEST_SECRET: "s".repeat(64),
};
const text =
  "Plants use sunlight to make sugars through photosynthesis. Roots absorb water from the soil. Leaves exchange gases through pores called stomata. Chlorophyll is a green pigment that absorbs light. Carbon dioxide supplies carbon for sugars.";
const input = { documentId: "public", pages: [{ page: 1, text }], questionCount: 5 };
const study = { documentId: "public", pages: input.pages, format: "flashcards" as const };
const output = {
  format: "flashcards",
  cards: [
    {
      front: "What absorbs water?",
      back: "Roots absorb water from the soil.",
      sources: [{ page: 1, excerpt: "Roots absorb water from the soil." }],
    },
  ],
  excluded: [],
};
async function request(
  body: unknown = study,
  path = "/api/study-generation",
  id = crypto.randomUUID(),
) {
  return new Request(origin + path, {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "idempotency-key": id,
      "x-generation-consent": "2026-11-11",
      cookie: `pq_guest=${await guestCookie(config.PROOFQUEST_GUEST_SECRET)}`,
    },
    body: JSON.stringify(body),
  });
}
function deps() {
  return {
    ledger: {
      reserve: vi.fn().mockResolvedValue({ status: "reserved" }),
      complete: vi.fn().mockResolvedValue(undefined),
      fail: vi.fn().mockResolvedValue(undefined),
    },
    generate: vi.fn().mockResolvedValue(output),
  };
}
it("signs expiring guest identities and rejects tampering", async () => {
  const token = await guestCookie(config.PROOFQUEST_GUEST_SECRET, 1700000000000);
  expect(await verifyGuest(token, config.PROOFQUEST_GUEST_SECRET, 1700000001000)).toBeTruthy();
  expect(await verifyGuest(token + "x", config.PROOFQUEST_GUEST_SECRET, 1700000001000)).toBeNull();
  expect(await verifyGuest(token, config.PROOFQUEST_GUEST_SECRET, 1800000000000)).toBeNull();
});
it("fails closed without opt-in and mints HttpOnly guest cookies only on the configured origin", async () => {
  const disabled = await handleAiRoute(new Request(origin + "/api/generation/config"), {});
  expect((await disabled!.json()).enabled).toBe(false);
  const response = await handleAiRoute(new Request(origin + "/api/generation/config"), config);
  expect(response!.headers.get("set-cookie")).toContain("HttpOnly; SameSite=Strict");
  expect((await response!.json()).provider).toContain("Groq");
  expect(
    (await handleAiRoute(new Request("https://attacker.test/api/generation/config"), config))!
      .status,
  ).toBe(403);
});
it("checks origin, identity and consent before touching allowance or provider", async () => {
  for (const field of ["origin", "cookie", "x-generation-consent"]) {
    const req = await request();
    req.headers.delete(field);
    const d = deps();
    expect((await handleAiRoute(req, config, d))!.status).toBeGreaterThanOrEqual(400);
    expect(d.ledger.reserve).not.toHaveBeenCalled();
    expect(d.generate).not.toHaveBeenCalled();
  }
});
it("reserves and commits before returning source-validated material; identical cached retries skip generation", async () => {
  const d = deps();
  const req = await request();
  const response = await handleAiRoute(req.clone(), config, d);
  expect(response!.status).toBe(200);
  const value = await response!.json();
  expect(d.ledger.reserve.mock.invocationCallOrder[0]).toBeLessThan(
    d.generate.mock.invocationCallOrder[0]!,
  );
  expect(d.ledger.complete).toHaveBeenCalledWith(expect.any(String), value);
  d.ledger.reserve.mockResolvedValue({ status: "complete", result: value });
  expect((await handleAiRoute(req, config, d))!.status).toBe(200);
  expect(d.generate).toHaveBeenCalledOnce();
});
it("never generates when quota fails and never exposes provider or database errors", async () => {
  const d = deps();
  d.ledger.reserve.mockResolvedValue({ status: "limited" });
  expect((await handleAiRoute(await request(), config, d))!.status).toBe(429);
  expect(d.generate).not.toHaveBeenCalled();
  d.ledger.reserve.mockRejectedValue(new Error("SECRET_SENTINEL"));
  const response = await handleAiRoute(await request(), config, d);
  expect(response!.status).toBe(503);
  expect(await response!.text()).not.toContain("SECRET_SENTINEL");
});
it("does not commit fabricated evidence or return success after a ledger failure", async () => {
  const d = deps();
  d.generate.mockResolvedValue({
    ...output,
    cards: [{ ...output.cards[0], sources: [{ page: 1, excerpt: "invented" }] }],
  });
  expect((await handleAiRoute(await request(), config, d))!.status).toBe(503);
  expect(d.ledger.complete).not.toHaveBeenCalled();
  d.generate.mockResolvedValue(output);
  d.ledger.complete.mockRejectedValue(new Error("REDIS_SECRET"));
  const response = await handleAiRoute(await request(), config, d);
  expect(response!.status).toBe(503);
  expect(await response!.text()).not.toContain("REDIS_SECRET");
  expect(d.ledger.fail).toHaveBeenCalled();
});
it("reserves format as part of the fingerprint and rejects overly large sources before allowance", async () => {
  const d = deps();
  await handleAiRoute(await request(), config, d);
  const fingerprint = d.ledger.reserve.mock.calls[0]![2];
  await handleAiRoute(await request({ ...study, format: "reviewer" }), config, d);
  expect(d.ledger.reserve.mock.calls[1]![2]).not.toBe(fingerprint);
  d.ledger.reserve.mockClear();
  const response = await handleAiRoute(
    await request({ ...input, pages: [{ page: 1, text: "x".repeat(4000) }] }, "/api/generation"),
    config,
    d,
  );
  expect(response!.status).toBe(413);
  expect(d.ledger.reserve).not.toHaveBeenCalled();
});
it("sends only source pages to Groq with strict schema, completion cap and no automatic retries", async () => {
  const fetcher = vi.fn().mockResolvedValue(
    Response.json({
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: JSON.stringify({
              format: "flashcards",
              cards: [{ front: "What absorbs water?", evidenceId: "p1-s2" }],
              excluded: [],
            }),
          },
        },
      ],
    }),
  );
  expect(await callGroq("secret", study, new AbortController().signal, fetcher)).toEqual(output);
  const body = JSON.parse(fetcher.mock.calls[0]![1].body);
  expect(body.response_format.json_schema.strict).toBe(true);
  expect(body.max_completion_tokens).toBe(2500);
  expect(body.messages[1].content).not.toContain("documentId");
  expect(() => groqPayload({ ...study, pages: [{ page: 1, text: "x".repeat(6000) }] })).toThrow();
  fetcher.mockResolvedValue(new Response("SECRET_SENTINEL", { status: 429 }));
  await expect(callGroq("secret", study, new AbortController().signal, fetcher)).rejects.toThrow(
    "The AI provider allowance",
  );
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("bounds response bytes and rejects incomplete model output", async () => {
  await expect(
    boundedJson(new Response("x".repeat(100)), new AbortController().signal, 50),
  ).rejects.toThrow();
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      Response.json({ choices: [{ finish_reason: "length", message: { content: "{}" } }] }),
    );
  await expect(callGroq("secret", study, new AbortController().signal, fetcher)).rejects.toThrow();
});
it("rejects unsafe Redis destinations and malformed responses without exposing credentials", async () => {
  expect(() => new UpstashLedger("https://attacker.test/", "secret")).toThrow();
  const fetcher = vi.fn().mockResolvedValue(Response.json({ error: "REDIS_SECRET" }));
  const ledger = new UpstashLedger("https://example.upstash.io", "secret", "test", fetcher);
  await expect(ledger.reserve("job", "guest", "fingerprint")).rejects.toThrow(
    "Generation is unavailable",
  );
});

it("rejects newly generated ambiguous choices before committing and sanitizes cached failures", async () => {
  const excerpt = "Plants use sunlight to make sugars through photosynthesis.";
  const questions = Array.from({ length: 5 }, (_, i) => ({
    prompt: `Which process ${i}?`,
    options: [
      { id: "a", text: "Photosynthesis" },
      { id: "b", text: "All of the above" },
    ],
    correctOptionId: "a",
    explanation: excerpt,
    sources: [{ page: 1, excerpt }],
  }));
  const d = deps();
  d.generate.mockResolvedValue({ questions });
  const response = await handleAiRoute(await request(input, "/api/generation"), config, d);
  expect(response!.status).toBe(503);
  expect((await response!.json()).code).toBe("invalid-output");
  expect(d.ledger.complete).not.toHaveBeenCalled();
  expect(d.ledger.fail).toHaveBeenCalledOnce();
});

it("keeps unaccepted formats disabled even with credentials and global opt-in", async () => {
  const configWithoutAcceptance = { ...config, PROOFQUEST_APPROVED_FORMATS: "" };
  const availability = await handleAiRoute(
    new Request(origin + "/api/generation/config"),
    configWithoutAcceptance,
  );
  expect((await availability!.json()).enabled).toBe(false);
  const d = deps();
  expect((await handleAiRoute(await request(), configWithoutAcceptance, d))!.status).toBe(503);
  expect(d.ledger.reserve).not.toHaveBeenCalled();
  expect(d.generate).not.toHaveBeenCalled();
  const onlyReviewer = { ...config, PROOFQUEST_APPROVED_FORMATS: "reviewer" };
  expect((await handleAiRoute(await request(), onlyReviewer, d))!.status).toBe(503);
});
