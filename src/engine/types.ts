// Core entity types for Film it!. Pure data, no logic.

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

/** Weighted components of studio satisfaction. */
export type GradeComponent = 'boxOffice' | 'public' | 'critics' | 'awards';

/** Weights for studio satisfaction. Sum to 1. */
export type ExpectationWeights = Record<GradeComponent, number>;

/**
 * On time and on budget are not weighted components: they are effects applied
 * after weighting. A 90-satisfaction film delivered slightly late drops to ~88,
 * a bit more late ~85, very late can fall to single digits.
 * Severity multiplies the penalty curves in tuning.ts.
 */
export interface DeliveryStrictness {
  late: number;
  overBudget: number;
}

export type RoleType =
  | 'main'
  | 'villain'
  | 'coVillain'
  | 'romanticInterest'
  | 'comicRelief'
  | 'supporting';

export type Billing = 'lead' | 'second' | 'support' | 'minor';

/** A scene's tone. */
export type Tone = 'happy' | 'sad' | 'thrill' | 'calm' | 'romantic' | 'scary';

/** Script profile axes, each 0–100: action (calm→thrill), humor (sad→happy), romance, fear. */
export type Axis = 'action' | 'humor' | 'romance' | 'fear';
export type AxisVector = Record<Axis, number>;

export type SceneDuration = 'short' | 'medium' | 'long';

/** Actor skills. An action beat uses one skill. */
export type Skill = 'action' | 'comedy' | 'drama' | 'romance' | 'menace';
export type SkillMap = Record<Skill, number>;

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export type AgeBracket = 'young' | 'adult' | 'veteran';

export type ActorTrait = 'method' | 'diva' | 'charming' | 'oneTake';

export type Specialty = 'script' | 'casting' | 'shooting' | 'post' | 'genre' | 'budget' | 'schedule' | 'festival';

// ---------- Content (static catalogue) ----------

export interface Studio {
  id: string;
  name: string;
  tier: number; // 1–5
}

/** An action a character can do in a scene ("fights and wins", "declares love"). */
export interface ActionDef {
  id: string;
  verb: string;
  /** Whether the beat names a target, and the word shown before it ("To", "With", "From"). */
  target: 'none' | 'optional' | 'required';
  prep: string;
  skill: Skill;
  /** Dramatic weight 0–3. 0 = passive (e.g. "watches"). */
  impact: number;
  /** Can end the story: a climax beat. */
  climax?: boolean;
  /** Tones this action sits naturally in. */
  tones: Tone[];
  /** Where this action pushes the script profile. */
  vec: AxisVector;
  /** Writing cost $K, and whether it needs stunts when shooting. */
  cost: number;
  stunt?: boolean;
  minRating: AgeRating;
  /** Topic that adds this action; undefined = always available. */
  topicId?: string;
}

export interface Topic {
  id: string;
  name: string;
  genreFit: GenreMap; // multiplier input, 0–100
  actions: string[]; // topic-specific actions it adds
  setIds: string[]; // sets it unlocks
  packId: string; // 'starter' for starter topics
}

export interface TopicPack {
  id: string;
  name: string;
  topicIds: string[];
  cost: number; // credits
}

/** How a set looks as a low-poly isometric diorama. */
export type SetStyle = 'interior' | 'exterior' | 'chroma';

export interface FilmSet {
  id: string;
  name: string;
  tags: string[]; // topic ids, mood, interior/exterior
  style: SetStyle;
  /** Grid footprint in iso cubes: width × depth (e.g. 2×2 house room, 4×10 war field). */
  footprint: { w: number; d: number };
  /** How many crowd extras the set can hold (for the Special: extras parameter). */
  extrasCapacity: number;
  /** Floor / wall colours for the diorama. */
  palette: { floor: string; wall?: string; accent: string };
  /** Fit per tone, 0–100. */
  toneFit: Record<Tone, number>;
  /** Fit for specific actions (e.g. the Colosseum for arena battles). Missing = stunt/default fit. */
  actionFit?: Record<string, number>;
  dayCost: number; // $K per shooting day
  /** How the set is unlocked. */
  unlock: { kind: 'start' } | { kind: 'topic'; topicId: string } | { kind: 'credits'; cost: number };
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
    | { kind: 'credits'; cost: number };
  blurb: string;
}

export interface Actor {
  id: string;
  name: string;
  starPower: number; // 0–100
  acting: number; // 0–100, general craft
  skills: SkillMap; // 0–100 each
  rarity: Rarity;
  traits: ActorTrait[];
  age: AgeBracket;
  /** Parody of a famous name ("Leonardo DiBario"). */
  famous?: boolean;
  /** For matching portrait art. */
  gender?: 'f' | 'm';
  /** Career across films: films made, awards won, recent credits. */
  films?: number;
  wins?: number;
  credits?: { title: string; grade: string }[];
  /** Asset key for commissioned cartoon portrait art; undefined = procedural face. */
  portrait?: string;
  /** Directors who discovered this actor (fee discount later). */
  discoveredBy?: string[];
}

// ---------- Contract ----------

export type HardRequirement =
  | { kind: 'runtime'; target: number; tolerance: number }
  | { kind: 'tone'; tone: Tone; count: number }
  | { kind: 'action'; actionId: string }
  | { kind: 'leadStarPower'; min: number }
  | { kind: 'role'; roleType: RoleType }
  | { kind: 'maxRating'; rating: AgeRating };

export type BonusGoal =
  | { kind: 'topic'; topicId: string; points: number }
  | { kind: 'festivalNomination'; points: number }
  | { kind: 'underBudget'; pct: number; points: number }
  | { kind: 'boxOffice'; min: number; points: number }
  | { kind: 'criticsAtLeast'; min: number; points: number }
  | { kind: 'returningLead'; actorId: string; name: string; points: number };

export interface Contract {
  id: string;
  /** Working title of the film the studio wants ("The Last Signal"). */
  title?: string;
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
  delivery: DeliveryStrictness;
  /** Box office the studio expects, $K. */
  boxOfficeTarget: number;
  /** Marketing budget the studio puts behind the film, $K (studio money, not ours). */
  marketing?: number;
  /** Set when this brief is a sequel to one of your hits. */
  sequelOf?: { filmId: string; franchise: string; number: number; topicId?: string; leadActorId?: string };
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
  /** Snapshot of the cast actor (films keep their cast even as actors change later). */
  actor?: Actor;
  /** Agreed pay for this role, $K. */
  pay?: number;
}

/** One action beat: "<role> <does action> <prep> <target>". */
export interface Beat {
  roleId: string;
  actionId: string;
  targetId?: string;
}

export type Meter = 'pace' | 'chemistry' | 'dialogue';
export type MeterMap = Record<Meter, number>;

/** Which cut of a shoot: favouring pace, favouring chemistry, or the rough one. */
export type TakeVersion = 'pace' | 'chemistry' | 'rough';

export interface Take {
  id: string;
  sceneId: string;
  setId: string;
  focus: Meter;
  version: TakeVersion;
  meters: MeterMap;
  score: number;
  week: number;
  feedback: string;
}

/** One bubble popping during a shoot (for the animation). t is 0–1 through the shoot. */
export interface Bubble {
  t: number;
  meter: Meter;
  value: number;
  roleId?: string;
}

/** A shoot waiting for the player to pick a version or try again. */
export interface PendingShoot {
  sceneId: string;
  setId: string;
  focus: Meter;
  bubbles: Bubble[];
  meters: MeterMap;
  versions: Take[];
  /** Pairs whose hidden chemistry this shoot revealed. */
  revealed: string[];
}

export interface ShootingState {
  /** Fatigue per role, 0–100. */
  fatigue: Record<string, number>;
  /** Cast bond from club meetups, 0–100. */
  bond: number;
  /** Fresh boost from relaxing, consumed by the next shoot (0–1). */
  fresh: number;
  /** Practice per scene, 0–100 each. */
  practice: Record<string, { pace: number; dialogue: number }>;
  /** Number of shoots per scene (learning curve). */
  shoots: Record<string, number>;
  /** Revealed hidden chemistry per actor pair key. */
  revealedPairs: Record<string, number>;
  pending?: PendingShoot;
  log: { week: number; text: string }[];
}

export type PolishTier = 'none' | 'basic' | 'pro' | 'premium';

export interface Scene {
  id: string;
  duration: SceneDuration;
  /** Minute the scene starts on the timeline (snapped to whole minutes). */
  startMin?: number;
  tone: Tone;
  beats: Beat[];
  /** Others involved: present, no action of their own. */
  others: string[];
  setId?: string;
  takes: Take[];
  chosenTakeId?: string;
  cut?: boolean;
  vfx: PolishTier;
  sfx: PolishTier;
}

export type MusicTier = 'none' | 'library' | 'composer' | 'star';

// ---------- Poster & marketing ----------

export type PosterStyle = 'moon' | 'skyline' | 'sunset' | 'haunted' | 'confetti' | 'castle' | 'blast' | 'portrait';
export type PosterFont = 'classic' | 'bold' | 'elegant' | 'scratch' | 'playful' | 'future' | 'epic';
export type PosterSize = 'hidden' | 's' | 'm' | 'l';

export interface PosterDesign {
  /** Background variant: style + seed. Regenerating rolls new ones. */
  style: PosterStyle;
  seed: number;
  regenerations: number;
  titleFont: PosterFont;
  titleSize: Exclude<PosterSize, 'hidden'>;
  directorSize: PosterSize;
  /** Billing size per role id. */
  billing: Record<string, PosterSize>;
  /** Role ids whose faces appear on the poster. */
  faces: string[];
  frame: 'none' | 'gold' | 'film' | 'neon';
}

export type MarketingLevel = 'cut' | 'standard' | 'push';
export interface MarketingState {
  level: MarketingLevel;
  changes: number;
}

export interface RoleCasting {
  draws: number; // 0 = never drawn; the first draw is free
  offered: Actor[];
}

export interface LedgerEntry {
  label: string;
  amount: number; // $K, positive = spend
  phase: FilmPhase;
}

/** Production weeks used (shoot + post share the contract deadline). */
export interface Calendar {
  shootWeeks: number;
  postWeeks: number;
}

export interface FilmResults {
  buzz: number;
  publicRating: number;
  criticsRating: number;
  /** Factor scores (0–100) that fed the ratings, for the breakdown. */
  factors: Record<string, number>;
  boredom: number;
  overproduction: number;
  openingWeekend: number;
  /** Gross per week of the run, $K. */
  weekly: number[];
  boxOffice: number;
  /** "Best Picture", "Festival: Sunvale Film Festival", … */
  nominations: string[];
  wins: string[];
  /** Award category → the film's driver value, for the breakdown. */
  awardDrivers: Record<string, number>;
  posterScore?: number;
  marketing?: MarketingLevel;
  /** Per award: who was nominated and who won (rival films included). */
  awardDetails?: { category: string; nominees: string[]; winner: string }[];
}

export interface GradeReport {
  components: Record<GradeComponent, number>;
  satisfaction: number;
  bonusPoints: number;
  bonusMet: string[];
  weeksLate: number;
  overBudgetPct: number;
  latePenalty: number;
  overBudgetPenalty: number;
  score: number;
  letterBeforeCaps: Grade;
  missedReqs: string[];
  grade: Grade;
  rewards: { reputation: number; credits: number; unspentCredits: number; awardRep: number };
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface Film {
  id: string;
  title: string;
  contract: Contract;
  directorId: string;
  /** Display name for credits ("A film by …"). */
  directorName?: string;
  phase: FilmPhase;
  runtime: number;
  topicId?: string;
  roles: Role[];
  scenes: Scene[];
  music: MusicTier;
  ledger: LedgerEntry[];
  calendar: Calendar;
  /** Casting state per role: draws made, cards on the table, rejected actor ids. */
  casting: Record<string, RoleCasting>;
  /** Actor ids rejected anywhere in this film: gone for this film. */
  rejected: string[];
  fillerShot: boolean;
  poster?: PosterDesign;
  marketing?: MarketingState;
  /** Franchise this film belongs to (number 2+ = sequel). */
  franchise?: { name: string; number: number };
  shooting?: ShootingState;
  /** Script quality locked in when the script is finished. */
  scriptQuality?: number;
  castingScore?: number;
  results?: FilmResults;
  report?: GradeReport;
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
  careerId?: string;
  completedAt: number; // ms timestamp
}

/**
 * A career: one run with a director profile. Reputation (which opens higher-tier studios)
 * and the director's level grow within the career; credits earned go to the global bank.
 */
export interface Career {
  id: string;
  directorId: string;
  startedAt: number;
  endedAt?: number;
  status: 'active' | 'retired' | 'fired';
  reputation: number;
  level: number;
  films: number;
  /** Credits this career has paid into the bank. */
  earnings: number;
  /** Consecutive F grades (fired at the limit). */
  fStreak: number;
  grades: Grade[];
  nominations: number;
  wins: number;
  boxOffice: number;
}

export interface Profile {
  version: number;
  name: string;
  createdAt: number;
  seed: number; // advances as content is generated
  /** The bank: credits earned across all careers. Buys profiles, topic packs and sets. */
  credits: number;
  /** The career in progress, if any. */
  career?: Career;
  /** Finished careers. */
  careers: Career[];
  unlocks: {
    directors: string[];
    topics: string[];
    packs: string[];
    sets: string[];
  };
  /** Lifetime stats per director profile. */
  directors: Record<string, DirectorState>;
  actorPool: Actor[];
  contractBoard: Contract[];
  activeFilm?: Film;
  filmography: FilmRecord[];
}
