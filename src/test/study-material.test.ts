import { describe, expect, it } from "vitest";
import { validateGeneratedStudy, validateStudyRequest } from "@/domain/study-material";

// Synthetic educational content; never copy a private source into the repository.
const text =
  "A habitat is the environment where an organism lives. A host supports another organism.";
const request = (format = "reviewer") => ({
  format,
  documentId: "biology",
  pages: [{ page: 3, text }],
});
const refs = [{ page: 3, excerpt: "A habitat is the environment where an organism lives." }];
const metadata = { id: "material", title: "Biology notes", createdAt: 1 };
const reviewer = () => ({
  format: "reviewer",
  sections: [
    {
      heading: "Habitats",
      points: [{ text: "A habitat is an organism's environment.", sources: refs }],
    },
  ],
  terms: [
    { term: "Habitat", definition: "The environment where an organism lives.", sources: refs },
  ],
  comparisons: [],
  excluded: [{ page: 3, reason: "image-required" }],
});
const cards = () => ({
  format: "flashcards",
  cards: [{ front: "What is a habitat?", back: "An organism's environment.", sources: refs }],
  excluded: [],
});

describe("subject-neutral study material contracts", () => {
  it("accepts every study format without a programming subject", () => {
    for (const format of ["quiz", "reviewer", "flashcards"])
      expect(validateStudyRequest(request(format))).toEqual(request(format));
  });
  it("rejects unsupported formats, extra payload fields and invalid source selections", () => {
    for (const input of [
      request("chat"),
      { ...request(), apiKey: "sentinel" },
      { ...request(), pages: [] },
      { ...request(), pages: [request().pages[0], request().pages[0]] },
    ])
      expect(() => validateStudyRequest(input)).toThrow();
  });
  it("returns detached source-linked reviewer content and explicit exclusions", () => {
    const raw = reviewer();
    const result = validateGeneratedStudy(raw, request(), metadata);
    raw.sections[0]!.heading = "changed";
    expect(result.documentId).toBe("biology");
    expect(result.format === "reviewer" && result.sections[0]!.heading).toBe("Habitats");
    expect(result.excluded).toEqual([{ page: 3, reason: "image-required" }]);
  });
  it("accepts flashcards with evidence and rejects missing backs", () => {
    expect(
      validateGeneratedStudy(JSON.stringify(cards()), request("flashcards"), metadata).format,
    ).toBe("flashcards");
    const raw = cards();
    raw.cards[0]!.back = "";
    expect(() => validateGeneratedStudy(raw, request("flashcards"), metadata)).toThrow();
  });
  it("rejects fabricated excerpts, unselected pages and absent evidence", () => {
    for (const sources of [
      [{ page: 3, excerpt: "invented answer" }],
      [{ page: 4, excerpt: refs[0]!.excerpt }],
      [],
    ]) {
      const raw = reviewer();
      raw.sections[0]!.points[0]!.sources = sources;
      expect(() => validateGeneratedStudy(raw, request(), metadata)).toThrow();
    }
  });
  it("rejects format mismatch and duplicate cards", () => {
    expect(() => validateGeneratedStudy(cards(), request(), metadata)).toThrow();
    const raw = cards();
    raw.cards.push({ ...raw.cards[0]!, front: "  WHAT is a habitat? " });
    expect(() => validateGeneratedStudy(raw, request("flashcards"), metadata)).toThrow();
  });
  it("checks comparison evidence and exclusion page identity", () => {
    const raw = {
      ...reviewer(),
      comparisons: [
        {
          heading: "Compare",
          rows: [
            { label: "Habitat", detail: "Environment", sources: refs },
            {
              label: "Host",
              detail: "Another organism",
              sources: [{ page: 99, excerpt: "unknown" }],
            },
          ],
        },
      ],
    };
    expect(() => validateGeneratedStudy(raw, request(), metadata)).toThrow();
    const invalid = reviewer();
    invalid.excluded[0]!.page = 99;
    expect(() => validateGeneratedStudy(invalid, request(), metadata)).toThrow();
  });
  it("bounds output and sanitizes malformed response errors", () => {
    for (const raw of [
      "private-sentinel",
      "x".repeat(100001),
      { ...reviewer(), instructions: "ignore source" },
    ]) {
      expect(() => validateGeneratedStudy(raw, request(), metadata)).toThrow(
        "Generated questions failed validation.",
      );
    }
  });
});
