// Contract (studio brief) generation.
// Contracts are generated from genre × runtime × budget tier × archetype. The career level
// (1–10) picks the studio tier and the budget tier: higher up, bigger studios and budgets.

import type { Archetype, BonusGoal, Contract, GenreId, Grade, HardRequirement } from './types';
import type { Rng } from './rng';
import { makeId } from './rng';
import { TUNING } from './tuning';
import { GENRE_IDS, GENRE_RATINGS, GENRE_REQUIRED_ROLES, genreCloseness, ratingIndex } from './data/genres';
import { actionById, GENRE_SIGNATURE_ACTIONS } from './data/actions';
import { GENRE_TONE } from './data/tones';
import { STUDIOS } from './data/studios';
import { TOPICS } from './data/topics';
import { workingTitle } from './titles';

export const ARCHETYPE_NAMES: Record<Archetype, string> = {
  blockbuster: 'Blockbuster',
  award: 'Award-oriented',
  crowd: 'Crowd-pleaser',
  indie: 'Indie',
  tightship: 'Tight ship',
};

function pickBudgetTier(rng: Rng, archetype: Archetype, levelTier: number): number {
  switch (archetype) {
    case 'indie':
      return Math.max(0, levelTier - 2);
    case 'blockbuster':
      return levelTier;
    default:
      return Math.max(0, levelTier - rng.int(0, 1));
  }
}

const clampLevel = (level: number) => Math.max(1, Math.min(TUNING.ladder.maxLevel, Math.round(level)));

/** The archetype's grade weights, with the awards share moved to critics where awards are out of reach. */
export function levelWeights(archetype: Archetype, level: number): Contract['weights'] {
  const w = TUNING.weights[archetype];
  const prestige = TUNING.premiere.awardPrestige[clampLevel(level) - 1];
  const awards = w.awards * prestige;
  return { ...w, awards, critics: w.critics + (w.awards - awards) };
}

/** Director's fee at a C for a brief of this level and difficulty, $K. */
export function feeFor(level: number, difficulty: number): number {
  const T = TUNING.contracts;
  return Math.round(((T.feeBase + T.feePerLevel * level) * (1 + T.feePerDifficulty * (difficulty - 1))) / 5) * 5;
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
  /** Genres the board may offer (default: all). */
  genres?: GenreId[];
}

export function generateContract(rng: Rng, levelArg: number, opts: GenerateOptions = {}): Contract {
  const T = TUNING.contracts;
  const level = clampLevel(levelArg);
  const studioTier = TUNING.ladder.studioTier[level - 1];

  const studios = STUDIOS.filter((s) => s.tier === studioTier);
  const studio = rng.pick(studios.length ? studios : STUDIOS.filter((s) => s.tier <= studioTier));
  const archetype = opts.archetype ?? rng.pick(TUNING.generatorArchetypes);
  const open = opts.genres?.length ? GENRE_IDS.filter((g) => opts.genres!.includes(g)) : GENRE_IDS;
  // Studios lean towards the genres they like.
  const liked = open.filter((g) => studio.likes?.includes(g));
  const genre = opts.genre ?? (liked.length && rng.chance(TUNING.contracts.studioTaste) ? rng.pick(liked) : rng.pick(open));
  const secondaryCandidates = open.filter((g) => g !== genre && genreCloseness(genre, g) > 0);
  const secondaryGenre = secondaryCandidates.length && rng.chance(0.3) ? rng.pick(secondaryCandidates) : undefined;

  const budgetTier = pickBudgetTier(rng, archetype, TUNING.ladder.budgetTier[level - 1]);
  const budget = roundTo(T.budgetTiers[budgetTier] * (0.8 + rng.next() * 0.4), 500);

  const runtime = pickRuntime(rng, archetype);
  const deadlineWeeks = Math.max(
    T.minDeadlineWeeks,
    Math.round(runtime * T.weeksPerMinute * T.deadlineModifier[archetype]) + budgetTier,
  );
  const ratings = GENRE_RATINGS[genre].filter((r) => !studio.maxRating || ratingIndex(r) <= ratingIndex(studio.maxRating));
  const rating = rng.pick(ratings.length ? ratings : ['PG' as const]);

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

  const rewards = { fee: feeFor(level, difficulty) };

  return {
    id: makeId('con', rng),
    title: workingTitle(rng, genre),
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
    weights: levelWeights(archetype, level),
    delivery: { ...TUNING.delivery[archetype] },
    boxOfficeTarget,
    marketing: roundTo(budget * TUNING.marketing.shareOfBudget, 100),
    difficulty,
    level,
    rewards,
  };
}

export interface BoardOptions {
  level: number;
  lastGrade?: Grade;
  genres?: GenreId[];
}

/**
 * The board for a career: two briefs at your level, then a safe one a level down — or a
 * stretch a level up after an A — and a locked teaser of what climbing opens up.
 */
export function generateBoard(rng: Rng, o: BoardOptions): Contract[] {
  const L = TUNING.ladder;
  const level = clampLevel(o.level);
  const board: Contract[] = [];
  const usedGenres = new Set<GenreId>();
  const add = (lvl: number, tag: Contract['tag'], locked = false) => {
    // Prefer variety in genre across the board.
    let c = generateContract(rng, lvl, { genres: o.genres });
    for (let tries = 0; tries < 5 && usedGenres.has(c.genre); tries++) c = generateContract(rng, lvl, { genres: o.genres });
    usedGenres.add(c.genre);
    board.push(locked ? { ...c, tag, locked } : { ...c, tag });
  };
  add(level, 'match');
  add(level, 'match');
  if (o.lastGrade === 'A' && level < L.maxLevel) add(level + 1, 'stretch');
  else if (level > 1) add(level - 1, 'safe');
  else add(level, 'match');
  if (level + L.teaserAhead <= L.maxLevel) add(level + L.teaserAhead, 'teaser', true);
  return board;
}
