// @vitest-environment node
import { it, expect } from "vitest";
import fixture from "./fixtures/usgs-water-cycle-text.json";
import { pdfSource } from "@/features/study-sources/adapters";
import { sourcePayload } from "@/server/generation/source-provider.server";
it("fits an actual public PDF page without dropping text or weakening the token bound", async () => {
  const doc = {
    id: crypto.randomUUID(),
    name: "usgs-water-cycle.pdf",
    pageCount: 1,
    checksum: "a".repeat(64),
    createdAt: 1,
    blob: new Blob(),
  };
  const source = await pdfSource(doc, [
    { documentId: doc.id, page: 1, text: fixture.text, warnings: [] },
  ]);
  if (source.kind !== "pdf") throw new Error("Expected PDF source");
  for (const format of ["quiz", "reviewer", "flashcards"] as const) {
    const payload = sourcePayload({ contract: "source-material-v1", source, format });
    expect(
      new TextEncoder().encode(JSON.stringify(payload)).length + payload.max_completion_tokens,
    ).toBeLessThanOrEqual(8000);
    const evidence = JSON.parse(payload.messages[1]!.content).evidence;
    expect(Object.values(evidence).join(" ").replace(/\s+/g, " ")).toBe(
      fixture.text.replace(/\s+/g, " "),
    );
  }
  expect(() =>
    sourcePayload({
      contract: "source-material-v1",
      source: {
        ...source,
        segments: source.segments.map((s) => ({ ...s, text: s.text.repeat(2) })),
      },
      format: "quiz",
    }),
  ).toThrow();
});
