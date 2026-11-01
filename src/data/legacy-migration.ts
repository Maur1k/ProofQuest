import { parseStoredData } from "@/domain/storage";
import { attemptSummary } from "@/domain/stats";
import type { AppData, Attempt, Question } from "@/domain/types";

export interface LegacyHistory {
  id: string;
  gradingVersion: "legacy-answered-v1";
  recorded: Attempt;
  score: ReturnType<typeof attemptSummary>;
  details: {
    questionId: string;
    provenance: "reconstructed" | "missing";
    question: Question | null;
  }[];
}
export interface LegacyMigrationPlan {
  source: string | null;
  data: AppData;
  history: LegacyHistory[];
  warning: string | null;
}

/** Pure preparation only: the adapter must retain source and commit all records atomically. */
export function prepareLegacyMigration(raw: string | null): LegacyMigrationPlan {
  const parsed = parseStoredData(raw);
  if (parsed.kind === "corrupt") throw new Error(parsed.warning);
  if (raw?.trim()) {
    const envelope: unknown = JSON.parse(raw);
    if (
      typeof envelope !== "object" ||
      envelope === null ||
      !("version" in envelope) ||
      envelope.version !== 1
    )
      throw new Error("Unsupported legacy data version");
  }
  const data: AppData =
    parsed.kind === "empty" ? { version: 1, quests: [], attempts: [] } : parsed.data;
  for (const records of [data.quests, data.attempts]) {
    if (new Set(records.map((record) => record.id)).size !== records.length)
      throw new Error("Duplicate legacy IDs; export the original before recovery");
  }
  const history = data.attempts.map((attempt): LegacyHistory => {
    const quest = data.quests.find((item) => item.id === attempt.questId);
    return {
      id: attempt.id,
      gradingVersion: "legacy-answered-v1",
      recorded: structuredClone(attempt),
      score: attemptSummary(attempt),
      details: Object.values(attempt.answers).map((answer) => {
        const question = quest?.questions.find((item) => item.id === answer.questionId);
        return {
          questionId: answer.questionId,
          provenance: question ? "reconstructed" : "missing",
          question: question ? structuredClone(question) : null,
        };
      }),
    };
  });
  return {
    source: raw,
    data,
    history,
    warning: parsed.kind === "recovered" ? parsed.warning : null,
  };
}
