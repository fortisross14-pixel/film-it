// Poster studio and marketing budget (Edit / post-production).
//
// Poster: a generated background (style + seed) you can regenerate for a rising fee,
// plus the choices you make — title font and size, director credit, each star's
// billing size, which faces appear, a frame. The poster scores 0–100 against simple
// marketing sense (style and font suit the genre; stars billed big, unknowns small;
// faces only for real stars, not too many). A good poster adds buzz and opening weekend.
//
// Marketing: the studio funds a marketing budget. During post you can ask for more
// (bigger box office, a little awards push, but a higher box office target) or less
// (smaller box office, a lower target). Each request takes a week.

import { gear } from './data/upgrades';
import type { Film, FilmRecord, GenreId, MarketingLevel, PosterDesign, PosterFont, PosterSize, PosterStyle, Role } from './types';
import { TUNING } from './tuning';
import { createRng } from './rng';
import { crewWeekCost } from './shooting';

export type MarketingResult = { ok: true; film: Film } | { ok: false; reason: string };
const fail = (reason: string): MarketingResult => ({ ok: false, reason });
const P = () => TUNING.poster;
const M = () => TUNING.marketing;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

const g = (fit: Partial<Record<GenreId, number>>, rest: number): Record<GenreId, number> => ({
  action: rest, drama: rest, romance: rest, comedy: rest, thriller: rest, horror: rest, scifi: rest, fantasy: rest, ...fit,
});

export const POSTER_STYLES: { id: PosterStyle; name: string; fit: Record<GenreId, number> }[] = [
  { id: 'moon', name: 'Moonlit', fit: g({ scifi: 95, drama: 80, fantasy: 70, thriller: 50, romance: 45, horror: 40, action: 35, comedy: 20 }, 40) },
  { id: 'skyline', name: 'City at night', fit: g({ thriller: 95, action: 85, scifi: 60, drama: 55, romance: 40, horror: 45, comedy: 35, fantasy: 15 }, 40) },
  { id: 'sunset', name: 'Sunset', fit: g({ romance: 95, drama: 70, comedy: 65, fantasy: 40, action: 30, thriller: 25, scifi: 25, horror: 10 }, 30) },
  { id: 'haunted', name: 'Haunted', fit: g({ horror: 100, thriller: 70, fantasy: 45, drama: 30, comedy: 20 }, 10) },
  { id: 'confetti', name: 'Confetti', fit: g({ comedy: 100, romance: 60, action: 25 }, 15) },
  { id: 'castle', name: 'Castle', fit: g({ fantasy: 100, romance: 50, drama: 45, action: 45, horror: 40, comedy: 30, scifi: 25 }, 30) },
  { id: 'blast', name: 'Explosion', fit: g({ action: 100, scifi: 75, thriller: 70, fantasy: 55, horror: 35, comedy: 30, drama: 15, romance: 10 }, 30) },
  { id: 'portrait', name: 'Star portrait', fit: g({ drama: 85, romance: 80, thriller: 65, comedy: 55, action: 50, horror: 45, scifi: 45, fantasy: 45 }, 50) },
];

export const POSTER_FONTS: { id: PosterFont; name: string; fit: Record<GenreId, number> }[] = [
  { id: 'classic', name: 'Classic serif', fit: g({ drama: 90, romance: 70, thriller: 60, fantasy: 55 }, 45) },
  { id: 'bold', name: 'Bold block', fit: g({ action: 95, thriller: 80, scifi: 65, comedy: 55, horror: 50 }, 40) },
  { id: 'elegant', name: 'Elegant script', fit: g({ romance: 95, drama: 75, fantasy: 55, comedy: 50 }, 25) },
  { id: 'scratch', name: 'Scratchy', fit: g({ horror: 100, thriller: 60 }, 15) },
  { id: 'playful', name: 'Playful', fit: g({ comedy: 100, romance: 55 }, 20) },
  { id: 'future', name: 'Futuristic', fit: g({ scifi: 100, action: 65, thriller: 55 }, 20) },
  { id: 'epic', name: 'Epic engraved', fit: g({ fantasy: 95, action: 75, drama: 55, scifi: 55 }, 35) },
];

const FRAME_FIT: Record<PosterDesign['frame'], Partial<Record<GenreId, number>>> = {
  none: {},
  gold: { drama: 4, fantasy: 4, romance: 3 },
  film: { drama: 3, thriller: 2, comedy: 2 },
  neon: { scifi: 4, thriller: 3, comedy: 2, action: 2 },
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function rollStyle(film: Film, n: number): { style: PosterStyle; seed: number } {
  const rng = createRng(hash(`${film.id}:poster:${n}`));
  const weights = Object.fromEntries(POSTER_STYLES.map((s) => [s.id, Math.pow(s.fit[film.contract.genre] / 100, 2) + 0.05])) as Record<PosterStyle, number>;
  return { style: rng.weighted(weights), seed: rng.int(1, 1_000_000) };
}

/** The film's poster, or the first generated draft. */
export function posterOf(film: Film): PosterDesign {
  if (film.poster) return film.poster;
  const lead = film.roles.find((r) => r.type === 'main');
  return {
    ...rollStyle(film, 0),
    regenerations: 0,
    titleFont: 'classic',
    titleSize: 'l',
    directorSize: 'hidden',
    billing: Object.fromEntries(film.roles.map((r) => [r.id, r.id === lead?.id ? 'm' : 's'])),
    faces: [],
    frame: 'none',
  };
}

export const regenerateFee = (film: Film) =>
  Math.round(Math.max(P().regenFeeMin, film.contract.budget * P().regenFeeShare) * Math.pow(2, posterOf(film).regenerations));

/** Ask the designers for a new background. Costs more each time. */
export function regeneratePoster(film: Film): MarketingResult {
  if (film.phase !== 'post') return fail('Posters are made during editing');
  const cur = posterOf(film);
  const fee = regenerateFee(film);
  const n = cur.regenerations + 1;
  return {
    ok: true,
    film: {
      ...film,
      poster: { ...cur, ...rollStyle(film, n), regenerations: n },
      ledger: [...film.ledger, { label: `Poster redesign #${n}`, amount: fee, phase: 'post' }],
    },
  };
}

export function editPoster(film: Film, patch: Partial<Omit<PosterDesign, 'style' | 'seed' | 'regenerations'>>): MarketingResult {
  if (film.phase !== 'post') return fail('Posters are made during editing');
  const cur = posterOf(film);
  if (patch.faces && patch.faces.some((id) => !film.roles.some((r) => r.id === id && r.actor))) return fail('Unknown actor');
  return { ok: true, film: { ...film, poster: { ...cur, ...patch, billing: { ...cur.billing, ...(patch.billing ?? {}) } } } };
}

// ---------------- Scoring ----------------

export interface PosterScore {
  style: number;
  title: number;
  billing: number;
  faces: number;
  director: number;
  frameBonus: number;
  total: number;
  tips: string[];
}

const starClass = (sp: number) => (sp >= P().superstarAt ? 'superstar' : sp >= P().starAt ? 'star' : sp < P().nobodyBelow ? 'nobody' : 'known');
const billingWeight = (r: Role) => TUNING.casting.billingScoreWeight[r.billing];

export function knownDirector(film: Film, history: FilmRecord[] = []) {
  return history.filter((h) => h.film.directorId === film.directorId).length >= P().knownDirectorFilms;
}

export function posterScore(film: Film, history: FilmRecord[] = [], design = posterOf(film)): PosterScore {
  const genre = film.contract.genre;
  const tips: string[] = [];
  const cast = film.roles.filter((r) => r.actor);

  const styleDef = POSTER_STYLES.find((s) => s.id === design.style)!;
  let style = styleDef.fit[genre];
  if (design.style === 'portrait' && design.faces.length === 0) {
    style -= 35;
    tips.push('A star-portrait poster needs faces on it');
  }
  if (style < 60) tips.push(`A ${styleDef.name.toLowerCase()} background doesn't sell ${genre}: ask for a new design`);

  const font = POSTER_FONTS.find((f) => f.id === design.titleFont)!;
  const sizeScore = { s: 55, m: 85, l: 100 }[design.titleSize];
  const title = font.fit[genre] * 0.7 + sizeScore * 0.3;
  if (font.fit[genre] < 60) tips.push(`The ${font.name.toLowerCase()} font doesn't suit ${genre}`);
  if (design.titleSize === 's') tips.push('Make the title bigger');

  // Billing: stars big, unknowns small or hidden.
  let bSum = 0, bW = 0;
  for (const r of cast) {
    const size = design.billing[r.id] ?? 'hidden';
    const cls = starClass(r.actor!.starPower);
    const table: Record<string, Record<PosterSize, number>> = {
      superstar: { l: 100, m: 80, s: 45, hidden: 10 },
      star: { l: 95, m: 95, s: 60, hidden: 30 },
      known: { l: r.billing === 'lead' ? 75 : 55, m: 90, s: 90, hidden: 70 },
      nobody: { l: 25, m: 55, s: 90, hidden: 100 },
    };
    const v = table[cls][size];
    if (cls === 'superstar' && (size === 'hidden' || size === 's')) tips.push(`${r.actor!.name} is a superstar: bill them big`);
    else if (cls === 'star' && size === 'hidden') tips.push(`Put ${r.actor!.name}'s name on the poster`);
    else if (cls === 'nobody' && (size === 'l' || size === 'm')) tips.push(`${r.actor!.name} is unknown: keep the name small or leave it off`);
    bSum += v * billingWeight(r);
    bW += billingWeight(r);
  }
  const billing = bW ? bSum / bW : 70;

  // Faces: superstars are worth showing; unknown faces sell nothing; don't crowd it.
  const superstars = cast.filter((r) => starClass(r.actor!.starPower) === 'superstar');
  let faces: number;
  if (design.faces.length === 0) {
    faces = superstars.length ? 65 : 85;
    if (superstars.length) tips.push(`Show ${superstars[0].actor!.name}'s face: superstars sell tickets`);
  } else {
    const vals = design.faces.map((id) => {
      const r = cast.find((x) => x.id === id);
      const cls = r ? starClass(r.actor!.starPower) : 'nobody';
      if (cls === 'nobody' && r) tips.push(`${r.actor!.name}'s face won't sell tickets`);
      return { superstar: 100, star: 80, known: 55, nobody: 25 }[cls];
    });
    faces = vals.reduce((a, b) => a + b, 0) / vals.length - Math.max(0, design.faces.length - P().maxFaces) * 15;
    if (design.faces.length > P().maxFaces) tips.push('Too many faces: the poster looks crowded');
  }

  const known = knownDirector(film, history);
  const director = (known ? { l: 100, m: 90, s: 75, hidden: 60 } : { l: 30, m: 55, s: 85, hidden: 90 })[design.directorSize];
  if (!known && (design.directorSize === 'l' || design.directorSize === 'm')) tips.push('Nobody knows the director yet: keep that credit small');
  if (known && design.directorSize === 'hidden') tips.push('Your name sells now: credit the director');

  const W = P().weights;
  const frameBonus = FRAME_FIT[design.frame][genre] ?? (design.frame === 'none' ? 0 : -2);
  const total = Math.round(clamp(style * W.style + title * W.title + billing * W.billing + faces * W.faces + director * W.director + frameBonus));
  const r = Math.round;
  return { style: r(clamp(style)), title: r(title), billing: r(billing), faces: r(clamp(faces)), director: r(director), frameBonus, total, tips: [...new Set(tips)] };
}

/** Poster → buzz points and opening-weekend multiplier. */
export function posterEffect(score: number) {
  const t = score / 100;
  return { buzz: Math.round(t * P().buzzAt100), opening: P().openingMin + (P().openingMax - P().openingMin) * t };
}

// ---------------- Marketing ----------------

export const marketingLevel = (film: Film): MarketingLevel => film.marketing?.level ?? 'standard';
export const marketingSpend = (film: Film) => Math.round((film.contract.marketing ?? film.contract.budget * M().shareOfBudget) * M().spendMult[marketingLevel(film)]);
/** The box office the studio expects, after any marketing change. */
export const effectiveBoxOfficeTarget = (film: Film) => Math.round(film.contract.boxOfficeTarget * M().targetMult[marketingLevel(film)]);

/** Ask the studio for more (or less) marketing. Takes a week of post. */
export function requestMarketing(film: Film, level: MarketingLevel): MarketingResult {
  if (film.phase !== 'post') return fail('Marketing is decided during editing');
  if (level === marketingLevel(film)) return fail('That is the current plan');
  if (!gear(film.upgrades).marketing.includes(level)) return fail('Needs the Marketing department upgrade');
  const week = film.calendar.shootWeeks + film.calendar.postWeeks + 1;
  return {
    ok: true,
    film: {
      ...film,
      marketing: { level, changes: (film.marketing?.changes ?? 0) + 1 },
      calendar: { ...film.calendar, postWeeks: film.calendar.postWeeks + M().changeWeeks },
      ledger: [...film.ledger, { label: `Week ${week}: marketing meetings`, amount: Math.round(crewWeekCost(film) * TUNING.post.crewShare), phase: 'post' }],
    },
  };
}
