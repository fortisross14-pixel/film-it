// Display helpers shared by UI (pure functions, safe for engine tests).

import type { BonusGoal, HardRequirement } from './types';
import { sceneTypeById } from './data/sceneTypes';
import { topicById } from './data/topics';

/** $K → "$25M" / "$750K". */
export function money(k: number): string {
  if (Math.abs(k) >= 1000) {
    const m = k / 1000;
    return `$${m >= 100 ? Math.round(m) : Number(m.toFixed(1))}M`;
  }
  return `$${Math.round(k)}K`;
}

export const ROLE_TYPE_NAMES = {
  main: 'Main (lead)',
  coMain: 'Co-main',
  villain: 'Villain',
  romanticInterest: 'Romantic interest',
  sidekick: 'Sidekick / Mentor',
  supporting: 'Supporting',
} as const;

export function describeHardReq(r: HardRequirement): string {
  switch (r.kind) {
    case 'runtime':
      return `Runtime ${r.target} min (±${r.tolerance})`;
    case 'sceneType':
      return `At least ${r.count} ${sceneTypeById(r.sceneTypeId).name} scene${r.count > 1 ? 's' : ''}`;
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
