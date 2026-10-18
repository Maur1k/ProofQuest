import type { Attempt, Quest, SubjectId } from "./types";

export const MASTERY_MAX = 5;

/**
 * Deterministic mastery rule, applied to answers in chronological order:
 * - correct, no hints, not revealed  -> +1
 * - correct with hints               ->  0 (counts toward accuracy only)
 * - incorrect or revealed            -> -1
 * Clamped to 0..MASTERY_MAX.
 */
export function masteryDelta(a: { correct: boolean; hintsUsed: number; revealed: boolean }): number {
  if (a.revealed || !a.correct) return -1;
  if (a.hintsUsed > 0) return 0;
  return 1;
}

export interface FlatAnswer {
  subjectId: SubjectId;
  topic: string;
  correct: boolean;
  hintsUsed: number;
  revealed: boolean;
  answeredAt: number;
}

export function flattenAnswers(attempts: Attempt[]): FlatAnswer[] {
  return attempts
    .flatMap((at) =>
      Object.values(at.answers).map((a) => ({
        subjectId: at.subjectId,
        topic: at.topic,
        correct: a.correct && !a.revealed,
        hintsUsed: a.hintsUsed,
        revealed: a.revealed,
        answeredAt: a.answeredAt,
      })),
    )
    .sort((x, y) => x.answeredAt - y.answeredAt);
}

export interface TopicStat {
  subjectId: SubjectId;
  topic: string;
  answered: number;
  correct: number;
  accuracy: number; // 0..1
  mastery: number; // 0..MASTERY_MAX
  lastIncorrectAt: number | null;
}

export function topicKey(subjectId: string, topic: string) {
  return `${subjectId}|${topic.trim().toLowerCase()}`;
}

export function computeTopicStats(attempts: Attempt[]): TopicStat[] {
  const map = new Map<string, TopicStat>();
  for (const a of flattenAnswers(attempts)) {
    const key = topicKey(a.subjectId, a.topic);
    const s =
      map.get(key) ??
      ({ subjectId: a.subjectId, topic: a.topic, answered: 0, correct: 0, accuracy: 0, mastery: 0, lastIncorrectAt: null } as TopicStat);
    s.answered += 1;
    if (a.correct) s.correct += 1;
    else s.lastIncorrectAt = a.answeredAt;
    s.mastery = Math.max(0, Math.min(MASTERY_MAX, s.mastery + masteryDelta(a)));
    s.accuracy = s.correct / s.answered;
    map.set(key, s);
  }
  return [...map.values()];
}

/** Lowest accuracy first; ties broken by the most recent incorrect answer. */
export function suggestFocus(stats: TopicStat[]): TopicStat | null {
  const candidates = stats.filter((s) => s.mastery < MASTERY_MAX);
  if (!candidates.length) return null;
  return [...candidates].sort(
    (a, b) => a.accuracy - b.accuracy || (b.lastIncorrectAt ?? 0) - (a.lastIncorrectAt ?? 0),
  )[0];
}

export interface Summary {
  answered: number;
  correct: number;
  incorrect: number;
  accuracy: number;
}

export function summarize(answers: { correct: boolean; revealed: boolean }[]): Summary {
  const answered = answers.length;
  const correct = answers.filter((a) => a.correct && !a.revealed).length;
  return { answered, correct, incorrect: answered - correct, accuracy: answered ? correct / answered : 0 };
}

export function attemptSummary(attempt: Attempt): Summary {
  return summarize(Object.values(attempt.answers));
}

export type QuestStatus = "new" | "in-progress" | "completed";

export function questStatus(questId: string, attempts: Attempt[]): QuestStatus {
  const mine = attempts.filter((a) => a.questId === questId);
  if (mine.some((a) => a.completedAt === null)) return "in-progress";
  if (mine.some((a) => a.completedAt !== null)) return "completed";
  return "new";
}

export function latestCompleted(questId: string, attempts: Attempt[]): Attempt | undefined {
  return attempts
    .filter((a) => a.questId === questId && a.completedAt !== null)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))[0];
}

export function unfinishedAttempt(questId: string, attempts: Attempt[]): Attempt | undefined {
  return attempts.find((a) => a.questId === questId && a.completedAt === null);
}

/** Most recently touched unfinished attempt whose quest still exists. */
export function continueTarget(
  quests: Quest[],
  attempts: Attempt[],
): { attempt: Attempt; quest: Quest } | null {
  const sorted = attempts.filter((a) => a.completedAt === null).sort((a, b) => b.updatedAt - a.updatedAt);
  for (const attempt of sorted) {
    const quest = quests.find((q) => q.id === attempt.questId);
    if (quest && quest.questions.length) return { attempt, quest };
  }
  return null;
}

export function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}
