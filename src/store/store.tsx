import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createSampleQuests } from "@/data/sample-quests";
import { BACKUP_KEY_PREFIX, STORAGE_KEY, parseStoredData } from "@/domain/storage";
import type { AnswerRecord, AppData, Attempt, QuestDraft } from "@/domain/types";
import { newId } from "@/lib/id";
import { dataReducer, type Action } from "./reducer";

interface StoreValue {
  ready: boolean;
  data: AppData;
  warning: string | null;
  dismissWarning: () => void;
  createQuest: (draft: QuestDraft) => string;
  updateQuest: (id: string, draft: QuestDraft) => void;
  deleteQuest: (id: string) => void;
  startAttempt: (questId: string) => void;
  showHint: (attemptId: string, questionId: string, count: number) => void;
  recordAnswer: (attemptId: string, record: Omit<AnswerRecord, "answeredAt">) => void;
  setIndex: (attemptId: string, index: number) => void;
  completeAttempt: (attemptId: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

const EMPTY: AppData = { version: 1, quests: [], attempts: [] };

function cleanDraft(d: QuestDraft): QuestDraft {
  return {
    ...d,
    title: d.title.trim(),
    topic: d.topic.trim(),
    questions: d.questions.map((q) => ({
      ...q,
      prompt: q.prompt.trim(),
      explanation: q.explanation.trim(),
      hints: q.hints.map((h) => h.trim()),
      ...(q.type === "trace"
        ? {
            variables: q.variables.map((v) => v.trim()),
            steps: q.steps.map((s) => ({
              label: s.label.trim(),
              values: s.values.map((v) => v.trim()),
            })),
          }
        : {}),
    })) as QuestDraft["questions"],
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>(EMPTY);
  const [warning, setWarning] = useState<string | null>(null);
  const dataRef = useRef(data);
  dataRef.current = data;

  // Load after hydration: localStorage is unavailable during SSR.
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      setWarning(
        "Browser storage is unavailable. Your changes will not be saved after you close this tab.",
      );
      setData({ version: 1, quests: createSampleQuests(), attempts: [] });
      setReady(true);
      return;
    }
    const result = parseStoredData(raw);
    const backup = () => {
      const key = `${BACKUP_KEY_PREFIX}${Date.now()}`;
      try {
        window.localStorage.setItem(key, raw ?? "");
        return key;
      } catch {
        return null;
      }
    };
    if (result.kind === "empty") {
      setData({ version: 1, quests: createSampleQuests(), attempts: [] });
    } else if (result.kind === "ok") {
      setData(result.data);
    } else if (result.kind === "recovered") {
      const key = backup();
      setData(result.data);
      setWarning(
        `${result.warning} Everything else was restored.${key ? ` The original data was backed up in browser storage as "${key}".` : ""}`,
      );
    } else {
      const key = backup();
      setData({ version: 1, quests: createSampleQuests(), attempts: [] });
      setWarning(
        `${result.warning} Sample quests were loaded instead.${key ? ` Your original data was kept as a backup in browser storage ("${key}").` : " The original could not be backed up."}`,
      );
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      setWarning("Could not save to browser storage. Recent changes may be lost on reload.");
    }
  }, [data, ready]);

  const dispatch = useCallback((action: Action) => setData((d) => dataReducer(d, action)), []);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      data,
      warning,
      dismissWarning: () => setWarning(null),
      createQuest: (draft) => {
        const now = Date.now();
        const id = newId();
        dispatch({
          type: "createQuest",
          quest: { ...cleanDraft(draft), id, createdAt: now, updatedAt: now },
        });
        return id;
      },
      updateQuest: (id, draft) => {
        const existing = dataRef.current.quests.find((q) => q.id === id);
        if (!existing) return;
        dispatch({
          type: "updateQuest",
          quest: { ...cleanDraft(draft), id, createdAt: existing.createdAt, updatedAt: Date.now() },
        });
      },
      deleteQuest: (id) => dispatch({ type: "deleteQuest", id }),
      startAttempt: (questId) => {
        const quest = dataRef.current.quests.find((q) => q.id === questId);
        if (!quest) return;
        const now = Date.now();
        const attempt: Attempt = {
          id: newId(),
          questId,
          questTitle: quest.title,
          subjectId: quest.subjectId,
          topic: quest.topic,
          startedAt: now,
          updatedAt: now,
          completedAt: null,
          currentIndex: 0,
          hintsShown: {},
          answers: {},
        };
        dispatch({ type: "startAttempt", attempt });
      },
      showHint: (attemptId, questionId, count) =>
        dispatch({ type: "showHint", attemptId, questionId, count, now: Date.now() }),
      recordAnswer: (attemptId, record) =>
        dispatch({
          type: "recordAnswer",
          attemptId,
          record: { ...record, answeredAt: Date.now() },
        }),
      setIndex: (attemptId, index) =>
        dispatch({ type: "setIndex", attemptId, index, now: Date.now() }),
      completeAttempt: (attemptId) =>
        dispatch({ type: "completeAttempt", attemptId, now: Date.now() }),
    }),
    [ready, data, warning, dispatch],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
