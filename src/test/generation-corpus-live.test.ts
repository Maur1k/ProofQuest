// @vitest-environment node
import { it, expect } from "vitest";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import fixtures from "./fixtures/generation-quality-sources.json";
import { callGroq, boundedJson } from "@/server/generation/provider.server";
import { UpstashLedger } from "@/server/generation/ledger.server";
import { validateGeneratedQuiz } from "@/domain/generation";
import { validateGeneratedStudy, type StudyFormat } from "@/domain/study-material";
import { checkGeneratedQuizQuality, checkGeneratedStudyQuality } from "@/domain/generation-quality";
const enabled = process.env["PROOFQUEST_CORPUS_LIVE"] === "true";
const cases = [
  ...fixtures.map((source) => ({ source, format: "quiz" as StudyFormat })),
  ...(["reviewer", "flashcards"] as const).map((format) => ({
    source: fixtures.find(
      (item) => item.id === (process.env["PROOFQUEST_STUDY_FIXTURE"] ?? "water"),
    )!,
    format,
  })),
];
for (const { source, format } of cases)
  it.skipIf(!enabled)(
    `quality corpus ${source.id} ${format}`,
    async () => {
      const reportDir = process.env["PROOFQUEST_EVALUATION_DIR"];
      if (!reportDir) throw new Error("Explicit public-fixture report directory required");
      await mkdir(reportDir, { recursive: true });
      const file = join(reportDir, `${source.id}-${format}.json`);
      const input = {
        documentId: `quality-${source.id}`,
        format,
        pages: [{ page: 1, text: source.text }],
      };
      const ledger = new UpstashLedger(
        process.env["UPSTASH_REDIS_REST_URL"]!,
        process.env["UPSTASH_REDIS_REST_TOKEN"]!,
        undefined,
        undefined,
        process.env["PROOFQUEST_VALIDATION_GLOBAL_CAP"] === "50" ? 50 : 20,
      );
      // Respect the same organization-wide pacing key; never reset caps for evaluation.
      const pace = await fetch(process.env["UPSTASH_REDIS_REST_URL"]!, {
        method: "POST",
        signal: AbortSignal.timeout(5000),
        headers: {
          authorization: `Bearer ${process.env["UPSTASH_REDIS_REST_TOKEN"]!}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(["TTL", "proofquest:{generation}:v1:pace"]),
      });
      const ttl = ((await pace.json()) as { result: unknown }).result;
      if (typeof ttl !== "number" || ttl > 65) throw new Error("Unable to verify pacing");
      if (ttl > 0) await new Promise((resolve) => setTimeout(resolve, (ttl + 1) * 1000));
      const job = `quality:${source.id}:${format}:${crypto.randomUUID()}`;
      const reservation = await ledger.reserve(
        job,
        `quality-fixture:${source.id}`,
        JSON.stringify(input),
      );
      if (reservation.status !== "reserved") {
        await writeFile(file, JSON.stringify({ source, format, status: reservation.status }));
        throw new Error("Evaluation allowance unavailable");
      }
      let output: unknown;
      try {
        output = await callGroq(
          process.env["GROQ_API_KEY"]!,
          input,
          AbortSignal.timeout(30000),
          async (url, init) => {
            const response = await fetch(url, init);
            const body = (await boundedJson(
              response.clone(),
              AbortSignal.timeout(5000),
              100000,
            )) as {
              choices?: {
                finish_reason?: string;
                message?: { content?: unknown; reasoning?: unknown };
              }[];
              error?: { code?: string };
            };
            await writeFile(
              file + ".wire.json",
              JSON.stringify(
                { status: response.status, code: body.error?.code, choice: body.choices?.[0] },
                null,
                2,
              ),
            );
            return response;
          },
        );
        const result =
          format === "quiz"
            ? checkGeneratedQuizQuality(
                validateGeneratedQuiz(
                  output,
                  { documentId: input.documentId, pages: input.pages, questionCount: 5 },
                  { id: job, quizId: job, title: source.id, createdAt: 1 },
                ),
              )
            : checkGeneratedStudyQuality(
                validateGeneratedStudy(output, input, { id: job, title: source.id, createdAt: 1 }),
              );
        await ledger.complete(job, result);
        await writeFile(
          file,
          JSON.stringify({ source, format, status: "accepted-structurally", result }, null, 2),
        );
        expect(result).toBeTruthy();
      } catch {
        await ledger.fail(job);
        await writeFile(
          file,
          JSON.stringify({ source, format, status: "rejected", output }, null, 2),
        );
        throw new Error("Public evaluation rejected; inspect fixture report, not provider logs");
      }
    },
    105000,
  );
