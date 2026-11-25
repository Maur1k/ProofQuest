import { validateGeneratedStudy } from "@/domain/study-material";
import { checkGeneratedQuizQuality, checkGeneratedStudyQuality } from "@/domain/generation-quality";
// @vitest-environment node
import { it, expect } from "vitest";
import { readFile, writeFile } from "node:fs/promises";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { callGroq } from "@/server/generation/provider.server";
import { UpstashLedger } from "@/server/generation/ledger.server";
import { validateGeneratedQuiz } from "@/domain/generation";
it.skipIf(process.env["PROOFQUEST_LIVE_TEST"] !== "true")(
  "public PDF provider diagnostic",
  async () => {
    const path = process.env["PROOFQUEST_PUBLIC_PDF"]!,
      report = process.env["PROOFQUEST_DIAGNOSTIC_FILE"]!;
    const task = getDocument({ data: new Uint8Array(await readFile(path)), useSystemFonts: true });
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""))
      .join("")
      .trim();
    await task.destroy();
    const input = {
      documentId: "public-rfc9110",
      format: (process.env["PROOFQUEST_LIVE_FORMAT"] ?? "quiz") as
        "quiz" | "reviewer" | "flashcards",
      pages: [{ page: 1, text }],
    };
    const ledger = new UpstashLedger(
      process.env["UPSTASH_REDIS_REST_URL"]!,
      process.env["UPSTASH_REDIS_REST_TOKEN"]!,
    );
    const job = `evaluation:${crypto.randomUUID()}`;
    expect((await ledger.reserve(job, "local-evaluation:public-pdf", "pdf-quiz")).status).toBe(
      "reserved",
    );
    try {
      const output = await callGroq(
        process.env["GROQ_API_KEY"]!,
        input,
        AbortSignal.timeout(30000),
        async (url, init) => {
          const response = await fetch(url, init);
          const data = await response
            .clone()
            .json()
            .catch(() => null);
          const message =
            typeof data?.error?.message === "string"
              ? data.error.message
                  .replaceAll(process.env["GROQ_API_KEY"]!, "[redacted]")
                  .slice(0, 400)
              : undefined;
          await writeFile(
            report,
            JSON.stringify({
              status: response.status,
              code: data?.error?.code,
              type: data?.error?.type,
              message,
              finish: data?.choices?.[0]?.finish_reason,
              tokens: data?.usage?.total_tokens,
            }),
          );
          return response;
        },
      );
      await writeFile(report + ".raw.json", JSON.stringify({ input, output }));
      const result =
        input.format === "quiz"
          ? checkGeneratedQuizQuality(
              validateGeneratedQuiz(
                output,
                { documentId: input.documentId, pages: input.pages, questionCount: 5 },
                { id: job, quizId: job, title: "Public RFC evaluation", createdAt: 1 },
              ),
            )
          : checkGeneratedStudyQuality(
              validateGeneratedStudy(output, input, {
                id: job,
                title: "Public RFC evaluation",
                createdAt: 1,
              }),
            );
      await ledger.complete(job, result);
      await writeFile(report + ".result.json", JSON.stringify(result));
    } catch {
      await ledger.fail(job);
      throw new Error("Public PDF evaluation failed; inspect sanitized report");
    }
  },
  40000,
);
