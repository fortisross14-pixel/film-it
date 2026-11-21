// Portrait art: four 6×6 sheets (young, adult, veteran, famous). Rows 0–2 are women,
// rows 3–5 men. Columns are expressions: romance, comedy, drama, action, menace, calm.
// The famous sheet follows the FAMOUS order. A portrait key is "<sheet>:<cell 0–35>".

import type { Actor, Skill } from './types';
import { FAMOUS, SKILLS, genderFromName } from './data/actors';
import { TUNING } from './tuning';

export type PortraitSheet = 'young' | 'adult' | 'veteran' | 'famous';
export const SHEET_SIZE = 6;

const EXPRESSION_COL: Record<Skill, number> = { romance: 0, comedy: 1, drama: 2, action: 3, menace: 4 };
const CALM_COL = 5;

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const portraitGender = (a: Actor): 'f' | 'm' => a.gender ?? genderFromName(a.name) ?? (hash(a.id) % 2 ? 'f' : 'm');

/** Expression column: the actor's strongest skill, or calm when nothing stands out. */
export function expressionCol(a: Actor): number {
  const top = [...SKILLS].sort((x, y) => a.skills[y] - a.skills[x])[0];
  return a.skills[top] >= TUNING.portraits.expressiveSkill ? EXPRESSION_COL[top] : CALM_COL;
}

/** Candidate cells in order of preference (best match first). */
export function portraitCandidates(a: Actor): string[] {
  const famous = FAMOUS.findIndex((f) => f.name === a.name);
  if (famous >= 0) return [`famous:${famous}`];
  const sheet: PortraitSheet = a.age;
  const rows = portraitGender(a) === 'f' ? [0, 1, 2] : [3, 4, 5];
  const h = hash(a.id);
  const rotated = rows.map((_, i) => rows[(i + h) % 3]);
  const first = expressionCol(a);
  const cols = [first, ...[0, 1, 2, 3, 4, 5].filter((c) => c !== first)];
  return cols.flatMap((c) => rotated.map((r) => `${sheet}:${r * SHEET_SIZE + c}`));
}

/** The portrait key for an actor (its stored one, else the best match). */
export const portraitOf = (a: Actor): string => a.portrait ?? portraitCandidates(a)[0];

/** Give every actor without a portrait the best match not already used in the pool. */
export function assignPortraits(pool: Actor[]): Actor[] {
  const taken = new Set(pool.flatMap((a) => (a.portrait ? [a.portrait] : [])));
  return pool.map((a) => {
    if (a.portrait) return a;
    const cands = portraitCandidates(a);
    const key = cands.find((k) => !taken.has(k)) ?? cands[0];
    taken.add(key);
    return { ...a, portrait: key };
  });
}

export function parsePortrait(key: string): { sheet: PortraitSheet; row: number; col: number } | null {
  const m = /^(young|adult|veteran|famous):(\d+)$/.exec(key);
  if (!m) return null;
  const i = Number(m[2]);
  return { sheet: m[1] as PortraitSheet, row: Math.floor(i / SHEET_SIZE), col: i % SHEET_SIZE };
}
