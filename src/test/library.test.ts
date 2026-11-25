// @vitest-environment node
import { expect, it } from "vitest";
import { buildLibrary, type LibraryInput } from "@/domain/library";
import { pdfSource, textSource, WATER_SAMPLE } from "@/features/study-sources/adapters";
import { sampleMaterial } from "@/features/study-sources/sample-material";
import { SOURCE_CONTRACT, sourceQuizVersion } from "@/domain/source-material";
import { startQuizSession } from "@/domain/quiz-session";
import type { QuizVersion } from "@/domain/quiz";
const empty = (): LibraryInput => ({
  sources: [],
  revisions: [],
  documents: [],
  sourceMaterials: [],
  studyMaterials: [],
  quizzes: [],
  sessions: [],
});
const doc = {
  id: "pdf",
  name: "Biology.pdf",
  pageCount: 1,
  createdAt: 1,
  checksum: "a".repeat(64),
  blob: new Blob(["pdf"]),
};
const quiz: QuizVersion = {
  id: "real",
  quizId: "real",
  title: "Biology",
  createdAt: 1,
  questions: [
    {
      id: "q1",
      type: "mcq",
      prompt: "Which?",
      explanation: "Evidence",
      hints: [],
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
      correctOptionId: "a",
      sources: [{ documentId: "pdf", page: 1, excerpt: "Evidence" }],
    },
  ],
};
it("combines an original PDF and its source without copying records", async () => {
  const r = await pdfSource(doc, [{ documentId: "pdf", page: 1, text: "Evidence", warnings: [] }]);
  const input = {
    ...empty(),
    documents: [doc],
    revisions: [r],
    sources: [
      {
        id: r.sourceId,
        kind: r.kind,
        title: r.title,
        revision: 0,
        currentRevisionId: r.id,
        createdAt: 1,
      },
    ],
    quizzes: [quiz],
  };
  const before = structuredClone(input);
  const view = buildLibrary(input);
  expect(view.sources).toHaveLength(1);
  expect(view.sources[0]?.document).toBe(doc);
  expect(view.sources[0]?.materials[0]?.version).toBe(quiz);
  expect(input).toEqual(before);
});
it("keeps absent and ambiguous PDF links under Other saved materials", async () => {
  expect(buildLibrary({ ...empty(), quizzes: [quiz] }).other).toHaveLength(1);
  const r = await pdfSource(doc, [{ documentId: "pdf", page: 1, text: "Evidence", warnings: [] }]);
  const sources = ["one", "two"].map((id) => ({
    id,
    kind: r.kind,
    title: r.title,
    revision: 0,
    currentRevisionId: id,
    createdAt: 1,
  }));
  const revisions = sources.map((s) => ({ ...r, id: s.id, sourceId: s.id }));
  expect(
    buildLibrary({ ...empty(), documents: [doc], sources, revisions, quizzes: [quiz] }).other,
  ).toHaveLength(1);
});
it("preserves immutable attempts and separates conflicting snapshots", () => {
  const session = startQuizSession("attempt", quiz, "test", 2);
  const conflict = { ...session, id: "conflict", version: { ...quiz, title: "Earlier title" } };
  const input = { ...empty(), documents: [doc], quizzes: [quiz], sessions: [session, conflict] };
  const before = structuredClone(input);
  const rows = buildLibrary(input).sources[0]!.materials;
  expect(rows[0]?.attempts).toEqual([session]);
  expect(rows[1]?.kind).toBe("attempt");
  expect(rows[1]?.version).toBeUndefined();
  expect(rows[1]?.attempts).toEqual([conflict]);
  expect(input).toEqual(before);
});
it("deduplicates unified question sets and excludes identifiable samples", async () => {
  const r = await textSource(WATER_SAMPLE.title, WATER_SAMPLE.text, "sample", true);
  const sample = sampleMaterial({ contract: SOURCE_CONTRACT, format: "quiz", source: r });
  expect(
    buildLibrary({ ...empty(), sourceMaterials: [sample], quizzes: [sourceQuizVersion(sample)] })
      .other,
  ).toEqual([]);
  const original = await textSource("Biology", WATER_SAMPLE.text, "real-source");
  const material = {
    ...sample,
    id: "source-generated-real",
    request: { ...sample.request, source: original },
    generation: { ...sample.generation, provider: "groq" as const },
  };
  const version = sourceQuizVersion(material);
  const view = buildLibrary({
    ...empty(),
    sources: [
      {
        id: original.sourceId,
        kind: "text",
        title: original.title,
        revision: 0,
        currentRevisionId: original.id,
        createdAt: 1,
      },
    ],
    revisions: [original],
    sourceMaterials: [material],
    quizzes: [version],
    sessions: [startQuizSession("attempt", version, "practice", 2)],
  });
  expect(view.sources[0]?.materials).toHaveLength(1);
  expect(view.sources[0]?.materials[0]?.attempts).toHaveLength(1);
  expect(view.other).toEqual([]);
});
