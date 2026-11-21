// Post-production: choose the take per scene, optionally cut weak scenes back to
// filler, one film-wide music package, and per-scene VFX/SFX polish slots with genre
// weights, diminishing returns and overproduction. Edits are free until you finish
// post; then money and post weeks are charged against the same deadline.

import type { Film, MusicTier, PolishTier, Scene } from './types';
import { TUNING } from './tuning';
import { actionById } from './data/actions';
import { directorById } from './data/directors';
import { specialtyScale } from './director';
import { budgetScale, realMinutes, sceneMinutes } from './script';
import { chosenTake, crewWeekCost } from './shooting';

export type PostResult = { ok: true; film: Film } | { ok: false; reason: string };
const fail = (reason: string): PostResult => ({ ok: false, reason });
const P = () => TUNING.post;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
export type PolishKind = 'vfx' | 'sfx';
export const POLISH_TIERS: PolishTier[] = ['none', 'basic', 'pro', 'premium'];
export const MUSIC_TIERS: MusicTier[] = ['none', 'library', 'composer', 'star'];

const replace = (film: Film, scene: Scene): Film => ({ ...film, scenes: film.scenes.map((s) => (s.id === scene.id ? scene : s)) });
const editor = (film: Film, level: number) => specialtyScale(directorById(film.directorId), 'post', level);
const costMult = (film: Film, level: number) => budgetScale(film.contract.budget) * (1 - P().editorDiscount * editor(film, level));
const boost = (film: Film, level: number) => 1 + P().editorBoost * editor(film, level);

// ---------------- Edits ----------------

export function chooseTake(film: Film, sceneId: string, takeId: string): PostResult {
  const s = film.scenes.find((x) => x.id === sceneId);
  if (!s?.takes.some((t) => t.id === takeId)) return fail('Unknown take');
  return { ok: true, film: replace(film, { ...s, chosenTakeId: takeId }) };
}

/** Cut a scene (its minutes return to filler) or restore it. */
export function setCut(film: Film, sceneId: string, cut: boolean): PostResult {
  const s = film.scenes.find((x) => x.id === sceneId);
  if (!s) return fail('Unknown scene');
  const kept = film.scenes.filter((x) => !x.cut && x.id !== sceneId).length + (cut ? 0 : 1);
  if (cut && kept < P().minScenesAfterCut) return fail(`Keep at least ${P().minScenesAfterCut} scenes`);
  return { ok: true, film: replace(film, { ...s, cut }) };
}

export function setMusic(film: Film, music: MusicTier): PostResult {
  return { ok: true, film: { ...film, music } };
}

export function setPolish(film: Film, sceneId: string, kind: PolishKind, tier: PolishTier): PostResult {
  const s = film.scenes.find((x) => x.id === sceneId);
  if (!s) return fail('Unknown scene');
  return { ok: true, film: replace(film, { ...s, [kind]: tier }) };
}

// ---------------- Scoring ----------------

export const isEmotional = (s: Scene) =>
  s.tone === 'romantic' || s.tone === 'sad' || s.beats.some((b) => {
    const a = actionById(b.actionId);
    return a.climax && (a.skill === 'romance' || a.skill === 'drama');
  });

const hasStunts = (s: Scene) => s.beats.some((b) => actionById(b.actionId).stunt);

/** Raw polish points for one slot, before diminishing returns. */
function slotPoints(film: Film, s: Scene, kind: PolishKind, level: number): number {
  const [, , points] = P().tiers[kind][s[kind]];
  const weight = (kind === 'vfx' ? P().vfxWeight : P().sfxWeight)[film.contract.genre];
  return points * weight * (hasStunts(s) ? P().stuntSceneMult : 1) * boost(film, level);
}

/** Polish points per scene id after diminishing returns across the film. */
function polishByScene(film: Film, kind: PolishKind, level: number): Record<string, number> {
  const live = film.scenes.filter((s) => !s.cut);
  const ranked = live.map((s) => ({ id: s.id, pts: slotPoints(film, s, kind, level) })).sort((a, b) => b.pts - a.pts);
  return Object.fromEntries(ranked.map((r, i) => [r.id, r.pts * Math.pow(P().decay, i)]));
}

export interface SceneScore {
  sceneId: string;
  take: number;
  music: number;
  vfx: number;
  sfx: number;
  total: number;
}

export function sceneScores(film: Film, level = 1): SceneScore[] {
  const vfx = polishByScene(film, 'vfx', level);
  const sfx = polishByScene(film, 'sfx', level);
  const m = P().music[film.music];
  return film.scenes.filter((s) => !s.cut).map((s) => {
    const take = chosenTake(s)?.score ?? 0;
    const music = (m.flat + (isEmotional(s) ? m.emotional : 0)) * boost(film, level);
    const v = vfx[s.id] ?? 0, f = sfx[s.id] ?? 0;
    const r = (n: number) => Math.round(n * 10) / 10;
    return { sceneId: s.id, take, music: r(music), vfx: r(v), sfx: r(f), total: Math.round(clamp(take + music + v + f)) };
  });
}

/** Critics penalty for heavy VFX in genres that don't want it (a Drama full of CGI). */
export function overproduction(film: Film): number {
  const w = P().vfxWeight[film.contract.genre];
  const excess = Math.max(0, P().overproductionBelowWeight - w) / P().overproductionBelowWeight;
  if (!excess) return 0;
  const pts = film.scenes.filter((s) => !s.cut).reduce((a, s) => a + P().tiers.vfx[s.vfx][2], 0);
  return Math.round(Math.min(P().overproductionCap, pts * excess * P().overproductionPerPoint));
}

// ---------------- Cost & time ----------------

export interface PostSummary {
  musicCost: number;
  polishCost: number;
  cost: number;
  days: number;
  weeks: number;
  crewCost: number;
  scores: SceneScore[];
  /** Minutes-weighted average over scenes and filler: the final cut's quality. */
  cutQuality: number;
  best: number;
  worst: number;
  overproduction: number;
  fillerMinutes: number;
}

export function postSummary(film: Film, level = 1): PostSummary {
  const mult = costMult(film, level);
  const live = film.scenes.filter((s) => !s.cut);
  const m = P().music[film.music];
  const musicCost = Math.round(m.cost * mult);
  let polishCost = 0, days = P().baseEditDays + m.days;
  for (const s of live) {
    for (const kind of ['vfx', 'sfx'] as const) {
      const [cost, d] = P().tiers[kind][s[kind]];
      polishCost += cost * mult;
      days += d;
    }
  }
  polishCost = Math.round(polishCost);
  days = Math.round(days * (1 - TUNING.directors.schedulePostDaysCut * specialtyScale(directorById(film.directorId), 'schedule', level)));
  const weeks = Math.ceil(days / P().daysPerWeek);
  const crewCost = Math.round(crewWeekCost(film) * P().crewShare) * weeks;
  const scores = sceneScores(film, level);
  const liveFilm = { ...film, scenes: live };
  const sceneMins = live.map((s) => sceneMinutes(s.duration, film.runtime));
  const filler = Math.max(0, film.runtime - realMinutes(liveFilm));
  const weighted = scores.reduce((a, sc, i) => a + sc.total * sceneMins[i], 0) + TUNING.shooting.fillerScore * filler;
  return {
    musicCost, polishCost, cost: musicCost + polishCost + crewCost, days, weeks, crewCost, scores,
    cutQuality: Math.round(weighted / film.runtime),
    best: Math.max(0, ...scores.map((s) => s.total)),
    worst: scores.length ? Math.min(...scores.map((s) => s.total)) : 0,
    overproduction: overproduction(film),
    fillerMinutes: filler,
  };
}

// ---------------- Auto-polish ----------------

/**
 * Spread a budget across the best-value polish slots (and music), greedily by score
 * gained per $K, respecting diminishing returns and overproduction.
 */
export function autoPolish(film: Film, budget: number, level = 1): Film {
  let f: Film = { ...film, music: 'none', scenes: film.scenes.map((s) => ({ ...s, vfx: 'none', sfx: 'none' })) };
  const value = (x: Film) => {
    const s = postSummary(x, level);
    return s.scores.reduce((a, sc) => a + sc.total, 0) - s.overproduction * 2;
  };
  for (let guard = 0; guard < 60; guard++) {
    const base = postSummary(f, level);
    const spentNow = base.musicCost + base.polishCost;
    const v0 = value(f);
    let best: { film: Film; ratio: number } | undefined;
    const tryMove = (next: Film) => {
      const s = postSummary(next, level);
      const extra = s.musicCost + s.polishCost - spentNow;
      if (extra <= 0 || spentNow + extra > budget) return;
      const gain = value(next) - v0;
      if (gain > 0 && (!best || gain / extra > best.ratio)) best = { film: next, ratio: gain / extra };
    };
    const mi = MUSIC_TIERS.indexOf(f.music);
    if (mi < MUSIC_TIERS.length - 1) tryMove({ ...f, music: MUSIC_TIERS[mi + 1] });
    for (const s of f.scenes.filter((x) => !x.cut)) {
      for (const kind of ['vfx', 'sfx'] as const) {
        const i = POLISH_TIERS.indexOf(s[kind]);
        if (i < POLISH_TIERS.length - 1) tryMove(replace(f, { ...s, [kind]: POLISH_TIERS[i + 1] }));
      }
    }
    if (!best) break;
    f = (best as { film: Film }).film;
  }
  return f;
}

// ---------------- Finish ----------------

/** Lock the final cut: charge music, polish and post crew, add post weeks, go to the premiere. */
export function finishPost(film: Film, level = 1): PostResult {
  if (film.phase !== 'post') return fail('Not in post');
  if (film.scenes.some((s) => !s.cut && !chosenTake(s))) return fail('Every scene needs a take');
  const s = postSummary(film, level);
  const ledger = [
    ...film.ledger,
    ...(s.musicCost ? [{ label: `Music: ${film.music}`, amount: s.musicCost, phase: 'post' as const }] : []),
    ...(s.polishCost ? [{ label: 'VFX & SFX', amount: s.polishCost, phase: 'post' as const }] : []),
    { label: `Post crew: ${s.weeks} week${s.weeks > 1 ? 's' : ''}`, amount: s.crewCost, phase: 'post' as const },
  ];
  return {
    ok: true,
    film: { ...film, phase: 'premiere', ledger, calendar: { ...film.calendar, postWeeks: film.calendar.postWeeks + s.weeks } },
  };
}
