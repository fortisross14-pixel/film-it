// Display helpers shared by UI (pure functions, safe for engine tests).

import type { BonusGoal, HardRequirement } from './types';
import { actionById } from './data/actions';
import { toneById } from './data/tones';
import { topicById } from './data/topics';

/** Audience score: ratings are 0–100 internally, shown on a 1–10 scale with one decimal ("6.8"). */
export function audienceScore(rating: number): string {
  return (Math.max(10, Math.min(100, rating)) / 10).toFixed(1);
}

/** Critics score: a percentage ("87%"). */
export const criticsScore = (rating: number) => `${Math.round(rating)}%`;

/** $K → "$25M" / "$750K". */
export function money(k: number): string {
  if (Math.abs(k) >= 1000) {
    const m = k / 1000;
    return `$${m >= 100 ? Math.round(m) : Number(m.toFixed(1))}M`;
  }
  return `$${Math.round(k)}K`;
}

export const ROLE_TYPE_NAMES = {
  main: 'Main',
  villain: 'Villain',
  coVillain: 'Co-villain',
  romanticInterest: 'Romantic interest',
  comicRelief: 'Comic relief',
  supporting: 'Supporting',
} as const;

export function describeHardReq(r: HardRequirement): string {
  switch (r.kind) {
    case 'runtime':
      return `Runtime ${r.target} min (±${r.tolerance})`;
    case 'tone':
      return `At least ${r.count} ${toneById(r.tone).name.toLowerCase()} scene${r.count > 1 ? 's' : ''}`;
    case 'action':
      return `Someone ${actionById(r.actionId).verb}`;
    case 'leadStarPower':
      return `Main lead star power ≥ ${r.min}`;
    case 'role':
      return `Has a ${ROLE_TYPE_NAMES[r.roleType]} role`;
    case 'maxRating':
      return `Stay within ${r.rating}`;
  }
}

export function describeBonus(b: BonusGoal): string {
  switch (b.kind) {
    case 'topic':
      return `Topic is ${topicById(b.topicId).name}`;
    case 'festivalNomination':
      return 'Festival nomination';
    case 'underBudget':
      return `Finish ${b.pct}% under budget`;
    case 'boxOffice':
      return `Box office ≥ ${money(b.min)}`;
    case 'criticsAtLeast':
      return `Critics rating ≥ ${b.min}`;
  }
}

/** "The Villain fights and wins The Hero", "The Hero dances with Anna", "The Villain escapes". */
export function describeBeat(who: string, actionId: string, target?: string): string {
  const a = actionById(actionId);
  if (!target) return `${who} ${a.verb}`;
  const prep = a.prep && a.prep !== 'To' ? ` ${a.prep.toLowerCase()}` : '';
  return `${who} ${a.verb}${prep} ${target}`;
}
