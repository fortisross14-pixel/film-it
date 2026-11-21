// Progression: reputation tiers and unlock checks. Unlocks are global.

import type { DirectorDef, FilmSet, Profile } from './types';
import { TUNING } from './tuning';
import { DIRECTORS } from './data/directors';
import { SETS } from './data/sets';
import { TOPIC_PACKS } from './data/topics';

/** Reputation tier, 1-based. */
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

export function directorUnlockText(d: DirectorDef): string {
  switch (d.unlock.kind) {
    case 'start':
      return 'Available from the start';
    case 'repTier':
      return `Reach reputation tier ${d.unlock.tier}`;
    case 'genreAwards':
      return `Win ${d.unlock.wins} award${d.unlock.wins > 1 ? 's' : ''} with a ${d.unlock.genre} film`;
  }
}

export function directorMeetsUnlock(d: DirectorDef, p: Profile): boolean {
  switch (d.unlock.kind) {
    case 'start':
      return true;
    case 'repTier':
      return reputationTier(p.reputation) >= d.unlock.tier;
    case 'genreAwards':
      return (p.genreAwardWins[d.unlock.genre] ?? 0) >= d.unlock.wins;
  }
}

/** Apply any unlocks the profile now qualifies for. Returns ids newly unlocked. */
export function applyAutoUnlocks(p: Profile): { profile: Profile; newDirectors: string[] } {
  const newDirectors = DIRECTORS.filter((d) => !p.unlocks.directors.includes(d.id) && directorMeetsUnlock(d, p)).map(
    (d) => d.id,
  );
  if (!newDirectors.length) return { profile: p, newDirectors };
  const directors = { ...p.directors };
  for (const id of newDirectors) directors[id] = directors[id] ?? { id, level: 1, films: 0 };
  return {
    profile: { ...p, directors, unlocks: { ...p.unlocks, directors: [...p.unlocks.directors, ...newDirectors] } },
    newDirectors,
  };
}

export function isSetUnlocked(s: FilmSet, p: Profile): boolean {
  return p.unlocks.sets.includes(s.id);
}

export function setUnlockText(s: FilmSet): string {
  switch (s.unlock.kind) {
    case 'start':
      return 'Starter set';
    case 'topic':
      return `Comes with the topic pack that has this topic`;
    case 'credits':
      return `${s.unlock.cost} credits · reputation tier ${s.unlock.repTier}`;
  }
}

export type PurchaseResult = { ok: true; profile: Profile } | { ok: false; reason: string };

export function buyTopicPack(p: Profile, packId: string): PurchaseResult {
  const pack = TOPIC_PACKS.find((x) => x.id === packId);
  if (!pack) return { ok: false, reason: 'Unknown pack' };
  if (p.unlocks.packs.includes(packId)) return { ok: false, reason: 'Already owned' };
  if (p.credits < pack.cost) return { ok: false, reason: 'Not enough credits' };
  const topicSets = SETS.filter((s) => s.unlock.kind === 'topic' && pack.topicIds.includes(s.unlock.topicId)).map(
    (s) => s.id,
  );
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
  if (reputationTier(p.reputation) < s.unlock.repTier) return { ok: false, reason: `Needs reputation tier ${s.unlock.repTier}` };
  if (p.credits < s.unlock.cost) return { ok: false, reason: 'Not enough credits' };
  return {
    ok: true,
    profile: { ...p, credits: p.credits - s.unlock.cost, unlocks: { ...p.unlocks, sets: [...p.unlocks.sets, setId] } },
  };
}
