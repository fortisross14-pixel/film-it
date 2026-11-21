// One permanent save in localStorage: the studio is your whole progress. Storage is
// injectable for tests. Saves from the old 3-slot builds are picked up once (the slot with
// the most films wins) and converted.
//
// Follows the save-systems skill: every save carries an integer version; loading
// refuses newer saves with a message, migrates older ones step by step, validates the
// result, and falls back to the previous save (kept as a backup) if the primary is
// unreadable. Writes report failure (e.g. storage full) instead of throwing.

import type { Career, Contract, GenreId, Profile } from './types';
import { TUNING } from './tuning';
import { DIRECTORS } from './data/directors';
import { SETS } from './data/sets';
import { TOPICS, TOPIC_PACKS } from './data/topics';
import { GENRE_IDS } from './data/genres';
import { famousRarity } from './data/actors';
import { generateBoard, feeFor } from './contracts';
import { createRng } from './rng';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVE_KEY = 'film-it:save';
const BACKUP_KEY = `${SAVE_KEY}:bak`;
/** The 3 slots of older builds. */
const LEGACY_SLOTS = 3;
const legacyKey = (slot: number) => `directors-cut:slot:${slot}`;

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
  // 7: credits and reputation are gone. Studio money, a career ladder, genres, a roster, talent packs.
  6: migrateTo7,
};

type OldCareer = Career & { reputation?: number };
type OldContract = Contract & { rewards: { fee?: number; credits?: number } };

function migrateTo7(d: RawSave): RawSave {
  const careerOf = (c: OldCareer): Career => {
    const { reputation: _r, ...rest } = c as OldCareer & { fStreak?: number };
    delete (rest as { fStreak?: number }).fStreak;
    const level = Math.max(1, Math.min(TUNING.ladder.maxLevel, c.level ?? 1));
    return { ...rest, level, topLevel: level, packsEarned: 0, lastGrade: c.grades?.[c.grades.length - 1] };
  };
  const contractOf = (c: OldContract, level: number): Contract => ({ ...c, level: c.level ?? level, rewards: { fee: c.rewards?.fee ?? feeFor(level, c.difficulty ?? 1) } });
  const rng = createRng(Number(d.seed) || 1);
  const unlocks = d.unlocks as Profile['unlocks'];
  const careers = ((d.careers as OldCareer[]) ?? []).map(careerOf);
  const career = d.career ? careerOf(d.career as OldCareer) : undefined;
  const parked = ((d.parked as { career: OldCareer; activeFilm?: { contract: OldContract } }[]) ?? []).map((x) => {
    const c = careerOf(x.career);
    return {
      career: c,
      contractBoard: generateBoard(rng, { level: c.level, genres: GENRE_IDS }),
      activeFilm: x.activeFilm ? { ...x.activeFilm, contract: contractOf(x.activeFilm.contract, c.level) } : undefined,
    };
  });
  const top = Math.max(1, ...[career, ...careers, ...parked.map((x) => x.career)].filter(Boolean).map((c) => c!.level));
  const genres = GENRE_IDS.filter((g) => TUNING.genres.start.includes(g) || (TUNING.genres.unlockAtLevel[g] ?? 99) <= top);
  const active = d.activeFilm as { contract: OldContract } | undefined;
  const out: RawSave = {
    ...d,
    money: Math.max(0, Math.round(Number(d.credits) || 0)),
    career,
    careers,
    parked,
    unlocks: { ...unlocks, genres: genres as GenreId[] },
    talentPacks: { casting: 0, star: 0 },
    // The old pool becomes your roster. Named stars keep their place in the rarity ladder.
    actorPool: ((d.actorPool as Profile['actorPool']) ?? []).map((a) => ({ ...a, rarity: famousRarity(a.name) ?? (a.rarity === 'epic' || a.rarity === 'legendary' ? 'rare' : a.rarity) })),
    contractBoard: career ? generateBoard(rng, { level: career.level, genres: genres as GenreId[] }) : [],
    activeFilm: active ? { ...active, contract: contractOf(active.contract, career?.level ?? 1) } : undefined,
    seed: rng.state(),
  };
  delete out.credits;
  return out;
}
const FIRST_MIGRATABLE = 5;

export type LoadStatus = 'ok' | 'empty' | 'corrupt' | 'older' | 'newer' | 'fromBackup' | 'migrated';

export interface LoadResult {
  status: LoadStatus;
  profile?: Profile;
  /** Version found in the file, when readable. */
  version?: number;
  message?: string;
}

/** Structural checks plus dropping ids the current content no longer has. */
export function validateProfile(d: unknown): Profile | undefined {
  if (typeof d !== 'object' || d === null) return undefined;
  const p = d as Profile;
  const isNum = (n: unknown) => typeof n === 'number' && Number.isFinite(n);
  if (typeof p.name !== 'string' || !isNum(p.seed) || !isNum(p.money) || p.money < 0) return undefined;
  if (!p.unlocks || !Array.isArray(p.unlocks.directors) || !Array.isArray(p.unlocks.sets)) return undefined;
  if (!Array.isArray(p.actorPool) || !Array.isArray(p.filmography) || !Array.isArray(p.careers) || !Array.isArray(p.contractBoard)) return undefined;
  const has = <T extends { id: string }>(list: T[]) => (id: string) => list.some((x) => x.id === id);
  const unlocks = {
    directors: p.unlocks.directors.filter(has(DIRECTORS)),
    sets: p.unlocks.sets.filter(has(SETS)),
    topics: (p.unlocks.topics ?? []).filter(has(TOPICS)),
    packs: (p.unlocks.packs ?? []).filter(has(TOPIC_PACKS)),
    genres: (p.unlocks.genres ?? []).filter((g) => GENRE_IDS.includes(g)),
  };
  if (!unlocks.genres.length) unlocks.genres = [...TUNING.genres.start];
  if (!unlocks.directors.length) return undefined;
  if (p.career && !has(DIRECTORS)(p.career.directorId)) return undefined;
  const parked = (Array.isArray(p.parked) ? p.parked : []).filter((x) => x?.career && has(DIRECTORS)(x.career.directorId) && Array.isArray(x.contractBoard));
  const talentPacks = { casting: Math.max(0, p.talentPacks?.casting ?? 0), star: Math.max(0, p.talentPacks?.star ?? 0) };
  return { ...p, unlocks, parked, talentPacks };
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

/** Load the save: primary first, then the backup if the primary is unreadable, then an old slot save. */
export function load(store = defaultStore()): LoadResult {
  const primary = parse(store?.getItem(SAVE_KEY) ?? null);
  if (primary.status === 'ok' || primary.status === 'newer') return primary;
  const backup = parse(store?.getItem(BACKUP_KEY) ?? null);
  if (backup.status === 'ok') return { ...backup, status: 'fromBackup', message: `${primary.message} Loaded the previous save instead.` };
  if (primary.status !== 'empty') return primary;
  return loadLegacy(store);
}

/** The best save from the old 3-slot builds (most films made), converted. */
function loadLegacy(store?: KeyValueStore): LoadResult {
  let best: LoadResult = { status: 'empty' };
  for (let slot = 0; slot < LEGACY_SLOTS; slot++) {
    const r = parse(store?.getItem(legacyKey(slot)) ?? null);
    if (r.status !== 'ok') continue;
    if (!best.profile || r.profile!.filmography.length > best.profile.filmography.length) best = r;
  }
  return best.profile ? { ...best, status: 'migrated', message: 'Your studio from the old save slots was carried over.' } : best;
}

export const loadProfile = (store = defaultStore()): Profile | undefined => load(store).profile;

export type SaveResult = { ok: true } | { ok: false; reason: string };

/** Write the save, keeping the previous good save as a backup. Never throws. */
export function saveProfile(p: Profile, store = defaultStore()): SaveResult {
  if (!store) return { ok: false, reason: 'Saving is not available in this browser.' };
  try {
    const json = JSON.stringify(p);
    const prev = store.getItem(SAVE_KEY);
    if (prev && prev !== json && parse(prev).status === 'ok') store.setItem(BACKUP_KEY, prev);
    store.setItem(SAVE_KEY, json);
    return { ok: true };
  } catch (e) {
    const full = e instanceof Error && /quota/i.test(e.name + e.message);
    return { ok: false, reason: full ? 'Browser storage is full: the game could not save.' : 'The game could not save.' };
  }
}

/** Erase all progress (the old slot saves too). */
export function eraseSave(store = defaultStore()): void {
  store?.removeItem(SAVE_KEY);
  store?.removeItem(BACKUP_KEY);
  for (let slot = 0; slot < LEGACY_SLOTS; slot++) {
    store?.removeItem(legacyKey(slot));
    store?.removeItem(`${legacyKey(slot)}:bak`);
  }
}
