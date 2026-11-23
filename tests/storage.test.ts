// The IndexedDB storage module: migration of this game's localStorage keys, fallback, and
// the engine save running on top of it.
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { _resetForTests, DB_NAME, flushStorage, gameStore, initStorage, isOwnKey, kvGet, kvSet, storageKind } from '../src/platform/storage';
import { SAVE_KEY, exportSave, importSave, load, saveProfile } from '../src/engine/save';
import { newProfile } from '../src/engine/profile';

async function idbGet(key: string): Promise<unknown> {
  const db = await new Promise<IDBDatabase>((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  const v = await new Promise((res) => {
    const r = db.transaction('kv').objectStore('kv').get(key);
    r.onsuccess = () => res(r.result);
  });
  db.close();
  return v;
}

beforeEach(() => {
  _resetForTests();
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
});
afterEach(() => _resetForTests());

describe('storage (IndexedDB with localStorage migration)', () => {
  it('only claims this game’s keys', () => {
    expect(isOwnKey('film-it:save')).toBe(true);
    expect(isOwnKey('film-it:save:bak')).toBe(true);
    expect(isOwnKey('directors-cut:slot:1')).toBe(true);
    expect(isOwnKey('directors-cut:prefs')).toBe(true);
    expect(isOwnKey('other-game-save')).toBe(false);
    expect(isOwnKey('xi2_career')).toBe(false);
  });

  it('moves the old localStorage save into IndexedDB and leaves other games alone', async () => {
    const p = { ...newProfile('Old', 7), money: 4321 };
    localStorage.setItem(SAVE_KEY, JSON.stringify(p));
    localStorage.setItem('directors-cut:prefs', '{"textScale":1.5}');
    localStorage.setItem('other-game-save', 'keep me');
    await initStorage();
    expect(storageKind()).toBe('indexeddb');
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
    expect(localStorage.getItem('directors-cut:prefs')).toBeNull();
    expect(localStorage.getItem('other-game-save')).toBe('keep me');
    expect(load(gameStore).profile?.money).toBe(4321);
    expect(kvGet('directors-cut:prefs')).toBe('{"textScale":1.5}');
    expect(JSON.parse(String(await idbGet(SAVE_KEY))).money).toBe(4321);
  });

  it('IndexedDB wins when a key is in both', async () => {
    await initStorage();
    kvSet(SAVE_KEY, JSON.stringify({ ...newProfile('New', 1), money: 2 }));
    await flushStorage();
    _resetForTests();
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...newProfile('Stale', 1), money: 1 }));
    await initStorage();
    expect(load(gameStore).profile?.money).toBe(2);
    expect(localStorage.getItem(SAVE_KEY)).toBeNull();
  });

  it('saves survive a restart and work with localStorage full', async () => {
    await initStorage();
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    try {
      expect(saveProfile({ ...newProfile('S', 3), money: 99 }, gameStore)).toEqual({ ok: true });
      await flushStorage();
    } finally {
      Storage.prototype.setItem = orig;
    }
    _resetForTests();
    await initStorage();
    expect(load(gameStore).profile?.money).toBe(99);
  });

  it('export and import round-trip', async () => {
    await initStorage();
    saveProfile({ ...newProfile('E', 5), money: 777 }, gameStore);
    const text = exportSave(gameStore)!;
    saveProfile({ ...newProfile('E', 5), money: 1 }, gameStore);
    expect(importSave(text, gameStore).saved).toEqual({ ok: true });
    expect(load(gameStore).profile?.money).toBe(777);
    expect(importSave('not json', gameStore).profile).toBeUndefined();
  });

  it('falls back to localStorage without IndexedDB', async () => {
    // @ts-expect-error simulate an old browser
    delete globalThis.indexedDB;
    await initStorage();
    expect(storageKind()).toBe('localstorage');
    kvSet('film-it:x', '1');
    expect(localStorage.getItem('film-it:x')).toBe('1');
  });
});
