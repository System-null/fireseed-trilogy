import { openDB } from 'idb';

const DB_NAME = 'fireseed-db';
const STORE = 'kv';

export async function db() {
  return openDB(DB_NAME, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(STORE)) {
        database.createObjectStore(STORE);
      }
    }
  });
}

export async function idbGet<T>(key: IDBValidKey): Promise<T | undefined> {
  return (await db()).get(STORE, key) as Promise<T | undefined>;
}

export async function idbSet<T>(key: IDBValidKey, value: T) {
  return (await db()).put(STORE, value, key);
}
