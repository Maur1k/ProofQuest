import { z } from "zod";
import {
  studySourceSchema,
  sourceRevisionSchema,
  sourceContent,
  validateSourceGraph,
  type StudySource,
  type SourceRevision,
} from "@/domain/study-source";
import { RevisionConflict } from "@/domain/quiz-session";
import { transact, requestValue } from "./indexed-db";
import { documentSchema, pageSchema } from "./records";

export async function sourceDigest(revision: SourceRevision): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(sourceContent(revision)),
  );
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
export function listSourceData(db: IDBDatabase) {
  return transact(db, ["sources", "sourceRevisions"], "readonly", async (tx) => {
    const sources = z
      .array(studySourceSchema)
      .parse(await requestValue(tx.objectStore("sources").getAll()));
    const revisions = z
      .array(sourceRevisionSchema)
      .parse(await requestValue(tx.objectStore("sourceRevisions").getAll()));
    validateSourceGraph(sources, revisions);
    return { sources, revisions };
  });
}
export async function saveSourceRevision(
  db: IDBDatabase,
  raw: SourceRevision,
  expectedRevision: number | null,
) {
  const revision = sourceRevisionSchema.parse(raw);
  if ((await sourceDigest(revision)) !== revision.contentHash)
    throw new Error("Source hash mismatch");
  return transact(
    db,
    ["sources", "sourceRevisions", "documents", "pages"],
    "readwrite",
    async (tx) => {
      const stored = await requestValue(tx.objectStore("sources").get(revision.sourceId));
      const current = stored === undefined ? null : studySourceSchema.parse(stored);
      if ((current?.revision ?? null) !== expectedRevision) throw new RevisionConflict();
      if (current && (current.kind !== revision.kind || revision.createdAt < current.createdAt))
        throw new Error("Source identity changed");
      if ((await requestValue(tx.objectStore("sourceRevisions").get(revision.id))) !== undefined)
        throw new Error("Source revisions are immutable");
      if (revision.kind === "pdf") {
        const document = documentSchema.parse(
          await requestValue(tx.objectStore("documents").get(revision.documentId)),
        );
        if (document.checksum !== revision.documentChecksum) throw new Error("PDF changed");
        for (const segment of revision.segments) {
          const saved = pageSchema.parse(
            await requestValue(tx.objectStore("pages").get([revision.documentId, segment.page])),
          );
          if (saved.text.trim() !== segment.text || segment.page > document.pageCount)
            throw new Error("PDF text changed");
        }
      }
      const source: StudySource = studySourceSchema.parse({
        id: revision.sourceId,
        kind: revision.kind,
        title: revision.title,
        revision: (current?.revision ?? -1) + 1,
        currentRevisionId: revision.id,
        createdAt: current?.createdAt ?? revision.createdAt,
      });
      await requestValue(tx.objectStore("sourceRevisions").add(revision));
      await requestValue(tx.objectStore("sources").put(source));
      return source;
    },
  );
}
