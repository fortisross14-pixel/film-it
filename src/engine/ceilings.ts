// Equipment ceilings: skill gets a film to the ceiling, equipment raises the ceiling.
// - Script: the director's script ceiling (genre masters reach 100 in their genre).
// - Takes: the average of the director's shooting ceiling and the set's tier.
// Raw quality is scaled (raw × ceiling / 100), so better play still shows under any ceiling.

import type { DirectorDef, FilmSet, GenreId } from './types';
import { TUNING } from './tuning';

export function scriptCeiling(d: DirectorDef | undefined, genre: GenreId): number {
  if (!d) return 100;
  return d.masterGenre === genre ? 100 : d.ceiling.script;
}

export const setCeiling = (s: FilmSet) => TUNING.gear.setCeiling[s.tier];

export function shootCeiling(d: DirectorDef | undefined, set: FilmSet, genre: GenreId): number {
  const dir = !d ? 100 : d.masterGenre === genre ? 100 : d.ceiling.shooting;
  return Math.round((dir + setCeiling(set)) / 2);
}

export const underCeiling = (raw: number, ceiling: number) => (raw * ceiling) / 100;
