// Progression: everything permanent. Studio money (earned by every career) buys director
// profiles, topic packs, sets and talent packs. Genres open for good when a career reaches
// a level. Talent packs add actors to the roster: rare, epic or legendary, depending on luck.

import type { Actor, DirectorDef, FilmSet, GenreId, Profile, Rarity, TalentPackId } from './types';
import { TUNING } from './tuning';
import { DIRECTORS } from './data/directors';
import { SETS } from './data/sets';
import { TOPIC_PACKS } from './data/topics';
import { GENRE_IDS } from './data/genres';
import { FAMOUS, famousOfRarity, generateActor, generateStar } from './data/actors';
import { assignPortraits } from './portraits';
import { withRng } from './profile';

export const directorCost = (d: DirectorDef) => (d.unlock.kind === 'buy' ? d.unlock.cost : 0);

export type PurchaseResult = { ok: true; profile: Profile } | { ok: false; reason: string };
const fail = (reason: string): PurchaseResult => ({ ok: false, reason });
const short = (p: Profile, cost: number) => (p.money < cost ? `You need $${cost - p.money}K more` : undefined);

export function buyDirector(p: Profile, directorId: string): PurchaseResult {
  const d = DIRECTORS.find((x) => x.id === directorId);
  if (!d) return fail('Unknown profile');
  if (p.unlocks.directors.includes(directorId)) return fail('Already unlocked');
  const cost = directorCost(d);
  const no = short(p, cost);
  if (no) return fail(no);
  return {
    ok: true,
    profile: {
      ...p,
      money: p.money - cost,
      unlocks: { ...p.unlocks, directors: [...p.unlocks.directors, directorId] },
      directors: { ...p.directors, [directorId]: p.directors[directorId] ?? { id: directorId, level: 1, films: 0 } },
    },
  };
}

export function buyTopicPack(p: Profile, packId: string): PurchaseResult {
  const pack = TOPIC_PACKS.find((x) => x.id === packId);
  if (!pack) return fail('Unknown pack');
  if (p.unlocks.packs.includes(packId)) return fail('Already owned');
  const no = short(p, pack.cost);
  if (no) return fail(no);
  const topicSets = SETS.filter((s) => s.unlock.kind === 'topic' && pack.topicIds.includes(s.unlock.topicId)).map((s) => s.id);
  return {
    ok: true,
    profile: {
      ...p,
      money: p.money - pack.cost,
      unlocks: {
        ...p.unlocks,
        packs: [...p.unlocks.packs, packId],
        topics: [...p.unlocks.topics, ...pack.topicIds.filter((t) => !p.unlocks.topics.includes(t))],
        sets: [...p.unlocks.sets, ...topicSets.filter((s) => !p.unlocks.sets.includes(s))],
      },
    },
  };
}

export const setCost = (s: FilmSet) => (s.unlock.kind === 'buy' ? s.unlock.cost : 0);

export function buySet(p: Profile, setId: string): PurchaseResult {
  const s = SETS.find((x) => x.id === setId);
  if (!s) return fail('Unknown set');
  if (p.unlocks.sets.includes(setId)) return fail('Already unlocked');
  if (s.unlock.kind !== 'buy') return fail('Comes with its topic pack');
  const no = short(p, s.unlock.cost);
  if (no) return fail(no);
  return { ok: true, profile: { ...p, money: p.money - s.unlock.cost, unlocks: { ...p.unlocks, sets: [...p.unlocks.sets, setId] } } };
}

// ---------------- Levels and genres ----------------

/** Highest level any career (running or finished) has reached. */
export function bestLevel(p: Profile): number {
  const all = [p.career, ...p.parked.map((x) => x.career), ...p.careers].filter((c) => !!c);
  return Math.max(1, ...all.map((c) => c!.topLevel ?? c!.level));
}

/** Level a career must reach to open a genre (undefined = open from the start). */
export const genreUnlockLevel = (g: GenreId): number | undefined =>
  TUNING.genres.start.includes(g) ? undefined : TUNING.genres.unlockAtLevel[g];

/** Open every genre a level has earned. Returns the profile and the genres that just opened. */
export function unlockGenresForLevel(p: Profile, level: number): { profile: Profile; opened: GenreId[] } {
  const opened = GENRE_IDS.filter((g) => {
    const at = genreUnlockLevel(g);
    return at !== undefined && level >= at && !p.unlocks.genres.includes(g);
  });
  if (!opened.length) return { profile: p, opened };
  return { profile: { ...p, unlocks: { ...p.unlocks, genres: [...p.unlocks.genres, ...opened] } }, opened };
}

// ---------------- Talent packs ----------------

export const packDef = (id: TalentPackId) => TUNING.talentPacks[id];

/** A pack type can be bought once a career has reached its level. */
export function packForSale(p: Profile, id: TalentPackId): boolean {
  const at = (packDef(id) as { unlockAtLevel?: number }).unlockAtLevel;
  return !at || bestLevel(p) >= at;
}

export function buyTalentPack(p: Profile, id: TalentPackId): PurchaseResult {
  const def = packDef(id);
  if (!packForSale(p, id)) return fail(`Reach level ${(def as { unlockAtLevel?: number }).unlockAtLevel} in a career first`);
  const no = short(p, def.price);
  if (no) return fail(no);
  return { ok: true, profile: { ...p, money: p.money - def.price, talentPacks: { ...p.talentPacks, [id]: (p.talentPacks[id] ?? 0) + 1 } } };
}

export const grantTalentPack = (p: Profile, id: TalentPackId): Profile => ({ ...p, talentPacks: { ...p.talentPacks, [id]: (p.talentPacks[id] ?? 0) + 1 } });

export interface PackCard {
  actor: Actor;
  /** A named star you already had: they got more famous instead. */
  duplicate: boolean;
}
export type OpenResult = { ok: true; profile: Profile; cards: PackCard[] } | { ok: false; reason: string };

/**
 * Open a talent pack: each card rolls a rarity. Rare cards are new unnamed actors; epic and
 * legendary cards are named stars (one you don't have yet if any are left; a duplicate boosts yours).
 */
export function openTalentPack(p: Profile, id: TalentPackId): OpenResult {
  if ((p.talentPacks[id] ?? 0) < 1) return { ok: false, reason: 'No pack to open' };
  const def = packDef(id);
  const A = TUNING.actors;
  const { profile, value } = withRng(p, (rng) => {
    let roster = [...p.actorPool];
    const cards: PackCard[] = [];
    const used = new Set(roster.map((a) => a.name));
    for (let i = 0; i < def.cards; i++) {
      let rarity = rng.weighted(def.odds as Record<Rarity, number>);
      // The guaranteed card: the last one is at least this good.
      const g = (def as { guaranteed?: Rarity }).guaranteed;
      if (g && i === def.cards - 1 && !cards.some((c) => c.actor.rarity === g || c.actor.rarity === 'legendary') && rarity !== 'legendary') rarity = g;
      if (rarity === 'epic' || rarity === 'legendary') {
        const tier = famousOfRarity(rarity);
        const fresh = tier.filter((f) => !used.has(f.name));
        if (fresh.length) {
          const star = generateStar(rng, rng.pick(fresh));
          used.add(star.name);
          roster.push(star);
          cards.push({ actor: star, duplicate: false });
        } else {
          const name = rng.pick(tier).name;
          const idx = roster.findIndex((a) => a.name === name);
          const a = roster[idx];
          const boosted = { ...a, starPower: Math.min(100, a.starPower + A.duplicateStar), acting: Math.min(100, a.acting + A.duplicateActing) };
          roster[idx] = boosted;
          cards.push({ actor: boosted, duplicate: true });
        }
      } else {
        const actor = generateActor(rng, used, rarity);
        roster.push(actor);
        cards.push({ actor, duplicate: false });
      }
    }
    roster = assignPortraits(roster);
    const byId = new Map(roster.map((a) => [a.id, a]));
    return { roster, cards: cards.map((c) => ({ ...c, actor: byId.get(c.actor.id)! })) };
  });
  return {
    ok: true,
    profile: { ...profile, actorPool: value.roster, talentPacks: { ...p.talentPacks, [id]: p.talentPacks[id] - 1 } },
    cards: value.cards,
  };
}

// ---------------- Collection ----------------

export interface CollectionProgress {
  directors: [number, number];
  sets: [number, number];
  topics: [number, number];
  genres: [number, number];
  stars: [number, number];
}

/** How much of the game is unlocked: the long-term goal next to climbing careers. */
export function collection(p: Profile): CollectionProgress {
  const names = new Set(p.actorPool.filter((a) => a.famous).map((a) => a.name));
  return {
    directors: [p.unlocks.directors.length, DIRECTORS.length],
    sets: [p.unlocks.sets.length, SETS.length],
    topics: [p.unlocks.packs.length, TOPIC_PACKS.length],
    genres: [p.unlocks.genres.length, GENRE_IDS.length],
    stars: [FAMOUS.filter((f) => names.has(f.name)).length, FAMOUS.length],
  };
}

/** Everything still for sale and its total price. */
export function unlockProgress(p: Profile): { owned: number; total: number; remainingCost: number } {
  const items = [
    ...DIRECTORS.map((d) => ({ owned: p.unlocks.directors.includes(d.id), cost: directorCost(d) })),
    ...TOPIC_PACKS.map((x) => ({ owned: p.unlocks.packs.includes(x.id), cost: x.cost })),
    ...SETS.filter((s) => s.unlock.kind === 'buy').map((s) => ({ owned: p.unlocks.sets.includes(s.id), cost: setCost(s) })),
  ];
  return {
    owned: items.filter((i) => i.owned).length,
    total: items.length,
    remainingCost: items.filter((i) => !i.owned).reduce((a, i) => a + i.cost, 0),
  };
}
