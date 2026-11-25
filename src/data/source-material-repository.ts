import { z } from "zod";
import {
  sourceMaterialSchema,
  sourceQuizVersion,
  type SourceMaterial,
} from "@/domain/source-material";
import { sourceRevisionSchema } from "@/domain/study-source";
import { studyProgressSchema, type StudyProgress } from "@/domain/study-record";
import { RevisionConflict } from "@/domain/quiz-session";
import { transact, requestValue } from "./indexed-db";
export function listSourceMaterials(db: IDBDatabase) {
  return transact(db, ["sourceMaterials"], "readonly", async (tx) =>
    z
      .array(sourceMaterialSchema)
      .parse(await requestValue(tx.objectStore("sourceMaterials").getAll())),
  );
}
export function assertMaterialRevision(material: SourceMaterial, revision: unknown) {
  const saved = sourceRevisionSchema.parse(revision),
    selected = material.request.source;
  const { segments, ...header } = saved,
    { segments: chosen, ...selectedHeader } = selected;
  if (
    JSON.stringify(header) !== JSON.stringify(selectedHeader) ||
    chosen.some((s) => JSON.stringify(s) !== JSON.stringify(segments.find((p) => p.id === s.id)))
  )
    throw new Error("Source revision does not match material");
}
export function saveSourceMaterial(db: IDBDatabase, raw: SourceMaterial) {
  const material = sourceMaterialSchema.parse(raw);
  return transact(
    db,
    ["sourceMaterials", "sourceRevisions", "versions"],
    "readwrite",
    async (tx) => {
      assertMaterialRevision(
        material,
        await requestValue(tx.objectStore("sourceRevisions").get(material.request.source.id)),
      );
      const old = await requestValue(tx.objectStore("sourceMaterials").get(material.id));
      if (
        old !== undefined &&
        JSON.stringify(sourceMaterialSchema.parse(old)) !== JSON.stringify(material)
      )
        throw new Error("Material is immutable");
      if (material.output.format === "quiz") {
        const version = sourceQuizVersion(material),
          previous = await requestValue(tx.objectStore("versions").get(version.id));
        if (previous !== undefined && JSON.stringify(previous) !== JSON.stringify(version))
          throw new Error("Quiz identity conflict");
        if (previous === undefined) await requestValue(tx.objectStore("versions").add(version));
      }
      if (old === undefined) await requestValue(tx.objectStore("sourceMaterials").add(material));
      return material;
    },
  );
}
export function validateSourceProgress(material: SourceMaterial, raw: unknown) {
  const progress = studyProgressSchema.parse(raw);
  if (
    progress.id !== material.id ||
    material.output.format !== "flashcards" ||
    progress.index >= material.output.cards.length
  )
    throw new Error("Invalid source card progress");
  return progress;
}
export function sourceCardProgress(
  db: IDBDatabase,
  id: string,
  change?: { previous: StudyProgress; index: number; revealed: boolean },
) {
  return transact(
    db,
    ["sourceMaterials", "sourceMaterialProgress"],
    change ? "readwrite" : "readonly",
    async (tx) => {
      const material = sourceMaterialSchema.parse(
        await requestValue(tx.objectStore("sourceMaterials").get(id)),
      );
      const current = validateSourceProgress(
        material,
        (await requestValue(tx.objectStore("sourceMaterialProgress").get(id))) ?? {
          id,
          revision: 0,
          index: 0,
          revealed: false,
        },
      );
      if (!change) return current;
      if (change.previous.id !== id || current.revision !== change.previous.revision)
        throw new RevisionConflict();
      const next = validateSourceProgress(material, {
        id,
        revision: current.revision + 1,
        index: change.index,
        revealed: change.index === current.index ? change.revealed : false,
      });
      await requestValue(tx.objectStore("sourceMaterialProgress").put(next));
      return next;
    },
  );
}
