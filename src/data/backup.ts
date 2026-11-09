import { z } from "zod";
import { quizVersionSchema } from "@/domain/quiz";
import {
  documentSchema,
  validateDocumentPages,
  jobSchema,
  legacyStateSchema,
  migrationSchema,
  pageSchema,
  sessionSchema,
  type DocumentRecord,
  type LegacyState,
} from "./records";
import { TABLES, transact, requestValue } from "./indexed-db";

export const BACKUP_MAX_BYTES = 100 * 1024 * 1024;
const encodedDocumentSchema = documentSchema
  .omit({ blob: true })
  .extend({ bytes: z.string().max(28 * 1024 * 1024) })
  .strict();
const backupSchema = z
  .object({
    format: z.literal("proofquest-backup"),
    version: z.literal(2),
    legacy: legacyStateSchema,
    migration: migrationSchema.nullable(),
    rollbackSources: z.array(z.string()).default([]),
    documents: z.array(encodedDocumentSchema),
    pages: z.array(pageSchema),
    versions: z.array(quizVersionSchema),
    sessions: z.array(sessionSchema),
    jobs: z.array(jobSchema),
  })
  .strict();

function encode(bytes: Uint8Array): string {
  let text = "";
  for (let offset = 0; offset < bytes.length; offset += 8192)
    text += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
  return btoa(text);
}
async function checksum(blob: Blob): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function exportBackup(database: IDBDatabase): Promise<string> {
  const snapshot = await transact(database, TABLES, "readonly", async (tx) => ({
    legacy: legacyStateSchema.parse(await requestValue(tx.objectStore("legacy").get("legacy"))),
    migration: migrationSchema
      .nullable()
      .parse((await requestValue(tx.objectStore("meta").get("migration-v1"))) ?? null),
    rollbackSources: z
      .array(z.string())
      .parse((await requestValue(tx.objectStore("meta").get("rollback-sources")))?.sources ?? []),
    documents: z
      .array(documentSchema)
      .parse(await requestValue(tx.objectStore("documents").getAll())),
    pages: z.array(pageSchema).parse(await requestValue(tx.objectStore("pages").getAll())),
    versions: z
      .array(quizVersionSchema)
      .parse(await requestValue(tx.objectStore("versions").getAll())),
    sessions: z.array(sessionSchema).parse(await requestValue(tx.objectStore("sessions").getAll())),
    jobs: z.array(jobSchema).parse(await requestValue(tx.objectStore("jobs").getAll())),
  }));
  // Blob reads happen after the consistent database snapshot, outside its transaction.
  const documents = [];
  for (const { blob, ...document } of snapshot.documents) {
    documents.push({ ...document, bytes: encode(new Uint8Array(await blob.arrayBuffer())) });
  }
  const text = JSON.stringify({ ...snapshot, documents, format: "proofquest-backup", version: 2 });
  if (new Blob([text]).size > BACKUP_MAX_BYTES)
    throw new Error("Backup exceeds the 100 MiB recovery limit.");
  return text;
}

function assertUnique(keys: string[]) {
  if (new Set(keys).size !== keys.length) throw new Error("Backup contains duplicate IDs");
}
function mergeRecords<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const merged = new Map(current.map((record) => [record.id, record]));
  for (const record of incoming) {
    const existing = merged.get(record.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(record))
      throw new Error(
        "Backup conflicts with existing records. Nothing was imported. Restore into a separate browser profile or export and deliberately clear this library first.",
      );
    merged.set(record.id, record);
  }
  return [...merged.values()];
}

export async function importBackup(database: IDBDatabase, text: string): Promise<LegacyState> {
  if (new Blob([text]).size > BACKUP_MAX_BYTES)
    throw new Error("Backup exceeds the 100 MiB recovery limit.");
  const backup = backupSchema.parse(JSON.parse(text));
  for (const records of [backup.documents, backup.versions, backup.sessions, backup.jobs])
    assertUnique(records.map((record) => record.id));
  assertUnique(backup.pages.map((page) => JSON.stringify([page.documentId, page.page])));
  const documents: DocumentRecord[] = [];
  for (const { bytes, ...document } of backup.documents) {
    const decoded = atob(bytes);
    const blob = new Blob([Uint8Array.from(decoded, (char) => char.charCodeAt(0))], {
      type: "application/pdf",
    });
    if (
      encode(new Uint8Array(await blob.arrayBuffer())) !== bytes ||
      (await checksum(blob)) !== document.checksum
    )
      throw new Error("PDF backup checksum mismatch");
    const pages = backup.pages.filter((page) => page.documentId === document.id);
    validateDocumentPages(document, pages);
    documents.push({ ...document, blob });
  }
  if (backup.pages.some((page) => !documents.some((document) => document.id === page.documentId)))
    throw new Error("Orphan page in backup");
  for (const session of backup.sessions) {
    const version = backup.versions.find((item) => item.id === session.version.id);
    if (version && JSON.stringify(version) !== JSON.stringify(session.version))
      throw new Error("Session snapshot does not match version");
  }
  for (const job of backup.jobs) {
    const document = documents.find((item) => item.id === job.documentId);
    if (
      !document ||
      job.selectedPages.some((page) => page > document.pageCount) ||
      new Set(job.selectedPages).size !== job.selectedPages.length ||
      job.updatedAt < job.createdAt ||
      (job.status === "succeeded" &&
        !backup.versions.some((version) => version.id === job.resultVersionId))
    )
      throw new Error("Invalid generation job reference");
  }
  return transact(database, TABLES, "readwrite", async (tx) => {
    const stored: unknown = await requestValue(tx.objectStore("legacy").get("legacy"));
    const current =
      stored === undefined
        ? {
            id: "legacy" as const,
            revision: 0,
            data: { version: 1 as const, quests: [], attempts: [] },
            snapshots: {},
          }
        : legacyStateSchema.parse(stored);
    const snapshots = { ...current.snapshots };
    for (const [key, value] of Object.entries(backup.legacy.snapshots)) {
      if (Object.hasOwn(snapshots, key) && JSON.stringify(snapshots[key]) !== JSON.stringify(value))
        throw new Error("Conflicting history snapshot");
      Object.defineProperty(snapshots, key, {
        value,
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    const next = legacyStateSchema.parse({
      id: "legacy",
      revision: current.revision + 1,
      snapshots,
      data: {
        version: 1,
        quests: mergeRecords(current.data.quests, backup.legacy.data.quests),
        attempts: mergeRecords(current.data.attempts, backup.legacy.data.attempts),
      },
    });
    await requestValue(tx.objectStore("legacy").put(next));
    for (const [table, records] of [
      ["documents", documents],
      ["pages", backup.pages],
      ["versions", backup.versions],
      ["sessions", backup.sessions],
      ["jobs", backup.jobs],
    ] as const) {
      for (const record of records) {
        const key = "id" in record ? record.id : [record.documentId, record.page];
        const existing: unknown = await requestValue(tx.objectStore(table).get(key));
        if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(record))
          throw new Error("Conflicting backup record. Nothing was imported.");
        if (existing === undefined) await requestValue(tx.objectStore(table).add(record));
      }
    }
    const existingSources: unknown = await requestValue(
      tx.objectStore("meta").get("rollback-sources"),
    );
    const previous = z
      .object({ id: z.literal("rollback-sources"), sources: z.array(z.string()) })
      .optional()
      .parse(existingSources);
    const sources = [
      ...new Set([
        ...(previous?.sources ?? []),
        ...backup.rollbackSources,
        ...(backup.migration?.source ? [backup.migration.source] : []),
      ]),
    ];
    await requestValue(tx.objectStore("meta").put({ id: "rollback-sources", sources }));
    return next;
  });
}

export async function clearLibrary(
  database: IDBDatabase,
  expectedRevision: number,
): Promise<LegacyState> {
  return transact(database, TABLES, "readwrite", async (tx) => {
    const current = legacyStateSchema.parse(
      await requestValue(tx.objectStore("legacy").get("legacy")),
    );
    if (current.revision !== expectedRevision)
      throw new Error("Library changed. Review it again before deleting.");
    for (const table of TABLES) await requestValue(tx.objectStore(table).clear());
    const next: LegacyState = {
      id: "legacy",
      revision: current.revision + 1,
      data: { version: 1, quests: [], attempts: [] },
      snapshots: {},
    };
    await requestValue(tx.objectStore("legacy").put(next));
    await requestValue(
      tx
        .objectStore("meta")
        .put({ id: "migration-v1", source: null, warning: null, questIds: [], attemptIds: [] }),
    );
    return next;
  });
}
