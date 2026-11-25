import { expect, it } from "vitest";
import { recoverGeneration, recoveryValue } from "@/features/generation/recovery";
const input = {
  documentId: "doc",
  questionCount: 5 as const,
  pages: [{ page: 1, text: "A sufficiently long source passage retained for request recovery." }],
};
it("recovers the same request and selected format only for unchanged sources within 24 hours", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const raw = recoveryValue(id, 1000, "checksum", "reviewer", input);
  const result = recoverGeneration(raw, "checksum", input.pages, "doc", 2000);
  expect(result.id).toBe(id);
  expect(result.studyInput.format).toBe("reviewer");
  for (const [checksum, pages, documentId, now] of [
    ["changed", input.pages, "doc", 2000],
    ["checksum", [], "doc", 2000],
    ["checksum", input.pages, "different", 2000],
    ["checksum", input.pages, "doc", 86401000],
  ] as const)
    expect(() => recoverGeneration(raw, checksum, [...pages], documentId, now)).toThrow();
});
