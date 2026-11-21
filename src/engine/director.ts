// Director effects shared by every phase.

import type { DirectorDef, GenreId, Specialty } from './types';
import { TUNING } from './tuning';
import { genreCloseness } from './data/genres';

/** Points added to every phase's quality from genre affinity (and genre mastery). */
export function affinityBonus(d: DirectorDef, genre: GenreId): number {
  const T = TUNING.directors;
  if (d.masterGenre) return d.masterGenre === genre ? T.masterGenreBonus : T.masterOtherBonus;
  if (d.genreAffinity.length === 0) return 0; // "Any"
  const best = Math.max(...d.genreAffinity.map((g) => genreCloseness(g, genre)));
  return best === 1 ? T.affinityMatch : best > 0 ? T.affinityClose : T.affinityFar;
}

/** Multiplier on a specialty bonus for the director's level (1 at level 1). */
export function specialtyScale(d: DirectorDef, specialty: Specialty, level: number): number {
  if (!d.specialties.includes(specialty)) return 0;
  return 1 + TUNING.directors.specialtyPerLevel * (Math.min(level, TUNING.directors.maxLevel) - 1);
}
