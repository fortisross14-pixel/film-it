// Shooting phase: a weekly loop. Each week the director picks one activity:
//   practice a scene · club meetup · relax · shoot a scene.
// A shoot is a bubble minigame: for a few seconds bubbles add to three meters
// (pace, chemistry, dialogue). It yields 3 versions — best in pace, best in
// chemistry, and a rough one — and you pick one or try again another week.
//
// What moves the bubbles: focus, the actors (star power → more bubbles, skills
// for their actions, acting, fatigue, hidden pair chemistry, traits), cast bond,
// practice, the director, scene↔genre alignment, set alignment, the learning
// curve on retakes, and a little noise ("inspired that day").

import type {
  Actor, Bubble, Film, FilmSet, Meter, MeterMap, PendingShoot, Profile, Role, Scene, ShootingState, Take, TakeVersion,
} from './types';
import type { Rng } from './rng';
import { makeId } from './rng';
import { TUNING } from './tuning';
import { actionById } from './data/actions';
import { setById, DEFAULT_ACTION_FIT } from './data/sets';
import { directorById } from './data/directors';
import { affinityBonus, specialtyScale } from './director';
import { withRng } from './profile';
import { genreTarget, participants, sceneProfile, spent } from './script';

export type ShootResult = { ok: true; profile: Profile } | { ok: false; reason: string };
const fail = (reason: string): ShootResult => ({ ok: false, reason });
const T = () => TUNING.shooting;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
export const METERS: Meter[] = ['pace', 'chemistry', 'dialogue'];

/** Linear up to the knee, then eases towards 100 so stacked bonuses still separate. */
function softCap(x: number): number {
  const k = T().softCapKnee;
  if (x <= k) return clamp(x);
  return clamp(k + (100 - k) * (1 - Math.exp(-(x - k) / T().softCapScale)));
}

export type WeekAction =
  | { kind: 'practice'; sceneId: string }
  | { kind: 'club' }
  | { kind: 'relax' }
  | { kind: 'shoot'; sceneId: string; setId: string; focus: Meter };

// ---------------- State ----------------

export function initShooting(film: Film): ShootingState {
  return {
    fatigue: Object.fromEntries(film.roles.map((r) => [r.id, 0])),
    bond: 0,
    fresh: 0,
    practice: Object.fromEntries(film.scenes.map((s) => [s.id, { pace: 0, dialogue: 0 }])),
    shoots: {},
    revealedPairs: {},
    log: [],
  };
}

const stateOf = (film: Film): ShootingState => film.shooting ?? initShooting(film);

export const weeksUsed = (film: Film) => film.calendar.shootWeeks + film.calendar.postWeeks;
export const weeksLeft = (film: Film) => film.contract.deadlineWeeks - weeksUsed(film);
/** Budget Master discount on crew, sets and writing (1 = no discount). */
export const budgetMult = (film: Film) => 1 - TUNING.directors.budgetDiscount * specialtyScale(directorById(film.directorId), 'budget', 1);

export const crewWeekCost = (film: Film) => Math.round(Math.max(T().crewWeekMin, film.contract.budget * T().crewWeekShare) * budgetMult(film));

export function shootWeekCost(film: Film, scene: Scene, set: FilmSet): number {
  const stunts = scene.beats.filter((b) => actionById(b.actionId).stunt).length;
  return crewWeekCost(film) + Math.round(set.dayCost * T().shootDaysPerWeek * budgetMult(film)) + Math.round(stunts * film.contract.budget * T().stuntShare);
}

// ---------------- Fits ----------------

/** How well a scene suits the film's genre, 0–100 (a chase fits a thriller better than a rom-com). */
export function sceneGenreFit(film: Film, scene: Scene): number {
  const p = sceneProfile(scene);
  const { target, weight } = genreTarget(film);
  const axes = ['action', 'humor', 'romance', 'fear'] as const;
  const w = axes.reduce((a, k) => a + weight[k], 0);
  const d = axes.reduce((a, k) => a + Math.abs(p[k] - target[k]) * weight[k], 0) / w;
  return Math.round(clamp(100 - d * 1.6));
}

/** How well a set suits a scene: its tone, and any specific actions. */
export function setFit(set: FilmSet, scene: Scene): number {
  const tone = set.toneFit[scene.tone];
  if (!scene.beats.length) return tone;
  const actionFits = scene.beats.map((b) => {
    const a = actionById(b.actionId);
    const specific = set.actionFit?.[a.id];
    if (specific !== undefined) return specific;
    return a.topicId ? 25 : DEFAULT_ACTION_FIT + (a.tones.includes(scene.tone) ? tone - 50 : 0) / 2;
  });
  return Math.round(tone * 0.6 + (actionFits.reduce((a, b) => a + b, 0) / actionFits.length) * 0.4);
}

// ---------------- Chemistry ----------------

export const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);

/** Hidden chemistry between two actors, fixed per pair. */
export function pairChemistry(a: Actor, b: Actor): number {
  const key = pairKey(a.id, b.id);
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  const [lo, hi] = T().pairChemistry;
  return Math.round(lo + ((h >>> 0) / 4294967296) * (hi - lo));
}

// ---------------- Meter prediction ----------------

interface CastIn { role: Role; actor: Actor; skill: number }

function sceneCast(film: Film, scene: Scene): CastIn[] {
  return participants(scene).flatMap((id) => {
    const role = film.roles.find((r) => r.id === id);
    if (!role?.actor) return [];
    const mine = scene.beats.filter((b) => b.roleId === id).map((b) => actionById(b.actionId).skill);
    const skill = mine.length ? mine.reduce((a, s) => a + role.actor!.skills[s], 0) / mine.length : role.actor.skills.drama;
    return [{ role, actor: role.actor, skill }];
  });
}

export interface MeterBreakdown {
  meters: MeterMap;
  factors: { label: string; value: string }[];
}

/** Expected meters for a shoot, before noise. */
export function predictMeters(film: Film, scene: Scene, set: FilmSet, focus: Meter, level = 1): MeterBreakdown {
  const st = stateOf(film);
  const cast = sceneCast(film, scene);
  const director = directorById(film.directorId);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const has = (a: Actor, t: Actor['traits'][number]) => a.traits.includes(t);

  const acting = avg(cast.map((c) => c.actor.acting + (has(c.actor, 'method') ? 6 : 0)));
  const skill = avg(cast.map((c) => c.skill));
  const drama = avg(cast.map((c) => c.actor.skills.drama));
  const star = avg(cast.map((c) => c.actor.starPower));
  const practice = st.practice[scene.id] ?? { pace: 0, dialogue: 0 };

  // Pair chemistry among the participants (hidden until revealed).
  const pairs: number[] = [];
  for (let i = 0; i < cast.length; i++)
    for (let j = i + 1; j < cast.length; j++) pairs.push(pairChemistry(cast[i].actor, cast[j].actor));
  const pairScore = pairs.length ? 50 + avg(pairs) : 40 + acting / 4;
  const charm = avg(cast.map((c) => (has(c.actor, 'charming') ? 10 : 0) - (has(c.actor, 'diva') ? 8 : 0)));

  let pace = skill * 0.5 + acting * 0.3 + practice.pace * 0.2 + avg(cast.map((c) => (has(c.actor, 'oneTake') ? 6 : 0)));
  let chemistry = pairScore * 0.55 + st.bond * 0.25 + star * 0.2 + charm;
  let dialogue = acting * 0.5 + drama * 0.2 + practice.dialogue * 0.3;

  const fatigue = avg(cast.map((c) => st.fatigue[c.role.id] ?? 0));
  const fatigueMult = 1 - (fatigue / 100) * T().fatiguePenalty;
  const starMult = T().starBubbleBase + (star / 100) * T().starBubbleRange;
  const sFit = sceneGenreFit(film, scene);
  const sceneMult = T().sceneFitBase + (sFit / 100) * T().sceneFitRange;
  const tFit = setFit(set, scene);
  const setMult = T().setFitBase + (tFit / 100) * T().setFitRange;
  const shoots = st.shoots[scene.id] ?? 0;
  const cine = specialtyScale(director, 'shooting', level);
  const retake = Math.min(shoots, T().retakeBonusCap) * T().retakeBonus * (cine ? T().cinematographerRetake : 1);
  const directorAdd = affinityBonus(director, film.contract.genre) + cine * T().cinematographerBase;
  const fresh = 1 + st.fresh;

  const shape = (base: number, m: Meter) => {
    const focusMult = m === focus ? T().focusBoost : T().focusOther;
    const freshMult = m === 'dialogue' ? 1 : fresh;
    return softCap((base + directorAdd + retake) * fatigueMult * starMult * sceneMult * setMult * focusMult * freshMult);
  };
  pace = shape(pace, 'pace');
  chemistry = shape(chemistry, 'chemistry');
  dialogue = shape(dialogue, 'dialogue');

  const pct = (x: number) => `${x >= 1 ? '+' : ''}${Math.round((x - 1) * 100)}%`;
  return {
    meters: { pace: Math.round(pace), chemistry: Math.round(chemistry), dialogue: Math.round(dialogue) },
    factors: [
      { label: 'Stars', value: pct(starMult) },
      { label: 'Fatigue', value: pct(fatigueMult) },
      { label: `Scene fits ${film.contract.genre}`, value: pct(sceneMult) },
      { label: `Set fit (${tFit})`, value: pct(setMult) },
      { label: 'Director', value: `${directorAdd >= 0 ? '+' : ''}${Math.round(directorAdd)}` },
      ...(retake ? [{ label: `Retake learning`, value: `+${Math.round(retake)}` }] : []),
      ...(st.fresh ? [{ label: 'Rested cast', value: pct(fresh) }] : []),
    ],
  };
}

// ---------------- Takes ----------------

export function takeScore(scene: Scene, m: MeterMap): number {
  const w = T().toneWeights[scene.tone];
  return Math.round(METERS.reduce((a, k) => a + m[k] * w[k], 0));
}

function feedbackFor(scene: Scene, m: MeterMap, version: TakeVersion): string {
  if (version === 'rough') return 'A rough cut: missed marks and flat energy.';
  const low = METERS.reduce((a, k) => (m[k] < m[a] ? k : a), 'pace' as Meter);
  const high = METERS.reduce((a, k) => (m[k] > m[a] ? k : a), 'pace' as Meter);
  const lowText = { pace: 'The scene dragged', chemistry: 'There was no spark between them', dialogue: 'They fumbled their lines' }[low];
  const highText = { pace: 'great energy', chemistry: 'real chemistry', dialogue: 'every line landed' }[high];
  return m[low] < 45 ? `${lowText}, but ${highText}.` : `Solid take: ${highText}${scene.tone === 'thrill' && high === 'pace' ? ' in the action' : ''}.`;
}

function makeBubbles(rng: Rng, meters: MeterMap, roleIds: string[]): Bubble[] {
  const out: Bubble[] = [];
  for (const meter of METERS) {
    let left = meters[meter];
    while (left > 0) {
      const value = Math.min(left, Math.max(1, Math.round(T().bubbleSize * (0.6 + rng.next() * 0.8))));
      left -= value;
      out.push({ t: rng.next(), meter, value, roleId: roleIds.length ? rng.pick(roleIds) : undefined });
    }
  }
  return out.sort((a, b) => a.t - b.t);
}

// ---------------- Week actions ----------------

const addFatigue = (st: ShootingState, ids: string[], amountRaw: number, film: Film) => {
  const fatigue = { ...st.fatigue };
  const amount = amountRaw;
  const cut = 1 - TUNING.directors.scheduleFatigueCut * specialtyScale(directorById(film.directorId), 'schedule', 1);
  for (const id of ids) {
    const method = film.roles.find((r) => r.id === id)?.actor?.traits.includes('method');
    fatigue[id] = clamp((fatigue[id] ?? 0) + (amount + (method && amount === T().shootFatigue ? T().methodExtraFatigue : 0)) * cut);
  }
  return fatigue;
};

/** Spend one production week on an activity. */
export function doWeek(p: Profile, action: WeekAction): ShootResult {
  const film = p.activeFilm;
  if (!film || film.phase !== 'shooting') return fail('Not shooting');
  const st = stateOf(film);
  if (st.pending) return fail('Pick a version (or try again) first');
  const week = weeksUsed(film) + 1;
  const level = p.directors[film.directorId]?.level ?? 1;
  const allIds = film.roles.map((r) => r.id);
  const crew = { label: `Week ${week}: crew`, amount: crewWeekCost(film), phase: 'shooting' as const };
  const base = (next: ShootingState, text: string, ledger = [crew]): ShootResult => ({
    ok: true,
    profile: {
      ...p,
      activeFilm: {
        ...film,
        shooting: { ...next, log: [...next.log, { week, text }] },
        calendar: { ...film.calendar, shootWeeks: film.calendar.shootWeeks + 1 },
        ledger: [...film.ledger, ...ledger],
      },
    },
  });

  switch (action.kind) {
    case 'practice': {
      const scene = film.scenes.find((s) => s.id === action.sceneId);
      if (!scene) return fail('Unknown scene');
      const cur = st.practice[scene.id] ?? { pace: 0, dialogue: 0 };
      const gain = (v: number) => Math.round(v + (100 - v) * (T().practiceGain / 100));
      return base(
        {
          ...st,
          practice: { ...st.practice, [scene.id]: { pace: gain(cur.pace), dialogue: gain(cur.dialogue) } },
          fatigue: addFatigue(st, participants(scene), T().practiceFatigue, film),
        },
        `Practiced scene ${film.scenes.indexOf(scene) + 1}`,
      );
    }
    case 'club':
      return base({ ...st, bond: clamp(st.bond + T().clubBond), fatigue: addFatigue(st, allIds, T().clubFatigue, film) }, 'Club meetup: the cast bonded');
    case 'relax': {
      const fatigue = Object.fromEntries(Object.entries(st.fatigue).map(([k, v]) => [k, clamp(v - T().relaxRecovery)]));
      const practice = Object.fromEntries(
        Object.entries(st.practice).map(([k, v]) => [k, { pace: v.pace, dialogue: Math.round(v.dialogue * T().relaxDialogueKeep) }]),
      );
      return base({ ...st, fatigue, practice, fresh: T().relaxFresh }, 'The cast took a week off to relax');
    }
    case 'shoot': {
      const scene = film.scenes.find((s) => s.id === action.sceneId);
      if (!scene) return fail('Unknown scene');
      if (!p.unlocks.sets.includes(action.setId)) return fail('Set is locked');
      const set = setById(action.setId);
      const predicted = predictMeters(film, scene, set, action.focus, level).meters;
      const ids = participants(scene);
      const { profile, value } = withRng(p, (rng) => {
        const meters = {} as MeterMap;
        for (const m of METERS) meters[m] = Math.round(clamp(predicted[m] * (1 + (rng.next() * 2 - 1) * T().noise)));
        const versions = (['pace', 'chemistry', 'rough'] as TakeVersion[]).map((version): Take => {
          const shape = T().versionShape[version];
          const vm = {} as MeterMap;
          for (const m of METERS) vm[m] = Math.round(clamp(meters[m] * shape[m] * (1 + (rng.next() * 2 - 1) * T().noise / 2)));
          return {
            id: makeId('take', rng), sceneId: scene.id, setId: set.id, focus: action.focus, version,
            meters: vm, score: takeScore(scene, vm), week, feedback: feedbackFor(scene, vm, version),
          };
        });
        return { meters, versions, bubbles: makeBubbles(rng, meters, ids) };
      });
      // Reveal hidden chemistry for pairs shooting together for the first time.
      const revealedPairs = { ...st.revealedPairs };
      const revealed: string[] = [];
      const cast = ids.map((id) => film.roles.find((r) => r.id === id)?.actor).filter(Boolean) as Actor[];
      for (let i = 0; i < cast.length; i++)
        for (let j = i + 1; j < cast.length; j++) {
          const k = pairKey(cast[i].id, cast[j].id);
          if (revealedPairs[k] === undefined) {
            revealedPairs[k] = pairChemistry(cast[i], cast[j]);
            revealed.push(k);
          }
        }
      const pending: PendingShoot = { sceneId: scene.id, setId: set.id, focus: action.focus, ...value, revealed };
      const next: ShootingState = {
        ...st,
        fresh: 0,
        shoots: { ...st.shoots, [scene.id]: (st.shoots[scene.id] ?? 0) + 1 },
        fatigue: addFatigue(st, ids, T().shootFatigue, film),
        revealedPairs,
        pending,
      };
      const rental = shootWeekCost(film, scene, set) - crewWeekCost(film);
      const r = base(next, `Shot scene ${film.scenes.indexOf(scene) + 1} on the ${set.name} set`, [
        crew,
        { label: `Week ${week}: ${set.name} rental & stunts`, amount: rental, phase: 'shooting' },
      ]);
      if (!r.ok) return r;
      return { ok: true, profile: { ...r.profile, seed: profile.seed, actorPool: profile.actorPool } };
    }
  }
}

/** Keep one version of the pending shoot. All three are stored as takes; the chosen one is used. */
export function chooseVersion(p: Profile, takeId: string): ShootResult {
  const film = p.activeFilm;
  const pending = film?.shooting?.pending;
  if (!film || !pending) return fail('Nothing to choose');
  const take = pending.versions.find((t) => t.id === takeId);
  if (!take) return fail('Unknown version');
  const scenes = film.scenes.map((s) =>
    s.id === pending.sceneId ? { ...s, takes: [...s.takes, ...pending.versions], chosenTakeId: take.id, setId: pending.setId } : s,
  );
  return { ok: true, profile: { ...p, activeFilm: { ...film, scenes, shooting: { ...film.shooting!, pending: undefined } } } };
}

/** Discard the pending shoot's versions keeping the scene's previous choice ("try again"). */
export function tryAgain(p: Profile): ShootResult {
  const film = p.activeFilm;
  const pending = film?.shooting?.pending;
  if (!film || !pending) return fail('Nothing to discard');
  const scenes = film.scenes.map((s) => (s.id === pending.sceneId ? { ...s, takes: [...s.takes, ...pending.versions] } : s));
  return { ok: true, profile: { ...p, activeFilm: { ...film, scenes, shooting: { ...film.shooting!, pending: undefined } } } };
}

export const chosenTake = (scene: Scene) => scene.takes.find((t) => t.id === scene.chosenTakeId);

export function shootingBlockers(film: Film): string[] {
  const out: string[] = [];
  if (film.shooting?.pending) out.push('Pick a version for the last shoot');
  film.scenes.forEach((s, i) => {
    if (!s.chosenTakeId) out.push(`Shoot scene ${i + 1}`);
  });
  return out;
}

/** Wrap: filler is shot in one block (one week, mediocre) and the film moves to post. */
export function wrapShooting(p: Profile): ShootResult {
  const film = p.activeFilm;
  if (!film || film.phase !== 'shooting') return fail('Not shooting');
  const blockers = shootingBlockers(film);
  if (blockers.length) return fail(blockers[0]);
  const week = weeksUsed(film) + 1;
  return {
    ok: true,
    profile: {
      ...p,
      activeFilm: {
        ...film,
        phase: 'post',
        fillerShot: true,
        calendar: { ...film.calendar, shootWeeks: film.calendar.shootWeeks + 1 },
        ledger: [...film.ledger, { label: `Week ${week}: filler block`, amount: crewWeekCost(film), phase: 'shooting' }],
      },
    },
  };
}

export const budgetLeftShooting = (film: Film) => film.contract.budget - spent(film);
