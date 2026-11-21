// Core entity types for Director's Cut. Pure data, no logic.

export type GenreId =
  | 'action'
  | 'drama'
  | 'romance'
  | 'comedy'
  | 'thriller'
  | 'horror'
  | 'scifi'
  | 'fantasy';

export type AgeRating = 'G' | 'PG' | 'PG-13' | 'R';

/** A value per genre, e.g. genre fit or genre range (0–100 unless noted). */
export type GenreMap = Record<GenreId, number>;

export type Archetype = 'blockbuster' | 'award' | 'crowd' | 'indie' | 'tightship';

export type GradeComponent =
  | 'schedule'
  | 'budget'
  | 'boxOffice'
  | 'public'
  | 'critics'
  | 'awards';

/** Weights for the A–F grade. Sum to 1. */
export type ExpectationWeights = Record<GradeComponent, number>;

export type RoleType =
  | 'main'
  | 'coMain'
  | 'villain'
  | 'romanticInterest'
  | 'sidekick'
  | 'supporting';

export type Billing = 'lead' | 'second' | 'support' | 'minor';

export type Intensity = 'low' | 'medium' | 'high';

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type AgeBracket = 'young' | 'adult' | 'veteran';

export type ActorTrait = 'method' | 'diva' | 'charming' | 'oneTake';

export type Specialty = 'script' | 'casting' | 'shooting' | 'post' | 'genre';

// ---------- Content (static catalogue) ----------

export interface Studio {
  id: string;
  name: string;
  tier: number; // 1–5
}

export interface SceneType {
  id: string;
  name: string;
  genreFit: GenreMap; // 0–100
  /** Role types that must participate in the scene. */
  requiredRoles: RoleType[];
  minParticipants: number;
  maxParticipants: number;
  baseCost: number; // $K
  costPerMin: number; // $K per minute
  difficulty: number; // 1–5, drives take variance
  /** Lowest age rating that allows this scene type (e.g. gore needs R). */
  minRating: AgeRating;
  /** Topic that adds this scene type; undefined = always available. */
  topicId?: string;
  /** Scene types that can serve as an Act 3 climax. */
  climax?: boolean;
}

export interface Topic {
  id: string;
  name: string;
  genreFit: GenreMap; // multiplier input, 0–100
  sceneTypes: string[]; // topic-specific scene types it adds
  setIds: string[]; // sets it unlocks
  packId: string; // 'starter' for starter topics
}

export interface TopicPack {
  id: string;
  name: string;
  topicIds: string[];
  cost: number; // credits
}

export interface FilmSet {
  id: string;
  name: string;
  tags: string[]; // topic ids, mood, interior/exterior
  /** Fit per scene type id, 0–100. Missing = default fit. */
  sceneFit: Record<string, number>;
  dayCost: number; // $K per shooting day
  /** How the set is unlocked. */
  unlock: { kind: 'start' } | { kind: 'topic'; topicId: string } | { kind: 'credits'; cost: number; repTier: number };
}

export interface DirectorDef {
  id: string;
  name: string;
  genreAffinity: GenreId[]; // empty = Any
  specialties: Specialty[];
  /** Genre masters: their one strong genre. */
  masterGenre?: GenreId;
  unlock:
    | { kind: 'start' }
    | { kind: 'repTier'; tier: number }
    | { kind: 'genreAwards'; genre: GenreId; wins: number };
  blurb: string;
}

export interface Actor {
  id: string;
  name: string;
  starPower: number; // 0–100
  acting: number; // 0–100
  genreRange: GenreMap; // 0–100
  rarity: Rarity;
  traits: ActorTrait[];
  age: AgeBracket;
  /** Directors who discovered this actor (fee discount later). */
  discoveredBy?: string[];
}

// ---------- Contract ----------

export type HardRequirement =
  | { kind: 'runtime'; target: number; tolerance: number }
  | { kind: 'sceneType'; sceneTypeId: string; count: number }
  | { kind: 'leadStarPower'; min: number }
  | { kind: 'role'; roleType: RoleType }
  | { kind: 'maxRating'; rating: AgeRating };

export type BonusGoal =
  | { kind: 'topic'; topicId: string; points: number }
  | { kind: 'festivalNomination'; points: number }
  | { kind: 'underBudget'; pct: number; points: number }
  | { kind: 'boxOffice'; min: number; points: number }
  | { kind: 'criticsAtLeast'; min: number; points: number };

export interface Contract {
  id: string;
  studio: Studio;
  archetype: Archetype;
  genre: GenreId;
  secondaryGenre?: GenreId;
  runtime: number; // target minutes
  runtimeTolerance: number;
  budget: number; // $K
  deadlineWeeks: number;
  rating: AgeRating;
  hardReqs: HardRequirement[];
  bonusGoals: BonusGoal[];
  weights: ExpectationWeights;
  /** Box office the studio expects, $K. */
  boxOfficeTarget: number;
  difficulty: number; // 1–5 stars
  rewards: { reputation: number; credits: number };
}

// ---------- Film in production ----------

export type FilmPhase = 'script' | 'casting' | 'shooting' | 'post' | 'premiere' | 'done';

export interface Role {
  id: string;
  name: string;
  type: RoleType;
  billing: Billing;
  actorId?: string;
}

export interface TakeParams {
  coverage: 'simple' | 'standard' | 'elaborate';
  rehearsal: 'none' | 'short' | 'full';
  tone: 'restrained' | 'balanced' | 'intense';
  special: 'none' | 'stunts' | 'extras';
}

export interface Take {
  id: string;
  sceneId: string;
  setId: string;
  params: TakeParams;
  score: number;
  daysUsed: number;
  feedback: string;
}

export type PolishTier = 'none' | 'basic' | 'pro' | 'premium';

export interface Scene {
  id: string;
  typeId: string;
  roleIds: string[];
  minutes: number;
  startMin: number;
  intensity: Intensity;
  setId?: string;
  takes: Take[];
  chosenTakeId?: string;
  cut?: boolean;
  vfx: PolishTier;
  sfx: PolishTier;
}

export type MusicTier = 'none' | 'library' | 'composer' | 'star';

export interface LedgerEntry {
  label: string;
  amount: number; // $K, positive = spend
  phase: FilmPhase;
}

export interface Calendar {
  shootDays: number;
  postDays: number;
}

export interface FilmResults {
  buzz: number;
  publicRating: number;
  criticsRating: number;
  openingWeekend: number;
  boxOffice: number;
  nominations: string[];
  wins: string[];
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface Film {
  id: string;
  title: string;
  contract: Contract;
  directorId: string;
  phase: FilmPhase;
  runtime: number;
  topicId?: string;
  roles: Role[];
  scenes: Scene[];
  music: MusicTier;
  ledger: LedgerEntry[];
  calendar: Calendar;
  /** Casting state per role: redraws used and currently offered card ids. */
  casting: Record<string, { redraws: number; offered: string[]; rejected: string[] }>;
  fillerShot: boolean;
  results?: FilmResults;
  grade?: Grade;
  gradeScore?: number;
}

// ---------- Profile ----------

export interface DirectorState {
  id: string;
  level: number;
  films: number;
}

export interface FilmRecord {
  film: Film;
  completedAt: number; // ms timestamp
}

export interface Profile {
  version: number;
  name: string;
  createdAt: number;
  seed: number; // advances as content is generated
  reputation: number;
  credits: number;
  unlocks: {
    directors: string[];
    topics: string[];
    packs: string[];
    sets: string[];
  };
  directors: Record<string, DirectorState>;
  actorPool: Actor[];
  contractBoard: Contract[];
  activeFilm?: Film;
  filmography: FilmRecord[];
  /** Award wins per genre, for genre-master unlocks. */
  genreAwardWins: Partial<Record<GenreId, number>>;
}
