import { z } from "zod";
import {
  studyRecordSchema,
  studyProgressSchema,
  validateStudyProgress,
  type StudyRecord,
  type StudyProgress,
} from "@/domain/study-record";
import { RevisionConflict } from "@/domain/quiz-session";
import { documentSchema, pageSchema } from "./records";
import { transact, requestValue } from "./indexed-db";

export function listStudyMaterials(db: IDBDatabase) {
  return transact(db, ["materials"], "readonly", async (tx) =>
    z.array(studyRecordSchema).parse(await requestValue(tx.objectStore("materials").getAll())),
  );
}
export function saveStudyMaterial(db: IDBDatabase, candidate: StudyRecord) {
  const record = studyRecordSchema.parse(candidate);
  return transact(db, ["materials", "documents", "pages"], "readwrite", async (tx) => {
    const document = documentSchema.parse(
      await requestValue(tx.objectStore("documents").get(record.request.documentId)),
    );
    if (document.checksum !== record.checksum) throw new Error("Source changed");
    for (const page of record.request.pages) {
      const stored = pageSchema.parse(
        await requestValue(tx.objectStore("pages").get([record.request.documentId, page.page])),
      );
      if (stored.text.trim() !== page.text.trim()) throw new Error("Source text changed");
    }
    const existing = await requestValue(tx.objectStore("materials").get(record.id));
    if (
      existing !== undefined &&
      JSON.stringify(studyRecordSchema.parse(existing)) !== JSON.stringify(record)
    )
      throw new Error("Study material is immutable");
    if (existing === undefined) await requestValue(tx.objectStore("materials").add(record));
    return record;
  });
}
export function loadStudyProgress(db: IDBDatabase, id: string) {
  return transact(db, ["materials", "studyProgress"], "readonly", async (tx) => {
    const record = studyRecordSchema.parse(await requestValue(tx.objectStore("materials").get(id)));
    const raw = await requestValue(tx.objectStore("studyProgress").get(id));
    return validateStudyProgress(
      record,
      raw === undefined
        ? { id, revision: 0, index: 0, revealed: false }
        : studyProgressSchema.parse(raw),
    );
  });
}
export function saveStudyProgress(
  db: IDBDatabase,
  previous: StudyProgress,
  index: number,
  revealed: boolean,
) {
  return transact(db, ["materials", "studyProgress"], "readwrite", async (tx) => {
    const record = studyRecordSchema.parse(
      await requestValue(tx.objectStore("materials").get(previous.id)),
    );
    const raw = await requestValue(tx.objectStore("studyProgress").get(previous.id));
    const current =
      raw === undefined
        ? { id: previous.id, revision: 0, index: 0, revealed: false }
        : studyProgressSchema.parse(raw);
    if (previous.revision !== current.revision) throw new RevisionConflict();
    const next = validateStudyProgress(record, {
      id: current.id,
      revision: current.revision + 1,
      index,
      revealed: index === current.index ? revealed : false,
    });
    await requestValue(tx.objectStore("studyProgress").put(next));
    return next;
  });
}
