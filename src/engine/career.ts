// Careers: pick a director profile and play contracts with it. Reputation and the
// director's level grow within the career; credits go to the global bank. A career ends
// when you retire it (bonus from reputation) or get fired (too many F grades in a row).

import type { Career, Film, Grade, Profile } from './types';
import { TUNING } from './tuning';
import { makeId } from './rng';
import { withRng, refreshBoard } from './profile';
import { reputationTier } from './progression';

export type CareerResult = { ok: true; profile: Profile } | { ok: false; reason: string };
const fail = (reason: string): CareerResult => ({ ok: false, reason });
const C = () => TUNING.career;

export function startCareer(p: Profile, directorId: string, now = Date.now()): CareerResult {
  if (p.career) return fail('Retire the current career first');
  if (!p.unlocks.directors.includes(directorId)) return fail('That profile is locked');
  const { profile, value: id } = withRng(p, (rng) => makeId('career', rng));
  const career: Career = {
    id, directorId, startedAt: now, status: 'active', reputation: 0, level: 1, films: 0, earnings: 0, fStreak: 0,
    grades: [], nominations: 0, wins: 0, boxOffice: 0,
  };
  const directors = { ...p.directors, [directorId]: { ...(p.directors[directorId] ?? { id: directorId, films: 0 }), id: directorId, level: 1 } };
  return { ok: true, profile: refreshBoard({ ...profile, career, directors }) };
}

/** Retirement bonus: credits from the reputation built in this career. */
export const retirementBonus = (c: Career) => Math.round(c.reputation * C().retireCreditsPerRep);

function endCareer(p: Profile, status: 'retired' | 'fired', now: number): Profile {
  const c = p.career!;
  const bonus = status === 'retired' ? retirementBonus(c) : 0;
  const ended: Career = { ...c, status, endedAt: now, earnings: c.earnings + bonus };
  return { ...p, credits: p.credits + bonus, career: undefined, careers: [...p.careers, ended], contractBoard: [] };
}

export function retireCareer(p: Profile, now = Date.now()): CareerResult {
  if (!p.career) return fail('No career to retire');
  if (p.activeFilm) return fail('Finish or abandon the film in production first');
  return { ok: true, profile: endCareer(p, 'retired', now) };
}

/** Called when a film is delivered: update the career, maybe fire the director. */
export function recordFilm(p: Profile, film: Film, creditsEarned: number, reputationEarned: number, now = Date.now()): { profile: Profile; fired: boolean } {
  const c = p.career;
  if (!c) return { profile: p, fired: false };
  const grade = film.grade as Grade;
  const fStreak = grade === 'F' ? c.fStreak + 1 : 0;
  const career: Career = {
    ...c,
    reputation: c.reputation + reputationEarned,
    level: Math.min(TUNING.directors.maxLevel, c.level + 1),
    films: c.films + 1,
    earnings: c.earnings + creditsEarned,
    fStreak,
    grades: [...c.grades, grade],
    nominations: c.nominations + (film.results?.nominations.length ?? 0),
    wins: c.wins + (film.results?.wins.length ?? 0),
    boxOffice: c.boxOffice + (film.results?.boxOffice ?? 0),
  };
  const d = p.directors[c.directorId] ?? { id: c.directorId, level: 1, films: 0 };
  let next: Profile = { ...p, career, directors: { ...p.directors, [c.directorId]: { ...d, level: career.level, films: d.films + 1 } } };
  const fired = fStreak >= C().firedAfterFs;
  next = fired ? endCareer(next, 'fired', now) : refreshBoard(next);
  return { profile: next, fired };
}

export const careerTier = (p: Profile) => reputationTier(p.career?.reputation ?? 0);

const ORDER: Grade[] = ['A', 'B', 'C', 'D', 'F'];
export const bestGrade = (c: Career): Grade | undefined =>
  c.grades.length ? c.grades.reduce((a, g) => (ORDER.indexOf(g) < ORDER.indexOf(a) ? g : a)) : undefined;
