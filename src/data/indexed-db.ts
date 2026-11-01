/** Browser-only adapter; importing this module performs no storage access. */
export const DATABASE_NAME = "proofquest:data:v2";
export const TABLES = [
  "legacy",
  "meta",
  "documents",
  "pages",
  "versions",
  "sessions",
  "jobs",
] as const;
export type Table = (typeof TABLES)[number];

export function openDatabase(factory: IDBFactory, name = DATABASE_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(name, 1);
    let rejected = false;
    request.onupgradeneeded = () => {
      for (const table of TABLES)
        request.result.createObjectStore(table, {
          keyPath: table === "pages" ? ["documentId", "page"] : "id",
        });
    };
    request.onblocked = () => {
      rejected = true;
      reject(new Error("Close other ProofQuest tabs to update browser storage."));
    };
    request.onerror = () => reject(request.error ?? new Error("Browser storage could not open."));
    request.onsuccess = () => {
      if (rejected) {
        request.result.close();
        return;
      }
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

export function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Storage request failed."));
  });
}

/** Only await IndexedDB requests inside work: network/file IO would let the transaction expire. */
export async function transact<T>(
  db: IDBDatabase,
  tables: readonly Table[],
  mode: IDBTransactionMode,
  work: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  const tx = db.transaction([...tables], mode);
  const completion = new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () =>
      reject(tx.error ?? new Error("Storage transaction aborted. Nothing was saved."));
    tx.onerror = () => {
      /* Abort is the authoritative failure, not an individual request event. */
    };
  });
  // Observe immediately so an abort cannot become an unhandled rejection during work.
  void completion.catch(() => {});
  try {
    const value = await work(tx);
    await completion;
    return value;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      /* A request failure may already have aborted it. */
    }
    await completion.catch(() => {});
    throw error;
  }
}
