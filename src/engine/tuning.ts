// All balance numbers live here. Values are first guesses; tune at the end.
// Money is in $K (thousands of dollars) everywhere in the engine.

import type { Archetype, DeliveryStrictness, ExpectationWeights, Rarity } from './types';

export const TUNING = {
  saveSlots: 3,
  saveVersion: 3,

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
    minScenes: 3,
    maxScenes: 7,
    /** Scene count → pacing score (index = number of scenes). Usually 4–5. */
    sceneCountScore: [0, 0, 0, 80, 100, 100, 85, 65],
    /** Scene length as a share of runtime. Filler fills the rest. */
    durationShare: { short: 0.12, medium: 0.18, long: 0.25 },
    /** Beats per scene → depth score (index = beats; 4+ uses the last). 1 shallow, 2 ideal, 3 good, 4 too complex. */
    depthByBeats: [0, 40, 100, 85, 45],
    /** Passive beats (impact 0, e.g. "watches") count as this much of a beat for depth. */
    passiveBeatWeight: 0.5,
    roleLimits: { main: [1, 1], villain: [0, 1], coVillain: [0, 1], romanticInterest: [0, 1], comicRelief: [0, 1], supporting: [0, 2] },
    /** Coverage (real scenes vs filler) with diminishing returns above the knee. */
    coverageKnee: 0.75,
    coverageKneeScore: 85,
    /** Scene profile: share from the tone vs from its actions. */
    toneWeightInScene: 0.5,
    /** Fit: score = 100 - weighted distance × this. */
    fitDistanceScale: 1.6,
    topicMultMin: 0.75,
    topicMultMax: 1.1,
    noTopicMult: 0.85,
    secondaryGenreWeight: 0.3,
    /** Structure points. */
    openingWithMain: 20,
    climaxEnding: 40,
    escalation: 20,
    toneVariety: 20,
    /** Characters. */
    unusedRolePenalty: 20,
    mainPresenceShare: 0.6,
    purposePenalty: 10,
    /** Weights of the quality components. */
    qualityWeights: { fit: 0.25, depth: 0.2, structure: 0.2, characters: 0.15, coherence: 0.1, pacing: 0.1 },
    /** Writing cost, $K: per scene, per beat, plus the action's own cost. Scaled by duration. */
    sceneBaseCost: 120,
    beatCost: 40,
    durationCostMult: { short: 0.8, medium: 1, long: 1.3 },
    /** Writing costs × budget / referenceBudget, clamped. */
    referenceBudget: 25_000,
    budgetScaleMin: 0.15,
    budgetScaleMax: 3,
  },

  casting: {
    cardsPerDraw: 3,
    /** Redraw fee = baseFeeShare × budget × 2^(paid redraws so far): 1×, 2×, 4×… */
    redrawFeeShare: 0.004,
    redrawFeeMin: 15,
    /** Rarity weights per billing tier (lead draws lean to stars). */
    rarityWeights: {
      lead: { common: 1, rare: 2, epic: 3, legendary: 3 },
      second: { common: 1.5, rare: 2, epic: 2, legendary: 1 },
      support: { common: 3, rare: 2, epic: 1, legendary: 0.5 },
      minor: { common: 4, rare: 2, epic: 0.5, legendary: 0.2 },
    },
    scoutGemWeight: 2.5,
    scoutFeeDiscount: 0.4,
    /** Pay: baseFee = feeAt30 × (starPower/30)^feeExponent × billing mult, floor feeMin. */
    feeAt30: 150,
    feeExponent: 4.2,
    feeMin: 25,
    billingFeeMult: { lead: 1, second: 0.7, support: 0.45, minor: 0.3 },
    /** Per-minute rate as a share of base fee. */
    perMinuteShare: 0.012,
    divaFeeMult: 1.25,
    /** Fit = skill × skillWeight + acting × (1 - skillWeight). */
    skillWeight: 0.65,
    /** Expected top star power per budget tier, for the casting star score. */
    expectedStar: [25, 40, 55, 70, 80],
    billingScoreWeight: { lead: 3, second: 2, support: 1, minor: 0.5 },
    starShare: 0.3,
    /** Default skill needs per role type before any beats. */
    roleDefaultSkill: { main: 'drama', villain: 'menace', coVillain: 'menace', romanticInterest: 'romance', comicRelief: 'comedy', supporting: 'drama' },
    roleDefaultWeight: 0.3,
    targetSkill: 'drama',
    targetWeight: 0.3,
  },
} as const;

export type Tuning = typeof TUNING;
