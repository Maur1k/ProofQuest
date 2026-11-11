import { z } from "zod";
import { studyRequestSchema, validateGeneratedStudy } from "./study-material";
export const studyRecordSchema = z
  .object({
    id: z.string().min(1).max(200),
    request: studyRequestSchema,
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
    material: z.unknown(),
  })
  .strict()
  .transform((record, ctx) => {
    try {
      const header = z
        .object({
          id: z.string(),
          title: z.string(),
          createdAt: z.number(),
          documentId: z.string(),
        })
        .parse(record.material);
      const { id, title, createdAt, documentId, ...output } = record.material as Record<
        string,
        unknown
      >;
      if (id !== record.id || documentId !== record.request.documentId) throw new Error();
      const material = validateGeneratedStudy(output, record.request, {
        id: header.id,
        title: header.title,
        createdAt: header.createdAt,
      });
      return { ...record, material };
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid saved study material" });
      return z.NEVER;
    }
  });
export type StudyRecord = z.infer<typeof studyRecordSchema>;
export const studyProgressSchema = z
  .object({
    id: z.string().min(1).max(200),
    revision: z.number().int().nonnegative(),
    index: z.number().int().nonnegative(),
    revealed: z.boolean(),
  })
  .strict();
export type StudyProgress = z.infer<typeof studyProgressSchema>;
export function validateStudyProgress(record: StudyRecord, progress: StudyProgress) {
  studyProgressSchema.parse(progress);
  if (
    progress.id !== record.id ||
    record.material.format !== "flashcards" ||
    progress.index >= record.material.cards.length
  )
    throw new Error("Invalid flashcard position");
  return progress;
}
