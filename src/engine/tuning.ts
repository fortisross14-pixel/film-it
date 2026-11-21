// All balance numbers live here. Values are first guesses; tune at the end.
// Money is in $K (thousands of dollars) everywhere in the engine.

import type { Archetype, DeliveryStrictness, ExpectationWeights, Rarity } from './types';

export const TUNING = {
  saveSlots: 3,
  saveVersion: 2,

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

  /** Expectation profiles: weights for studio satisfaction. Each sums to 1. */
  weights: {
    blockbuster: { boxOffice: 0.5, public: 0.35, critics: 0.1, awards: 0.05 },
    award: { boxOffice: 0.15, public: 0.05, critics: 0.35, awards: 0.45 },
    crowd: { boxOffice: 0.35, public: 0.5, critics: 0.1, awards: 0.05 },
    indie: { boxOffice: 0.1, public: 0.1, critics: 0.45, awards: 0.35 },
    tightship: { boxOffice: 0.3, public: 0.3, critics: 0.2, awards: 0.2 },
  } satisfies Record<Archetype, ExpectationWeights>,

  /** How harshly each archetype applies the delivery penalties (× the curves below). */
  delivery: {
    blockbuster: { late: 1.0, overBudget: 0.8 },
    award: { late: 0.8, overBudget: 0.8 },
    crowd: { late: 1.0, overBudget: 1.0 },
    indie: { late: 1.0, overBudget: 1.3 },
    tightship: { late: 1.6, overBudget: 1.6 },
  } satisfies Record<Archetype, DeliveryStrictness>,

  /**
   * Penalty curves: [x, points off satisfaction], linearly interpolated, capped at the last point.
   * Late: x = weeks late. Over budget: x = % over budget.
   */
  latePenalty: [[0, 0], [1, 2], [2, 5], [3, 10], [4, 18], [6, 35], [8, 60], [10, 82]] as [number, number][],
  overBudgetPenalty: [[0, 0], [5, 2], [10, 5], [20, 12], [35, 30], [50, 60], [75, 82]] as [number, number][],

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
    /** Genre affinity effect on every phase's quality (points). */
    affinityMatch: 5,
    affinityClose: 0,
    affinityFar: -4,
    /** Genre masters: bonus in their genre, small bonus everywhere else. */
    masterGenreBonus: 8,
    masterOtherBonus: 2,
    /** Specialty bonus grows per level: base × (1 + perLevel × (level - 1)). */
    specialtyPerLevel: 0.08,
    writerQualityBonus: 6,
    writerCostDiscount: 0.12,
  },

  script: {
    minRuntime: 60,
    maxRuntime: 180,
    sceneMinMinutes: 1,
    sceneMaxMinutes: 10,
    /** Act boundaries as share of runtime. */
    actSplits: [0.25, 0.75],
    roleLimits: { main: [1, 1], coMain: [0, 1], villain: [0, 1], romanticInterest: [0, 1], sidekick: [0, 2], supporting: [0, 4] },
    /** Coverage: score at the knee and the knee share (diminishing returns above it). */
    coverageKnee: 0.8,
    coverageKneeScore: 85,
    /** Structure points. */
    strongSceneFit: 60,
    actStrongPoints: 20,
    climaxPoints: 25,
    gapPoints: 15,
    gapMaxMinutes: 12,
    gapPenaltyEach: 4,
    /** Variety. */
    varietyTarget: 6,
    repeatFreeCount: 2,
    repeatPenaltyEach: 8,
    /** Topic fit multiplier range (topic genreFit 0 → min, 100 → max). No topic → noTopic. */
    topicMultMin: 0.7,
    topicMultMax: 1.15,
    noTopicMult: 0.8,
    secondaryGenreWeight: 0.3,
    /** Role balance: share of runtime each billing should be on screen. */
    leadScreenShare: 0.25,
    secondScreenShare: 0.1,
    unusedRolePenalty: 15,
    /** Weights of the five quality components. */
    qualityWeights: { coverage: 0.25, structure: 0.2, variety: 0.15, fit: 0.25, roles: 0.15 },
  },
} as const;

export type Tuning = typeof TUNING;
