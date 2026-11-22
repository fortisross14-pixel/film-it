import type { Studio } from '../types';

// The studios that hire you. Small indie labels at the bottom, the majors at the top. Each has
// its own taste: offers lean towards the genres it likes, and family studios stay PG.
export const STUDIOS: Studio[] = [
  { id: 'backlot', name: 'B25 Films', tier: 1, likes: ['drama', 'thriller', 'horror'] },
  { id: 'lanternhouse', name: 'Blumhaus', tier: 1, likes: ['horror', 'thriller'] },
  { id: 'focus', name: 'Focus Pullers', tier: 1, likes: ['drama', 'romance', 'comedy'] },
  { id: 'meridian', name: 'Lionsgait', tier: 2, likes: ['action', 'thriller', 'horror'] },
  { id: 'northgate', name: 'DreamPorks', tier: 2, likes: ['comedy', 'fantasy'], maxRating: 'PG' },
  { id: 'silverline', name: 'Paramounty', tier: 3, likes: ['action', 'scifi', 'comedy'] },
  { id: 'atlasbay', name: 'Columbo Pictures', tier: 3, likes: ['drama', 'thriller', 'romance'] },
  { id: 'universol', name: 'Universol', tier: 3, likes: ['action', 'scifi', 'horror'] },
  { id: 'crown', name: 'Farmer Bros.', tier: 4, likes: ['drama', 'action', 'fantasy'] },
  { id: 'fax', name: 'Twentieth Century Fax', tier: 4, likes: ['scifi', 'comedy', 'action'] },
  { id: 'paragon', name: 'Walt Lindsey Studios', tier: 5, likes: ['comedy', 'fantasy', 'romance'], maxRating: 'PG' },
  { id: 'mountain', name: 'Paramountain', tier: 5, likes: ['action', 'scifi', 'thriller'] },
];

export const FILM_TITLE_PARTS = {
  first: ['Midnight', 'Last', 'Silent', 'Broken', 'Golden', 'Red', 'Hidden', 'Final', 'Lost', 'Wild', 'Iron', 'Glass', 'Hollow', 'Burning', 'Paper'],
  second: ['Harbor', 'Promise', 'Signal', 'Kingdom', 'Summer', 'Witness', 'Horizon', 'Crown', 'Letters', 'Run', 'Garden', 'Engine', 'Shadows', 'Hearts', 'Frontier'],
};
