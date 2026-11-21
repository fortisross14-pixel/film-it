import type { Studio } from '../types';

export const STUDIOS: Studio[] = [
  { id: 'backlot', name: 'Backlot Collective', tier: 1 },
  { id: 'lanternhouse', name: 'Lanternhouse Films', tier: 1 },
  { id: 'meridian', name: 'Meridian Pictures', tier: 2 },
  { id: 'northgate', name: 'Northgate Studios', tier: 2 },
  { id: 'silverline', name: 'Silverline Entertainment', tier: 3 },
  { id: 'atlasbay', name: 'Atlas Bay Pictures', tier: 3 },
  { id: 'crown', name: 'Crownlight Studios', tier: 4 },
  { id: 'paragon', name: 'Paragon Worldwide', tier: 5 },
];

export const FILM_TITLE_PARTS = {
  first: ['Midnight', 'Last', 'Silent', 'Broken', 'Golden', 'Red', 'Hidden', 'Final', 'Lost', 'Wild', 'Iron', 'Glass', 'Hollow', 'Burning', 'Paper'],
  second: ['Harbor', 'Promise', 'Signal', 'Kingdom', 'Summer', 'Witness', 'Horizon', 'Crown', 'Letters', 'Run', 'Garden', 'Engine', 'Shadows', 'Hearts', 'Frontier'],
};
