// @vitest-environment node
import { expect, it, vi } from "vitest";
import { generateForGuest } from "@/server/generation/service.server";
import { disabledGenerationRoute } from "@/server/generation/routes.server";
import { GENERATION_CONSENT_VERSION } from "@/domain/generation-policy";
const guest = "11111111-1111-4111-8111-111111111111",
  key = "22222222-2222-4222-8222-222222222222";
const text =
  "Active recall means retrieving information from memory. The original source can be checked for evidence.";
const input = { documentId: "doc", pages: [{ page: 1, text }], questionCount: 5 };
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
function request(consent = true) {
  return new Request("https://local.test/api/generation", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": key,
      ...(consent ? { "x-generation-consent": GENERATION_CONSENT_VERSION } : {}),
    },
    body: JSON.stringify(input),
  });
}
function dependencies() {
  return {
    provider: { generate: vi.fn().mockResolvedValue(output()) },
    ledger: {
      reserve: vi.fn().mockResolvedValue({ status: "reserved" }),
      complete: vi.fn(),
      fail: vi.fn(),
    },
    maxInputBytes: 256000,
  };
}
it("reserves before provider execution, validates output and records success before returning it", async () => {
  const deps = dependencies();
  const order: string[] = [];
  deps.ledger.reserve.mockImplementation(async () => {
    order.push("reserve");
    return { status: "reserved" };
  });
  deps.provider.generate.mockImplementation(async () => {
    order.push("provider");
    return output();
  });
  deps.ledger.complete.mockImplementation(async () => {
    order.push("complete");
  });
  const response = await generateForGuest(request(), guest, deps);
  expect(response.status).toBe(200);
  expect(order).toEqual(["reserve", "provider", "complete"]);
  expect((await response.json()).version.questions).toHaveLength(5);
});
it("does not send text without consent, allowance or a functioning ledger", async () => {
  const deps = dependencies();
  expect((await generateForGuest(request(false), guest, deps)).status).toBe(400);
  expect(deps.ledger.reserve).not.toHaveBeenCalled();
  for (const status of ["limited", "pending", "failed", "conflict"]) {
    deps.ledger.reserve.mockResolvedValue({ status });
    expect((await generateForGuest(request(), guest, deps)).ok).toBe(false);
  }
  deps.ledger.reserve.mockRejectedValue(new Error("PRIVATE_SECRET"));
  expect((await generateForGuest(request(), guest, deps)).status).toBe(503);
  expect(deps.provider.generate).not.toHaveBeenCalled();
});
it("returns a durable cached result without another provider call", async () => {
  const deps = dependencies();
  const response = await generateForGuest(request(), guest, deps);
  const { version } = await response.json();
  deps.ledger.reserve.mockResolvedValue({ status: "complete", version });
  expect((await generateForGuest(request(), guest, deps)).status).toBe(200);
  expect(deps.provider.generate).toHaveBeenCalledOnce();
});
it("fails closed on invalid provider output and a failed success commit without exposing sentinels", async () => {
  const deps = dependencies();
  deps.provider.generate.mockResolvedValue({ private: "PRIVATE_SECRET" });
  let response = await generateForGuest(request(), guest, deps);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("PRIVATE_SECRET");
  expect(deps.ledger.complete).not.toHaveBeenCalled();
  expect(deps.ledger.fail).toHaveBeenCalledOnce();
  deps.provider.generate.mockResolvedValue(output());
  deps.ledger.complete.mockRejectedValue(new Error("PRIVATE_SECRET"));
  response = await generateForGuest(request(), guest, deps);
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain("PRIVATE_SECRET");
});
it("production routes remain disabled and never read or echo the posted body", async () => {
  const response = disabledGenerationRoute(request())!;
  expect(response.status).toBe(503);
  expect(await response.text()).not.toContain(text);
  const config = await disabledGenerationRoute(
    new Request("https://local.test/api/generation/config"),
  )!.json();
  expect(config.enabled).toBe(false);
  expect(disabledGenerationRoute(new Request("https://local.test/"))).toBeNull();
});

it("keeps reviewer and flashcard generation disabled without reading the source", async () => {
  const request = new Request("https://local.test/api/study-generation", {
    method: "POST",
    body: "PRIVATE_SOURCE",
  });
  const response = disabledGenerationRoute(request)!;
  expect(response.status).toBe(503);
  expect(request.bodyUsed).toBe(false);
  expect(await response.text()).not.toContain("PRIVATE_SOURCE");
});
