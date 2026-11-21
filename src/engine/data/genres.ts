import type { AgeRating, GenreId, GenreMap } from '../types';

export const GENRES: { id: GenreId; name: string }[] = [
  { id: 'action', name: 'Action' },
  { id: 'drama', name: 'Drama' },
  { id: 'romance', name: 'Romance' },
  { id: 'comedy', name: 'Comedy' },
  { id: 'thriller', name: 'Thriller' },
  { id: 'horror', name: 'Horror' },
  { id: 'scifi', name: 'Sci-Fi' },
  { id: 'fantasy', name: 'Fantasy' },
];

export const GENRE_IDS: GenreId[] = GENRES.map((g) => g.id);

export const genreName = (id: GenreId) => GENRES.find((g) => g.id === id)?.name ?? id;

/** How close two genres are (0–1). Used for director affinity "far off" penalty. */
const NEIGHBOURS: Record<GenreId, GenreId[]> = {
  action: ['thriller', 'scifi', 'fantasy'],
  drama: ['romance', 'thriller'],
  romance: ['drama', 'comedy'],
  comedy: ['romance'],
  thriller: ['action', 'horror', 'drama'],
  horror: ['thriller', 'fantasy'],
  scifi: ['action', 'fantasy'],
  fantasy: ['scifi', 'action', 'horror'],
};

export function genreCloseness(a: GenreId, b: GenreId): number {
  if (a === b) return 1;
  return NEIGHBOURS[a].includes(b) ? 0.5 : 0;
}

/** Build a GenreMap from a partial, filling the rest with a default. */
export function gm(partial: Partial<GenreMap>, fallback = 30): GenreMap {
  const out = {} as GenreMap;
  for (const g of GENRE_IDS) out[g] = partial[g] ?? fallback;
  return out;
}

export const AGE_RATINGS: AgeRating[] = ['G', 'PG', 'PG-13', 'R'];

export const ratingIndex = (r: AgeRating) => AGE_RATINGS.indexOf(r);

/** Typical ratings per genre, used by the contract generator. */
export const GENRE_RATINGS: Record<GenreId, AgeRating[]> = {
  action: ['PG-13', 'R'],
  drama: ['PG', 'PG-13', 'R'],
  romance: ['PG', 'PG-13'],
  comedy: ['PG', 'PG-13', 'R'],
  thriller: ['PG-13', 'R'],
  horror: ['PG-13', 'R'],
  scifi: ['PG', 'PG-13'],
  fantasy: ['PG', 'PG-13'],
};

/** Roles some genres require in their brief. */
export const GENRE_REQUIRED_ROLES: Partial<Record<GenreId, ('villain' | 'romanticInterest')[]>> = {
  action: ['villain'],
  thriller: ['villain'],
  romance: ['romanticInterest'],
};
