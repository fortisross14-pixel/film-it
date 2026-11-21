// Rankings: every director you have created (one per career, running or finished), with
// their averages and totals from the filmography, sortable for the leaderboard.

import type { Career, Grade, Profile } from './types';
import { runningCareers } from './career';

export interface DirectorStats {
  career: Career;
  running: boolean;
  films: number;
  /** Average critics rating (0–100) over their films. */
  critics: number;
  /** Average audience rating (0–100). */
  audience: number;
  nominations: number;
  wins: number;
  /** Total box office, $K. */
  boxOffice: number;
  /** Money earned for the studio, $K. */
  earnings: number;
  topLevel: number;
  /** Average grade score (0–100). */
  score: number;
  best?: { title: string; grade?: Grade };
}

export type RankKey = 'critics' | 'audience' | 'awards' | 'boxOffice' | 'level';

export const RANK_LABEL: Record<RankKey, string> = {
  critics: 'Critics', audience: 'Audience', awards: 'Awards', boxOffice: 'Box office', level: 'Level',
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** Stats for every career, running ones first. */
export function directorStats(p: Profile): DirectorStats[] {
  const running = runningCareers(p).map((x) => x.career);
  const all = [...running.map((c) => ({ c, running: true })), ...p.careers.map((c) => ({ c, running: false }))];
  return all.map(({ c, running: r }) => {
    const films = p.filmography.filter((f) => f.careerId === c.id).map((f) => f.film).filter((f) => f.results);
    const best = [...films].sort((a, b) => (b.gradeScore ?? 0) - (a.gradeScore ?? 0))[0];
    return {
      career: c,
      running: r,
      films: films.length,
      critics: Math.round(avg(films.map((f) => f.results!.criticsRating))),
      audience: Math.round(avg(films.map((f) => f.results!.publicRating))),
      nominations: films.reduce((a, f) => a + f.results!.nominations.length, 0),
      wins: films.reduce((a, f) => a + f.results!.wins.length, 0),
      boxOffice: films.reduce((a, f) => a + f.results!.boxOffice, 0),
      earnings: c.earnings,
      topLevel: c.topLevel ?? c.level,
      score: Math.round(avg(films.map((f) => f.gradeScore ?? 0))),
      best: best ? { title: best.title, grade: best.grade } : undefined,
    };
  });
}

const value = (s: DirectorStats, key: RankKey): number[] => {
  switch (key) {
    case 'critics': return [s.critics, s.films];
    case 'audience': return [s.audience, s.films];
    case 'awards': return [s.wins, s.nominations];
    case 'boxOffice': return [s.boxOffice];
    case 'level': return [s.topLevel, s.score];
  }
};

/** The leaderboard: directors with at least one film, best first by the key (ties by the next number). */
export function rankDirectors(p: Profile, key: RankKey): DirectorStats[] {
  return directorStats(p)
    .filter((s) => s.films > 0)
    .sort((a, b) => {
      const va = value(a, key), vb = value(b, key);
      for (let i = 0; i < va.length; i++) if (va[i] !== vb[i]) return vb[i] - va[i];
      return b.score - a.score;
    });
}
