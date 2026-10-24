import {
  COLLECTION_STORES,
  STORAGE_KEY,
  createEmptyLifeData,
  mergeLifeData,
  type LifeData,
  type LifeDataStoreName,
} from "@/lib/lifeDataTypes";

const DB_NAME = "lifeflow-indexeddb";
const DB_VERSION = 2;
const META_STORE = "meta";
const MIGRATION_KEY = "migratedFromLocalStorage";

type StoreItem<K extends LifeDataStoreName> = LifeData[K][number];

interface MetaRecord {
  key: string;
  value: unknown;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function openDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      for (const storeName of COLLECTION_STORES) {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, {
            keyPath: storeName === "mealChecks" ? "date" : "id",
          });
        }
      }

      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function getMeta(key: string): Promise<MetaRecord | undefined> {
  const db = await openDatabase();
  const transaction = db.transaction(META_STORE, "readonly");
  const request = transaction.objectStore(META_STORE).get(key);
  const result = await requestToPromise(request);
  await transactionDone(transaction);
  return result as MetaRecord | undefined;
}

async function setMeta(key: string, value: unknown): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(META_STORE, "readwrite");
  transaction.objectStore(META_STORE).put({ key, value } satisfies MetaRecord);
  await transactionDone(transaction);
}

export async function replaceLifeDataInDb(value: LifeData): Promise<void> {
  const nextData = mergeLifeData(value);
  const db = await openDatabase();
  const transaction = db.transaction([...COLLECTION_STORES, META_STORE], "readwrite");

  for (const storeName of COLLECTION_STORES) {
    const store = transaction.objectStore(storeName);
    store.clear();

    for (const item of nextData[storeName] as Array<LifeData[typeof storeName][number]>) {
      store.put(item);
    }
  }

  transaction.objectStore(META_STORE).put({ key: MIGRATION_KEY, value: true } satisfies MetaRecord);
  await transactionDone(transaction);
}

async function migrateLocalStorageData(): Promise<void> {
  const alreadyMigrated = await getMeta(MIGRATION_KEY);
  if (alreadyMigrated?.value) return;

  const hasWindow = typeof window !== "undefined";
  if (!hasWindow) {
    await setMeta(MIGRATION_KEY, true);
    return;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    await setMeta(MIGRATION_KEY, true);
    return;
  }

  const parsed = JSON.parse(raw) as Partial<LifeData>;
  await replaceLifeDataInDb(mergeLifeData(parsed));
  window.localStorage.removeItem(STORAGE_KEY);
}

export async function loadLifeDataFromDb(): Promise<LifeData> {
  await migrateLocalStorageData();

  const db = await openDatabase();
  const transaction = db.transaction([...COLLECTION_STORES], "readonly");

  const [
    expenses,
    food,
    mealChecks,
    exercise,
    habits,
    tasks,
    journal,
    loans,
  ] = await Promise.all([
    requestToPromise(transaction.objectStore("expenses").getAll()),
    requestToPromise(transaction.objectStore("food").getAll()),
    requestToPromise(transaction.objectStore("mealChecks").getAll()),
    requestToPromise(transaction.objectStore("exercise").getAll()),
    requestToPromise(transaction.objectStore("habits").getAll()),
    requestToPromise(transaction.objectStore("tasks").getAll()),
    requestToPromise(transaction.objectStore("journal").getAll()),
    requestToPromise(transaction.objectStore("loans").getAll()),
  ]);

  await transactionDone(transaction);

  return mergeLifeData({
    expenses,
    food,
    mealChecks,
    exercise,
    habits,
    tasks,
    journal,
    loans,
  });
}

export async function putCollectionItem<K extends LifeDataStoreName>(
  storeName: K,
  value: StoreItem<K>,
): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).put(value);
  await transactionDone(transaction);
}

export async function deleteCollectionItem(storeName: LifeDataStoreName, key: string): Promise<void> {
  const db = await openDatabase();
  const transaction = db.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).delete(key);
  await transactionDone(transaction);
}

export async function clearLifeDataInDb(): Promise<void> {
  await replaceLifeDataInDb(createEmptyLifeData());
}