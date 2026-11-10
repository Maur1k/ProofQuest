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
import { STORAGE_KEY, BACKUP_KEY_PREFIX, parseStoredData } from "@/domain/storage";
import type { AnswerRecord, AppData, Attempt, QuestDraft, Quest } from "@/domain/types";
import { newId } from "@/lib/id";
import { dataReducer, type Action } from "./reducer";
import { openDatabase } from "@/data/indexed-db";
import { ProofQuestRepository } from "@/data/repository";
import type { LegacyState } from "@/data/records";
import { clearLibrary, exportBackup, importBackup } from "@/data/backup";
import { createSampleMcqVersion } from "@/data/sample-mcq";
import type { QuizSession } from "@/domain/quiz-session";
import { RevisionConflict } from "@/domain/quiz-session";

type Persistence = "loading" | "durable" | "blocked" | "temporary";
interface StoreValue {
  startSamplePractice: () => Promise<QuizSession>;
  loadQuizSession: (id: string) => Promise<QuizSession | null>;
  submitPractice: (
    session: QuizSession,
    questionId: string,
    optionId: string,
  ) => Promise<QuizSession>;
  ready: boolean;
  data: AppData;
  snapshots: LegacyState["snapshots"];
  warning: string | null;
  persistence: Persistence;
  busy: boolean;
  dismissWarning: () => void;
  useTemporarySession: () => void;
  exportData: () => Promise<string>;
  importData: (text: string) => Promise<void>;
  clearData: () => Promise<void>;
  createQuest: (draft: QuestDraft) => Promise<string | null>;
  updateQuest: (id: string, draft: QuestDraft, original: Quest) => Promise<boolean>;
  deleteQuest: (id: string) => Promise<boolean>;
  startAttempt: (questId: string) => Promise<boolean>;
  showHint: (attemptId: string, questionId: string, count: number) => Promise<boolean>;
  recordAnswer: (attemptId: string, record: Omit<AnswerRecord, "answeredAt">) => Promise<boolean>;
  setIndex: (attemptId: string, index: number) => Promise<boolean>;
  completeAttempt: (attemptId: string) => Promise<boolean>;
}
const StoreContext = createContext<StoreValue | null>(null);
const EMPTY: AppData = { version: 1, quests: [], attempts: [] };
const INITIAL: LegacyState = { id: "legacy", revision: 0, data: EMPTY, snapshots: {} };

function recoveryState(data: AppData): LegacyState {
  return {
    ...INITIAL,
    data,
    snapshots: Object.fromEntries(
      data.attempts.map((attempt) => {
        const quest = data.quests.find((item) => item.id === attempt.questId) ?? null;
        return [attempt.id, { provenance: quest ? "reconstructed" : "missing", quest }];
      }),
    ),
  };
}

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
  const [state, setState] = useState<LegacyState>(INITIAL);
  const [warning, setWarning] = useState<string | null>(null);
  const [persistence, setPersistence] = useState<Persistence>("loading");
  const [busy, setBusy] = useState(false);
  const stateRef = useRef(state);
  const modeRef = useRef(persistence);
  const busyRef = useRef(false);
  const repository = useRef<ProofQuestRepository | null>(null);
  const channel = useRef<BroadcastChannel | null>(null);
  const originalSource = useRef<string | null>(null);
  const apply = useCallback((value: LegacyState) => {
    stateRef.current = value;
    setState(value);
  }, []);
  const setMode = useCallback((value: Persistence) => {
    modeRef.current = value;
    setPersistence(value);
  }, []);
  const refresh = useCallback(async () => {
    if (busyRef.current || modeRef.current !== "durable") return;
    try {
      const latest = await repository.current?.getLegacy();
      if (latest && !busyRef.current && latest.revision > stateRef.current.revision) apply(latest);
    } catch {
      setWarning("Could not refresh saved data. Reload before editing in another tab.");
    }
  }, [apply]);

  useEffect(() => {
    let cancelled = false;
    let opened: ProofQuestRepository | null = null;
    async function initialize() {
      try {
        opened = new ProofQuestRepository(await openDatabase(window.indexedDB));
        if (cancelled) {
          opened.close();
          return;
        }
        repository.current = opened;
        let loaded = await opened.getLegacy();
        if (!loaded) {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          originalSource.current = raw;
          // Keep a read-only fallback ready if the transaction is unavailable or fails.
          const parsed = parseStoredData(raw);
          if (parsed.kind === "ok" || parsed.kind === "recovered")
            apply(recoveryState(parsed.data));
          loaded = await opened.initializeLegacy(raw, {
            version: 1,
            quests: createSampleQuests(),
            attempts: [],
          });
        }
        const migration = await opened.getMigration();
        if (cancelled) return;
        originalSource.current = migration?.source ?? null;
        apply(loaded);
        setMode("durable");
        if (migration?.warning)
          setWarning(`${migration.warning} The original data is retained in your backup.`);
      } catch {
        if (cancelled) return;
        try {
          const raw = window.localStorage.getItem(STORAGE_KEY);
          originalSource.current = raw;
          const parsed = parseStoredData(raw);
          if (parsed.kind === "ok" || parsed.kind === "recovered")
            apply(recoveryState(parsed.data));
        } catch {
          /* Keep the existing in-memory state; do not replace unreadable storage. */
        }
        setMode("blocked");
        setWarning(
          "Saved storage could not be opened or migrated. Your original data was not replaced. Export a backup, retry by reloading, or explicitly choose a temporary session.",
        );
      } finally {
        if (!cancelled) setReady(true);
      }
    }
    void initialize();
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    if (typeof BroadcastChannel !== "undefined") {
      channel.current = new BroadcastChannel("proofquest:data-changed");
      channel.current.onmessage = onFocus;
    }
    return () => {
      cancelled = true;
      opened?.close();
      channel.current?.close();
      window.removeEventListener("focus", onFocus);
    };
  }, [apply, refresh, setMode]);

  const dispatch = useCallback(
    async (action: Action): Promise<boolean> => {
      if (busyRef.current) return false;
      if (modeRef.current === "blocked" || modeRef.current === "loading") {
        setWarning(
          "This change was not saved. Open Data & backup to recover storage or explicitly use a temporary session.",
        );
        return false;
      }
      busyRef.current = true;
      setBusy(true);
      try {
        if (modeRef.current === "temporary") {
          const current = stateRef.current;
          const snapshots = { ...current.snapshots };
          if (action.type === "startAttempt") {
            const quest = current.data.quests.find((q) => q.id === action.attempt.questId);
            if (quest)
              snapshots[action.attempt.id] = {
                provenance: "original",
                quest: structuredClone(quest),
              };
          }
          const data = dataReducer(current.data, action);
          apply({
            ...current,
            revision: current.revision + 1,
            data,
            snapshots: Object.fromEntries(
              data.attempts.filter((a) => snapshots[a.id]).map((a) => [a.id, snapshots[a.id]!]),
            ),
          });
        } else {
          if (!repository.current) throw new Error("Storage unavailable");
          const next = await repository.current.changeLegacy(action, stateRef.current.revision);
          apply(next);
          channel.current?.postMessage("changed");
        }
        return true;
      } catch (error) {
        if (error instanceof RevisionConflict) {
          setWarning(
            "Another tab changed this library. Your change was not saved. Review the latest data and retry; editor text has been kept.",
          );
          try {
            const latest = await repository.current?.getLegacy();
            if (latest) apply(latest);
          } catch {
            setWarning(
              "Storage could not be refreshed. Your change was not saved; export before reloading.",
            );
          }
        } else
          setWarning(
            "Could not save this change. Free browser storage or export a backup and retry. Your previous saved data is intact.",
          );
        return false;
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [apply],
  );

  const runRecovery = useCallback(
    async (work: (repo: ProofQuestRepository) => Promise<LegacyState>) => {
      if (busyRef.current || modeRef.current !== "durable" || !repository.current)
        throw new Error("Durable storage must be available and idle.");
      busyRef.current = true;
      setBusy(true);
      try {
        apply(await work(repository.current));
        channel.current?.postMessage("changed");
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [apply],
  );
  const runQuiz = useCallback(
    async <T,>(work: (repo: ProofQuestRepository) => Promise<T>): Promise<T> => {
      if (busyRef.current || modeRef.current !== "durable" || !repository.current)
        throw new Error("Saved storage must be available and idle. Please retry.");
      busyRef.current = true;
      setBusy(true);
      try {
        return await work(repository.current);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [],
  );
  const startSamplePractice = useCallback(
    () =>
      runQuiz(async (repo) => {
        const version = createSampleMcqVersion();
        await repo.addVersion(version);
        return repo.startSession(newId(), version.id, "practice", Date.now());
      }),
    [runQuiz],
  );
  const loadQuizSession = useCallback(async (id: string) => {
    if (modeRef.current !== "durable" || !repository.current)
      throw new Error("Saved storage is unavailable.");
    return (await repository.current.getSession(id)) ?? null;
  }, []);
  const submitPractice = useCallback(
    (session: QuizSession, questionId: string, optionId: string) =>
      runQuiz((repo) =>
        repo.changeSession(
          session.id,
          session.revision,
          {
            type: "practice",
            questionId,
            response: { type: "mcq", optionId },
            hintsUsed: 0,
            revealed: false,
          },
          Math.max(Date.now(), session.updatedAt),
        ),
      ),
    [runQuiz],
  );
  const value = useMemo<StoreValue>(
    () => ({
      startSamplePractice,
      loadQuizSession,
      submitPractice,
      ready,
      data: state.data,
      snapshots: state.snapshots,
      warning,
      persistence,
      busy,
      dismissWarning: () => setWarning(null),
      useTemporarySession: () => {
        setMode("temporary");
        setWarning("Temporary session: changes exist only in this tab. Export before closing it.");
      },
      exportData: async () => {
        if (modeRef.current === "durable" && repository.current)
          return exportBackup(repository.current.database);
        return JSON.stringify({
          format: "proofquest-backup",
          version: 2,
          legacy: stateRef.current,
          migration: {
            id: "migration-v1",
            source: originalSource.current,
            warning: "Exported from a temporary or blocked session",
            questIds: [],
            attemptIds: [],
          },
          documents: [],
          pages: [],
          versions: [],
          sessions: [],
          jobs: [],
        });
      },
      importData: (text) => runRecovery((repo) => importBackup(repo.database, text)),
      clearData: async () => {
        await runRecovery((repo) => clearLibrary(repo.database, stateRef.current.revision));
        try {
          window.localStorage.removeItem(STORAGE_KEY);
          const backups = Object.keys(window.localStorage).filter((key) =>
            key.startsWith(BACKUP_KEY_PREFIX),
          );
          for (const key of backups) window.localStorage.removeItem(key);
        } catch {
          setWarning("Library cleared, but an older localStorage backup could not be removed.");
        }
      },
      createQuest: async (draft) => {
        const now = Date.now(),
          id = newId();
        return (await dispatch({
          type: "createQuest",
          quest: { ...cleanDraft(draft), id, createdAt: now, updatedAt: now },
        }))
          ? id
          : null;
      },
      updateQuest: async (id, draft, original) => {
        const existing = stateRef.current.data.quests.find((q) => q.id === id);
        if (!existing) {
          setWarning("Quest no longer exists. Your edit was not saved.");
          return false;
        }
        if (JSON.stringify(existing) !== JSON.stringify(original)) {
          setWarning(
            "This quest changed since you opened the editor. Your edit was not saved. Copy your draft before reopening the latest version.",
          );
          return false;
        }
        return dispatch({
          type: "updateQuest",
          quest: { ...cleanDraft(draft), id, createdAt: existing.createdAt, updatedAt: Date.now() },
        });
      },
      deleteQuest: (id) => dispatch({ type: "deleteQuest", id }),
      startAttempt: async (questId) => {
        const quest = stateRef.current.data.quests.find((q) => q.id === questId);
        if (!quest) return false;
        if (
          stateRef.current.data.attempts.some(
            (a) => a.questId === questId && a.completedAt === null,
          )
        )
          return true;
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
        return dispatch({ type: "startAttempt", attempt });
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
    [
      ready,
      state,
      warning,
      persistence,
      busy,
      dispatch,
      runRecovery,
      setMode,
      startSamplePractice,
      loadQuizSession,
      submitPractice,
    ],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
export function useStore(): StoreValue {
  const context = useContext(StoreContext);
  if (!context) throw new Error("useStore must be used inside StoreProvider");
  return context;
}
