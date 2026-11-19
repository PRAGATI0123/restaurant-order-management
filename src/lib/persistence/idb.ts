/**
 * A TINY INDEXEDDB HELPER: one database, one "key → value" table.
 *
 * IndexedDB is the browser's built-in database. Unlike localStorage it holds
 * a lot of data, doesn't block the screen while saving, and survives closing
 * the browser and restarting the computer. Its own API is old-fashioned
 * (events instead of promises), so these few functions wrap it in promises.
 *
 * Everything here quietly does nothing where IndexedDB doesn't exist (the
 * server, tests): the app then simply runs from memory.
 */
const DB_NAME = "restaurant-pos";
const STORE = "kv";
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | undefined;

export function isIndexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    // First time (or a newer version): create the table.
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("The database is open in an older tab."));
  });
  // If opening failed, try again next time instead of failing forever.
  dbPromise.catch(() => (dbPromise = undefined));
  return dbPromise;
}

/** Runs one request in a transaction and resolves with its result. */
async function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Saving was cancelled."));
  });
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  if (!isIndexedDbAvailable()) return undefined;
  return run<T | undefined>("readonly", (store) => store.get(key));
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  await run("readwrite", (store) => store.put(value, key));
}

export async function idbDelete(key: string): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  await run("readwrite", (store) => store.delete(key));
}
