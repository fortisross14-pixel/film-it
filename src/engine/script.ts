// Script phase. You define the characters, then build 3–7 scenes. Each scene has a
// duration, a tone and a few action beats ("Villain · fights and wins · To: Main").
// Scenes are ordered on the timeline; filler fills the rest of the runtime and is
// spread evenly between them. All functions are pure and return a new Film.

import type {
  ActionDef, Axis, AxisVector, Beat, Billing, DirectorDef, Film, HardRequirement, Role, RoleType, Scene, SceneDuration, Tone,
} from './types';
import { TUNING } from './tuning';
import { ACTIONS, actionById } from './data/actions';
import { GENRE_PROFILE, TONES, toneById } from './data/tones';
import { topicById } from './data/topics';
import { ratingIndex } from './data/genres';
import { affinityBonus, specialtyScale } from './director';
import { ROLE_TYPE_NAMES } from './format';

export type EditResult = { ok: true; film: Film } | { ok: false; reason: string };
const fail = (reason: string): EditResult => ({ ok: false, reason });
const S = () => TUNING.script;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const AXIS_IDS: Axis[] = ['action', 'humor', 'romance', 'fear'];

export const ROLE_TYPES: RoleType[] = ['main', 'villain', 'coVillain', 'romanticInterest', 'comicRelief', 'supporting'];
export const DURATIONS: SceneDuration[] = ['short', 'medium', 'long'];

export const BILLING_FOR: Record<RoleType, Billing> = {
  main: 'lead',
  villain: 'second',
  romanticInterest: 'second',
  coVillain: 'support',
  comicRelief: 'support',
  supporting: 'minor',
};

const DEFAULT_ROLE_NAMES: Record<RoleType, string[]> = {
  main: ['The Hero'],
  villain: ['The Villain'],
  coVillain: ['The Henchman'],
  romanticInterest: ['The Love Interest'],
  comicRelief: ['The Joker'],
  supporting: ['The Mentor', 'The Friend'],
};

function nextId(prefix: string, ids: string[]): string {
  let n = 1;
  while (ids.includes(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

const replaceScene = (film: Film, scene: Scene): Film => ({ ...film, scenes: film.scenes.map((s) => (s.id === scene.id ? scene : s)) });

// ---------------- Timing ----------------

export const sceneMinutes = (duration: SceneDuration, runtime: number) => Math.round(S().durationShare[duration] * runtime);
export const realMinutes = (film: Film) => film.scenes.reduce((a, s) => a + sceneMinutes(s.duration, film.runtime), 0);
export const fillerMinutes = (film: Film) => Math.max(0, film.runtime - realMinutes(film));
export const fillerShare = (film: Film) => (film.runtime ? fillerMinutes(film) / film.runtime : 1);

export interface SlotLayout {
  sceneId: string;
  start: number;
  minutes: number;
  act: 1 | 2 | 3;
}

const actOf = (start: number, minutes: number, runtime: number): 1 | 2 | 3 => {
  const mid = (start + minutes / 2) / runtime;
  return mid < 0.25 ? 1 : mid < 0.75 ? 2 : 3;
};

/**
 * Normalise scene positions: scenes without a start are spread evenly; then every scene
 * is clamped inside the runtime and pushed so none overlap. Scenes come back sorted by time.
 */
export function pack(film: Film): Film {
  const n = film.scenes.length;
  if (!n) return film;
  const mins = (s: Scene) => sceneMinutes(s.duration, film.runtime);
  const gap = fillerMinutes(film) / (n + 1);
  let cursor = gap;
  const withStart = film.scenes.map((s) => {
    const fallback = Math.round(cursor);
    cursor += mins(s) + gap;
    return { ...s, startMin: s.startMin ?? fallback };
  });
  const sorted = withStart.sort((a, b) => a.startMin! - b.startMin!);
  // Forward pass: no overlaps, not before 0.
  let end = 0;
  for (const s of sorted) {
    s.startMin = Math.max(end, Math.max(0, Math.round(s.startMin!)));
    end = s.startMin + mins(s);
  }
  // Backward pass: nothing past the runtime.
  let limit = film.runtime;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const s = sorted[i];
    s.startMin = Math.min(s.startMin!, limit - mins(s));
    limit = s.startMin;
  }
  return { ...film, scenes: sorted };
}

/** Scene positions on the timeline, in time order. */
export function layout(film: Film): SlotLayout[] {
  return pack(film).scenes.map((s) => {
    const minutes = sceneMinutes(s.duration, film.runtime);
    return { sceneId: s.id, start: s.startMin!, minutes, act: actOf(s.startMin!, minutes, film.runtime) };
  });
}

/** Free [start, end) stretches of filler on the timeline. */
export function freeGaps(film: Film, ignoreId?: string): [number, number][] {
  const out: [number, number][] = [];
  let cursor = 0;
  for (const s of pack(film).scenes) {
    if (s.id === ignoreId) continue;
    if (s.startMin! > cursor) out.push([cursor, s.startMin!]);
    cursor = Math.max(cursor, s.startMin! + sceneMinutes(s.duration, film.runtime));
  }
  if (cursor < film.runtime) out.push([cursor, film.runtime]);
  return out;
}

export function setRuntime(film: Film, minutes: number): EditResult {
  const m = Math.round(minutes);
  if (!Number.isFinite(m) || m < S().minRuntime || m > S().maxRuntime) return fail(`Runtime must be ${S().minRuntime}–${S().maxRuntime} min`);
  const next = { ...film, runtime: m };
  if (realMinutes(next) > m) return fail('Scenes would be longer than the runtime');
  // Keep scenes at the same relative place in the film.
  const scale = m / film.runtime;
  return { ok: true, film: pack({ ...next, scenes: pack(film).scenes.map((s) => ({ ...s, startMin: Math.round(s.startMin! * scale) })) }) };
}

// ---------------- Characters ----------------

export const roleCount = (film: Film, type: RoleType) => film.roles.filter((r) => r.type === type).length;
export const canAddRole = (film: Film, type: RoleType) => roleCount(film, type) < S().roleLimits[type][1];

export function addRole(film: Film, type: RoleType, name?: string): EditResult {
  if (!canAddRole(film, type)) return fail(`No more ${ROLE_TYPE_NAMES[type]} roles allowed`);
  const used = new Set(film.roles.map((r) => r.name));
  const fallback = DEFAULT_ROLE_NAMES[type].find((n) => !used.has(n)) ?? `${ROLE_TYPE_NAMES[type]} ${roleCount(film, type) + 1}`;
  const role: Role = { id: nextId('role', film.roles.map((r) => r.id)), name: name?.trim() || fallback, type, billing: BILLING_FOR[type] };
  return { ok: true, film: { ...film, roles: [...film.roles, role] } };
}

export function renameRole(film: Film, roleId: string, name: string): EditResult {
  if (!name.trim()) return fail('Name cannot be empty');
  if (!film.roles.some((r) => r.id === roleId)) return fail('Unknown role');
  return { ok: true, film: { ...film, roles: film.roles.map((r) => (r.id === roleId ? { ...r, name: name.trim() } : r)) } };
}

/** Remove a role and every beat it acts in; it is also dropped as a target or as "others". */
export function removeRole(film: Film, roleId: string): EditResult {
  if (!film.roles.some((r) => r.id === roleId)) return fail('Unknown role');
  const scenes = film.scenes.map((s) => ({
    ...s,
    beats: s.beats
      .filter((b) => b.roleId !== roleId)
      .map((b) => (b.targetId === roleId ? { ...b, targetId: undefined } : b))
      .filter((b) => !(actionById(b.actionId).target === 'required' && !b.targetId)),
    others: s.others.filter((id) => id !== roleId),
  }));
  return { ok: true, film: { ...film, roles: film.roles.filter((r) => r.id !== roleId), scenes } };
}

// ---------------- Topic ----------------

/** Set the topic. Beats using actions of a topic the film no longer has are removed. */
export function setTopic(film: Film, topicId: string | undefined, unlockedTopics: string[]): EditResult & { removedBeats?: number } {
  if (topicId && !unlockedTopics.includes(topicId)) return fail('Topic is locked');
  const allowed = new Set(topicId ? topicById(topicId).actions : []);
  let removedBeats = 0;
  const scenes = film.scenes.map((s) => {
    const beats = s.beats.filter((b) => {
      const a = actionById(b.actionId);
      const keep = !a.topicId || allowed.has(a.id);
      if (!keep) removedBeats++;
      return keep;
    });
    return { ...s, beats };
  });
  return { ok: true, film: { ...film, topicId, scenes }, removedBeats };
}

// ---------------- Scenes ----------------

export function addScene(film: Film, init: Partial<Pick<Scene, 'duration' | 'tone'>> = {}): EditResult & { sceneId?: string } {
  if (film.scenes.length >= S().maxScenes) return fail(`At most ${S().maxScenes} scenes`);
  const scene: Scene = {
    id: nextId('scene', film.scenes.map((s) => s.id)),
    duration: init.duration ?? 'medium',
    tone: init.tone ?? 'calm',
    beats: [],
    others: [],
    takes: [],
    vfx: 'none',
    sfx: 'none',
  };
  if (realMinutes({ ...film, scenes: [...film.scenes, scene] }) > film.runtime) return fail('Not enough runtime left for another scene');
  // Append after the last scene with a small gap (drag it anywhere afterwards).
  const minutes = sceneMinutes(scene.duration, film.runtime);
  const packed = pack(film).scenes;
  const last = packed[packed.length - 1];
  const lastEnd = last ? last.startMin! + sceneMinutes(last.duration, film.runtime) : 0;
  const margin = Math.round(film.runtime * S().newSceneGap);
  scene.startMin = Math.min(lastEnd + margin, film.runtime - minutes);
  return { ok: true, film: pack({ ...film, scenes: [...film.scenes, scene] }), sceneId: scene.id };
}

export function updateScene(film: Film, sceneId: string, patch: Partial<Pick<Scene, 'duration' | 'tone' | 'others'>>): EditResult {
  const s = film.scenes.find((x) => x.id === sceneId);
  if (!s) return fail('Unknown scene');
  if (patch.others?.some((id) => !film.roles.some((r) => r.id === id))) return fail('Unknown role');
  const next = replaceScene(film, { ...s, ...patch });
  if (realMinutes(next) > film.runtime) return fail('Scenes would be longer than the runtime');
  return { ok: true, film: pack(next) };
}

export function removeScene(film: Film, sceneId: string): EditResult {
  if (!film.scenes.some((s) => s.id === sceneId)) return fail('Unknown scene');
  return { ok: true, film: { ...film, scenes: film.scenes.filter((s) => s.id !== sceneId) } };
}

/** Move a scene earlier (-1) or later (+1): it swaps places with its neighbour. */
export function moveScene(film: Film, sceneId: string, delta: number): EditResult {
  const scenes = pack(film).scenes;
  const i = scenes.findIndex((s) => s.id === sceneId);
  if (i < 0) return fail('Unknown scene');
  const j = i + delta;
  if (j < 0 || j >= scenes.length) return fail('Cannot move further');
  const [a, b] = [scenes[Math.min(i, j)], scenes[Math.max(i, j)]];
  const bStart = a.startMin!;
  const aStart = bStart + sceneMinutes(b.duration, film.runtime) + (b.startMin! - a.startMin! - sceneMinutes(a.duration, film.runtime));
  const swapped = scenes.map((s) => (s.id === a.id ? { ...s, startMin: aStart } : s.id === b.id ? { ...s, startMin: bStart } : s));
  return { ok: true, film: pack({ ...film, scenes: swapped }) };
}

/**
 * Drag and drop: place a scene to start at a minute (snapped). If it would overlap another
 * scene it goes to the nearest free spot that fits.
 */
export function placeScene(film: Film, sceneId: string, minute: number): EditResult {
  const packed = pack(film);
  const s = packed.scenes.find((x) => x.id === sceneId);
  if (!s) return fail('Unknown scene');
  const minutes = sceneMinutes(s.duration, film.runtime);
  const want = Math.max(0, Math.min(film.runtime - minutes, Math.round(minute)));
  const fits = (start: number) => freeGaps(packed, sceneId).some(([a, b]) => start >= a && start + minutes <= b);
  for (let d = 0; d <= film.runtime; d++) {
    for (const start of [want - d, want + d]) {
      if (start >= 0 && start + minutes <= film.runtime && fits(start)) {
        return { ok: true, film: pack(replaceScene(packed, { ...s, startMin: start })) };
      }
    }
  }
  return fail('No free space for that scene');
}

// ---------------- Beats ----------------

/** Actions the film can use: base actions allowed by the rating, plus the topic's own. */
export function availableActions(film: Film): ActionDef[] {
  const topicActions = new Set(film.topicId ? topicById(film.topicId).actions : []);
  const max = ratingIndex(film.contract.rating);
  return ACTIONS.filter((a) => (!a.topicId || topicActions.has(a.id)) && ratingIndex(a.minRating) <= max);
}

export function validateBeat(film: Film, beat: Beat): string[] {
  const errs: string[] = [];
  const a = ACTIONS.find((x) => x.id === beat.actionId);
  if (!a) return ['Unknown action'];
  if (!film.roles.some((r) => r.id === beat.roleId)) errs.push('Pick who does it');
  if (!availableActions(film).some((x) => x.id === a.id)) {
    errs.push(a.topicId ? `"${a.verb}" needs the ${topicById(a.topicId).name} topic` : `"${a.verb}" is not allowed at ${film.contract.rating}`);
  }
  if (a.target === 'required' && !beat.targetId) errs.push(`"${a.verb}" needs a target`);
  if (a.target === 'none' && beat.targetId) errs.push(`"${a.verb}" takes no target`);
  if (beat.targetId && !film.roles.some((r) => r.id === beat.targetId)) errs.push('Unknown target');
  if (beat.targetId && beat.targetId === beat.roleId) errs.push('A character cannot target themselves');
  return errs;
}

export function addBeat(film: Film, sceneId: string, beat: Beat): EditResult {
  const s = film.scenes.find((x) => x.id === sceneId);
  if (!s) return fail('Unknown scene');
  const errs = validateBeat(film, beat);
  if (errs.length) return fail(errs[0]);
  return { ok: true, film: replaceScene(film, { ...s, beats: [...s.beats, { ...beat }] }) };
}

export function updateBeat(film: Film, sceneId: string, index: number, beat: Beat): EditResult {
  const s = film.scenes.find((x) => x.id === sceneId);
  if (!s || !s.beats[index]) return fail('Unknown beat');
  const errs = validateBeat(film, beat);
  if (errs.length) return fail(errs[0]);
  return { ok: true, film: replaceScene(film, { ...s, beats: s.beats.map((b, i) => (i === index ? { ...beat } : b)) }) };
}

export function removeBeat(film: Film, sceneId: string, index: number): EditResult {
  const s = film.scenes.find((x) => x.id === sceneId);
  if (!s || !s.beats[index]) return fail('Unknown beat');
  return { ok: true, film: replaceScene(film, { ...s, beats: s.beats.filter((_, i) => i !== index) }) };
}

/** Everyone in a scene: actors of beats, their targets, and others involved. */
export function participants(scene: Scene): string[] {
  const ids = new Set<string>();
  for (const b of scene.beats) {
    ids.add(b.roleId);
    if (b.targetId) ids.add(b.targetId);
  }
  scene.others.forEach((id) => ids.add(id));
  return [...ids];
}

/** Screen time per role id: minutes of every scene it appears in. */
export function screenTime(film: Film): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(film.roles.map((r) => [r.id, 0]));
  for (const s of film.scenes) for (const id of participants(s)) out[id] = (out[id] ?? 0) + sceneMinutes(s.duration, film.runtime);
  return out;
}

// ---------------- Cost ----------------

/** Writing costs scale with the size of the production. */
export const budgetScale = (budget: number) =>
  Math.max(S().budgetScaleMin, Math.min(S().budgetScaleMax, budget / S().referenceBudget));

export function sceneCost(scene: Scene, director?: DirectorDef, level = 1, budget: number = S().referenceBudget): number {
  const T = S();
  const raw = (T.sceneBaseCost + scene.beats.reduce((a, b) => a + T.beatCost + actionById(b.actionId).cost, 0)) * T.durationCostMult[scene.duration] * budgetScale(budget);
  const discount = director
    ? TUNING.directors.writerCostDiscount * specialtyScale(director, 'script', level) + TUNING.directors.budgetDiscount * specialtyScale(director, 'budget', level)
    : 0;
  return Math.round(raw * (1 - Math.min(0.5, discount)));
}

export const scriptCost = (film: Film, director?: DirectorDef, level = 1) =>
  film.scenes.reduce((a, s) => a + sceneCost(s, director, level, film.contract.budget), 0);

// ---------------- Profile (the four axes) ----------------

export function sceneProfile(scene: Scene): AxisVector {
  const tone = toneById(scene.tone).vec;
  const active = scene.beats.map((b) => actionById(b.actionId));
  if (!active.length) return { ...tone };
  const w = S().toneWeightInScene;
  const out = {} as AxisVector;
  for (const ax of AXIS_IDS) out[ax] = tone[ax] * w + (active.reduce((a, x) => a + x.vec[ax], 0) / active.length) * (1 - w);
  return out;
}

/** Minutes-weighted profile of the whole script (filler is neutral and does not count). */
export function scriptProfile(film: Film): AxisVector {
  const out: AxisVector = { action: 0, humor: 0, romance: 0, fear: 0 };
  const total = realMinutes(film);
  if (!total) return out;
  for (const s of film.scenes) {
    const p = sceneProfile(s);
    const m = sceneMinutes(s.duration, film.runtime);
    for (const ax of AXIS_IDS) out[ax] += (p[ax] * m) / total;
  }
  for (const ax of AXIS_IDS) out[ax] = Math.round(out[ax]);
  return out;
}

/** The genre's ideal profile (blended with the secondary genre). */
export function genreTarget(film: Film): { target: AxisVector; weight: AxisVector } {
  const { genre, secondaryGenre } = film.contract;
  const p = GENRE_PROFILE[genre];
  if (!secondaryGenre) return p;
  const q = GENRE_PROFILE[secondaryGenre];
  const w = S().secondaryGenreWeight;
  const mix = (a: AxisVector, b: AxisVector) => Object.fromEntries(AXIS_IDS.map((k) => [k, a[k] * (1 - w) + b[k] * w])) as AxisVector;
  return { target: mix(p.target, q.target), weight: mix(p.weight, q.weight) };
}

export function topicMultiplier(film: Film): number {
  if (!film.topicId) return S().noTopicMult;
  const fit = topicById(film.topicId).genreFit[film.contract.genre] / 100;
  return S().topicMultMin + (S().topicMultMax - S().topicMultMin) * fit;
}

// ---------------- Quality ----------------

export interface QualityBreakdown {
  fit: number;
  depth: number;
  structure: number;
  characters: number;
  coherence: number;
  pacing: number;
  directorBonus: number;
  profile: AxisVector;
  total: number;
  notes: string[];
}

export function beatDepth(scene: Scene): number {
  const n = scene.beats.reduce((a, b) => a + (actionById(b.actionId).impact === 0 ? S().passiveBeatWeight : 1), 0);
  const table = S().depthByBeats;
  const lo = Math.floor(n), hi = Math.min(table.length - 1, Math.ceil(n));
  const f = n - lo;
  const at = (i: number) => table[Math.min(table.length - 1, i)];
  return at(lo) * (1 - f) + at(hi) * f;
}

const sceneImpact = (s: Scene) => s.beats.reduce((a, b) => a + actionById(b.actionId).impact, 0);
const sceneHasClimax = (s: Scene) => s.beats.some((b) => actionById(b.actionId).climax);

export function scriptQuality(film: Film, director?: DirectorDef, level = 1): QualityBreakdown {
  const T = S();
  const notes: string[] = [];
  const scenes = film.scenes;
  const profile = scriptProfile(film);

  // Genre fit: weighted distance between the script profile and the genre's ideal.
  const { target, weight } = genreTarget(film);
  const wSum = AXIS_IDS.reduce((a, k) => a + weight[k], 0);
  const dist = AXIS_IDS.reduce((a, k) => a + Math.abs(profile[k] - target[k]) * weight[k], 0) / wSum;
  const fit = scenes.length ? clamp((100 - dist * T.fitDistanceScale) * topicMultiplier(film)) : 0;
  for (const k of AXIS_IDS) {
    if (weight[k] >= 0.6 && Math.abs(profile[k] - target[k]) > 25) {
      notes.push(`${k[0].toUpperCase() + k.slice(1)} is ${profile[k] < target[k] ? 'too low' : 'too high'} for ${film.contract.genre}`);
    }
  }
  if (!film.topicId) notes.push('No topic chosen');

  // Depth: 2 beats per scene is ideal.
  const depth = scenes.length ? scenes.reduce((a, s) => a + beatDepth(s), 0) / scenes.length : 0;
  scenes.forEach((s, i) => {
    if (s.beats.length === 1) notes.push(`Scene ${i + 1} is shallow (1 action)`);
    if (s.beats.length >= 4) notes.push(`Scene ${i + 1} is too complex (${s.beats.length} actions)`);
  });

  // Structure: open with the main, end on a climax, escalate, vary tone.
  let structure = 0;
  const main = film.roles.find((r) => r.type === 'main');
  if (scenes.length) {
    if (main && participants(scenes[0]).includes(main.id)) structure += T.openingWithMain;
    else notes.push('Open with your main character');
    if (sceneHasClimax(scenes[scenes.length - 1])) structure += T.climaxEnding;
    else notes.push('The last scene needs a climax action');
    const half = Math.floor(scenes.length / 2);
    const early = scenes.slice(0, half).reduce((a, s) => a + sceneImpact(s), 0) / Math.max(1, half);
    const late = scenes.slice(half).reduce((a, s) => a + sceneImpact(s), 0) / Math.max(1, scenes.length - half);
    if (late >= early) structure += T.escalation;
    else notes.push('The story loses steam: put bigger moments later');
    const tones = new Set(scenes.map((s) => s.tone)).size;
    structure += tones >= 3 ? T.toneVariety : tones === 2 ? T.toneVariety / 2 : 0;
    if (tones < 2 && scenes.length > 1) notes.push('Every scene has the same tone');
  }

  // Characters: everyone used, main present, each type does its job.
  let characters = main ? 100 : 0;
  if (!main) notes.push('No main character');
  const st = screenTime(film);
  for (const r of film.roles) {
    if (!st[r.id]) {
      characters -= T.unusedRolePenalty;
      notes.push(`${r.name} never appears`);
    }
  }
  if (main && scenes.length) {
    const present = scenes.filter((s) => participants(s).includes(main.id)).length / scenes.length;
    if (present < T.mainPresenceShare) {
      characters -= 25;
      notes.push(`${main.name} should be in more scenes`);
    }
  }
  const acts = (type: RoleType, pred: (b: Beat, a: ActionDef) => boolean) =>
    film.roles.filter((r) => r.type === type).every((r) => scenes.some((s) => s.beats.some((b) => b.roleId === r.id && pred(b, actionById(b.actionId)))));
  const purpose: [RoleType, (b: Beat, a: ActionDef) => boolean, string][] = [
    ['villain', (b, a) => b.targetId === main?.id && a.impact >= 2, 'The villain should act against the main'],
    ['romanticInterest', (_, a) => a.skill === 'romance' || a.id === 'breaksUp', 'The romantic interest needs a romantic moment'],
    ['comicRelief', (_, a) => a.skill === 'comedy', 'The comic relief should be funny'],
  ];
  for (const [type, pred, note] of purpose) {
    if (roleCount(film, type) && !acts(type, pred)) {
      characters -= T.purposePenalty;
      notes.push(note);
    }
  }
  characters = clamp(characters);

  // Coherence: actions that sit naturally in the scene's tone.
  const allBeats = scenes.flatMap((s) => s.beats.map((b) => ({ s, a: actionById(b.actionId) })));
  const coherence = allBeats.length ? (allBeats.filter(({ s, a }) => a.tones.includes(s.tone)).length / allBeats.length) * 100 : 0;
  if (allBeats.length && coherence < 60) notes.push('Some actions clash with their scene tone');

  // Pacing: scene count (4–5 ideal) and coverage of the runtime vs filler.
  const share = 1 - fillerShare(film);
  const coverage = share <= T.coverageKnee
    ? (share / T.coverageKnee) * T.coverageKneeScore
    : T.coverageKneeScore + ((share - T.coverageKnee) / (1 - T.coverageKnee)) * (100 - T.coverageKneeScore);
  const countScore = T.sceneCountScore[Math.min(scenes.length, T.sceneCountScore.length - 1)];
  const pacing = (coverage + countScore) / 2;
  if (share < 0.6 && scenes.length) notes.push(`${Math.round((1 - share) * 100)}% filler: the film will feel boring`);

  const W = T.qualityWeights;
  const directorBonus = director
    ? affinityBonus(director, film.contract.genre) + TUNING.directors.writerQualityBonus * specialtyScale(director, 'script', level)
    : 0;
  const base = fit * W.fit + depth * W.depth + structure * W.structure + characters * W.characters + coherence * W.coherence + pacing * W.pacing;
  // An unfinished script (fewer than the minimum scenes) is scaled down.
  const completeness = Math.min(1, scenes.length / T.minScenes);
  const total = scenes.length ? clamp(Math.round((base + directorBonus) * completeness)) : 0;
  const r = Math.round;
  return {
    fit: r(fit), depth: r(depth), structure: r(structure), characters: r(characters), coherence: r(coherence), pacing: r(pacing),
    directorBonus: r(directorBonus), profile, total, notes,
  };
}

// ---------------- Requirements ----------------

export type ReqStatus = 'met' | 'missing' | 'pending';

export interface ReqCheck {
  req: HardRequirement;
  status: ReqStatus;
  detail?: string;
}

export function checkRequirements(film: Film): ReqCheck[] {
  return film.contract.hardReqs.map((req): ReqCheck => {
    switch (req.kind) {
      case 'runtime': {
        const off = Math.abs(film.runtime - req.target);
        return { req, status: off <= req.tolerance ? 'met' : 'missing', detail: `${film.runtime} min` };
      }
      case 'tone': {
        const n = film.scenes.filter((s) => s.tone === req.tone).length;
        return { req, status: n >= req.count ? 'met' : 'missing', detail: `${n}/${req.count}` };
      }
      case 'action': {
        const has = film.scenes.some((s) => s.beats.some((b) => b.actionId === req.actionId));
        return { req, status: has ? 'met' : 'missing' };
      }
      case 'role':
        return { req, status: film.roles.some((r) => r.type === req.roleType) ? 'met' : 'missing' };
      case 'maxRating': {
        const over = film.scenes.some((s) => s.beats.some((b) => ratingIndex(actionById(b.actionId).minRating) > ratingIndex(req.rating)));
        return { req, status: over ? 'missing' : 'met' };
      }
      case 'leadStarPower': {
        const lead = film.roles.find((r) => r.type === 'main')?.actor;
        if (!lead) return { req, status: 'pending', detail: 'Checked at casting' };
        return { req, status: lead.starPower >= req.min ? 'met' : 'missing', detail: `${lead.starPower}` };
      }
    }
  });
}

// ---------------- Finish ----------------

/** Problems that stop the script going to casting. Missed hard reqs are allowed (they cap the grade). */
export function scriptBlockers(film: Film): string[] {
  const out: string[] = [];
  if (!film.roles.some((r) => r.type === 'main')) out.push('Add a main character');
  if (film.scenes.length < S().minScenes) out.push(`Write at least ${S().minScenes} scenes`);
  film.scenes.forEach((s, i) => {
    if (!s.beats.length) out.push(`Scene ${i + 1} has no actions`);
    for (const b of s.beats) {
      const e = validateBeat(film, b);
      if (e.length) out.push(`Scene ${i + 1}: ${e[0]}`);
    }
  });
  if (realMinutes(film) > film.runtime) out.push('Scenes are longer than the runtime');
  return out;
}

export function finishScript(film: Film, director?: DirectorDef, level = 1): EditResult {
  if (film.phase !== 'script') return fail('Script is already locked');
  const blockers = scriptBlockers(film);
  if (blockers.length) return fail(blockers[0]);
  return {
    ok: true,
    film: {
      ...film,
      phase: 'casting',
      scriptQuality: scriptQuality(film, director, level).total,
      ledger: [...film.ledger, { label: 'Script', amount: scriptCost(film, director, level), phase: 'script' }],
    },
  };
}

export const spent = (film: Film) => film.ledger.reduce((a, e) => a + e.amount, 0);
export const TONE_IDS: Tone[] = TONES.map((t) => t.id);
