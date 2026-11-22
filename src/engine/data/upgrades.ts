// Studio upgrades: permanent unlocks bought with studio money. They open better post
// production, music, marketing and actor agencies. A film keeps the upgrades the studio
// had when it started (film.upgrades), so post and marketing checks stay pure.

import type { MarketingLevel, MusicTier, PolishTier } from '../types';

export type UpgradeId = 'agency1' | 'agency2' | 'post1' | 'post2' | 'composer' | 'starComposer' | 'marketing';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  kind: 'Actors' | 'Post' | 'Music' | 'Marketing';
  cost: number; // $K
  requires?: UpgradeId;
  text: string;
}

export const UPGRADES: UpgradeDef[] = [
  { id: 'agency1', name: 'Talent agency', kind: 'Actors', cost: 350, text: 'Talent packs can hold rare and epic actors, and Star packs go on sale.' },
  { id: 'agency2', name: 'Star agency', kind: 'Actors', cost: 1750, requires: 'agency1', text: 'Talent packs can hold legendary actors and the named stars.' },
  { id: 'post1', name: 'Post house', kind: 'Post', cost: 450, text: 'Pro visual effects and sound.' },
  { id: 'post2', name: 'VFX studio', kind: 'Post', cost: 1600, requires: 'post1', text: 'Premium, blockbuster-grade visual effects and sound.' },
  { id: 'composer', name: 'Composer contract', kind: 'Music', cost: 400, text: 'An original score instead of library music: lifts emotional scenes.' },
  { id: 'starComposer', name: 'Star composer', kind: 'Music', cost: 1150, requires: 'composer', text: 'A famous composer: a big lift, and a shot at Best Score.' },
  { id: 'marketing', name: 'Marketing department', kind: 'Marketing', cost: 800, text: 'Ask the studio to push a film harder: bigger opening, better award chances.' },
];

export const upgradeById = (id: string) => UPGRADES.find((u) => u.id === id);

/** What a set of upgrades allows. Undefined (films from older saves) allows everything. */
export function gear(upgrades?: readonly string[]) {
  const has = (id: UpgradeId) => !upgrades || upgrades.includes(id);
  const polish: PolishTier[] = ['none', 'basic', ...(has('post1') ? ['pro' as const] : []), ...(has('post2') ? ['premium' as const] : [])];
  const music: MusicTier[] = ['none', 'library', ...(has('composer') ? ['composer' as const] : []), ...(has('starComposer') ? ['star' as const] : [])];
  const marketing: MarketingLevel[] = ['cut', 'standard', ...(has('marketing') ? ['push' as const] : [])];
  const agency = has('agency2') ? 2 : has('agency1') ? 1 : 0;
  return { polish, music, marketing, agency };
}

/** The upgrade that unlocks a post / music / marketing option. */
export const UNLOCKED_BY: Partial<Record<PolishTier | MusicTier | MarketingLevel, UpgradeId>> = {
  pro: 'post1', premium: 'post2', composer: 'composer', star: 'starComposer', push: 'marketing',
};
