// Save slots in localStorage (3 slots). Storage is injectable for tests.

import type { Profile } from './types';
import { TUNING } from './tuning';

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const key = (slot: number) => `directors-cut:slot:${slot}`;

function defaultStore(): KeyValueStore | undefined {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : undefined;
  } catch {
    return undefined;
  }
}

export interface SlotSummary {
  slot: number;
  empty: boolean;
  name?: string;
  career?: string;
  careers?: number;
  credits?: number;
  films?: number;
  corrupt?: boolean;
}

function checkSlot(slot: number) {
  if (!Number.isInteger(slot) || slot < 0 || slot >= TUNING.saveSlots) throw new Error(`Bad save slot ${slot}`);
}

export function saveProfile(slot: number, p: Profile, store = defaultStore()): void {
  checkSlot(slot);
  store?.setItem(key(slot), JSON.stringify(p));
}

export function loadProfile(slot: number, store = defaultStore()): Profile | undefined {
  checkSlot(slot);
  const raw = store?.getItem(key(slot));
  if (!raw) return undefined;
  try {
    const p = JSON.parse(raw) as Profile;
    if (typeof p !== 'object' || p === null || p.version !== TUNING.saveVersion) return undefined;
    return p;
  } catch {
    return undefined;
  }
}

export function deleteSlot(slot: number, store = defaultStore()): void {
  checkSlot(slot);
  store?.removeItem(key(slot));
}

export function listSlots(store = defaultStore()): SlotSummary[] {
  const out: SlotSummary[] = [];
  for (let slot = 0; slot < TUNING.saveSlots; slot++) {
    const raw = store?.getItem(key(slot));
    if (!raw) {
      out.push({ slot, empty: true });
      continue;
    }
    const p = loadProfile(slot, store);
    if (!p) out.push({ slot, empty: false, corrupt: true });
    else out.push({ slot, empty: false, name: p.name, career: p.career?.directorId, careers: p.careers.length + (p.career ? 1 : 0), credits: p.credits, films: p.filmography.length });
  }
  return out;
}
