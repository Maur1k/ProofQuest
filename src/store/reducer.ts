import type { AnswerRecord, AppData, Attempt, Quest } from "@/domain/types";

export type Action =
  | { type: "createQuest"; quest: Quest }
  | { type: "updateQuest"; quest: Quest }
  | { type: "deleteQuest"; id: string }
  | { type: "startAttempt"; attempt: Attempt }
  | { type: "showHint"; attemptId: string; questionId: string; count: number; now: number }
  | { type: "recordAnswer"; attemptId: string; record: AnswerRecord }
  | { type: "setIndex"; attemptId: string; index: number; now: number }
  | { type: "completeAttempt"; attemptId: string; now: number };

function patchAttempt(data: AppData, id: string, fn: (a: Attempt) => Attempt): AppData {
  return { ...data, attempts: data.attempts.map((a) => (a.id === id ? fn(a) : a)) };
}

export function dataReducer(data: AppData, action: Action): AppData {
  switch (action.type) {
    case "createQuest":
      return { ...data, quests: [action.quest, ...data.quests] };
    case "updateQuest":
      return { ...data, quests: data.quests.map((q) => (q.id === action.quest.id ? action.quest : q)) };
    case "deleteQuest":
      // Attempts are kept (they carry snapshots) so progress history survives.
      // Unfinished attempts of a deleted quest can never be resumed, so drop those.
      return {
        ...data,
        quests: data.quests.filter((q) => q.id !== action.id),
        attempts: data.attempts.filter((a) => !(a.questId === action.id && a.completedAt === null)),
      };
    case "startAttempt": {
      const existing = data.attempts.some(
        (a) => a.questId === action.attempt.questId && a.completedAt === null,
      );
      if (existing) return data; // only one unfinished attempt per quest
      return { ...data, attempts: [...data.attempts, action.attempt] };
    }
    case "showHint":
      return patchAttempt(data, action.attemptId, (a) => {
        if (a.completedAt !== null || a.answers[action.questionId]) return a;
        const prev = a.hintsShown[action.questionId] ?? 0;
        if (action.count <= prev) return a;
        return { ...a, updatedAt: action.now, hintsShown: { ...a.hintsShown, [action.questionId]: action.count } };
      });
    case "recordAnswer":
      return patchAttempt(data, action.attemptId, (a) => {
        // Reject duplicates: one record per question per attempt.
        if (a.completedAt !== null || a.answers[action.record.questionId]) return a;
        return {
          ...a,
          updatedAt: action.record.answeredAt,
          answers: { ...a.answers, [action.record.questionId]: action.record },
        };
      });
    case "setIndex":
      return patchAttempt(data, action.attemptId, (a) =>
        a.completedAt !== null ? a : { ...a, currentIndex: Math.max(0, action.index), updatedAt: action.now },
      );
    case "completeAttempt":
      return patchAttempt(data, action.attemptId, (a) =>
        a.completedAt !== null ? a : { ...a, completedAt: action.now, updatedAt: action.now },
      );
  }
}
