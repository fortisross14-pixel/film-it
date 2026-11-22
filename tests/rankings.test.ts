import { newProfile } from '../src/engine/profile';
import { careerName, startCareer } from '../src/engine/career';
import { filmPay } from '../src/engine/grade';
import { directorStats, rankDirectors } from '../src/engine/rankings';
import { generateContract } from '../src/engine/contracts';
import { createRng } from '../src/engine/rng';
import { TUNING } from '../src/engine/tuning';
import type { Career, Film, FilmResults, Grade, Profile } from '../src/engine/types';

const results = (o: Partial<FilmResults>) => ({ boxOffice: 0, publicRating: 50, criticsRating: 50, nominations: [], wins: [], ...o });

describe('what a film pays', () => {
  const c = generateContract(createRng(1), 4, { archetype: 'crowd' });
  it('pays the fee by grade, nothing for an F', () => {
    expect(filmPay(c, 'C', results({})).total).toBe(c.rewards.fee);
    expect(filmPay(c, 'A', results({})).fee).toBeGreaterThan(filmPay(c, 'B', results({})).fee);
    expect(filmPay(c, 'F', results({ boxOffice: 1e9, publicRating: 99, criticsRating: 99, wins: ['X'], nominations: ['X'] })).total).toBe(0);
  });
  it('adds box office, ratings and awards bonuses', () => {
    const base = filmPay(c, 'B', results({}));
    const hit = filmPay(c, 'B', results({ boxOffice: c.boxOfficeTarget * 2 }));
    expect(hit.boxOfficeBonus).toBe(Math.round((c.rewards.fee * Math.min(1, TUNING.rewards.boxOfficeBonusCap)) / 5) * 5);
    expect(hit.boxOfficeBonus).toBeGreaterThan(0);
    const huge = filmPay(c, 'B', results({ boxOffice: c.boxOfficeTarget * 10 }));
    expect(huge.boxOfficeBonus).toBe(Math.round((c.rewards.fee * TUNING.rewards.boxOfficeBonusCap) / 5) * 5);
    expect(filmPay(c, 'B', results({ publicRating: 90, criticsRating: 90 })).ratingBonus).toBeGreaterThan(0);
    expect(base.ratingBonus).toBe(0);
    const awards = filmPay(c, 'B', results({ nominations: ['A', 'B'], wins: ['A'] }));
    expect(awards.awardBonus).toBeGreaterThan(TUNING.rewards.winBonus);
    const low = filmPay({ ...c, level: 1 }, 'B', results({ nominations: ['A', 'B'], wins: ['A'] }));
    expect(awards.awardBonus).toBeGreaterThan(low.awardBonus);
  });
});

describe('director rankings', () => {
  function withFilms(): Profile {
    let p = newProfile('T', 9);
    const add = (q: Profile, career: Career, title: string, grade: Grade, r: Partial<FilmResults>): Profile => ({
      ...q,
      filmography: [...q.filmography, { careerId: career.id, completedAt: 0, film: { id: title, title, grade, gradeScore: 70, results: results(r) } as unknown as Film }],
    });
    const a = startCareer(p, 'starterA', 1, 'Ana Critic');
    if (!a.ok) throw new Error(a.reason);
    p = a.profile;
    const ca = p.career!;
    const b = startCareer(p, 'starterB', 2, '  ');
    if (!b.ok) throw new Error(b.reason);
    p = b.profile;
    const cb = p.career!;
    p = add(p, ca, 'Art', 'A', { criticsRating: 90, publicRating: 60, boxOffice: 1000, nominations: ['X', 'Y'], wins: ['X'] });
    p = add(p, ca, 'Art 2', 'B', { criticsRating: 80, publicRating: 62, boxOffice: 1000 });
    p = add(p, cb, 'Boom', 'B', { criticsRating: 50, publicRating: 85, boxOffice: 90000, nominations: ['Z'] });
    // A finished career with no films is not ranked.
    p = { ...p, careers: [{ ...ca, id: 'old', name: 'Nobody' }] };
    return p;
  }

  it('names the director you create (random when left empty)', () => {
    const p = withFilms();
    const names = directorStats(p).map((s) => careerName(s.career));
    expect(names).toContain('Ana Critic');
    expect(names[0].trim().length).toBeGreaterThan(3);
    expect(names.filter((n) => n.trim() === '')).toHaveLength(0);
  });

  it('averages and totals each director from their films', () => {
    const s = directorStats(withFilms()).find((x) => x.career.name === 'Ana Critic')!;
    expect(s).toMatchObject({ films: 2, critics: 85, audience: 61, nominations: 2, wins: 1, boxOffice: 2000, running: true });
    expect(s.best?.title).toBe('Art');
  });

  it('ranks by critics, audience, awards and box office', () => {
    const p = withFilms();
    const top = (k: Parameters<typeof rankDirectors>[1]) => rankDirectors(p, k).map((s) => s.career.name);
    expect(top('critics')[0]).toBe('Ana Critic');
    expect(top('audience')[0]).not.toBe('Ana Critic');
    expect(top('awards')[0]).toBe('Ana Critic');
    expect(top('boxOffice')[0]).not.toBe('Ana Critic');
    expect(rankDirectors(p, 'critics')).toHaveLength(2);
  });
});
