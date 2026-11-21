// All balance numbers live here. Values are first guesses; tune at the end.
// Money is in $K (thousands of dollars) everywhere in the engine.

import type { Archetype, ExpectationWeights, Rarity } from './types';

export const TUNING = {
  saveSlots: 3,
  saveVersion: 1,

  contracts: {
    boardSize: 4,
    runtimeOptions: [85, 90, 95, 100, 105, 110, 120, 130],
    runtimeTolerance: 5,
    /** Budget tiers in $K. Index = budget tier (0 = micro). */
    budgetTiers: [3_000, 10_000, 25_000, 60_000, 150_000],
    /** Studio tier → max budget tier offered. */
    studioMaxBudgetTier: [1, 2, 3, 4, 4],
    /** Deadline weeks per minute of runtime, before archetype modifiers. */
    weeksPerMinute: 0.21,
    minDeadlineWeeks: 12,
    /** Box office target as a multiple of budget, per archetype. */
    boxOfficeMultiple: {
      blockbuster: 3.0,
      award: 1.5,
      crowd: 2.5,
      indie: 2.0,
      tightship: 2.0,
    } satisfies Record<Archetype, number>,
    deadlineModifier: {
      blockbuster: 1.1,
      award: 1.1,
      crowd: 1.0,
      indie: 0.9,
      tightship: 0.8,
    } satisfies Record<Archetype, number>,
    leadStarPowerMin: [40, 50, 60, 70, 80], // by budget tier
    rewardBase: { reputation: 40, credits: 60 },
  },

  /** Expectation profiles. Each sums to 1. */
  weights: {
    blockbuster: { schedule: 0.05, budget: 0.1, boxOffice: 0.4, public: 0.3, critics: 0.1, awards: 0.05 },
    award: { schedule: 0.075, budget: 0.075, boxOffice: 0.15, public: 0.0, critics: 0.3, awards: 0.4 },
    crowd: { schedule: 0.1, budget: 0.1, boxOffice: 0.3, public: 0.4, critics: 0.05, awards: 0.05 },
    indie: { schedule: 0.1, budget: 0.15, boxOffice: 0.05, public: 0.1, critics: 0.35, awards: 0.25 },
    tightship: { schedule: 0.35, budget: 0.35, boxOffice: 0.1, public: 0.1, critics: 0.05, awards: 0.05 },
  } satisfies Record<Archetype, ExpectationWeights>,

  /** Archetypes offered by the generator (MVP: 3; set to all 5 later if wanted). */
  generatorArchetypes: ['blockbuster', 'award', 'indie', 'crowd', 'tightship'] as Archetype[],

  /** Reputation needed for each tier. Index = tier - 1. */
  reputationTiers: [0, 150, 400, 900, 1800],

  startingCredits: 100,

  actors: {
    poolSize: 60,
    rarityOdds: { common: 0.6, rare: 0.27, epic: 0.1, legendary: 0.03 } satisfies Record<Rarity, number>,
    /** Star power range by rarity. */
    starPower: {
      common: [10, 45],
      rare: [30, 65],
      epic: [55, 85],
      legendary: [80, 100],
    } satisfies Record<Rarity, [number, number]>,
    acting: {
      common: [25, 65],
      rare: [40, 75],
      epic: [55, 90],
      legendary: [65, 98],
    } satisfies Record<Rarity, [number, number]>,
    /** Chance a common/rare card is a hidden gem (low star, high acting). */
    hiddenGemChance: 0.12,
    hiddenGemActing: [78, 95] as [number, number],
    traitChance: 0.35,
  },

  directors: {
    maxLevel: 10,
  },
} as const;

export type Tuning = typeof TUNING;
