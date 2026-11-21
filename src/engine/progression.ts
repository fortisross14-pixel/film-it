// Progression: reputation tiers (per career), and everything bought with the bank's
// credits — director profiles, topic packs and sets. Unlocks are global.

import type { DirectorDef, FilmSet, Profile } from './types';
import { TUNING } from './tuning';
import { DIRECTORS } from './data/directors';
import { SETS } from './data/sets';
import { TOPIC_PACKS } from './data/topics';

/** Reputation tier, 1-based. Higher tiers open bigger studios. */
export function reputationTier(reputation: number): number {
  let tier = 1;
  TUNING.reputationTiers.forEach((min, i) => {
    if (reputation >= min) tier = i + 1;
  });
  return tier;
}

/** Reputation needed for the next tier, or undefined at max tier. */
export function nextTierAt(reputation: number): number | undefined {
  return TUNING.reputationTiers.find((min) => min > reputation);
}

export const directorCost = (d: DirectorDef) => (d.unlock.kind === 'credits' ? d.unlock.cost : 0);

export function directorUnlockText(d: DirectorDef): string {
  return d.unlock.kind === 'start' ? 'Starter profile' : `${d.unlock.cost} credits`;
}

export function setUnlockText(s: FilmSet): string {
  switch (s.unlock.kind) {
    case 'start':
      return 'Starter set';
    case 'topic':
      return 'Comes with its topic pack';
    case 'credits':
      return `${s.unlock.cost} credits`;
  }
}

export type PurchaseResult = { ok: true; profile: Profile } | { ok: false; reason: string };

export function buyDirector(p: Profile, directorId: string): PurchaseResult {
  const d = DIRECTORS.find((x) => x.id === directorId);
  if (!d) return { ok: false, reason: 'Unknown profile' };
  if (p.unlocks.directors.includes(directorId)) return { ok: false, reason: 'Already unlocked' };
  const cost = directorCost(d);
  if (p.credits < cost) return { ok: false, reason: 'Not enough credits' };
  return {
    ok: true,
    profile: {
      ...p,
      credits: p.credits - cost,
      unlocks: { ...p.unlocks, directors: [...p.unlocks.directors, directorId] },
      directors: { ...p.directors, [directorId]: p.directors[directorId] ?? { id: directorId, level: 1, films: 0 } },
    },
  };
}

export function buyTopicPack(p: Profile, packId: string): PurchaseResult {
  const pack = TOPIC_PACKS.find((x) => x.id === packId);
  if (!pack) return { ok: false, reason: 'Unknown pack' };
  if (p.unlocks.packs.includes(packId)) return { ok: false, reason: 'Already owned' };
  if (p.credits < pack.cost) return { ok: false, reason: 'Not enough credits' };
  const topicSets = SETS.filter((s) => s.unlock.kind === 'topic' && pack.topicIds.includes(s.unlock.topicId)).map((s) => s.id);
  return {
    ok: true,
    profile: {
      ...p,
      credits: p.credits - pack.cost,
      unlocks: {
        ...p.unlocks,
        packs: [...p.unlocks.packs, packId],
        topics: [...p.unlocks.topics, ...pack.topicIds.filter((t) => !p.unlocks.topics.includes(t))],
        sets: [...p.unlocks.sets, ...topicSets.filter((s) => !p.unlocks.sets.includes(s))],
      },
    },
  };
}

export function buySet(p: Profile, setId: string): PurchaseResult {
  const s = SETS.find((x) => x.id === setId);
  if (!s) return { ok: false, reason: 'Unknown set' };
  if (p.unlocks.sets.includes(setId)) return { ok: false, reason: 'Already unlocked' };
  if (s.unlock.kind !== 'credits') return { ok: false, reason: 'Not for sale' };
  if (p.credits < s.unlock.cost) return { ok: false, reason: 'Not enough credits' };
  return {
    ok: true,
    profile: { ...p, credits: p.credits - s.unlock.cost, unlocks: { ...p.unlocks, sets: [...p.unlocks.sets, setId] } },
  };
}

/** Everything still to buy and its total price: "unlock it all" progress. */
export function unlockProgress(p: Profile): { owned: number; total: number; remainingCost: number } {
  const items = [
    ...DIRECTORS.map((d) => ({ owned: p.unlocks.directors.includes(d.id), cost: directorCost(d) })),
    ...TOPIC_PACKS.map((x) => ({ owned: p.unlocks.packs.includes(x.id), cost: x.cost })),
    ...SETS.filter((s) => s.unlock.kind === 'credits').map((s) => ({
      owned: p.unlocks.sets.includes(s.id),
      cost: s.unlock.kind === 'credits' ? s.unlock.cost : 0,
    })),
  ];
  return {
    owned: items.filter((i) => i.owned).length,
    total: items.length,
    remainingCost: items.filter((i) => !i.owned).reduce((a, i) => a + i.cost, 0),
  };
}
