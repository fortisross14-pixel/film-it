// Careers: pick a director profile and climb the ladder (levels 1–10) over up to 10 films.
// Each grade moves the level: A +2, B +1, C stays, D −1. One F and the career is over.
// The fee goes to the studio's money; a B or an A also earns a talent pack. Reaching new
// levels opens genres for every career.

import type { Career, Film, GenreId, Grade, ParkedCareer, Profile, TalentPackId } from './types';
import { TUNING } from './tuning';
import { makeId } from './rng';
import { withRng, refreshBoard } from './profile';
import { grantTalentPack, unlockGenresForLevel } from './progression';

export type CareerResult = { ok: true; profile: Profile } | { ok: false; reason: string };
const fail = (reason: string): CareerResult => ({ ok: false, reason });
const C = () => TUNING.career;

/** Every running career: the loaded one first, then the parked ones. */
export function runningCareers(p: Profile): ParkedCareer[] {
  const loaded = p.career ? [{ career: p.career, contractBoard: p.contractBoard, activeFilm: p.activeFilm }] : [];
  return [...loaded, ...p.parked];
}

/** Put the loaded career on hold (back to the studio). */
export function parkCareer(p: Profile): Profile {
  if (!p.career) return p;
  const slot: ParkedCareer = { career: p.career, contractBoard: p.contractBoard, activeFilm: p.activeFilm };
  return { ...p, career: undefined, contractBoard: [], activeFilm: undefined, parked: [...p.parked, slot] };
}

/** Load a running career (parking whichever was loaded). */
export function enterCareer(p: Profile, careerId: string): CareerResult {
  if (p.career?.id === careerId) return { ok: true, profile: p };
  const q = parkCareer(p);
  const slot = q.parked.find((x) => x.career.id === careerId);
  if (!slot) return fail('No such career');
  return {
    ok: true,
    profile: { ...q, career: slot.career, contractBoard: slot.contractBoard, activeFilm: slot.activeFilm, parked: q.parked.filter((x) => x !== slot) },
  };
}

/** Start a new career (parking the loaded one). Up to TUNING.career.maxCareers run at once, one per director. */
export function startCareer(p: Profile, directorId: string, now = Date.now()): CareerResult {
  if (!p.unlocks.directors.includes(directorId)) return fail('That profile is locked');
  const running = runningCareers(p);
  if (running.length >= C().maxCareers) return fail(`Up to ${C().maxCareers} careers at once: retire one first`);
  if (running.some((x) => x.career.directorId === directorId)) return fail('That director already has a career running');
  p = parkCareer(p);
  const { profile, value: id } = withRng(p, (rng) => makeId('career', rng));
  const career: Career = {
    id, directorId, startedAt: now, status: 'active', level: 1, topLevel: 1, films: 0, earnings: 0,
    grades: [], nominations: 0, wins: 0, boxOffice: 0, packsEarned: 0,
  };
  const directors = { ...p.directors, [directorId]: { ...(p.directors[directorId] ?? { id: directorId, films: 0 }), id: directorId, level: 1 } };
  return { ok: true, profile: refreshBoard({ ...profile, career, directors }) };
}

function endCareer(p: Profile, status: Career['status'], now: number): Profile {
  const ended: Career = { ...p.career!, status, endedAt: now };
  return { ...p, career: undefined, careers: [...p.careers, ended], contractBoard: [] };
}

/** Stop a career early (frees its slot). */
export function retireCareer(p: Profile, now = Date.now()): CareerResult {
  if (!p.career) return fail('No career to retire');
  if (p.activeFilm) return fail('Finish or abandon the film in production first');
  return { ok: true, profile: endCareer(p, 'retired', now) };
}

export const levelAfter = (level: number, grade: Grade) =>
  Math.max(1, Math.min(TUNING.ladder.maxLevel, level + TUNING.ladder.climb[grade]));

export interface FilmOutcome {
  /** An F: the career is over. */
  fired: boolean;
  /** The 10th film: the career is complete. */
  wrapped: boolean;
  levelFrom: number;
  levelTo: number;
  genresOpened: GenreId[];
  pack?: TalentPackId;
}

/** Called when a film is delivered: move the career up or down the ladder, or end it. */
export function recordFilm(p: Profile, film: Film, moneyEarned: number, now = Date.now()): { profile: Profile; outcome: FilmOutcome } {
  const c = p.career;
  const grade = film.grade as Grade;
  const none: FilmOutcome = { fired: false, wrapped: false, levelFrom: c?.level ?? 1, levelTo: c?.level ?? 1, genresOpened: [] };
  if (!c) return { profile: p, outcome: none };
  const fired = grade === 'F';
  const level = fired ? c.level : levelAfter(c.level, grade);
  const pack = film.report?.rewards.pack;
  const career: Career = {
    ...c,
    level,
    topLevel: Math.max(c.topLevel ?? c.level, level),
    films: c.films + 1,
    earnings: c.earnings + moneyEarned,
    grades: [...c.grades, grade],
    lastGrade: grade,
    nominations: c.nominations + (film.results?.nominations.length ?? 0),
    wins: c.wins + (film.results?.wins.length ?? 0),
    boxOffice: c.boxOffice + (film.results?.boxOffice ?? 0),
    packsEarned: c.packsEarned + (pack ? 1 : 0),
  };
  const d = p.directors[c.directorId] ?? { id: c.directorId, level: 1, films: 0 };
  let next: Profile = { ...p, career, directors: { ...p.directors, [c.directorId]: { ...d, level, films: d.films + 1 } } };
  if (pack) next = grantTalentPack(next, pack);
  const g = unlockGenresForLevel(next, career.topLevel);
  next = g.profile;
  const wrapped = !fired && career.films >= TUNING.ladder.maxFilms;
  next = fired ? endCareer(next, 'fired', now) : wrapped ? endCareer(next, 'wrapped', now) : refreshBoard(next);
  return { profile: next, outcome: { fired, wrapped, levelFrom: c.level, levelTo: level, genresOpened: g.opened, pack } };
}

const ORDER: Grade[] = ['A', 'B', 'C', 'D', 'F'];
export const bestGrade = (c: Career): Grade | undefined =>
  c.grades.length ? c.grades.reduce((a, g) => (ORDER.indexOf(g) < ORDER.indexOf(a) ? g : a)) : undefined;

/** A line for the hall of fame. */
export function legacyTitle(c: Career): string {
  const top = c.topLevel ?? c.level;
  if (c.status === 'fired') return c.films <= 3 ? 'A brief flame' : 'Gone too soon';
  if (c.status === 'retired' && c.films < TUNING.ladder.maxFilms) return c.films ? 'Left the business early' : 'Never got started';
  if (top >= TUNING.ladder.maxLevel && c.wins >= 3) return 'Hollywood legend';
  if (top >= TUNING.ladder.maxLevel) return 'Blockbuster royalty';
  if (top >= 7) return 'A household name';
  if (top >= 4) return 'A respected director';
  return 'A working director';
}
