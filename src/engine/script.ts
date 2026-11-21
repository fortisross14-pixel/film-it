// Script phase: runtime, roles, scenes over filler, topic, quality, cost and
// the live hard-requirement checklist. All functions are pure and return a new Film.
//
// Timeline decision (open question in the doc): scenes snap to 1-minute slots
// and may not overlap. Anything not covered by a scene is filler.

import type { Billing, DirectorDef, Film, HardRequirement, Intensity, Role, RoleType, Scene, SceneType } from './types';
import { TUNING } from './tuning';
import { SCENE_TYPES, sceneTypeById } from './data/sceneTypes';
import { topicById } from './data/topics';
import { ratingIndex } from './data/genres';
import { affinityBonus, specialtyScale } from './director';
import { ROLE_TYPE_NAMES } from './format';

export type EditResult = { ok: true; film: Film } | { ok: false; reason: string };
const fail = (reason: string): EditResult => ({ ok: false, reason });
const S = () => TUNING.script;

export const ROLE_TYPES: RoleType[] = ['main', 'coMain', 'villain', 'romanticInterest', 'sidekick', 'supporting'];

export const BILLING_FOR: Record<RoleType, Billing> = {
  main: 'lead',
  coMain: 'second',
  villain: 'second',
  romanticInterest: 'second',
  sidekick: 'support',
  supporting: 'minor',
};

const DEFAULT_ROLE_NAMES: Record<RoleType, string[]> = {
  main: ['The Hero'],
  coMain: ['The Partner'],
  villain: ['The Villain'],
  romanticInterest: ['The Love Interest'],
  sidekick: ['The Sidekick', 'The Mentor'],
  supporting: ['The Neighbour', 'The Boss', 'The Rival', 'The Stranger'],
};

function nextId(prefix: string, ids: string[]): string {
  let n = 1;
  while (ids.includes(`${prefix}${n}`)) n++;
  return `${prefix}${n}`;
}

const sceneEnd = (s: Pick<Scene, 'startMin' | 'minutes'>) => s.startMin + s.minutes;

// ---------------- Runtime ----------------

export function setRuntime(film: Film, minutes: number): EditResult {
  const m = Math.round(minutes);
  if (m < S().minRuntime || m > S().maxRuntime) return fail(`Runtime must be ${S().minRuntime}–${S().maxRuntime} min`);
  const last = Math.max(0, ...film.scenes.map(sceneEnd));
  if (m < last) return fail(`A scene ends at minute ${last}; move it before shortening`);
  return { ok: true, film: { ...film, runtime: m } };
}

/** Act (1–3) for a minute on the timeline. */
export function actAt(minute: number, runtime: number): 1 | 2 | 3 {
  const [a, b] = S().actSplits;
  if (minute < runtime * a) return 1;
  if (minute < runtime * b) return 2;
  return 3;
}

/** A scene's act is taken from its midpoint. */
export const sceneAct = (s: Scene, runtime: number) => actAt(s.startMin + s.minutes / 2, runtime);

// ---------------- Roles ----------------

export function roleCount(film: Film, type: RoleType) {
  return film.roles.filter((r) => r.type === type).length;
}

export function canAddRole(film: Film, type: RoleType): boolean {
  return roleCount(film, type) < S().roleLimits[type][1];
}

export function addRole(film: Film, type: RoleType, name?: string): EditResult {
  if (!canAddRole(film, type)) return fail(`No more ${ROLE_TYPE_NAMES[type]} roles allowed`);
  const used = new Set(film.roles.map((r) => r.name));
  const fallback = DEFAULT_ROLE_NAMES[type].find((n) => !used.has(n)) ?? `${ROLE_TYPE_NAMES[type]} ${roleCount(film, type) + 1}`;
  const role: Role = {
    id: nextId('role', film.roles.map((r) => r.id)),
    name: name?.trim() || fallback,
    type,
    billing: BILLING_FOR[type],
  };
  return { ok: true, film: { ...film, roles: [...film.roles, role] } };
}

export function renameRole(film: Film, roleId: string, name: string): EditResult {
  if (!name.trim()) return fail('Name cannot be empty');
  if (!film.roles.some((r) => r.id === roleId)) return fail('Unknown role');
  return { ok: true, film: { ...film, roles: film.roles.map((r) => (r.id === roleId ? { ...r, name: name.trim() } : r)) } };
}

/**
 * Remove a role. It is taken out of every scene; scenes that then break their
 * participant rules are removed too (they return to filler).
 */
export function removeRole(film: Film, roleId: string): EditResult & { removedScenes?: string[] } {
  if (!film.roles.some((r) => r.id === roleId)) return fail('Unknown role');
  const roles = film.roles.filter((r) => r.id !== roleId);
  const removedScenes: string[] = [];
  const scenes: Scene[] = [];
  for (const s of film.scenes) {
    if (!s.roleIds.includes(roleId)) {
      scenes.push(s);
      continue;
    }
    const next = { ...s, roleIds: s.roleIds.filter((id) => id !== roleId) };
    if (participantErrors(next, sceneTypeById(s.typeId), roles).length) removedScenes.push(s.id);
    else scenes.push(next);
  }
  return { ok: true, film: { ...film, roles, scenes }, removedScenes };
}

// ---------------- Topic ----------------

/** Set the topic. Scenes of topic-specific types that the new topic lacks are removed. */
export function setTopic(film: Film, topicId: string | undefined, unlockedTopics: string[]): EditResult & { removedScenes?: string[] } {
  if (topicId && !unlockedTopics.includes(topicId)) return fail('Topic is locked');
  const allowed = new Set(topicId ? topicById(topicId).sceneTypes : []);
  const removedScenes = film.scenes.filter((s) => {
    const t = sceneTypeById(s.typeId);
    return t.topicId && !allowed.has(t.id);
  }).map((s) => s.id);
  return {
    ok: true,
    film: { ...film, topicId, scenes: film.scenes.filter((s) => !removedScenes.includes(s.id)) },
    removedScenes,
  };
}

// ---------------- Scenes ----------------

/** Scene types the film can use: base types allowed by the rating, plus the topic's own. */
export function availableSceneTypes(film: Film): SceneType[] {
  const topicTypes = new Set(film.topicId ? topicById(film.topicId).sceneTypes : []);
  const maxRating = ratingIndex(film.contract.rating);
  return SCENE_TYPES.filter((t) => (!t.topicId || topicTypes.has(t.id)) && ratingIndex(t.minRating) <= maxRating);
}

export interface SceneDraft {
  typeId: string;
  roleIds: string[];
  minutes: number;
  startMin: number;
  intensity: Intensity;
}

function participantErrors(s: Pick<Scene, 'roleIds'>, type: SceneType, roles: Role[]): string[] {
  const errs: string[] = [];
  const present = s.roleIds.map((id) => roles.find((r) => r.id === id));
  if (present.some((r) => !r)) errs.push('Unknown role in scene');
  const n = s.roleIds.length;
  if (n < type.minParticipants || n > type.maxParticipants) {
    errs.push(
      type.minParticipants === type.maxParticipants
        ? `${type.name} needs exactly ${type.minParticipants} role${type.minParticipants > 1 ? 's' : ''}`
        : `${type.name} needs ${type.minParticipants}–${type.maxParticipants} roles`,
    );
  }
  for (const req of type.requiredRoles) {
    if (!present.some((r) => r?.type === req)) errs.push(`${type.name} needs the ${ROLE_TYPE_NAMES[req]}`);
  }
  if (new Set(s.roleIds).size !== s.roleIds.length) errs.push('A role is listed twice');
  return errs;
}

/** All problems with a scene draft. Empty = valid. */
export function validateScene(film: Film, draft: SceneDraft, ignoreSceneId?: string): string[] {
  const errs: string[] = [];
  const type = SCENE_TYPES.find((t) => t.id === draft.typeId);
  if (!type) return ['Unknown scene type'];
  if (!availableSceneTypes(film).some((t) => t.id === type.id)) {
    errs.push(type.topicId ? `${type.name} needs the ${topicById(type.topicId).name} topic` : `${type.name} is not allowed at ${film.contract.rating}`);
  }
  if (!Number.isInteger(draft.minutes) || draft.minutes < S().sceneMinMinutes || draft.minutes > S().sceneMaxMinutes) {
    errs.push(`Length must be ${S().sceneMinMinutes}–${S().sceneMaxMinutes} min`);
  }
  if (!Number.isInteger(draft.startMin) || draft.startMin < 0 || sceneEnd(draft) > film.runtime) {
    errs.push('Scene must fit inside the runtime');
  }
  const clash = film.scenes.find(
    (s) => s.id !== ignoreSceneId && draft.startMin < sceneEnd(s) && s.startMin < sceneEnd(draft),
  );
  if (clash) errs.push(`Overlaps the ${sceneTypeById(clash.typeId).name} at minute ${clash.startMin}`);
  errs.push(...participantErrors(draft, type, film.roles));
  return errs;
}

export function addScene(film: Film, draft: SceneDraft): EditResult & { sceneId?: string } {
  const errs = validateScene(film, draft);
  if (errs.length) return fail(errs[0]);
  const scene: Scene = {
    id: nextId('scene', film.scenes.map((s) => s.id)),
    ...draft,
    roleIds: [...draft.roleIds],
    takes: [],
    vfx: 'none',
    sfx: 'none',
  };
  const scenes = [...film.scenes, scene].sort((a, b) => a.startMin - b.startMin);
  return { ok: true, film: { ...film, scenes }, sceneId: scene.id };
}

export function updateScene(film: Film, sceneId: string, draft: SceneDraft): EditResult {
  const existing = film.scenes.find((s) => s.id === sceneId);
  if (!existing) return fail('Unknown scene');
  const errs = validateScene(film, draft, sceneId);
  if (errs.length) return fail(errs[0]);
  const scenes = film.scenes
    .map((s) => (s.id === sceneId ? { ...s, ...draft, roleIds: [...draft.roleIds] } : s))
    .sort((a, b) => a.startMin - b.startMin);
  return { ok: true, film: { ...film, scenes } };
}

export function removeScene(film: Film, sceneId: string): EditResult {
  if (!film.scenes.some((s) => s.id === sceneId)) return fail('Unknown scene');
  return { ok: true, film: { ...film, scenes: film.scenes.filter((s) => s.id !== sceneId) } };
}

/** Earliest free start minute that fits `minutes`, at or after `from`. */
export function findFreeSlot(film: Film, minutes: number, from = 0): number | undefined {
  for (let start = Math.max(0, from); start + minutes <= film.runtime; start++) {
    const end = start + minutes;
    if (!film.scenes.some((s) => start < sceneEnd(s) && s.startMin < end)) return start;
  }
  return undefined;
}

/** Filler segments as [start, end) pairs. */
export function fillerSegments(film: Film): [number, number][] {
  const out: [number, number][] = [];
  let cursor = 0;
  for (const s of [...film.scenes].sort((a, b) => a.startMin - b.startMin)) {
    if (s.startMin > cursor) out.push([cursor, s.startMin]);
    cursor = Math.max(cursor, sceneEnd(s));
  }
  if (cursor < film.runtime) out.push([cursor, film.runtime]);
  return out;
}

// ---------------- Derived values ----------------

/** Screen time per role id: the sum of minutes of every scene it appears in. */
export function screenTime(film: Film): Record<string, number> {
  const out: Record<string, number> = Object.fromEntries(film.roles.map((r) => [r.id, 0]));
  for (const s of film.scenes) for (const id of s.roleIds) out[id] = (out[id] ?? 0) + s.minutes;
  return out;
}

export const realMinutes = (film: Film) => film.scenes.reduce((a, s) => a + s.minutes, 0);
export const fillerMinutes = (film: Film) => film.runtime - realMinutes(film);
export const fillerShare = (film: Film) => (film.runtime ? fillerMinutes(film) / film.runtime : 1);

export function sceneCost(scene: Pick<Scene, 'typeId' | 'minutes'>, director?: DirectorDef, level = 1): number {
  const t = sceneTypeById(scene.typeId);
  const raw = t.baseCost + scene.minutes * t.costPerMin;
  const discount = director ? TUNING.directors.writerCostDiscount * specialtyScale(director, 'script', level) : 0;
  return Math.round(raw * (1 - Math.min(0.5, discount)));
}

/** Script cost: sum of scene base costs + minutes × cost per minute. Filler is free to write. */
export function scriptCost(film: Film, director?: DirectorDef, level = 1): number {
  return film.scenes.reduce((a, s) => a + sceneCost(s, director, level), 0);
}

/** Genre fit of a scene type for the film (blending the secondary genre). */
export function sceneGenreFit(film: Film, type: SceneType): number {
  const { genre, secondaryGenre } = film.contract;
  if (!secondaryGenre) return type.genreFit[genre];
  const w = S().secondaryGenreWeight;
  return type.genreFit[genre] * (1 - w) + type.genreFit[secondaryGenre] * w;
}

export function topicMultiplier(film: Film): number {
  if (!film.topicId) return S().noTopicMult;
  const fit = topicById(film.topicId).genreFit[film.contract.genre] / 100;
  return S().topicMultMin + (S().topicMultMax - S().topicMultMin) * fit;
}

// ---------------- Quality ----------------

export interface QualityBreakdown {
  coverage: number;
  structure: number;
  variety: number;
  fit: number;
  roles: number;
  directorBonus: number;
  total: number;
  notes: string[];
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export function scriptQuality(film: Film, director?: DirectorDef, level = 1): QualityBreakdown {
  const T = S();
  const notes: string[] = [];
  const real = realMinutes(film);
  const share = film.runtime ? real / film.runtime : 0;

  // Coverage with diminishing returns above the knee.
  const coverage =
    share <= T.coverageKnee
      ? (share / T.coverageKnee) * T.coverageKneeScore
      : T.coverageKneeScore + ((share - T.coverageKnee) / (1 - T.coverageKnee)) * (100 - T.coverageKneeScore);
  if (share < 0.5) notes.push(`${Math.round((1 - share) * 100)}% filler: the film will feel boring`);

  // Structure.
  let structure = 0;
  for (const act of [1, 2, 3] as const) {
    const strong = film.scenes.some(
      (s) => sceneAct(s, film.runtime) === act && s.intensity !== 'low' && sceneGenreFit(film, sceneTypeById(s.typeId)) >= T.strongSceneFit,
    );
    if (strong) structure += T.actStrongPoints;
    else notes.push(`Act ${act} has no strong scene`);
  }
  const climax = film.scenes.some((s) => sceneAct(s, film.runtime) === 3 && sceneTypeById(s.typeId).climax);
  if (climax) structure += T.climaxPoints;
  else notes.push('Act 3 has no climax');
  // Every full gapMaxMinutes of uninterrupted filler costs gapPenaltyEach.
  const gaps = fillerSegments(film).filter(([a, b]) => b - a > T.gapMaxMinutes);
  const longGaps = gaps.length;
  const gapUnits = gaps.reduce((a, [s, e]) => a + Math.floor((e - s) / T.gapMaxMinutes), 0);
  structure += Math.max(0, T.gapPoints - gapUnits * T.gapPenaltyEach);
  if (longGaps) notes.push(`${longGaps} long filler gap${longGaps > 1 ? 's' : ''} (>${T.gapMaxMinutes} min)`);

  // Variety.
  const counts: Record<string, number> = {};
  for (const s of film.scenes) counts[s.typeId] = (counts[s.typeId] ?? 0) + 1;
  const distinct = Object.keys(counts).length;
  const repeats = Object.values(counts).reduce((a, c) => a + Math.max(0, c - T.repeatFreeCount), 0);
  const variety = film.scenes.length
    ? clamp((Math.min(distinct, T.varietyTarget) / T.varietyTarget) * 100 - repeats * T.repeatPenaltyEach)
    : 0;
  if (repeats) notes.push('Some scene types repeat too often');

  // Fit: minutes-weighted genre fit × topic multiplier.
  const fitRaw = real ? film.scenes.reduce((a, s) => a + sceneGenreFit(film, sceneTypeById(s.typeId)) * s.minutes, 0) / real : 0;
  const fit = clamp(fitRaw * topicMultiplier(film));
  if (!film.topicId) notes.push('No topic chosen');

  // Role balance.
  const st = screenTime(film);
  let roles = 100;
  if (!film.roles.some((r) => r.type === 'main')) {
    roles = 0;
    notes.push('No main lead');
  } else {
    for (const r of film.roles) {
      const t = st[r.id] ?? 0;
      if (t === 0) {
        roles -= T.unusedRolePenalty;
        notes.push(`${r.name} never appears`);
        continue;
      }
      const need = r.billing === 'lead' ? T.leadScreenShare : r.billing === 'second' ? T.secondScreenShare : 0;
      const target = need * film.runtime;
      if (target && t < target) {
        roles -= (1 - t / target) * (r.billing === 'lead' ? 40 : 15);
        notes.push(`${r.name} needs more screen time (${t}/${Math.round(target)} min)`);
      }
    }
    roles = clamp(roles);
  }

  const W = T.qualityWeights;
  let directorBonus = 0;
  if (director) {
    directorBonus = affinityBonus(director, film.contract.genre) + TUNING.directors.writerQualityBonus * specialtyScale(director, 'script', level);
  }
  const base = coverage * W.coverage + structure * W.structure + variety * W.variety + fit * W.fit + roles * W.roles;
  const total = film.scenes.length ? clamp(Math.round(base + directorBonus)) : 0;
  const r1 = (n: number) => Math.round(n);
  return { coverage: r1(coverage), structure: r1(structure), variety: r1(variety), fit: r1(fit), roles: r1(roles), directorBonus: r1(directorBonus), total, notes };
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
      case 'sceneType': {
        const n = film.scenes.filter((s) => s.typeId === req.sceneTypeId).length;
        return { req, status: n >= req.count ? 'met' : 'missing', detail: `${n}/${req.count}` };
      }
      case 'role':
        return { req, status: film.roles.some((r) => r.type === req.roleType) ? 'met' : 'missing' };
      case 'maxRating': {
        // Scene types above the rating are blocked in the editor, so this holds unless content changes later.
        const over = film.scenes.some((s) => ratingIndex(sceneTypeById(s.typeId).minRating) > ratingIndex(req.rating));
        return { req, status: over ? 'missing' : 'met' };
      }
      case 'leadStarPower':
        return { req, status: 'pending', detail: 'Checked at casting' };
    }
  });
}

// ---------------- Finish ----------------

/** Blocking problems that stop the script going to casting. Missed hard reqs are allowed (they cap the grade). */
export function scriptBlockers(film: Film): string[] {
  const out: string[] = [];
  if (!film.roles.some((r) => r.type === 'main')) out.push('Add a main lead');
  if (film.scenes.length === 0) out.push('Place at least one scene');
  for (const s of film.scenes) {
    const errs = validateScene(film, s, s.id);
    if (errs.length) out.push(`${sceneTypeById(s.typeId).name} at ${s.startMin}': ${errs[0]}`);
  }
  return out;
}

/** Lock the script, charge its cost to the ledger and move to casting. */
export function finishScript(film: Film, director?: DirectorDef, level = 1): EditResult {
  if (film.phase !== 'script') return fail('Script is already locked');
  const blockers = scriptBlockers(film);
  if (blockers.length) return fail(blockers[0]);
  const cost = scriptCost(film, director, level);
  return {
    ok: true,
    film: {
      ...film,
      phase: 'casting',
      scriptQuality: scriptQuality(film, director, level).total,
      ledger: [...film.ledger, { label: 'Script', amount: cost, phase: 'script' }],
    },
  };
}

export const spent = (film: Film) => film.ledger.reduce((a, e) => a + e.amount, 0);
