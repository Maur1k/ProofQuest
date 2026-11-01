import { z } from "zod";
import {
  attemptSchema,
  questSchema,
  responseSchema as legacyResponseSchema,
} from "@/domain/storage";
import {
  quizVersionSchema,
  validateResponse,
  checkQuizAnswer,
  responseIsEmpty,
} from "@/domain/quiz";
import { finalizeQuizSession, type QuizSession } from "@/domain/quiz-session";

const id = z.string().min(1).max(200);
const time = z.number().finite().nonnegative();
const count = z.number().int().nonnegative();
export const appDataSchema = z
  .object({ version: z.literal(1), quests: z.array(questSchema), attempts: z.array(attemptSchema) })
  .strict()
  .superRefine((data, ctx) => {
    for (const records of [data.quests, data.attempts])
      if (new Set(records.map((record) => record.id)).size !== records.length)
        ctx.addIssue({ code: "custom", message: "Duplicate legacy record IDs" });
  });
export const snapshotSchema = z
  .object({
    provenance: z.enum(["original", "reconstructed", "missing"]),
    quest: questSchema.nullable(),
  })
  .strict();
export type AttemptSnapshot = z.infer<typeof snapshotSchema>;
export const legacyStateSchema = z
  .object({
    id: z.literal("legacy"),
    revision: count,
    data: appDataSchema,
    snapshots: z.record(snapshotSchema),
  })
  .strict()
  .superRefine((state, ctx) => {
    for (const attempt of state.data.attempts) {
      const snapshot = Object.hasOwn(state.snapshots, attempt.id)
        ? state.snapshots[attempt.id]
        : undefined;
      if (
        !snapshot ||
        (snapshot.quest && snapshot.quest.id !== attempt.questId) ||
        (snapshot.provenance === "missing") !== (snapshot.quest === null)
      )
        ctx.addIssue({ code: "custom", message: "Missing or inconsistent history snapshot" });
    }
    if (
      Object.keys(state.snapshots).some(
        (id) => !state.data.attempts.some((attempt) => attempt.id === id),
      )
    )
      ctx.addIssue({ code: "custom", message: "Orphan history snapshot" });
  });
export type LegacyState = z.infer<typeof legacyStateSchema>;

export const documentSchema = z
  .object({
    id,
    name: z.string().min(1).max(500),
    checksum: z.string().regex(/^[a-f0-9]{64}$/),
    pageCount: z.number().int().positive(),
    createdAt: time,
    blob: z.instanceof(Blob),
  })
  .strict();
export type DocumentRecord = z.infer<typeof documentSchema>;
export const pageSchema = z
  .object({
    documentId: id,
    page: z.number().int().positive(),
    text: z.string().max(200_000),
    warnings: z.array(z.string().max(1000)).max(100),
  })
  .strict();
export type PageRecord = z.infer<typeof pageSchema>;
export const jobSchema = z
  .object({
    id,
    revision: count,
    documentId: id,
    status: z.enum(["queued", "running", "succeeded", "failed", "cancelled"]),
    selectedPages: z.array(z.number().int().positive()).min(1).max(30),
    questionCount: z.number().int().min(1).max(100),
    createdAt: time,
    updatedAt: time,
    resultVersionId: id.nullable(),
    errorCode: z.enum(["timeout", "invalid-output", "unavailable", "cancelled"]).nullable(),
  })
  .strict();
export type GenerationJob = z.infer<typeof jobSchema>;

const responseSchema = z.union([
  legacyResponseSchema,
  z.object({ type: z.literal("mcq"), optionId: id.nullable() }).strict(),
]);
const answerSchema = z
  .object({
    questionId: id,
    response: responseSchema,
    status: z.enum(["draft", "submitted"]),
    correct: z.boolean().nullable(),
    hintsUsed: count,
    revealed: z.boolean(),
    updatedAt: time,
  })
  .strict();
export const sessionSchema: z.ZodType<QuizSession> = z
  .object({
    id,
    revision: count,
    mode: z.enum(["practice", "test"]),
    gradingVersion: z.literal("all-questions-v1"),
    version: quizVersionSchema,
    questionOrder: z.array(id),
    optionOrder: z.record(z.array(id)),
    answers: z.record(answerSchema),
    startedAt: time,
    updatedAt: time,
    completedAt: time.nullable(),
    result: z
      .object({
        correct: count,
        incorrect: count,
        skipped: count,
        total: count,
        percentage: count.max(100),
      })
      .strict()
      .nullable(),
  })
  .strict()
  .superRefine((session, ctx) => {
    const fail = (message: string) => ctx.addIssue({ code: "custom", message });
    const sameSet = (a: string[], b: string[]) =>
      a.length === b.length && new Set(a).size === a.length && a.every((x) => b.includes(x));
    if (
      !sameSet(
        session.questionOrder,
        session.version.questions.map((q) => q.id),
      )
    )
      fail("Invalid question order");
    const mcqs = session.version.questions.filter((q) => q.type === "mcq");
    if (
      !sameSet(
        Object.keys(session.optionOrder),
        mcqs.map((q) => q.id),
      )
    )
      fail("Invalid option order keys");
    for (const question of mcqs)
      if (
        !sameSet(
          session.optionOrder[question.id] ?? [],
          question.options.map((option) => option.id),
        )
      )
        fail("Invalid option order");
    if (
      session.updatedAt < session.startedAt ||
      (session.completedAt !== null && session.completedAt !== session.updatedAt)
    )
      fail("Invalid session time");
    for (const [key, answer] of Object.entries(session.answers)) {
      const question = session.version.questions.find((q) => q.id === key);
      if (!question || answer.questionId !== key) {
        fail("Unknown answer question");
        continue;
      }
      try {
        validateResponse(question, answer.response);
      } catch {
        fail("Invalid response");
      }
      if (
        answer.hintsUsed > question.hints.length ||
        answer.updatedAt < session.startedAt ||
        answer.updatedAt > session.updatedAt
      )
        fail("Invalid answer metadata");
      if (
        session.completedAt !== null &&
        (answer.correct === null || answer.status !== "submitted")
      )
        fail("Completed answers must be finalized");
      if (
        session.completedAt !== null &&
        responseIsEmpty(answer.response) &&
        answer.correct !== false
      )
        fail("Empty answer cannot be correct");
      if (session.mode === "test" && (answer.hintsUsed !== 0 || answer.revealed))
        fail("Test must not reveal hints or solutions");
      if (
        session.mode === "test" &&
        session.completedAt === null &&
        (answer.correct !== null || answer.status !== "draft")
      )
        fail("Ungraded test draft required");
      if (session.mode === "practice" && (answer.correct === null || answer.status !== "submitted"))
        fail("Submitted practice answer required");
      if (
        (session.mode === "practice" || session.completedAt !== null) &&
        !responseIsEmpty(answer.response) &&
        answer.correct !== (!answer.revealed && checkQuizAnswer(question, answer.response))
      )
        fail("Recorded new answer grading does not match its snapshot");
      if (session.mode === "practice" && answer.revealed && answer.correct !== false)
        fail("Revealed answer cannot be correct");
    }
    if (session.completedAt === null && session.result !== null) fail("Unfinished result");
    if (session.completedAt !== null) {
      try {
        const expected = finalizeQuizSession(
          { ...session, completedAt: null, result: null },
          session.revision,
          session.updatedAt,
        );
        if (JSON.stringify(expected.result) !== JSON.stringify(session.result))
          fail("Invalid score");
      } catch {
        fail("Invalid completed session");
      }
    }
  });
export const migrationSchema = z
  .object({
    id: z.literal("migration-v1"),
    source: z.string().nullable(),
    warning: z.string().nullable(),
    questIds: z.array(id),
    attemptIds: z.array(id),
  })
  .strict();
