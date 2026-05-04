// Offline-first sync queue for Supabase mutations.
// Queue persists in IndexedDB and flushes when the browser is online.

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const DB_NAME = "lifeflow-sync";
const DB_VERSION = 1;
const STORE = "queue";

export type SyncOp =
  | { kind: "insert"; table: string; values: Record<string, any> }
  | { kind: "update"; table: string; match: Record<string, any>; values: Record<string, any> }
  | { kind: "delete"; table: string; match: Record<string, any> }
  | { kind: "upsert"; table: string; values: Record<string, any>; onConflict?: string };

export interface QueuedOp extends SyncOp {
  id: string;
  ts: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;
function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error);
  });
}

async function reqDone<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function getAll(): Promise<QueuedOp[]> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readonly");
  const items = await reqDone(tx.objectStore(STORE).getAll());
  await txDone(tx);
  return (items as QueuedOp[]).sort((a, b) => a.ts - b.ts);
}

async function putItem(item: QueuedOp): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(item);
  await txDone(tx);
}

async function deleteItem(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
}

// ── Listeners (for status UI) ──
type Listener = (state: { pending: number; online: boolean; syncing: boolean }) => void;
const listeners = new Set<Listener>();
let _pending = 0;
let _syncing = false;

function emit() {
  const state = { pending: _pending, online: navigator.onLine, syncing: _syncing };
  listeners.forEach(l => l(state));
}

export function subscribeSyncStatus(l: Listener): () => void {
  listeners.add(l);
  l({ pending: _pending, online: navigator.onLine, syncing: _syncing });
  return () => listeners.delete(l);
}

async function refreshPendingCount() {
  const all = await getAll();
  _pending = all.length;
  emit();
}

// ── Execution ──
async function executeOp(op: QueuedOp): Promise<{ ok: boolean; retry: boolean; error?: any }> {
  try {
    let res: any;
    if (op.kind === "insert") {
      res = await supabase.from(op.table as any).insert(op.values);
    } else if (op.kind === "update") {
      let q: any = supabase.from(op.table as any).update(op.values);
      for (const [k, v] of Object.entries(op.match)) q = q.eq(k, v);
      res = await q;
    } else if (op.kind === "delete") {
      let q: any = supabase.from(op.table as any).delete();
      for (const [k, v] of Object.entries(op.match)) q = q.eq(k, v);
      res = await q;
    } else if (op.kind === "upsert") {
      res = await supabase.from(op.table as any).upsert(op.values, op.onConflict ? { onConflict: op.onConflict } : undefined);
    }
    if (res?.error) {
      // Network/timeout-ish → retry. Anything else (e.g. RLS, constraint) → drop to avoid getting stuck.
      const msg = String(res.error.message || "").toLowerCase();
      const networkish = msg.includes("fetch") || msg.includes("network") || msg.includes("timeout");
      return { ok: false, retry: networkish, error: res.error };
    }
    return { ok: true, retry: false };
  } catch (err: any) {
    return { ok: false, retry: true, error: err };
  }
}

let flushPromise: Promise<void> | null = null;

export function flushQueue(): Promise<void> {
  if (flushPromise) return flushPromise;
  flushPromise = (async () => {
    if (!navigator.onLine) return;
    _syncing = true;
    emit();
    try {
      const ops = await getAll();
      if (ops.length === 0) return;
      let synced = 0;
      let dropped = 0;
      for (const op of ops) {
        const result = await executeOp(op);
        if (result.ok) {
          await deleteItem(op.id);
          synced++;
        } else if (!result.retry) {
          // Drop bad op so queue isn't stuck. Log for visibility.
          console.warn("[sync] dropping op", op, result.error);
          await deleteItem(op.id);
          dropped++;
        } else {
          // Network-like error: stop, retry later.
          break;
        }
      }
      await refreshPendingCount();
      if (synced > 0) {
        toast.success(`Synced ${synced} change${synced > 1 ? "s" : ""}`);
      }
      if (dropped > 0) {
        toast.error(`${dropped} change${dropped > 1 ? "s" : ""} couldn't be saved`);
      }
    } finally {
      _syncing = false;
      emit();
      flushPromise = null;
    }
  })();
  return flushPromise;
}

export async function enqueue(op: SyncOp): Promise<void> {
  const item: QueuedOp = { ...op, id: crypto.randomUUID(), ts: Date.now() } as QueuedOp;
  await putItem(item);
  _pending += 1;
  emit();
  // Try immediate flush (will no-op if offline or already running)
  if (navigator.onLine) flushQueue();
}

// ── Init ──
let initialized = false;
export function initSyncQueue() {
  if (initialized) return;
  initialized = true;
  refreshPendingCount();
  window.addEventListener("online", () => {
    emit();
    toast.success("Back online — syncing…");
    flushQueue();
  });
  window.addEventListener("offline", () => {
    emit();
    toast.warning("You're offline. Changes will sync when you're back.");
  });
  // Periodic flush attempt for transient failures
  setInterval(() => {
    if (navigator.onLine) flushQueue();
  }, 30000);
  // Initial flush on load
  if (navigator.onLine) flushQueue();
}
