// Contract (studio brief) generation.
// Contracts are generated from genre × runtime × budget tier × archetype and
// scale with the player's reputation tier.

import type { Archetype, BonusGoal, Contract, GenreId, HardRequirement } from './types';
import type { Rng } from './rng';
import { makeId } from './rng';
import { TUNING } from './tuning';
import { GENRE_IDS, GENRE_RATINGS, GENRE_REQUIRED_ROLES, genreCloseness, ratingIndex } from './data/genres';
import { actionById, GENRE_SIGNATURE_ACTIONS } from './data/actions';
import { GENRE_TONE } from './data/tones';
import { STUDIOS } from './data/studios';
import { TOPICS } from './data/topics';
import { reputationTier } from './progression';

export const ARCHETYPE_NAMES: Record<Archetype, string> = {
  blockbuster: 'Blockbuster',
  award: 'Award-oriented',
  crowd: 'Crowd-pleaser',
  indie: 'Indie',
  tightship: 'Tight ship',
};

function pickBudgetTier(rng: Rng, archetype: Archetype, maxTier: number): number {
  switch (archetype) {
    case 'indie':
      return 0;
    case 'blockbuster':
      return Math.max(0, maxTier - rng.int(0, 1));
    default:
      return rng.int(0, maxTier);
  }
}

function pickRuntime(rng: Rng, archetype: Archetype): number {
  const opts = TUNING.contracts.runtimeOptions;
  if (archetype === 'blockbuster') return rng.pick(opts.slice(3));
  if (archetype === 'indie') return rng.pick(opts.slice(0, 5));
  return rng.pick(opts);
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

export interface GenerateOptions {
  /** Force fields (useful for tests and scripted tutorials). */
  archetype?: Archetype;
  genre?: GenreId;
}

export function generateContract(rng: Rng, repTier: number, opts: GenerateOptions = {}): Contract {
  const T = TUNING.contracts;

  const studios = STUDIOS.filter((s) => s.tier <= repTier);
  const studio = rng.pick(studios.length ? studios : STUDIOS.filter((s) => s.tier === 1));
  const archetype = opts.archetype ?? rng.pick(TUNING.generatorArchetypes);
  const genre = opts.genre ?? rng.pick(GENRE_IDS);
  const secondaryCandidates = GENRE_IDS.filter((g) => g !== genre && genreCloseness(genre, g) > 0);
  const secondaryGenre = rng.chance(0.3) ? rng.pick(secondaryCandidates) : undefined;

  const maxBudgetTier = T.studioMaxBudgetTier[studio.tier - 1];
  const budgetTier = pickBudgetTier(rng, archetype, maxBudgetTier);
  const budget = roundTo(T.budgetTiers[budgetTier] * (0.8 + rng.next() * 0.4), 500);

  const runtime = pickRuntime(rng, archetype);
  const deadlineWeeks = Math.max(
    T.minDeadlineWeeks,
    Math.round(runtime * T.weeksPerMinute * T.deadlineModifier[archetype]) + budgetTier,
  );
  const rating = rng.pick(GENRE_RATINGS[genre]);

  // ---- Hard requirements ----
  const hardReqs: HardRequirement[] = [{ kind: 'runtime', target: runtime, tolerance: T.runtimeTolerance }];
  for (const roleType of GENRE_REQUIRED_ROLES[genre] ?? []) hardReqs.push({ kind: 'role', roleType });

  const signature = GENRE_SIGNATURE_ACTIONS[genre].filter((id) => ratingIndex(actionById(id).minRating) <= ratingIndex(rating));
  if (signature.length && rng.chance(0.7)) hardReqs.push({ kind: 'action', actionId: rng.pick(signature) });
  else hardReqs.push({ kind: 'tone', tone: GENRE_TONE[genre], count: 1 });
  if (archetype === 'blockbuster' || archetype === 'crowd' || (budgetTier >= 2 && rng.chance(0.5))) {
    hardReqs.push({ kind: 'leadStarPower', min: T.leadStarPowerMin[budgetTier] });
  }
  if (rating !== 'G' && rng.chance(0.25)) hardReqs.push({ kind: 'maxRating', rating });

  // ---- Bonus goals ----
  const bonusGoals: BonusGoal[] = [];
  const topicCandidates = TOPICS.filter((t) => t.genreFit[genre] >= 80);
  if (topicCandidates.length && rng.chance(0.6)) {
    bonusGoals.push({ kind: 'topic', topicId: rng.pick(topicCandidates).id, points: 3 });
  }
  const boxOfficeTarget = roundTo(budget * T.boxOfficeMultiple[archetype], 500);
  switch (archetype) {
    case 'award':
    case 'indie':
      bonusGoals.push({ kind: 'festivalNomination', points: 4 });
      if (rng.chance(0.5)) bonusGoals.push({ kind: 'criticsAtLeast', min: 75, points: 3 });
      break;
    case 'tightship':
      bonusGoals.push({ kind: 'underBudget', pct: 10, points: 4 });
      break;
    default:
      bonusGoals.push({ kind: 'boxOffice', min: roundTo(boxOfficeTarget * 1.5, 500), points: 4 });
  }

  // ---- Difficulty & rewards ----
  const tightness = deadlineWeeks / Math.max(1, runtime * T.weeksPerMinute); // <1 = tight
  let difficulty = 1 + budgetTier * 0.6 + (studio.tier - 1) * 0.4 + (hardReqs.length - 1) * 0.35;
  if (tightness < 0.95) difficulty += 0.8;
  difficulty = Math.max(1, Math.min(5, Math.round(difficulty)));

  const mult = (1 + (difficulty - 1) * 0.5) * (1 + (studio.tier - 1) * 0.3);
  const rewards = {
    reputation: Math.round(T.rewardBase.reputation * mult),
    credits: Math.round(T.rewardBase.credits * mult),
  };

  return {
    id: makeId('con', rng),
    studio,
    archetype,
    genre,
    secondaryGenre,
    runtime,
    runtimeTolerance: T.runtimeTolerance,
    budget,
    deadlineWeeks,
    rating,
    hardReqs,
    bonusGoals,
    weights: { ...TUNING.weights[archetype] },
    delivery: { ...TUNING.delivery[archetype] },
    boxOfficeTarget,
    difficulty,
    rewards,
  };
}

/** Fill the contract board for a profile. Returns a new board. */
export function generateBoard(rng: Rng, profile: { reputation: number }): Contract[] {
  const tier = reputationTier(profile.reputation);
  const board: Contract[] = [];
  const usedGenres = new Set<GenreId>();
  for (let i = 0; i < TUNING.contracts.boardSize; i++) {
    // Prefer variety in genre across the board.
    let c = generateContract(rng, tier);
    for (let tries = 0; tries < 5 && usedGenres.has(c.genre); tries++) c = generateContract(rng, tier);
    usedGenres.add(c.genre);
    board.push(c);
  }
  return board;
}
