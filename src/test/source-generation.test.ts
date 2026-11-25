// @vitest-environment node
import { expect, it, vi } from "vitest";
import { IDBFactory, IDBObjectStore } from "fake-indexeddb";
import { textSource, WATER_SAMPLE } from "@/features/study-sources/adapters";
import { sampleMaterial } from "@/features/study-sources/sample-material";
import {
  SOURCE_CONTRACT,
  SOURCE_CONSENT,
  sourceRequestSchema,
  sourceMaterialSchema,
  checkSourceMaterial,
  sourceQuizVersion,
  sourceMaterialCitations,
  type SourceRequest,
} from "@/domain/source-material";
import { selectSource } from "@/domain/study-source";
import { openDatabase } from "@/data/indexed-db";
import { ProofQuestRepository } from "@/data/repository";
import { saveSourceRevision } from "@/data/source-repository";
import {
  saveSourceMaterial,
  listSourceMaterials,
  sourceCardProgress,
} from "@/data/source-material-repository";
import { exportBackup, importBackup } from "@/data/backup";
import { handleAiRoute, guestCookie, getAiConfig } from "@/server/generation/runtime.server";
import { sourcePayload, materializeSourceOutput } from "@/server/generation/source-provider.server";
import { restoreSourceRequest } from "@/features/study-sources/source-recovery";
async function fixture(format: SourceRequest["format"] = "quiz") {
  const source = await textSource(WATER_SAMPLE.title, WATER_SAMPLE.text, "source", true);
  const sample = sampleMaterial({ contract: SOURCE_CONTRACT, format, source });
  const original = await textSource("Biology", WATER_SAMPLE.text, "text");
  const request = sourceRequestSchema.parse({
    contract: SOURCE_CONTRACT,
    format,
    source: original,
  });
  return {
    original,
    request,
    material: checkSourceMaterial({
      ...sample,
      id: `source-generated-${crypto.randomUUID()}`,
      request,
      generation: {
        ...sample.generation,
        provider: "groq",
        model: "openai/gpt-oss-20b",
        reviewStatus: "structural-pass",
      },
    }),
  };
}
async function setup() {
  const db = await openDatabase(new IDBFactory());
  const repo = new ProofQuestRepository(db);
  await repo.initializeLegacy(null, { version: 1, quests: [], attempts: [] });
  return { db, repo };
}
it("keeps paragraph citations separate from legacy grading snapshots and rejects invented evidence", async () => {
  const { material } = await fixture();
  const version = sourceQuizVersion(material);
  expect(version.questions.every((q) => q.type === "mcq" && q.sources.length === 0)).toBe(true);
  expect(sourceMaterialCitations(material, "q1")[0]).toMatchObject({
    kind: "text",
    label: "Paragraph 1",
  });
  expect(sourceMaterialCitations(material, "q1")[0]).not.toHaveProperty("page");
  const bad = structuredClone(material);
  if (bad.output.format === "quiz") bad.output.questions[0]!.sources[0]!.excerpt = "Invented";
  expect(() => sourceMaterialSchema.parse(bad)).toThrow();
});
it.each(["reviewer", "flashcards"] as const)(
  "requires exact evidence IDs for %s",
  async (format) => {
    const { material } = await fixture(format);
    const bad = structuredClone(material);
    if (bad.output.format === "reviewer") bad.output.sections[0]!.points[0]!.evidenceId = "unknown";
    if (bad.output.format === "flashcards") bad.output.cards[0]!.evidenceId = "unknown";
    expect(() => sourceMaterialSchema.parse(bad)).toThrow();
  },
);
it("persists quiz/source envelope atomically and reuses it for both modes without regrading history", async () => {
  const { db, repo } = await setup();
  const { original, material } = await fixture();
  await saveSourceRevision(db, original, null);
  await saveSourceMaterial(db, material);
  await saveSourceMaterial(db, material);
  const practice = await repo.startSession("practice", material.id, "practice", 1),
    exam = await repo.startSession("exam", material.id, "test", 2);
  expect(practice.version).toEqual(exam.version);
  expect(practice.mode).toBe("practice");
  expect(exam.mode).toBe("test");
  await saveSourceRevision(
    db,
    await textSource("Edited", "Changed source text.", original.sourceId),
    0,
  );
  expect((await listSourceMaterials(db))[0]).toEqual(material);
  const backup = await exportBackup(db);
  expect(JSON.parse(backup).version).toBe(5);
  const target = await setup();
  await importBackup(target.db, backup);
  expect(await listSourceMaterials(target.db)).toEqual([material]);
  expect(await target.repo.listSessions()).toHaveLength(2);
  repo.close();
  target.repo.close();
});
it("keeps card progress revisioned and includes it in backups", async () => {
  const { db, repo } = await setup();
  const { original, material } = await fixture("flashcards");
  await saveSourceRevision(db, original, null);
  await saveSourceMaterial(db, material);
  const previous = await sourceCardProgress(db, material.id);
  const next = await sourceCardProgress(db, material.id, { previous, index: 0, revealed: true });
  await expect(
    sourceCardProgress(db, material.id, { previous, index: 1, revealed: true }),
  ).rejects.toThrow();
  const target = await setup();
  await importBackup(target.db, await exportBackup(db));
  expect(await sourceCardProgress(target.db, material.id)).toEqual(next);
  const bad = JSON.parse(await exportBackup(db));
  bad.sourceMaterialProgress[0].id = "missing";
  await expect(importBackup(target.db, JSON.stringify(bad))).rejects.toThrow();
  repo.close();
  target.repo.close();
});
it("aborts a failed material write without leaving an orphan quiz", async () => {
  const { db, repo } = await setup();
  const { original, material } = await fixture();
  await saveSourceRevision(db, original, null);
  const add = IDBObjectStore.prototype.add;
  const spy = vi.spyOn(IDBObjectStore.prototype, "add").mockImplementation(function (
    this: IDBObjectStore,
    ...args: Parameters<typeof add>
  ) {
    if (this.name === "sourceMaterials") throw new DOMException("Full", "QuotaExceededError");
    return add.apply(this, args);
  });
  try {
    await expect(saveSourceMaterial(db, material)).rejects.toThrow();
  } finally {
    spy.mockRestore();
  }
  expect(await listSourceMaterials(db)).toEqual([]);
  expect(await repo.listVersions()).toEqual([]);
  repo.close();
});
it("binds recovery to revision, coverage and format with an absolute expiry", async () => {
  const { request } = await fixture();
  const saved = { id: crypto.randomUUID(), started: 100, choice: "quiz", input: request };
  expect(restoreSourceRequest(JSON.stringify(saved), request, 101).id).toBe(saved.id);
  expect(() =>
    restoreSourceRequest(JSON.stringify(saved), { ...request, format: "reviewer" }, 101),
  ).toThrow();
  expect(() => restoreSourceRequest(JSON.stringify(saved), request, 86400100)).toThrow();
});
it("transmits selected segment evidence without filenames, fake PDF pages or unselected text", async () => {
  const { request } = await fixture();
  request.source = sourceRequestSchema.parse({
    ...request,
    source: selectSource(request.source, ["paragraph-1", "paragraph-2"]),
  }).source;
  const payload = sourcePayload(request);
  const user = JSON.parse(payload.messages[1]!.content);
  expect(Object.keys(user.evidence)).toHaveLength(2);
  expect(payload.messages[1]!.content).not.toContain('"page":');
  expect(payload.messages[1]!.content).not.toContain("Sunlight");
  expect(payload.messages[1]!.content).not.toContain("Biology");
});
const origin = "http://127.0.0.1:4193";
const config = {
  PROOFQUEST_GENERATION_ENABLED: "true",
  PROOFQUEST_APPROVED_FORMATS: "quiz,reviewer,flashcards",
  PROOFQUEST_ORIGIN: origin,
  GROQ_API_KEY: "sentinel",
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "sentinel",
  PROOFQUEST_GUEST_SECRET: "s".repeat(64),
};
async function http(input: SourceRequest, id: string) {
  return new Request(origin + "/api/source-generation", {
    method: "POST",
    headers: {
      origin,
      "content-type": "application/json",
      "idempotency-key": id,
      "x-generation-consent": SOURCE_CONSENT,
      cookie: `pq_guest=${await guestCookie(config.PROOFQUEST_GUEST_SECRET)}`,
    },
    body: JSON.stringify(input),
  });
}
function deps(output: unknown) {
  return {
    ledger: {
      reserve: vi.fn().mockResolvedValue({ status: "reserved" }),
      complete: vi.fn(),
      fail: vi.fn(),
    },
    generate: vi.fn(),
    generateSource: vi.fn().mockResolvedValue(output),
  };
}
it("enforces consent, origin and per-format gates before reserving source generation", async () => {
  const { request, material } = await fixture();
  for (const header of ["origin", "cookie", "x-generation-consent"]) {
    const req = await http(request, crypto.randomUUID());
    req.headers.delete(header);
    const d = deps(material.output);
    expect((await handleAiRoute(req, config, d))!.status).toBeGreaterThanOrEqual(400);
    expect(d.ledger.reserve).not.toHaveBeenCalled();
  }
  const d = deps(material.output);
  expect(
    (await handleAiRoute(
      await http(request, crypto.randomUUID()),
      { ...config, PROOFQUEST_APPROVED_FORMATS: "" },
      d,
    ))!.status,
  ).toBe(503);
  expect(d.ledger.reserve).not.toHaveBeenCalled();
});
it("validates and commits source output before delivery and recovers cached results without another call", async () => {
  const { request, material } = await fixture();
  const id = crypto.randomUUID(),
    d = deps(material.output);
  const response = await handleAiRoute(await http(request, id), config, d);
  expect(response!.status).toBe(200);
  const body = await response!.json();
  expect(body.material.request).toEqual(request);
  expect(d.ledger.complete).toHaveBeenCalledOnce();
  d.ledger.reserve.mockResolvedValueOnce({ status: "complete", result: body.material });
  expect((await handleAiRoute(await http(request, id), config, d))!.status).toBe(200);
  expect(d.generateSource).toHaveBeenCalledOnce();
  const bad = structuredClone(body.material);
  bad.request.source.id = "different";
  d.ledger.reserve.mockResolvedValueOnce({ status: "complete", result: bad });
  expect((await handleAiRoute(await http(request, id), config, d))!.status).toBe(503);
});
it("rejects unsupported provider output and never silently substitutes sample material", async () => {
  const { request } = await fixture();
  const d = deps({ format: "quiz", questions: [] });
  const response = await handleAiRoute(await http(request, crypto.randomUUID()), config, d);
  expect(response!.status).toBe(503);
  expect(d.ledger.complete).not.toHaveBeenCalled();
  expect(d.ledger.fail).toHaveBeenCalledOnce();
});
it("limits the approved temporary validation cap to local hosts", () => {
  expect(
    getAiConfig({ ...config, PROOFQUEST_VALIDATION_GLOBAL_CAP: "50" })?.validationGlobalCap,
  ).toBe(50);
  expect(
    getAiConfig({
      ...config,
      PROOFQUEST_ORIGIN: "https://example.com",
      PROOFQUEST_VALIDATION_GLOBAL_CAP: "50",
    })?.validationGlobalCap,
  ).toBe(20);
});

it("materializes exact quiz evidence and rejects invented IDs or rewritten quotations", async () => {
  const { request } = await fixture();
  const wire = { questions: [{ prompt: "Water?", sources: [{ evidenceId: "paragraph-1:s1" }] }] };
  expect(materializeSourceOutput(wire, request)).toMatchObject({
    questions: [
      { sources: [{ segmentId: "paragraph-1", excerpt: request.source.segments[0]!.text }] },
    ],
  });
  expect(() =>
    materializeSourceOutput({ questions: [{ sources: [{ evidenceId: "missing" }] }] }, request),
  ).toThrow();
  expect(() =>
    materializeSourceOutput(
      { questions: [{ sources: [{ evidenceId: "paragraph-1:s1", excerpt: "invented" }] }] },
      request,
    ),
  ).toThrow();
});
