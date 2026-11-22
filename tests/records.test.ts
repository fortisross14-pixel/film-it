import { newProfile } from '../src/engine/profile';
import { startCareer } from '../src/engine/career';
import { newRecords, records } from '../src/engine/records';
import type { Film, FilmResults, Profile } from '../src/engine/types';

const film = (id: string, r: Partial<FilmResults>) => ({ id, title: id, grade: 'B', gradeScore: 70, results: { criticsRating: 60, publicRating: 60, boxOffice: 1000, nominations: [], wins: [], ...r } }) as unknown as Film;

describe('records', () => {
  function studio(): Profile {
    const s = startCareer(newProfile('T', 1), 'starterA', 1, 'Ana');
    if (!s.ok) throw new Error(s.reason);
    const c = s.profile.career!;
    const add = (f: Film) => ({ careerId: c.id, completedAt: 0, film: f });
    return { ...s.profile, filmography: [add(film('Quiet', { criticsRating: 91, wins: ['X'], nominations: ['X', 'Y'] })), add(film('Loud', { publicRating: 88, boxOffice: 90000 }))] };
  }
  it('holds the bests across films and careers', () => {
    const r = Object.fromEntries(records(studio()).map((x) => [x.key, x]));
    expect(r.critics).toMatchObject({ value: 91, holder: 'Quiet' });
    expect(r.audience).toMatchObject({ value: 88, holder: 'Loud' });
    expect(r.boxOffice).toMatchObject({ value: 90000, holder: 'Loud' });
    expect(r.awards).toMatchObject({ holder: 'Quiet', detail: '1 won, 2 nominations' });
    expect(r.careerBoxOffice).toMatchObject({ value: 91000, holder: 'Ana' });
    expect(records(newProfile('E', 1))).toEqual([]);
  });
  it('spots a new record', () => {
    const p = studio();
    expect(newRecords(p, film('New', { criticsRating: 95, boxOffice: 100000 }))).toEqual(['critics', 'boxOffice']);
    expect(newRecords(p, film('Meh', {}))).toEqual([]);
    expect(newRecords(newProfile('E', 1), film('First', { criticsRating: 99 }))).toEqual([]);
  });
});
