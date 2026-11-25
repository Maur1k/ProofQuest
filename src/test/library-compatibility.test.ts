// @vitest-environment node
import { expect, it } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { openDatabase } from "@/data/indexed-db";
import { ProofQuestRepository } from "@/data/repository";
import { exportBackup, importBackup } from "@/data/backup";
import { saveStudyMaterial, listStudyMaterials } from "@/data/study-repository";
import { validateGeneratedStudy } from "@/domain/study-material";
import { buildLibrary } from "@/domain/library";
import { createSampleQuests } from "@/data/sample-quests";
import { createSampleMcqVersion } from "@/data/sample-mcq";
import { pdfSource } from "@/features/study-sources/adapters";
import { saveSourceRevision, listSourceData } from "@/data/source-repository";
import { writeFile } from "node:fs/promises";
it("round-trips active legacy formats and archived records without changing Library associations", async () => {
  const repo = new ProofQuestRepository(await openDatabase(new IDBFactory()));
  await repo.initializeLegacy(null, { version: 1, quests: createSampleQuests(), attempts: [] });
  const text =
    "Cells are the basic units of life. The nucleus contains genetic material. Cells use energy to maintain their functions.";
  const blob = new Blob(["%PDF-1.4 validation fixture"]);
  const checksum = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
  const doc = {
    id: "biology",
    name: "Biology validation",
    blob,
    checksum,
    pageCount: 1,
    createdAt: 1,
  };
  const pages = [{ documentId: doc.id, page: 1, text, warnings: [] }];
  await repo.addDocument(doc, pages);
  await saveSourceRevision(repo.database, await pdfSource(doc, pages), null);
  const sources = [{ page: 1, excerpt: "Cells are the basic units of life." }];
  for (const format of ["flashcards", "reviewer"] as const) {
    const request = { documentId: doc.id, format, pages: [{ page: 1, text }] };
    const output =
      format === "flashcards"
        ? {
            format,
            cards: [{ front: "What are cells?", back: "The basic units of life.", sources }],
            excluded: [],
          }
        : {
            format,
            sections: [
              {
                heading: "Cells",
                points: [{ text: "Cells are the basic units of life.", sources }],
              },
            ],
            terms: [],
            comparisons: [],
            excluded: [],
          };
    const material = validateGeneratedStudy(output, request, {
      id: format,
      title: "Biology " + format,
      createdAt: 1,
    });
    await saveStudyMaterial(repo.database, { id: format, request, checksum, material });
  }
  const quiz = {
    id: "biology-quiz",
    quizId: "biology-quiz",
    title: "Biology questions",
    createdAt: 1,
    questions: [
      {
        id: "q1",
        type: "mcq" as const,
        prompt: "What are cells?",
        explanation: "Cells are the basic units of life.",
        hints: [],
        options: [
          { id: "a", text: "Basic units of life" },
          { id: "b", text: "Only genetic material" },
        ],
        correctOptionId: "a",
        sources: [{ documentId: doc.id, ...sources[0]! }],
      },
    ],
  };
  await repo.addVersion(quiz);
  await repo.startSession("unfinished-exam", quiz.id, "test", 1);
  await repo.addVersion(createSampleMcqVersion());
  const before = await exportBackup(repo.database);
  const target = new ProofQuestRepository(await openDatabase(new IDBFactory()));
  await importBackup(target.database, before);
  const projection = async (r: ProofQuestRepository) =>
    buildLibrary({
      ...(await listSourceData(r.database)),
      documents: await r.listDocuments(),
      studyMaterials: await listStudyMaterials(r.database),
      sourceMaterials: [],
      quizzes: await r.listVersions(),
      sessions: await r.listSessions(),
    });
  const view = await projection(target);
  expect(view.sources).toHaveLength(1);
  expect(view.sources[0]?.materials).toHaveLength(3);
  expect(view.sources[0]?.materials.find((m) => m.format === "quiz")?.attempts[0]?.id).toBe(
    "unfinished-exam",
  );
  expect(view.other).toEqual([]);
  const restored = JSON.parse(await exportBackup(target.database));
  const original = JSON.parse(before);
  for (const key of [
    "documents",
    "pages",
    "materials",
    "versions",
    "sessions",
    "sources",
    "sourceRevisions",
  ])
    expect(restored[key]).toEqual(original[key]);
  expect(restored.legacy.data).toEqual(original.legacy.data);
  expect(restored.legacy.snapshots).toEqual(original.legacy.snapshots);
  await target.deleteDocument(doc.id);
  const missing = await projection(target);
  expect(missing.other).toHaveLength(3);
  expect(missing.sources).toHaveLength(1);
  if (process.env["PROOFQUEST_TEST_BACKUP_OUTPUT"])
    await writeFile(process.env["PROOFQUEST_TEST_BACKUP_OUTPUT"], before, "utf8");
  repo.close();
  target.close();
});
