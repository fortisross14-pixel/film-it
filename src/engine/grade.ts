// Grade: weighted studio satisfaction, then delivery effects (late / over budget).
// Hard-requirement caps and the full premiere inputs arrive in Milestone 6.

import type { Contract, ExpectationWeights, Grade, GradeComponent } from './types';
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
