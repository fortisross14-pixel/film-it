// All balance numbers live here. Values are first guesses; tune at the end.
// Money is in $K (thousands of dollars) everywhere in the engine.

import type { Archetype, DeliveryStrictness, ExpectationWeights, Rarity } from './types';

export const TUNING = {
  saveSlots: 3,
  saveVersion: 5,

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
    /** Budget Master: crew, set rental and writing cost less. */
    budgetDiscount: 0.2,
    /** Clockwork Director: less fatigue, faster post. */
    scheduleFatigueCut: 0.3,
    schedulePostDaysCut: 0.3,
    /** Festival Darling: critics bonus, lower festival bar. */
    festivalCritics: 4,
    festivalThresholdCut: 5,
  },

  script: {
    minRuntime: 60,
    maxRuntime: 180,
    minScenes: 2,
    /** New scenes are appended after the last one with this gap (share of runtime). */
    newSceneGap: 0.03,
    maxScenes: 7,
    /** Scene count → pacing score (index = number of scenes). Usually 4–5. */
    sceneCountScore: [0, 0, 65, 85, 100, 100, 85, 65],
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
  shooting: {
    /** Crew cost per production week = budget × share (min). Runs every week. */
    crewWeekShare: 0.012,
    crewWeekMin: 20,
    /** Set rental: dayCost × days per shoot week. */
    shootDaysPerWeek: 5,
    /** Extra per stunt beat on a shoot week, × budget. */
    stuntShare: 0.004,
    /** Fatigue. */
    shootFatigue: 25,
    methodExtraFatigue: 10,
    practiceFatigue: 8,
    clubFatigue: 5,
    relaxRecovery: 60,
    fatiguePenalty: 0.5, // at 100 fatigue a meter loses half
    /** Practice per week on one scene (diminishing towards 100). */
    practiceGain: 35,
    /** Relax: fresh boost on next shoot's pace & chemistry; practiced dialogue fades. */
    relaxFresh: 0.12,
    relaxDialogueKeep: 0.6,
    clubBond: 25,
    /** Hidden pair chemistry range, added around 50. */
    pairChemistry: [-25, 35] as [number, number],
    /** Learning curve: + per previous shoot of the scene, capped. */
    retakeBonus: 6,
    retakeBonusCap: 2,
    cinematographerBase: 8,
    cinematographerRetake: 1.5,
    /** Multipliers. */
    starBubbleBase: 0.85,
    starBubbleRange: 0.3,
    sceneFitBase: 0.75,
    sceneFitRange: 0.5,
    setFitBase: 0.7,
    setFitRange: 0.6,
    focusBoost: 1.2,
    focusOther: 0.92,
    /** "Inspired that day": per-meter noise ± this share. */
    noise: 0.08,
    /** Meters ease towards 100 above the knee. */
    softCapKnee: 70,
    softCapScale: 40,
    /** Bubbles are roughly this many points each. */
    bubbleSize: 5,
    /** Version shaping. */
    versionShape: {
      pace: { pace: 1.15, chemistry: 0.88, dialogue: 0.95 },
      chemistry: { pace: 0.88, chemistry: 1.15, dialogue: 0.95 },
      rough: { pace: 0.7, chemistry: 0.72, dialogue: 0.7 },
    },
    /** How each tone values the three meters for the take score. */
    toneWeights: {
      thrill: { pace: 0.5, chemistry: 0.2, dialogue: 0.3 },
      scary: { pace: 0.45, chemistry: 0.15, dialogue: 0.4 },
      romantic: { pace: 0.15, chemistry: 0.55, dialogue: 0.3 },
      happy: { pace: 0.3, chemistry: 0.35, dialogue: 0.35 },
      sad: { pace: 0.15, chemistry: 0.35, dialogue: 0.5 },
      calm: { pace: 0.2, chemistry: 0.3, dialogue: 0.5 },
    },
    /** Filler is shot in one block at wrap: one week, mediocre. */
    fillerScore: 45,
  },
  post: {
    /** Editing the cut always takes this many post days. */
    baseEditDays: 5,
    daysPerWeek: 5,
    /** Post crew per week, as a share of the shooting crew cost. */
    crewShare: 0.5,
    /** Music: cost $K at the reference budget (scaled like writing), days, bonuses. */
    music: {
      none: { cost: 0, days: 0, flat: 0, emotional: 0 },
      library: { cost: 100, days: 2, flat: 3, emotional: 0 },
      composer: { cost: 500, days: 5, flat: 3, emotional: 8 },
      star: { cost: 1500, days: 8, flat: 6, emotional: 12 },
    },
    /** VFX / SFX per scene slot. */
    tiers: {
      vfx: { none: [0, 0, 0], basic: [150, 1, 4], pro: [400, 2, 8], premium: [900, 4, 13] }, // [cost, days, points]
      sfx: { none: [0, 0, 0], basic: [60, 1, 4], pro: [150, 2, 8], premium: [350, 3, 13] },
    },
    /** How much each genre cares about VFX / SFX (0–1). */
    vfxWeight: { action: 0.9, drama: 0.15, romance: 0.15, comedy: 0.3, thriller: 0.4, horror: 0.5, scifi: 1, fantasy: 1 },
    sfxWeight: { action: 1, drama: 0.3, romance: 0.25, comedy: 0.4, thriller: 0.9, horror: 1, scifi: 0.7, fantasy: 0.6 },
    /** Scenes with stunts get more out of VFX/SFX. */
    stuntSceneMult: 1.25,
    /** Diminishing returns: the nth best slot of a kind counts decay^(n-1). */
    decay: 0.85,
    /** Overproduction: VFX points in low-weight genres cost critics points. */
    overproductionBelowWeight: 0.5,
    overproductionPerPoint: 0.5,
    overproductionCap: 30,
    /** The Editor: cheaper and stronger polish. */
    editorDiscount: 0.25,
    editorBoost: 0.25,
    /** Cutting a scene returns its minutes to filler; keep at least this many. */
    minScenesAfterCut: 2,
  },
  premiere: {
    /** Rating factor weights (High 3 / Medium 2 / Low 1, per the requirements table). */
    publicWeights: { script: 3, star: 3, worst: 3, peak: 1, acting: 2, chemistry: 2, fx: 3, originality: 1, execution: 2 },
    criticsWeights: { script: 2, star: 1, worst: 2, peak: 3, acting: 3, chemistry: 3, fx: 1, originality: 2, execution: 2 },
    /** FX matter to the public only as much as the genre cares (vfx/sfx weight); below this they count as Low. */
    fxPublicMinWeight: 0.3,
    /** Boredom: (filler share − free share) × this, off each rating. Some filler is normal. */
    boredomFreeShare: 0.2,
    boredomPublic: 60,
    boredomCritics: 40,
    /** "On the night" noise, ± points. */
    ratingNoise: 3,
    /** Buzz = star power, topic hype, charming cast. */
    buzzStar: 0.6,
    buzzTopic: 0.25,
    buzzCharming: 5,
    buzzBase: 10,
    /** Market size multipliers. */
    genreMarket: { action: 1.0, scifi: 0.95, fantasy: 0.9, comedy: 0.85, horror: 0.75, thriller: 0.8, romance: 0.65, drama: 0.55 },
    ratingMarket: { G: 0.9, PG: 1.0, 'PG-13': 1.05, R: 0.85 },
    /** Opening weekend = budget × openingShare × genre × rating × (buzzBase + buzz/100) × critics effect. */
    openingShare: 0.7,
    openingBuzzBase: 0.4,
    criticsEffectBase: 0.9,
    criticsEffectPer: 1 / 500,
    /** Weekly retention from the public rating, over runWeeks. */
    runWeeks: 8,
    retentionBase: 0.35,
    retentionPerPublic: 1 / 200,
    /** Sleeper hit: small films with a great public rating hold longer. */
    sleeperBudgetMax: 12_000,
    sleeperPublicMin: 75,
    sleeperBonus: 0.08,
    /** Box office score: 100 × (gross / target)^exp × atTarget/100, capped. */
    boxOfficeAtTarget: 80,
    boxOfficeExp: 0.8,
    /** Awards. */
    festivalBudgetMax: 12_000,
    festivalNomCritics: 70,
    festivalWinCritics: 82,
    bigFilmFestivalCritics: 85,
    nominationBase: 0.35,
    nominationPerPoint: 1 / 15,
    rivalRange: [72, 95] as [number, number],
    winNoise: 8,
    /** Award points: nomination / win; festival counts the same. Expected points per archetype. */
    nominationPoints: 1,
    winPoints: 2.5,
    expectedAwardPoints: { blockbuster: 1.5, award: 6, crowd: 1.5, indie: 3, tightship: 1.5 },
  },

  rewards: {
    gradeMult: { A: 1.5, B: 1.2, C: 1, D: 0.6, F: 0.3 },
    nominationRep: 10,
    winRep: 30,
    /** Unspent budget → credits per $K. */
    unspentCreditsPerK: 0.002,
    bonusGoalPoints: 1,
  },
  career: {
    /** Retiring pays credits per reputation point earned in the career. */
    retireCreditsPerRep: 0.25,
    /** Fired after this many F grades in a row (no retirement bonus). */
    firedAfterFs: 2,
  },
  poster: {
    /** Regenerating the background costs budget × share × 2^n. */
    regenFeeShare: 0.003,
    regenFeeMin: 10,
    /** Score weights (sum 1). */
    weights: { style: 0.3, title: 0.2, billing: 0.25, faces: 0.15, director: 0.1 },
    /** Star power that counts as a star (bill big) / a superstar (face worth showing). */
    starAt: 60,
    superstarAt: 80,
    nobodyBelow: 35,
    maxFaces: 4,
    /** Director "known" after this many films in the career. */
    knownDirectorFilms: 3,
    /** Poster score → buzz points and opening multiplier. */
    buzzAt100: 12,
    openingMin: 0.85,
    openingMax: 1.2,
  },
  marketing: {
    /** Studio marketing budget as a share of the production budget. */
    shareOfBudget: 0.35,
    /** Asking for a change takes this many post weeks. */
    changeWeeks: 1,
    spendMult: { cut: 0.6, standard: 1, push: 1.6 },
    /** Opening weekend multiplier and box office target multiplier per level. */
    openingMult: { cut: 0.72, standard: 1, push: 1.4 },
    targetMult: { cut: 0.75, standard: 1, push: 1.3 },
    /** Awards campaign: nomination chance bonus. */
    nominationBonus: { cut: -0.03, standard: 0, push: 0.06 },
  },
  actorCareers: {
    /** Star power change after a film, by grade (lead billing; others × otherShare). */
    starByGrade: { A: 8, B: 5, C: 2, D: -1, F: -3 },
    starPerWin: 4,
    otherShare: 0.6,
    /** Acting improves a little after a strong performance. */
    actingGainAt: 70,
    actingGain: 1,
    /** Actors cast while below this star power "remember you": fee discount for that director. */
    discoveredBelow: 35,
    discoveryDiscount: 0.15,
    creditsKept: 5,
  },
  sequel: {
    /** A hit (this grade or better and box office ≥ target) earns a sequel brief. */
    minGrade: 'B',
    budgetMult: 1.4,
    rewardMult: 1.3,
    /** Franchise effects at the premiere. */
    buzzBonus: 12,
    openingMult: 1.25,
    criticsFatiguePer: 3,
    criticsFatigueMax: 9,
    returningLeadPoints: 4,
  },
  rivals: {
    nomineesPerCategory: 5,
  },
} as const;

export type Tuning = typeof TUNING;
