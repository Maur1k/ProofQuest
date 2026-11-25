// @vitest-environment node
import { it } from "vitest";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import fixture from "./fixtures/usgs-water-cycle-text.json";
import { pdfSource } from "@/features/study-sources/adapters";
import { generateSource } from "@/server/generation/source-provider.server";
import { GENERATION_MODEL } from "@/server/generation/provider.server";
import { UpstashLedger } from "@/server/generation/ledger.server";
import { checkSourceMaterial, SOURCE_PROMPT_VERSION } from "@/domain/source-material";
for (const format of ["quiz", "reviewer", "flashcards"] as const)
  it.skipIf(process.env["PROOFQUEST_SOURCE_LIVE"] !== "true")(
    `public PDF source ${format}`,
    async () => {
      const dir = process.env["PROOFQUEST_EVALUATION_DIR"]!;
      if (!dir) throw Error("Explicit evidence directory required");
      await mkdir(dir, { recursive: true });
      const doc = {
        id: "public-usgs",
        name: "USGS water cycle",
        pageCount: 1,
        checksum: "a".repeat(64),
        createdAt: 1,
        blob: new Blob(),
      };
      const source = await pdfSource(doc, [
        { documentId: doc.id, page: 1, text: fixture.text, warnings: [] },
      ]);
      const input = { contract: "source-material-v1" as const, source, format };
      const ledger = new UpstashLedger(
        process.env["UPSTASH_REDIS_REST_URL"]!,
        process.env["UPSTASH_REDIS_REST_TOKEN"]!,
        undefined,
        undefined,
        process.env["PROOFQUEST_VALIDATION_GLOBAL_CAP"] === "50" ? 50 : 20,
      );
      const pace = await fetch(process.env["UPSTASH_REDIS_REST_URL"]!, {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env["UPSTASH_REDIS_REST_TOKEN"]!}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(["TTL", "proofquest:{generation}:v1:pace"]),
        signal: AbortSignal.timeout(5000),
      });
      const ttl = ((await pace.json()) as { result: number }).result;
      if (typeof ttl !== "number" || ttl > 65) throw Error("Cannot verify pacing");
      if (ttl > 0) await new Promise((r) => setTimeout(r, (ttl + 1) * 1000));
      const key = crypto.randomUUID(),
        job = `public-usgs-source:${key}`;
      if (
        (await ledger.reserve(job, "public-fixture:usgs-source", JSON.stringify(input))).status !==
        "reserved"
      )
        throw Error("Allowance unavailable");
      let output: unknown;
      try {
        output = await generateSource(
          process.env["GROQ_API_KEY"]!,
          input,
          AbortSignal.timeout(30000),
        );
        const raw = {
          contract: input.contract,
          id: `source-generated-${key}`,
          title: source.title,
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
        };
        await writeFile(join(dir, `${format}.json`), JSON.stringify(raw, null, 2));
        const material = checkSourceMaterial(raw);
        await ledger.complete(job, material);
      } catch (e) {
        await ledger.fail(job);
        await writeFile(
          join(dir, `${format}-failure.json`),
          JSON.stringify({ output, error: e instanceof Error ? e.message : "unknown" }, null, 2),
        );
        throw Error("Public PDF output rejected; inspect local public fixture report");
      }
    },
    105000,
  );
