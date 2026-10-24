import { z } from "zod";
import {
  DIFFICULTIES,
  LANGUAGES,
  SUBJECT_IDS,
  type AppData,
  type Attempt,
  type Quest,
} from "./types";

export const STORAGE_KEY = "proofquest:data:v1";
export const BACKUP_KEY_PREFIX = "proofquest:backup:";

const base = {
  id: z.string().min(1),
  prompt: z.string(),
  language: z.enum(LANGUAGES),
  code: z.string(),
  explanation: z.string(),
  hints: z.array(z.string()),
};

const questionSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("predict"), expectedOutput: z.string() }),
  z.object({
    ...base,
    type: z.literal("trace"),
    variables: z.array(z.string()),
    steps: z.array(z.object({ label: z.string(), values: z.array(z.string()) })),
  }),
  z.object({ ...base, type: z.literal("fix"), fixedCode: z.string() }),
]);

export const questSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  subjectId: z.enum(SUBJECT_IDS),
  topic: z.string(),
  difficulty: z.enum(DIFFICULTIES),
  questions: z.array(questionSchema),
  createdAt: z.number(),
  updatedAt: z.number(),
});

const responseSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("predict"), output: z.string() }),
  z.object({ type: z.literal("trace"), cells: z.array(z.array(z.string())) }),
  z.object({ type: z.literal("fix"), code: z.string() }),
]);

export const attemptSchema = z.object({
  id: z.string().min(1),
  questId: z.string(),
  questTitle: z.string(),
  subjectId: z.enum(SUBJECT_IDS),
  topic: z.string(),
  startedAt: z.number(),
  updatedAt: z.number(),
  completedAt: z.number().nullable(),
  currentIndex: z.number().int().min(0),
  hintsShown: z.record(z.number()),
  answers: z.record(
    z.object({
      questionId: z.string(),
      response: responseSchema,
      correct: z.boolean(),
      hintsUsed: z.number(),
      revealed: z.boolean(),
      answeredAt: z.number(),
    }),
  ),
});

export type ParseResult =
  | { kind: "empty" }
  | { kind: "ok"; data: AppData }
  | { kind: "recovered"; data: AppData; dropped: number; warning: string }
  | { kind: "corrupt"; warning: string };

/**
 * Parses stored data. Valid records are kept individually so a single bad entry
 * never discards the rest. Callers must back up the raw string for any
 * non-"ok" result before overwriting storage.
 */
export function parseStoredData(raw: string | null): ParseResult {
  if (raw === null || raw.trim() === "") return { kind: "empty" };
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { kind: "corrupt", warning: "Saved data could not be read (invalid format)." };
  }
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    return { kind: "corrupt", warning: "Saved data had an unexpected structure." };
  }
  const obj = json as Record<string, unknown>;
  if (!Array.isArray(obj["quests"]) || !Array.isArray(obj["attempts"])) {
    return { kind: "corrupt", warning: "Saved data was missing quests or attempts." };
  }
  const quests: Quest[] = [];
  const attempts: Attempt[] = [];
  let dropped = 0;
  for (const q of obj["quests"]) {
    const r = questSchema.safeParse(q);
    if (r.success) quests.push(r.data);
    else dropped++;
  }
  for (const a of obj["attempts"]) {
    const r = attemptSchema.safeParse(a);
    if (r.success) attempts.push(r.data);
    else dropped++;
  }
  const data: AppData = { version: 1, quests, attempts };
  if (dropped > 0) {
    return {
      kind: "recovered",
      data,
      dropped,
      warning: `${dropped} saved item${dropped === 1 ? "" : "s"} could not be read and ${dropped === 1 ? "was" : "were"} skipped.`,
    };
  }
  return { kind: "ok", data };
}
