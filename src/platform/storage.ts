// Key-value storage for the save and settings (platform layer: the engine stays DOM-free
// and gets this injected as its KeyValueStore).
//
// All of the owner's games share one origin (fortisross14-pixel.github.io) and with it one
// ~5 MB localStorage, which is usually full. So Film it! keeps its data in IndexedDB (a share
// of the disk), with an in-memory mirror so the rest of the code can stay synchronous. On first
// start this game's own localStorage keys are moved into IndexedDB and, once that transaction
// has committed, removed from localStorage. IndexedDB wins if a key exists in both. Where
// IndexedDB isn't available (node tests, old browsers) it falls back to localStorage.

import type { KeyValueStore } from '../engine/save';

/** Unique to this game: IndexedDB names are per origin too, shared with the other games. */
export const DB_NAME = 'film-it-storage';
const STORE = 'kv';

/** This game's localStorage keys, and only these, are migrated. */
const OWN_PREFIX = 'film-it:';
const OWN_LEGACY_KEYS = new Set([
  'directors-cut:prefs',
  ...[0, 1, 2].flatMap((s) => [`directors-cut:slot:${s}`, `directors-cut:slot:${s}:bak`]),
]);
export const isOwnKey = (k: string) => k.startsWith(OWN_PREFIX) || OWN_LEGACY_KEYS.has(k);

let db: IDBDatabase | null = null;
const mem = new Map<string, string>();
/** Keys whose latest value has not been confirmed committed yet (value null = delete). */
const dirty = new Map<string, string | null>();
let onError: (msg: string) => void = () => {};

/** Called with a player-facing message whenever a write fails. */
export function onStorageError(fn: (msg: string) => void) {
  onError = fn;
}
export const storageKind = (): 'indexeddb' | 'localstorage' => (db ? 'indexeddb' : 'localstorage');

function ls(): Storage | undefined {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((res, rej) => {
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
    tx.onabort = () => rej(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
    r.onblocked = () => rej(new Error('IndexedDB blocked'));
  });
}

function ownLsKeys(): string[] {
  const s = ls();
  if (!s) return [];
  try {
    const out: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k !== null && isOwnKey(k)) out.push(k);
    }
    return out;
  } catch {
    return [];
  }
}

/** Await once before the app first renders or loads a save. Never throws. */
export async function initStorage(): Promise<void> {
  if (db) return;
  try {
    if (typeof indexedDB === 'undefined') return;
    const d = await openDb();
    const st = d.transaction(STORE, 'readonly').objectStore(STORE);
    const [keys, vals] = await Promise.all([req(st.getAllKeys()), req(st.getAll())]);
    keys.forEach((k, i) => mem.set(String(k), String(vals[i])));
    // Move this game's localStorage keys over; IndexedDB wins when both exist.
    const moved: string[] = [];
    const wtx = d.transaction(STORE, 'readwrite');
    for (const k of ownLsKeys()) {
      const v = ls()!.getItem(k);
      if (v === null) continue;
      if (!mem.has(k)) {
        mem.set(k, v);
        wtx.objectStore(STORE).put(v, k);
      }
      moved.push(k);
    }
    await done(wtx);
    // Only now that the copy is committed: free the shared localStorage for the other games.
    for (const k of moved) {
      try {
        ls()?.removeItem(k);
      } catch {
        /* harmless: the IndexedDB copy wins next time */
      }
    }
    db = d;
    d.onclose = () => {
      db = null;
      onError('Browser storage was closed: reload the game to keep saving.');
    };
    // Ask the browser not to evict the save under storage pressure.
    try {
      void navigator.storage?.persist?.().catch(() => undefined);
    } catch {
      /* optional */
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') void flushStorage();
      });
      addEventListener('pagehide', () => void flushStorage());
    }
  } catch (e) {
    console.warn('IndexedDB unavailable, using localStorage', e);
    mem.clear();
    db = null;
  }
}

export function describe(e: unknown): string {
  const text = `${(e as { name?: string } | null)?.name ?? ''} ${(e as { message?: string } | null)?.message ?? ''}`;
  if (/quota/i.test(text)) return 'Browser storage is full: the game could not save.';
  if (/security/i.test(text)) return 'Browser storage is blocked for this site: the game could not save.';
  return 'The game could not save.';
}

/** Write the given keys in one transaction; resolves when committed (or failed and reported). */
function commit(entries: [string, string | null][]): Promise<void> {
  if (!db || !entries.length) return Promise.resolve();
  try {
    const tx = db.transaction(STORE, 'readwrite');
    const st = tx.objectStore(STORE);
    for (const [k, v] of entries) {
      if (v === null) st.delete(k);
      else st.put(v, k);
    }
    return done(tx).then(
      () => {
        // Only clear what is still the latest value: a newer write keeps its key dirty.
        for (const [k, v] of entries) if (dirty.has(k) && dirty.get(k) === v) dirty.delete(k);
      },
      (e) => onError(describe(e)),
    );
  } catch (e) {
    onError(describe(e));
    return Promise.resolve();
  }
}

function write(key: string, value: string | null) {
  dirty.set(key, value);
  void commit([[key, value]]);
}

/** Re-write everything not yet confirmed (page hidden/closing, or before a reload). */
export function flushStorage(): Promise<void> {
  return commit([...dirty.entries()]);
}

export function kvGet(key: string): string | null {
  if (db) return mem.get(key) ?? null;
  try {
    return ls()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Throws (like localStorage) only in the fallback, so callers can report it. */
export function kvSet(key: string, value: string): void {
  if (db) {
    mem.set(key, value);
    write(key, value);
    return;
  }
  const s = ls();
  if (!s) throw new Error('Saving is not available in this browser.');
  s.setItem(key, value);
}

export function kvRemove(key: string): void {
  if (db) {
    mem.delete(key);
    write(key, null);
    return;
  }
  try {
    ls()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** The KeyValueStore the engine's save code uses. */
export const gameStore: KeyValueStore = { getItem: kvGet, setItem: kvSet, removeItem: kvRemove };

/** Tests only: forget the open database and the mirror. */
export function _resetForTests() {
  db?.close();
  db = null;
  mem.clear();
  dirty.clear();
}
