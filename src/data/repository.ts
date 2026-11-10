import { z } from "zod";
import { quizVersionSchema, type QuizResponse, type QuizVersion } from "@/domain/quiz";
import {
  finalizeQuizSession,
  RevisionConflict,
  saveTestDraft,
  startQuizSession,
  submitPracticeAnswer,
  type QuizMode,
  type QuizSession,
} from "@/domain/quiz-session";
import { type AppData } from "@/domain/types";
import { dataReducer, type Action } from "@/store/reducer";
import { prepareLegacyMigration } from "./legacy-migration";
import {
  appDataSchema,
  documentSchema,
  validateDocumentPages,
  jobSchema,
  legacyStateSchema,
  migrationSchema,
  pageSchema,
  sessionSchema,
  type DocumentRecord,
  type GenerationJob,
  type LegacyState,
  type PageRecord,
} from "./records";
import { requestValue, transact } from "./indexed-db";

export interface DocumentRepository {
  listDocuments(): Promise<DocumentRecord[]>;
  getDocumentBundle(
    id: string,
  ): Promise<{ document: DocumentRecord; pages: PageRecord[] } | undefined>;
  addDocument(document: DocumentRecord, pages: PageRecord[]): Promise<void>;
  getDocument(id: string): Promise<DocumentRecord | undefined>;
  getPages(documentId: string): Promise<PageRecord[]>;
  deleteDocument(id: string): Promise<void>;
}
export interface QuizRepository {
  addVersion(version: QuizVersion): Promise<void>;
  getVersion(id: string): Promise<QuizVersion | undefined>;
  deleteQuiz(quizId: string): Promise<void>;
}
export type SessionCommand =
  | { type: "draft"; questionId: string; response: QuizResponse }
  | {
      type: "practice";
      questionId: string;
      response: QuizResponse;
      hintsUsed: number;
      revealed: boolean;
    }
  | { type: "finalize" };
export interface AttemptRepository {
  startSession(id: string, versionId: string, mode: QuizMode, now: number): Promise<QuizSession>;
  getSession(id: string): Promise<QuizSession | undefined>;
  changeSession(
    id: string,
    revision: number,
    command: SessionCommand,
    now: number,
  ): Promise<QuizSession>;
}

async function read<T>(
  tx: IDBTransaction,
  table: string,
  key: IDBValidKey,
  schema: z.ZodType<T>,
): Promise<T | undefined> {
  const value: unknown = await requestValue(tx.objectStore(table).get(key));
  return value === undefined ? undefined : schema.parse(value);
}

export class ProofQuestRepository implements DocumentRepository, QuizRepository, AttemptRepository {
  constructor(readonly database: IDBDatabase) {}
  close() {
    this.database.close();
  }

  async initializeLegacy(raw: string | null, seed: AppData): Promise<LegacyState> {
    return transact(this.database, ["legacy", "meta"], "readwrite", async (tx) => {
      const existing = await read(tx, "legacy", "legacy", legacyStateSchema);
      if (existing) return existing;
      const plan = prepareLegacyMigration(raw);
      const data = appDataSchema.parse(raw?.trim() ? plan.data : seed);
      const state: LegacyState = {
        id: "legacy",
        revision: 0,
        data,
        snapshots: Object.fromEntries(
          data.attempts.map((attempt) => {
            const quest = data.quests.find((item) => item.id === attempt.questId) ?? null;
            return [attempt.id, { provenance: quest ? "reconstructed" : "missing", quest }];
          }),
        ),
      };
      await requestValue(tx.objectStore("legacy").add(state));
      const verified = await read(tx, "legacy", "legacy", legacyStateSchema);
      if (JSON.stringify(verified) !== JSON.stringify(state))
        throw new Error("Migration verification failed");
      await requestValue(
        tx.objectStore("meta").add({
          id: "migration-v1",
          source: raw,
          warning: plan.warning,
          questIds: data.quests.map((item) => item.id),
          attemptIds: data.attempts.map((item) => item.id),
        }),
      );
      return state;
    });
  }
  getMigration() {
    return transact(this.database, ["meta"], "readonly", (tx) =>
      read(tx, "meta", "migration-v1", migrationSchema),
    );
  }
  getLegacy() {
    return transact(this.database, ["legacy"], "readonly", (tx) =>
      read(tx, "legacy", "legacy", legacyStateSchema),
    );
  }
  async changeLegacy(action: Action, revision: number): Promise<LegacyState> {
    return transact(this.database, ["legacy"], "readwrite", async (tx) => {
      const current = await read(tx, "legacy", "legacy", legacyStateSchema);
      if (!current) throw new Error("Storage has not been initialized");
      if (current.revision !== revision) throw new RevisionConflict();
      const snapshots = { ...current.snapshots };
      if (action.type === "startAttempt") {
        const quest = current.data.quests.find((item) => item.id === action.attempt.questId);
        if (!quest) throw new Error("Quest no longer exists");
        snapshots[action.attempt.id] = { provenance: "original", quest };
      }
      const data = dataReducer(current.data, action);
      const retained = Object.fromEntries(
        data.attempts.map((attempt) => [attempt.id, snapshots[attempt.id]]),
      );
      const next = legacyStateSchema.parse({
        id: "legacy",
        revision: revision + 1,
        data,
        snapshots: retained,
      });
      await requestValue(tx.objectStore("legacy").put(next));
      return next;
    });
  }
  async addDocument(input: DocumentRecord, inputPages: PageRecord[]): Promise<void> {
    const document = documentSchema.parse(input);
    const pages = z.array(pageSchema).parse(inputPages);
    validateDocumentPages(document, pages);
    await transact(this.database, ["documents", "pages"], "readwrite", async (tx) => {
      await requestValue(tx.objectStore("documents").add(document));
      for (const page of pages) await requestValue(tx.objectStore("pages").add(page));
    });
  }
  getDocumentBundle(id: string) {
    return transact(this.database, ["documents", "pages"], "readonly", async (tx) => {
      const document = await read(tx, "documents", id, documentSchema);
      if (!document) return undefined;
      const pages = z
        .array(pageSchema)
        .parse(
          await requestValue(
            tx.objectStore("pages").getAll(IDBKeyRange.bound([id, 1], [id, document.pageCount])),
          ),
        )
        .sort((a, b) => a.page - b.page);
      validateDocumentPages(document, pages);
      return { document, pages };
    });
  }
  listDocuments(): Promise<DocumentRecord[]> {
    return transact(this.database, ["documents"], "readonly", async (tx) =>
      z.array(documentSchema).parse(await requestValue(tx.objectStore("documents").getAll())),
    );
  }
  getDocument(id: string) {
    return transact(this.database, ["documents"], "readonly", (tx) =>
      read(tx, "documents", id, documentSchema),
    );
  }
  getPages(documentId: string): Promise<PageRecord[]> {
    return transact(this.database, ["pages"], "readonly", async (tx) => {
      const all: unknown = await requestValue(tx.objectStore("pages").getAll());
      return z
        .array(pageSchema)
        .parse(all)
        .filter((page) => page.documentId === documentId)
        .sort((a, b) => a.page - b.page);
    });
  }
  async deleteDocument(id: string) {
    await transact(this.database, ["documents", "pages", "jobs"], "readwrite", async (tx) => {
      await requestValue(tx.objectStore("documents").delete(id));
      const pages = z.array(pageSchema).parse(await requestValue(tx.objectStore("pages").getAll()));
      for (const page of pages.filter((p) => p.documentId === id))
        await requestValue(tx.objectStore("pages").delete([id, page.page]));
      const jobs = z.array(jobSchema).parse(await requestValue(tx.objectStore("jobs").getAll()));
      for (const job of jobs.filter((j) => j.documentId === id))
        await requestValue(tx.objectStore("jobs").delete(job.id));
      // Versions and session snapshots intentionally retain citations/excerpts after PDF deletion.
    });
  }
  async addVersion(input: QuizVersion) {
    const version = quizVersionSchema.parse(input);
    await transact(this.database, ["versions"], "readwrite", async (tx) => {
      const existing = await read(tx, "versions", version.id, quizVersionSchema);
      if (existing) {
        if (JSON.stringify(existing) !== JSON.stringify(version))
          throw new Error("Quiz versions are immutable. Create a new version ID.");
        return;
      }
      await requestValue(tx.objectStore("versions").add(version));
    });
  }
  getVersion(id: string) {
    return transact(this.database, ["versions"], "readonly", (tx) =>
      read(tx, "versions", id, quizVersionSchema),
    );
  }
  async deleteQuiz(quizId: string) {
    await transact(this.database, ["versions"], "readwrite", async (tx) => {
      const versions = z
        .array(quizVersionSchema)
        .parse(await requestValue(tx.objectStore("versions").getAll()));
      for (const version of versions.filter((v) => v.quizId === quizId))
        await requestValue(tx.objectStore("versions").delete(version.id));
    });
  }
  async startSession(id: string, versionId: string, mode: QuizMode, now: number) {
    return transact(this.database, ["versions", "sessions"], "readwrite", async (tx) => {
      const existing = await read(tx, "sessions", id, sessionSchema);
      if (existing) {
        if (existing.version.id !== versionId || existing.mode !== mode)
          throw new Error("Attempt ID already exists");
        return existing;
      }
      const version = await read(tx, "versions", versionId, quizVersionSchema);
      if (!version) throw new Error("Quiz version no longer exists");
      const all = z
        .array(sessionSchema)
        .parse(await requestValue(tx.objectStore("sessions").getAll()));
      const unfinished = all.find(
        (s) => s.version.quizId === version.quizId && s.mode === mode && s.completedAt === null,
      );
      if (unfinished) return unfinished;
      const session = sessionSchema.parse(startQuizSession(id, version, mode, now));
      await requestValue(tx.objectStore("sessions").add(session));
      return session;
    });
  }
  listSessions() {
    return transact(this.database, ["sessions"], "readonly", async (tx) =>
      z.array(sessionSchema).parse(await requestValue(tx.objectStore("sessions").getAll())),
    );
  }
  async retrySession(id: string, previousId: string, now: number) {
    return transact(this.database, ["sessions"], "readwrite", async (tx) => {
      const previous = await read(tx, "sessions", previousId, sessionSchema);
      if (!previous || previous.completedAt === null)
        throw new Error("A completed quiz is required for retry");
      const all = z
        .array(sessionSchema)
        .parse(await requestValue(tx.objectStore("sessions").getAll()));
      const unfinished = all.find(
        (s) =>
          s.version.id === previous.version.id &&
          s.mode === previous.mode &&
          s.completedAt === null,
      );
      if (unfinished) return unfinished;
      if (
        all.some(
          (s) =>
            s.version.quizId === previous.version.quizId &&
            s.mode === previous.mode &&
            s.completedAt === null,
        )
      )
        throw new Error("Finish the existing attempt before retrying an older version");
      const next = sessionSchema.parse(startQuizSession(id, previous.version, previous.mode, now));
      await requestValue(tx.objectStore("sessions").add(next));
      return next;
    });
  }
  getSession(id: string) {
    return transact(this.database, ["sessions"], "readonly", (tx) =>
      read(tx, "sessions", id, sessionSchema),
    );
  }
  async changeSession(id: string, revision: number, command: SessionCommand, now: number) {
    return transact(this.database, ["sessions"], "readwrite", async (tx) => {
      const session = await read(tx, "sessions", id, sessionSchema);
      if (!session) throw new Error("Attempt no longer exists");
      const next =
        command.type === "finalize"
          ? finalizeQuizSession(session, revision, now)
          : command.type === "draft"
            ? saveTestDraft(session, revision, command.questionId, command.response, now)
            : submitPracticeAnswer(
                session,
                revision,
                command.questionId,
                command.response,
                now,
                command.hintsUsed,
                command.revealed,
              );
      sessionSchema.parse(next);
      await requestValue(tx.objectStore("sessions").put(next));
      return next;
    });
  }
  async saveJob(input: GenerationJob, expectedRevision: number | null) {
    const job = jobSchema.parse(input);
    return transact(this.database, ["jobs", "documents", "versions"], "readwrite", async (tx) => {
      const current = await read(tx, "jobs", job.id, jobSchema);
      if (
        (current?.revision ?? null) !== expectedRevision ||
        job.revision !== (expectedRevision === null ? 0 : expectedRevision + 1)
      )
        throw new RevisionConflict();
      const document = await read(tx, "documents", job.documentId, documentSchema);
      if (
        !document ||
        job.selectedPages.some((page) => page > document.pageCount) ||
        new Set(job.selectedPages).size !== job.selectedPages.length
      )
        throw new Error("Invalid job source pages");
      if (job.updatedAt < job.createdAt || (current && job.updatedAt < current.updatedAt))
        throw new Error("Invalid job time");
      if (
        current &&
        (current.status === "succeeded" ||
          current.status === "failed" ||
          current.status === "cancelled")
      )
        throw new Error("Job is already finished");
      if (
        job.status === "succeeded" &&
        (!job.resultVersionId ||
          !(await read(tx, "versions", job.resultVersionId, quizVersionSchema)))
      )
        throw new Error("Missing generated version");
      if (job.status !== "succeeded" && job.resultVersionId !== null)
        throw new Error("Unfinished job has a result");
      await requestValue(tx.objectStore("jobs").put(job));
      return job;
    });
  }
}
