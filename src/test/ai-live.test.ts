// @vitest-environment node
import { expect, it } from "vitest";
import { UpstashLedger } from "@/server/generation/ledger.server";
import { callGroq } from "@/server/generation/provider.server";
import { validateGeneratedQuiz } from "@/domain/generation";
import { validateGeneratedStudy } from "@/domain/study-material";
const live = process.env["PROOFQUEST_LIVE_TEST"] === "true";
it.skipIf(!live)(
  "live Redis reserves atomically and never overwrites a committed result on failure",
  async () => {
    const ledger = new UpstashLedger(
      process.env["UPSTASH_REDIS_REST_URL"]!,
      process.env["UPSTASH_REDIS_REST_TOKEN"]!,
      `proofquest:{integration-test}:${crypto.randomUUID()}`,
    );
    const results = await Promise.all([
      ledger.reserve("one", "guest", "f"),
      ledger.reserve("one", "guest", "f"),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual(["pending", "reserved"]);
    expect((await ledger.reserve("one", "guest", "changed")).status).toBe("conflict");
    expect((await ledger.reserve("two", "other", "f")).status).toBe("limited");
    await ledger.complete("one", { ok: true });
    await ledger.fail("one");
    expect(await ledger.reserve("one", "guest", "f")).toEqual({
      status: "complete",
      result: { ok: true },
    });
  },
  20000,
);
it.skipIf(!live)(
  "live Groq produces a source-validated chosen format from public educational facts",
  async () => {
    const format = process.env["PROOFQUEST_LIVE_FORMAT"] as "quiz" | "reviewer" | "flashcards";
    if (!["quiz", "reviewer", "flashcards"].includes(format))
      throw new Error("Choose a test format");
    const text =
      "The water cycle describes how water moves on Earth. Evaporation changes liquid water into water vapor. Condensation changes water vapor into liquid droplets. Precipitation is water falling from clouds as rain, snow, sleet or hail. Collection occurs when water gathers in rivers, lakes and oceans. Sunlight supplies energy for evaporation. Gravity moves water downhill. Plants release water vapor through transpiration. Water that enters the ground can become groundwater.";
    const input = { documentId: "public-water-cycle", pages: [{ page: 1, text }], format };
    const ledger = new UpstashLedger(
      process.env["UPSTASH_REDIS_REST_URL"]!,
      process.env["UPSTASH_REDIS_REST_TOKEN"]!,
    );
    const job = `evaluation:${crypto.randomUUID()}`;
    expect((await ledger.reserve(job, `local-evaluation:${format}`, format)).status).toBe(
      "reserved",
    );
    try {
      const output = await callGroq(
        process.env["GROQ_API_KEY"]!,
        input,
        AbortSignal.timeout(30000),
      );
      const result =
        format === "quiz"
          ? validateGeneratedQuiz(
              output,
              { documentId: input.documentId, pages: input.pages, questionCount: 5 },
              { id: job, quizId: job, title: "Public water cycle evaluation", createdAt: 1 },
            )
          : validateGeneratedStudy(output, input, {
              id: job,
              title: "Public water cycle evaluation",
              createdAt: 1,
            });
      await ledger.complete(job, result);
      // Public test content only, needed for human factual/citation review.
      console.log(JSON.stringify({ format, result }));
    } catch {
      await ledger.fail(job);
      throw new Error("Live generation or validation failed; provider details withheld");
    }
  },
  40000,
);

it.skipIf(!live)(
  "live Redis enforces guest and global daily caps atomically",
  async () => {
    for (const scope of ["guest", "global"]) {
      const prefix = `proofquest:{integration-test}:${crypto.randomUUID()}`;
      const counter = scope === "guest" ? `${prefix}:guest:guest` : `${prefix}:global`;
      const script =
        "local day = math.floor(tonumber(redis.call('TIME')[1]) / 86400); redis.call('HSET', KEYS[1], 'day', day, 'count', ARGV[1]); redis.call('EXPIRE', KEYS[1], 120); return 1";
      const response = await fetch(process.env["UPSTASH_REDIS_REST_URL"]!, {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env["UPSTASH_REDIS_REST_TOKEN"]!}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(["EVAL", script, 1, counter, scope === "guest" ? 3 : 20]),
      });
      expect(response.ok).toBe(true);
      const ledger = new UpstashLedger(
        process.env["UPSTASH_REDIS_REST_URL"]!,
        process.env["UPSTASH_REDIS_REST_TOKEN"]!,
        prefix,
      );
      expect((await ledger.reserve("job", "guest", "fingerprint")).status).toBe("limited");
    }
  },
  15000,
);
