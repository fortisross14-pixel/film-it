// Save slots in localStorage (3 slots). Storage is injectable for tests.
//
// Follows the save-systems skill: every save carries an integer version; loading
// refuses newer saves with a message, migrates older ones step by step, validates the
// result, and falls back to the previous save (kept as a backup) if the primary is
// unreadable. Writes report failure (e.g. storage full) instead of throwing.

import type { Profile } from './types';
import { TUNING } from './tuning';
import { DIRECTORS } from './data/directors';
import { SETS } from './data/sets';
import { TOPICS, TOPIC_PACKS } from './data/topics';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const key = (slot: number) => `directors-cut:slot:${slot}`;
const backupKey = (slot: number) => `${key(slot)}:bak`;

function defaultStore(): KeyValueStore | undefined {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Migrations: MIGRATIONS[v] turns a version-v save into version v+1. Keep every one
 * forever. Versions below FIRST_MIGRATABLE were pre-release test builds with
 * incompatible models (script, casting and careers were redesigned); they cannot be
 * migrated and are reported as such.
 */
type RawSave = Record<string, unknown> & { version: number };
const MIGRATIONS: Record<number, (d: RawSave) => RawSave> = {
  // 6: careers can run side by side; the others are parked.
  5: (d) => ({ ...d, parked: [] }),
};
const FIRST_MIGRATABLE = 5;

export type LoadStatus = 'ok' | 'empty' | 'corrupt' | 'older' | 'newer' | 'fromBackup';

export interface LoadResult {
  status: LoadStatus;
  profile?: Profile;
  /** Version found in the file, when readable. */
  version?: number;
  message?: string;
}

function checkSlot(slot: number) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= TUNING.saveSlots) throw new Error(`Bad save slot ${slot}`);
}

/** Structural checks plus dropping ids the current content no longer has. */
export function validateProfile(d: unknown): Profile | undefined {
  if (typeof d !== 'object' || d === null) return undefined;
  const p = d as Profile;
  const isNum = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  if (typeof p.name !== 'string' || !isNum(p.seed) || !isNum(p.credits) || p.credits < 0) return undefined;
  if (!p.unlocks || !Array.isArray(p.unlocks.directors) || !Array.isArray(p.unlocks.sets)) return undefined;
  if (!Array.isArray(p.actorPool) || !Array.isArray(p.filmography) || !Array.isArray(p.careers) || !Array.isArray(p.contractBoard)) return undefined;
  const has = <T extends { id: string }>(list: T[]) => (id: string) => list.some((x) => x.id === id);
  const unlocks = {
    directors: p.unlocks.directors.filter(has(DIRECTORS)),
    sets: p.unlocks.sets.filter(has(SETS)),
    topics: (p.unlocks.topics ?? []).filter(has(TOPICS)),
    packs: (p.unlocks.packs ?? []).filter(has(TOPIC_PACKS)),
  };
  if (!unlocks.directors.length) return undefined;
  if (p.career && !has(DIRECTORS)(p.career.directorId)) return undefined;
  const parked = (Array.isArray(p.parked) ? p.parked : []).filter((x) => x?.career && has(DIRECTORS)(x.career.directorId) && Array.isArray(x.contractBoard));
  return { ...p, unlocks, parked };
}

function parse(raw: string | null): LoadResult {
  if (!raw) return { status: 'empty' };
  let data: RawSave;
  try {
    data = JSON.parse(raw);
  } catch {
    return { status: 'corrupt', message: 'The save file is damaged.' };
  }
  if (typeof data !== 'object' || data === null || !Number.isInteger(data.version)) {
    return { status: 'corrupt', message: 'The save file has no version.' };
  }
  let v = data.version;
  if (v > TUNING.saveVersion) {
    return { status: 'newer', version: v, message: 'This save is from a newer version of the game.' };
  }
  if (v < FIRST_MIGRATABLE) {
    return { status: 'older', version: v, message: 'This save is from an early test build and cannot be converted.' };
  }
  while (v < TUNING.saveVersion) {
    const step = MIGRATIONS[v];
    if (!step) return { status: 'older', version: data.version, message: `No upgrade from save version ${v}.` };
    data = { ...step(data), version: v + 1 };
    v++;
  }
  const profile = validateProfile(data);
  if (!profile) return { status: 'corrupt', version: data.version, message: 'The save failed its checks.' };
  return { status: 'ok', profile, version: data.version };
}

/** Load a slot: primary first, then the backup if the primary is unreadable. */
export function loadSlot(slot: number, store = defaultStore()): LoadResult {
  checkSlot(slot);
  const primary = parse(store?.getItem(key(slot)) ?? null);
  if (primary.status === 'ok' || primary.status === 'empty' || primary.status === 'newer') return primary;
  const backup = parse(store?.getItem(backupKey(slot)) ?? null);
  if (backup.status === 'ok') return { ...backup, status: 'fromBackup', message: `${primary.message} Loaded the previous save instead.` };
  return primary;
}

export function loadProfile(slot: number, store = defaultStore()): Profile | undefined {
  const r = loadSlot(slot, store);
  return r.profile;
}

export type SaveResult = { ok: true } | { ok: false; reason: string };

/** Write a slot, keeping the previous good save as a backup. Never throws. */
export function saveProfile(slot: number, p: Profile, store = defaultStore()): SaveResult {
  checkSlot(slot);
  if (!store) return { ok: false, reason: 'Saving is not available in this browser.' };
  try {
    const json = JSON.stringify(p);
    const prev = store.getItem(key(slot));
    if (prev && prev !== json && parse(prev).status === 'ok') store.setItem(backupKey(slot), prev);
    store.setItem(key(slot), json);
    return { ok: true };
  } catch (e) {
    const full = e instanceof Error && /quota/i.test(e.name + e.message);
    return { ok: false, reason: full ? 'Browser storage is full: the game could not save.' : 'The game could not save.' };
  }
}

export function deleteSlot(slot: number, store = defaultStore()): void {
  checkSlot(slot);
  store?.removeItem(key(slot));
  store?.removeItem(backupKey(slot));
}

export interface SlotSummary {
  slot: number;
  empty: boolean;
  status: LoadStatus;
  message?: string;
  name?: string;
  career?: string;
  careers?: number;
  credits?: number;
  films?: number;
  /** @deprecated use status */
  corrupt?: boolean;
}

export function listSlots(store = defaultStore()): SlotSummary[] {
  const out: SlotSummary[] = [];
  for (let slot = 0; slot < TUNING.saveSlots; slot++) {
    const r = loadSlot(slot, store);
    const p = r.profile;
    if (r.status === 'empty') out.push({ slot, empty: true, status: 'empty' });
    else if (!p) out.push({ slot, empty: false, status: r.status, message: r.message, corrupt: true });
    else {
      out.push({
        slot, empty: false, status: r.status, message: r.message, name: p.name, career: p.career?.directorId,
        careers: p.careers.length + (p.career ? 1 : 0), credits: p.credits, films: p.filmography.length,
      });
    }
  }
  return out;
}
