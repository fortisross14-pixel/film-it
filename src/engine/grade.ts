// Grade: weighted studio satisfaction, then delivery effects (late / over budget).
// Hard-requirement caps and the full premiere inputs arrive in Milestone 6.

import type { Contract, ExpectationWeights, Film, FilmRecord, FilmResults, Grade, GradeComponent, GradeReport } from './types';
import { checkRequirements, spent } from './script';
import { weeksUsed } from './shooting';
import { describeBonus, describeHardReq } from './format';
import { TUNING } from './tuning';

/** Linear interpolation over [x, y] points, clamped at both ends. */
export function curve(points: readonly (readonly [number, number])[], x: number): number {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x0, y0] = points[i - 1];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return points[points.length - 1][1];
}

/** Weighted satisfaction 0–100 from component scores 0–100. */
export function satisfaction(scores: Record<GradeComponent, number>, w: ExpectationWeights): number {
  return (Object.keys(w) as GradeComponent[]).reduce((a, k) => a + scores[k] * w[k], 0);
}

export interface DeliveryEffect {
  latePenalty: number;
  overBudgetPenalty: number;
  final: number;
}

/**
 * Apply on-time / on-budget effects to a satisfaction score.
 * weeksLate may be fractional; overBudgetPct is % over budget (≤ 0 = on budget).
 */
export function applyDelivery(
  score: number,
  weeksLate: number,
  overBudgetPct: number,
  strictness: Contract['delivery'],
): DeliveryEffect {
  const latePenalty = weeksLate > 0 ? curve(TUNING.latePenalty, weeksLate) * strictness.late : 0;
  const overBudgetPenalty = overBudgetPct > 0 ? curve(TUNING.overBudgetPenalty, overBudgetPct) * strictness.overBudget : 0;
  const final = Math.max(0, Math.min(100, score - latePenalty - overBudgetPenalty));
  return { latePenalty, overBudgetPenalty, final };
}

export const GRADE_THRESHOLDS: [Grade, number][] = [['A', 90], ['B', 80], ['C', 70], ['D', 60], ['F', 0]];

export function letterFor(score: number): Grade {
  return GRADE_THRESHOLDS.find(([, min]) => score >= min)![0];
}

// ---------------- Full grade ----------------


const LETTERS: Grade[] = ['A', 'B', 'C', 'D', 'F'];

export function boxOfficeScore(gross: number, target: number): number {
  const T = TUNING.premiere;
  if (target <= 0) return 100;
  return Math.round(Math.max(0, Math.min(100, T.boxOfficeAtTarget * Math.pow(gross / target, T.boxOfficeExp))));
}

export function awardPoints(results: Pick<FilmResults, 'nominations' | 'wins'>): number {
  const T = TUNING.premiere;
  return results.nominations.length * T.nominationPoints + results.wins.length * T.winPoints;
}

/**
 * Studio verdict: weighted satisfaction (box office, public, critics, awards) + bonus goals,
 * then late / over-budget effects, then each missed hard requirement caps the grade one letter.
 */
export function gradeFilm(film: Film, results: FilmResults, _history: FilmRecord[] = []): GradeReport {
  const c = film.contract;
  const components: Record<GradeComponent, number> = {
    boxOffice: boxOfficeScore(results.boxOffice, c.boxOfficeTarget),
    public: results.publicRating,
    critics: results.criticsRating,
    awards: Math.round(Math.min(100, (100 * awardPoints(results)) / TUNING.premiere.expectedAwardPoints[c.archetype])),
  };
  const sat = satisfaction(components, c.weights);

  const totalSpent = spent(film);
  const bonusMet: string[] = [];
  let bonusPoints = 0;
  for (const b of c.bonusGoals) {
    const met =
      b.kind === 'topic' ? film.topicId === b.topicId
      : b.kind === 'festivalNomination' ? results.nominations.some((n) => n.startsWith('Festival:'))
      : b.kind === 'underBudget' ? totalSpent <= c.budget * (1 - b.pct / 100)
      : b.kind === 'boxOffice' ? results.boxOffice >= b.min
      : results.criticsRating >= b.min;
    if (met) {
      bonusMet.push(describeBonus(b));
      bonusPoints += b.points * TUNING.rewards.bonusGoalPoints;
    }
  }

  const weeksLate = Math.max(0, weeksUsed(film) - c.deadlineWeeks);
  const overBudgetPct = ((totalSpent - c.budget) / c.budget) * 100;
  const d = applyDelivery(Math.min(100, sat + bonusPoints), weeksLate, overBudgetPct, c.delivery);
  const score = Math.round(d.final);

  const cutFilm = { ...film, scenes: film.scenes.filter((s) => !s.cut) };
  const missedReqs = checkRequirements(cutFilm).filter((r) => r.status !== 'met').map((r) => describeHardReq(r.req));
  const letterBeforeCaps = letterFor(score);
  const grade = LETTERS[Math.min(LETTERS.length - 1, LETTERS.indexOf(letterBeforeCaps) + missedReqs.length)];

  const R = TUNING.rewards;
  const mult = R.gradeMult[grade];
  const winsCount = results.wins.length;
  const rewards = {
    reputation: Math.round(c.rewards.reputation * mult),
    credits: Math.round(c.rewards.credits * mult),
    unspentCredits: Math.round(Math.max(0, c.budget - totalSpent) * R.unspentCreditsPerK),
    awardRep: (results.nominations.length - winsCount) * R.nominationRep + winsCount * (R.winRep + R.nominationRep),
  };

  return {
    components, satisfaction: Math.round(sat), bonusPoints, bonusMet, weeksLate, overBudgetPct: Math.round(overBudgetPct * 10) / 10,
    latePenalty: Math.round(d.latePenalty * 10) / 10, overBudgetPenalty: Math.round(d.overBudgetPenalty * 10) / 10,
    score, letterBeforeCaps, missedReqs, grade, rewards,
  };
}
