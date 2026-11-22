// Premiere: buzz, public & critics ratings, box office run, festivals and awards.
// Then the grade (grade.ts) and delivering the film back to the base (rewards).

import type { Actor, Film, FilmRecord, FilmResults, Profile, Role } from './types';
import type { Rng } from './rng';
import { TUNING } from './tuning';
import { actionById } from './data/actions';
import { topicById } from './data/topics';
import { postSummary, isEmotional, sceneScores } from './post';
import { chosenTake, weeksUsed } from './shooting';
import { participants, spent } from './script';
import { withRng } from './profile';
import { gradeFilm } from './grade';
import { recordFilm, type FilmOutcome } from './career';
import { afterDelivery, franchiseEffect } from './franchise';
import { RIVAL_DIRECTORS } from './data/rivals';
import { workingTitle } from './titles';
import { GENRE_IDS } from './data/genres';
import { marketingLevel, posterEffect, posterScore } from './marketing';
import { directorById } from './data/directors';
import { specialtyScale } from './director';

const P = () => TUNING.premiere;
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

export type PremiereResult = { ok: true; profile: Profile; fired?: boolean; outcome?: FilmOutcome } | { ok: false; reason: string };
const fail = (reason: string): PremiereResult => ({ ok: false, reason });

export const FESTIVALS = ['Sunvale Film Festival', 'Golden Lantern Fest', 'Northlight Independent', 'Harbour Lights Festival'];

const billingW = (r: Role) => TUNING.casting.billingScoreWeight[r.billing];
function weighted(film: Film, f: (a: Actor) => number): number {
  const cast = film.roles.filter((r) => r.actor);
  const w = cast.reduce((a, r) => a + billingW(r), 0);
  return w ? cast.reduce((a, r) => a + f(r.actor!) * billingW(r), 0) / w : 0;
}

/** The film as it appears in the final cut (cut scenes removed). */
export const finalCut = (film: Film): Film => ({ ...film, scenes: film.scenes.filter((s) => !s.cut) });

/** Rating factors 0–100. */
export function ratingFactors(film: Film, history: FilmRecord[] = []): Record<string, number> {
  const cut = finalCut(film);
  const post = postSummary(film);
  const live = sceneScores(film);
  const fxPts = avg(live.map((s) => s.vfx + s.sfx));
  const tones = new Set(cut.scenes.map((s) => s.tone)).size;
  const actions = new Set(cut.scenes.flatMap((s) => s.beats.map((b) => b.actionId))).size;
  const topicFit = film.topicId ? topicById(film.topicId).genreFit[film.contract.genre] : 0;
  const last = history[history.length - 1]?.film;
  const repeat = last && last.contract.genre === film.contract.genre && last.topicId === film.topicId;
  return {
    script: film.scriptQuality ?? 0,
    star: weighted(film, (a) => a.starPower),
    worst: post.worst,
    peak: post.best,
    acting: weighted(film, (a) => a.acting + (a.traits.includes('method') ? 5 : 0)),
    chemistry: avg(cut.scenes.map((s) => chosenTake(s)?.meters.chemistry ?? 0)),
    fx: clamp(fxPts * 4),
    originality: clamp(40 + tones * 8 + actions * 2 + (topicFit >= 40 && topicFit < 80 ? 10 : 0) - (repeat ? 15 : 0)),
    execution: post.cutQuality,
  };
}

function rate(factors: Record<string, number>, weights: Record<string, number>): number {
  const keys = Object.keys(weights);
  const w = keys.reduce((a, k) => a + weights[k], 0);
  return keys.reduce((a, k) => a + (factors[k] ?? 0) * weights[k], 0) / w;
}

export function computeResults(rng: Rng, film: Film, history: FilmRecord[] = []): FilmResults {
  const T = P();
  const cut = finalCut(film);
  const post = postSummary(film);
  const factors = ratingFactors(film, history);
  const fx = franchiseEffect(film);
  const fillerShare = post.fillerMinutes / film.runtime;
  const boredom = Math.max(0, fillerShare - T.boredomFreeShare);
  const noise = () => (rng.next() * 2 - 1) * T.ratingNoise;

  // FX only matter to the public as much as the genre cares.
  const fxGenre = Math.max(TUNING.post.vfxWeight[film.contract.genre], TUNING.post.sfxWeight[film.contract.genre]);
  const publicWeights = { ...T.publicWeights, fx: fxGenre < T.fxPublicMinWeight ? 1 : T.publicWeights.fx * fxGenre };
  const charming = film.roles.filter((r) => r.actor?.traits.includes('charming')).length;
  const curve = (raw: number) => T.ratingCenter + (raw - T.ratingCenter) * T.ratingSpread + T.ratingLift;
  const publicRating = Math.round(clamp(curve(rate(factors, publicWeights)) - boredom * T.boredomPublic + charming * 2 + noise()));
  const darling = specialtyScale(directorById(film.directorId), 'festival', 1);
  const criticsRating = Math.round(clamp(curve(rate(factors, T.criticsWeights)) - boredom * T.boredomCritics - post.overproduction + noise()
    + darling * TUNING.directors.festivalCritics + fx.critics));
  const festivalCut = darling * TUNING.directors.festivalThresholdCut;

  // Buzz: stars, topic hype, charm.
  const topStar = Math.max(0, ...film.roles.map((r) => r.actor?.starPower ?? 0));
  const hype = film.topicId ? topicById(film.topicId).genreFit[film.contract.genre] : 40;
  const poster = posterScore(film, history);
  const pe = posterEffect(poster.total);
  const level = marketingLevel(film);
  const buzz = Math.round(clamp(T.buzzBase + topStar * T.buzzStar + hype * T.buzzTopic + charming * T.buzzCharming + pe.buzz + fx.buzz));

  // Box office: opening from market × buzz (× a little critics), legs from the public.
  const c = film.contract;
  const opening = c.budget * T.openingShare * T.genreMarket[c.genre] * T.ratingMarket[c.rating]
    * (T.openingBuzzBase + buzz / 100) * (T.criticsEffectBase + criticsRating * T.criticsEffectPer)
    * pe.opening * TUNING.marketing.openingMult[level] * fx.opening;
  let retention = T.retentionBase + publicRating * T.retentionPerPublic;
  if (c.budget <= T.sleeperBudgetMax && publicRating >= T.sleeperPublicMin) retention += T.sleeperBonus;
  const weekly: number[] = [];
  let week = opening * 1.5;
  for (let i = 0; i < T.runWeeks; i++) {
    weekly.push(Math.round(week));
    week *= Math.min(0.95, retention);
  }
  const boxOffice = weekly.reduce((a, b) => a + b, 0);

  // ---- Awards ----
  const nominations: string[] = [];
  const wins: string[] = [];
  const awardDrivers: Record<string, number> = {};
  // The year's rival films (named, by rival directors) compete in every category.
  const season = Array.from({ length: 8 }, () => {
    const g = rng.pick(GENRE_IDS);
    return { title: workingTitle(rng, g), director: rng.pick(RIVAL_DIRECTORS) };
  });
  const awardDetails: NonNullable<FilmResults['awardDetails']> = [];
  const label = (r: { title: string; director: string }) => `${r.title} (${r.director})`;
  const contest = (name: string, driver: number, threshold: number) => {

    awardDrivers[name] = Math.round(driver);
    if (driver < threshold) return;
    const prestige = T.awardPrestige[Math.max(1, Math.min(10, c.level ?? 10)) - 1];
    const p = clamp(T.nominationBase + TUNING.marketing.nominationBonus[level] + (driver - threshold) * T.nominationPerPoint, 0.1, 0.95) * prestige;
    if (!rng.chance(p)) return;
    nominations.push(name);
    const rivals = rng.shuffle(season).slice(0, TUNING.rivals.nomineesPerCategory - 1).map((r) => ({ ...r, score: rng.int(T.rivalRange[0], T.rivalRange[1]) }));
    const best = rivals.reduce((a, b) => (b.score > a.score ? b : a));
    const ours = driver + (rng.next() * 2 - 1) * T.winNoise;
    const won = ours > best.score;
    if (won) wins.push(name);
    awardDetails.push({ category: name, nominees: [film.title, ...rivals.map(label)], winner: won ? film.title : label(best) });
  };

  // Festivals: reachable early for small films with strong critics.
  if (c.budget <= T.festivalBudgetMax ? criticsRating >= T.festivalNomCritics - festivalCut && rng.chance(T.festivalNomChance) : criticsRating >= T.bigFilmFestivalCritics - festivalCut && rng.chance(T.bigFilmFestivalChance)) {
    const name = `Festival: ${rng.pick(FESTIVALS)}`;
    nominations.push(name);
    if (criticsRating >= T.festivalWinCritics - festivalCut && rng.chance(0.5 + (criticsRating - T.festivalWinCritics) / 40)) wins.push(name);
  }

  contest('Best Picture', criticsRating * 0.6 + post.cutQuality * 0.4, T.pictureAwardThreshold);
  contest('Best Director', post.cutQuality * T.directorCutWeight + (film.scriptQuality ?? 0) * (1 - T.directorCutWeight), T.directorAwardThreshold);
  const perf = film.roles.filter((r) => r.actor).map((r) => {
    const mine = cut.scenes.filter((s) => participants(s).includes(r.id)).map((s) => chosenTake(s)?.score ?? 0);
    return { r, v: avg(mine) * 0.6 + r.actor!.acting * 0.4 };
  });
  const lead = perf.find((x) => x.r.type === 'main');
  if (lead) contest(`Best Lead Performance: ${lead.r.actor!.name}`, lead.v, T.leadAwardThreshold);
  const support = perf.filter((x) => x.r.type !== 'main').sort((a, b) => b.v - a.v)[0];
  if (support) contest(`Best Supporting Performance: ${support.r.actor!.name}`, support.v, T.supportAwardThreshold);
  contest('Best Original Script', (film.scriptQuality ?? 0) * 0.6 + criticsRating * 0.4, T.scriptAwardThreshold);
  if (film.music === 'star') {
    const emo = sceneScores(film).filter((s) => isEmotional(cut.scenes.find((x) => x.id === s.sceneId)!));
    contest('Best Score', avg(emo.map((s) => s.total)), T.scoreAwardThreshold);
  }
  const live = sceneScores(film);
  // Craft awards: the craft itself, but voters also need to rate the film.
  const craft = (points: number) => clamp(points) * (1 - T.craftCriticsWeight) + criticsRating * T.craftCriticsWeight;
  if (TUNING.post.vfxWeight[c.genre] >= 0.5) contest('Best Visual Effects', craft(live.reduce((a, s) => a + s.vfx, 0) * T.fxAwardPerPoint), T.fxAwardThreshold);
  contest('Best Sound', craft(live.reduce((a, s) => a + s.sfx, 0) * T.soundAwardPerPoint), T.soundAwardThreshold);

  return {
    buzz, publicRating, criticsRating, factors, boredom: Math.round(fillerShare * 100), overproduction: post.overproduction,
    openingWeekend: Math.round(opening), weekly, boxOffice, nominations, wins, awardDrivers, posterScore: poster.total, marketing: level, awardDetails,
  };
}

/** Roll the premiere: compute results and the grade, stored on the film. */
export function runPremiere(p: Profile): PremiereResult {
  const film = p.activeFilm;
  if (!film || film.phase !== 'premiere') return fail('Not ready for the premiere');
  if (film.results) return fail('The premiere already happened');
  const { profile, value: results } = withRng(p, (rng) => computeResults(rng, film, p.filmography));
  const report = gradeFilm(film, results, p.filmography);
  return { ok: true, profile: { ...profile, activeFilm: { ...film, results, report, grade: report.grade, gradeScore: report.score } } };
}

/**
 * Deliver the film: the fee and award bonus to the studio's money, the career moves up or
 * down the ladder (or ends), the film into the filmography, and a fresh contract board.
 */
export function deliverFilm(p: Profile, now = Date.now()): PremiereResult {
  const film = p.activeFilm;
  if (!film?.results || !film.report) return fail('Premiere first');
  const r = film.report.rewards;
  const earned = r.total;
  const base: Profile = {
    ...p,
    money: p.money + earned,
    filmography: [...p.filmography, { film: { ...film, phase: 'done' }, careerId: p.career?.id, completedAt: now }],
    activeFilm: undefined,
  };
  const { profile, outcome } = recordFilm(base, film, earned, now);
  const done = withRng(profile, (rng) => afterDelivery(profile, film, rng));
  return { ok: true, profile: { ...done.value, seed: done.profile.seed }, fired: outcome.fired, outcome };
}

/** Facts for the red carpet moment. */
export function redCarpet(film: Film) {
  return {
    arrivals: film.roles.filter((r) => r.actor).map((r) => ({ role: r.name, actor: r.actor!, star: r.actor!.starPower })),
    weeks: weeksUsed(film),
    spent: spent(film),
    climax: film.scenes.flatMap((s) => s.beats).filter((b) => actionById(b.actionId).climax).length,
  };
}
