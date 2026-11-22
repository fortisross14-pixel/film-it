// Personal records: the bests across every film and career, for the endgame chase
// ("can I beat my own box office, awards or ratings?").

import type { Film, Profile } from './types';
import { directorStats } from './rankings';
import { careerName } from './career';

export interface RecordEntry { key: RecordKey; label: string; value: number; holder: string; detail?: string }
export type RecordKey = 'critics' | 'audience' | 'boxOffice' | 'awards' | 'careerBoxOffice' | 'careerWins' | 'careerCritics';

export const RECORD_LABEL: Record<RecordKey, string> = {
  critics: 'Best critics rating', audience: 'Best audience rating', boxOffice: 'Biggest box office', awards: 'Most awards for a film',
  careerBoxOffice: 'Biggest career box office', careerWins: 'Most award wins in a career', careerCritics: 'Best career average (critics)',
};

/** Awards score for a film: wins count most, nominations break ties. */
const awardScore = (f: Film) => (f.results?.wins.length ?? 0) * 100 + (f.results?.nominations.length ?? 0);

const filmValue = (f: Film, key: 'critics' | 'audience' | 'boxOffice' | 'awards') =>
  key === 'critics' ? f.results!.criticsRating : key === 'audience' ? f.results!.publicRating : key === 'boxOffice' ? f.results!.boxOffice : awardScore(f);

/** The current records (only categories with at least one film). */
export function records(p: Profile): RecordEntry[] {
  const films = p.filmography.map((r) => r.film).filter((f) => f.results);
  const out: RecordEntry[] = [];
  for (const key of ['critics', 'audience', 'boxOffice', 'awards'] as const) {
    const best = films.reduce<Film | undefined>((b, f) => (!b || filmValue(f, key) > filmValue(b, key) ? f : b), undefined);
    if (!best || (key === 'awards' && awardScore(best) === 0)) continue;
    out.push({
      key, label: RECORD_LABEL[key], value: filmValue(best, key), holder: best.title,
      detail: key === 'awards' ? `${best.results!.wins.length} won, ${best.results!.nominations.length} nominations` : undefined,
    });
  }
  const careers = directorStats(p).filter((s) => s.films > 0);
  const top = <K extends 'boxOffice' | 'wins' | 'critics'>(k: K) => careers.reduce<(typeof careers)[0] | undefined>((b, s) => (!b || s[k] > b[k] ? s : b), undefined);
  const bo = top('boxOffice'), wins = top('wins'), crit = careers.filter((s) => s.films >= 5).reduce<(typeof careers)[0] | undefined>((b, s) => (!b || s.critics > b.critics ? s : b), undefined);
  if (bo) out.push({ key: 'careerBoxOffice', label: RECORD_LABEL.careerBoxOffice, value: bo.boxOffice, holder: careerName(bo.career) });
  if (wins && wins.wins > 0) out.push({ key: 'careerWins', label: RECORD_LABEL.careerWins, value: wins.wins, holder: careerName(wins.career) });
  if (crit) out.push({ key: 'careerCritics', label: RECORD_LABEL.careerCritics, value: crit.critics, holder: careerName(crit.career), detail: 'over 5+ films' });
  return out;
}

/** Film records this film breaks (compared with every earlier film). */
export function newRecords(p: Profile, film: Film): RecordKey[] {
  if (!film.results) return [];
  const earlier = p.filmography.map((r) => r.film).filter((f) => f.results && f.id !== film.id);
  if (!earlier.length) return [];
  return (['critics', 'audience', 'boxOffice', 'awards'] as const).filter((k) => {
    const v = filmValue(film, k);
    return (k !== 'awards' || v > 0) && earlier.every((f) => v > filmValue(f, k));
  });
}
