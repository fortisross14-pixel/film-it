import type { DirectorDef } from '../types';

export const DIRECTORS: DirectorDef[] = [
  { id: 'starterA', name: 'Ava Lindqvist', genreAffinity: ['romance', 'drama'], specialties: [],
    unlock: { kind: 'start' }, blurb: 'Starter director. At home with people and feelings.' },
  { id: 'starterB', name: 'Marco Reyes', genreAffinity: ['action', 'thriller'], specialties: [],
    unlock: { kind: 'start' }, blurb: 'Starter director. Speed, stakes and things exploding.' },
  { id: 'writer', name: 'The Writer', genreAffinity: [], specialties: ['script'],
    unlock: { kind: 'repTier', tier: 2 }, blurb: '+Script quality and cheaper scenes.' },
  { id: 'scout', name: 'The Talent Scout', genreAffinity: [], specialties: ['casting'],
    unlock: { kind: 'repTier', tier: 2 }, blurb: 'Better odds of hidden gems, cheaper rerolls.' },
  { id: 'cinematographer', name: 'The Cinematographer', genreAffinity: [], specialties: ['shooting'],
    unlock: { kind: 'repTier', tier: 3 }, blurb: 'Higher base take score, faster improvement on retakes.' },
  { id: 'editor', name: 'The Editor', genreAffinity: [], specialties: ['post'],
    unlock: { kind: 'repTier', tier: 3 }, blurb: 'Cheaper and stronger music, VFX and SFX.' },
  // Genre masters
  { id: 'masterHorror', name: 'Master of Horror', genreAffinity: ['horror'], specialties: ['genre'], masterGenre: 'horror',
    unlock: { kind: 'genreAwards', genre: 'horror', wins: 1 }, blurb: 'Strong in Horror; small bonus everywhere.' },
  { id: 'masterComedy', name: 'Master of Comedy', genreAffinity: ['comedy'], specialties: ['genre'], masterGenre: 'comedy',
    unlock: { kind: 'genreAwards', genre: 'comedy', wins: 1 }, blurb: 'Strong in Comedy; small bonus everywhere.' },
  { id: 'masterScifi', name: 'Master of Sci-Fi', genreAffinity: ['scifi'], specialties: ['genre'], masterGenre: 'scifi',
    unlock: { kind: 'genreAwards', genre: 'scifi', wins: 1 }, blurb: 'Strong in Sci-Fi; small bonus everywhere.' },
  { id: 'masterFantasy', name: 'Master of Fantasy', genreAffinity: ['fantasy'], specialties: ['genre'], masterGenre: 'fantasy',
    unlock: { kind: 'genreAwards', genre: 'fantasy', wins: 1 }, blurb: 'Strong in Fantasy; small bonus everywhere.' },
];

export const directorById = (id: string): DirectorDef => {
  const d = DIRECTORS.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown director ${id}`);
  return d;
};
