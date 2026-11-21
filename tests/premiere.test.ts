import { postProfile } from './helpers';
import type { Film, FilmResults, Profile } from '../src/engine/types';
import { finishPost } from '../src/engine/post';
import { computeResults, deliverFilm, ratingFactors, runPremiere, type PremiereResult } from '../src/engine/premiere';
import { boxOfficeScore, gradeFilm } from '../src/engine/grade';
import { createRng } from '../src/engine/rng';
import { TUNING } from '../src/engine/tuning';

const okR = (r: PremiereResult): Profile => { if (!r.ok) throw new Error(r.reason); return r.profile; };

function premiereProfile(genre: 'thriller' | 'drama' = 'thriller', budget = 25000): Profile {
  const p = postProfile(genre, budget);
  const r = finishPost(p.activeFilm!);
  if (!r.ok) throw new Error(r.reason);
  return { ...p, activeFilm: r.film };
}

const results = (over: Partial<FilmResults> = {}): FilmResults => ({
  buzz: 50, publicRating: 70, criticsRating: 70, factors: {}, boredom: 10, overproduction: 0, openingWeekend: 0, weekly: [],
  boxOffice: 50000, nominations: [], wins: [], awardDrivers: {}, ...over,
});

describe('ratings', () => {
  it('computes factors and ratings in range', () => {
    const f = premiereProfile().activeFilm!;
    const fac = ratingFactors(f);
    for (const v of Object.values(fac)) { expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThanOrEqual(100); }
    const r = computeResults(createRng(1), f);
    expect(r.publicRating).toBeGreaterThanOrEqual(0);
    expect(r.criticsRating).toBeLessThanOrEqual(100);
    expect(r.weekly).toHaveLength(TUNING.premiere.runWeeks);
    expect(r.boxOffice).toBe(r.weekly.reduce((a, b) => a + b, 0));
    expect(r.weekly[1]).toBeLessThan(r.weekly[0]);
  });
  it('boredom hurts the public more than critics', () => {
    const f = premiereProfile().activeFilm!;
    const short: Film = { ...f, scenes: f.scenes.map((s) => ({ ...s, duration: 'short' as const })) };
    const long: Film = { ...f, scenes: f.scenes.map((s) => ({ ...s, duration: 'long' as const })) };
    const a = computeResults(createRng(1), long), b = computeResults(createRng(1), short);
    expect(a.publicRating - b.publicRating).toBeGreaterThan(a.criticsRating - b.criticsRating);
  });
  it('a better public rating gives longer legs', () => {
    const f = premiereProfile().activeFilm!;
    const great: Film = { ...f, scriptQuality: 100 };
    expect(computeResults(createRng(1), great).boxOffice).toBeGreaterThan(computeResults(createRng(1), { ...f, scriptQuality: 0 }).boxOffice);
  });
});

describe('grade', () => {
  it('box office score is 80 at target and grows above', () => {
    expect(boxOfficeScore(100, 100)).toBe(80);
    expect(boxOfficeScore(200, 100)).toBe(100);
    expect(boxOfficeScore(50, 100)).toBeLessThan(80);
  });
  it('weights by the brief: a hit with no awards fails an award brief', () => {
    const f = premiereProfile().activeFilm!;
    const award = { ...f, contract: { ...f.contract, archetype: 'award' as const, weights: { ...TUNING.weights.award } } };
    const block = { ...f, contract: { ...f.contract, archetype: 'blockbuster' as const, weights: { ...TUNING.weights.blockbuster } } };
    const r = results({ boxOffice: f.contract.boxOfficeTarget * 5, criticsRating: 45, publicRating: 80 });
    expect(gradeFilm(block, r).satisfaction).toBeGreaterThan(gradeFilm(award, r).satisfaction + 20);
    expect(gradeFilm(award, r).components.awards).toBe(0);
  });
  it('late delivery lowers the score after weighting', () => {
    const f = premiereProfile().activeFilm!;
    const onTime = gradeFilm({ ...f, contract: { ...f.contract, deadlineWeeks: 99 } }, results());
    const late = gradeFilm({ ...f, contract: { ...f.contract, deadlineWeeks: 1 } }, results());
    expect(late.weeksLate).toBeGreaterThan(0);
    expect(late.score).toBe(Math.round(Math.max(0, onTime.score - late.latePenalty - late.overBudgetPenalty + onTime.overBudgetPenalty)));
  });
  it('each missed hard requirement caps the grade one letter', () => {
    const f = premiereProfile().activeFilm!;
    const clean = { ...f, contract: { ...f.contract, hardReqs: [] } };
    const missing = { ...f, contract: { ...f.contract, hardReqs: [{ kind: 'action' as const, actionId: 'pranks' }, { kind: 'role' as const, roleType: 'comicRelief' as const }] } };
    const r = results({ publicRating: 100, criticsRating: 100, boxOffice: 1e9, nominations: ['A', 'B', 'C', 'D'], wins: ['A', 'B'] });
    const g1 = gradeFilm(clean, r), g2 = gradeFilm(missing, r);
    expect(g2.missedReqs).toHaveLength(2);
    const order = ['A', 'B', 'C', 'D', 'F'];
    expect(order.indexOf(g2.grade)).toBe(Math.min(4, order.indexOf(g1.grade) + 2));
  });
  it('bonus goals add points', () => {
    const f = premiereProfile().activeFilm!;
    const withGoal = { ...f, contract: { ...f.contract, bonusGoals: [{ kind: 'criticsAtLeast' as const, min: 50, points: 4 }] } };
    const g = gradeFilm(withGoal, results());
    expect(g.bonusPoints).toBe(4);
    expect(g.bonusMet).toHaveLength(1);
  });
  it('rewards scale with grade and awards', () => {
    const p0 = premiereProfile().activeFilm!;
    const f = { ...p0, contract: { ...p0.contract, hardReqs: [], budget: 1e7, deadlineWeeks: 99 } };
    const good = gradeFilm(f, results({ publicRating: 100, criticsRating: 100, boxOffice: 1e9, nominations: ['X'], wins: ['X'] }));
    const bad = gradeFilm(f, results({ publicRating: 0, criticsRating: 0, boxOffice: 0 }));
    expect(good.rewards.reputation).toBeGreaterThan(bad.rewards.reputation);
    expect(good.rewards.awardRep).toBe(TUNING.rewards.nominationRep + TUNING.rewards.winRep);
  });
});

describe('balance anchors', () => {
  it("the requirements doc's example: a $400M hit with 45% critics and no nominations on an award brief lands at C", () => {
    const p0 = premiereProfile().activeFilm!;
    const f = { ...p0, contract: { ...p0.contract, archetype: 'award' as const, weights: { ...TUNING.weights.award }, hardReqs: [], bonusGoals: [], budget: 1e6, deadlineWeeks: 99, boxOfficeTarget: 150_000 } };
    const g = gradeFilm(f, results({ boxOffice: 400_000, criticsRating: 45, publicRating: 75, nominations: [], wins: [] }));
    expect(g.grade).toBe('C');
  });
});

describe('premiere & delivery', () => {
  it('runs once, then delivers rewards and resets for the next contract', () => {
    let p = premiereProfile();
    expect(deliverFilm(p).ok).toBe(false);
    p = okR(runPremiere(p));
    const f = p.activeFilm!;
    expect(f.results).toBeDefined();
    expect(f.grade).toMatch(/[A-F]/);
    expect(runPremiere(p).ok).toBe(false);
    const credits = p.credits, board = p.contractBoard.map((c) => c.id);
    const r = deliverFilm(p, 123);
    const q = okR(r);
    expect(q.activeFilm).toBeUndefined();
    expect(q.filmography).toHaveLength(1);
    expect(q.filmography[0]).toMatchObject({ completedAt: 123, careerId: p.career!.id, film: { phase: 'done', grade: f.grade } });
    expect(q.credits).toBe(credits + f.report!.rewards.credits + f.report!.rewards.unspentCredits);
    if (f.grade !== 'F') {
      expect(q.career!.reputation).toBe(f.report!.rewards.reputation + f.report!.rewards.awardRep);
      expect(q.career!.level).toBe(2);
      expect(q.career!.films).toBe(1);
      expect(q.directors[f.directorId].level).toBe(2);
      expect(q.contractBoard.map((c) => c.id)).not.toEqual(board);
    }
    // save-systems: a stored film (cast, every take, results) must stay small — 40 of them
    // plus the profile should fit comfortably in localStorage (~5 MB per origin).
    const filmBytes = JSON.stringify(q.filmography[0]).length;
    expect(filmBytes * 40 + JSON.stringify({ ...q, filmography: [] }).length).toBeLessThan(2_000_000);
  });
  it('a cheap, well-reviewed film can reach festivals', () => {
    const f = premiereProfile('drama', 8000).activeFilm!;
    const strong: Film = { ...f, scriptQuality: 100, scenes: f.scenes.map((s) => ({ ...s, duration: 'long' as const, takes: s.takes.map((t) => ({ ...t, score: 100, meters: { pace: 100, chemistry: 100, dialogue: 100 } })) })) };
    let festivals = 0;
    for (let seed = 1; seed <= 20; seed++) if (computeResults(createRng(seed), strong).nominations.some((n) => n.startsWith('Festival'))) festivals++;
    expect(festivals).toBeGreaterThan(10);
  });
});
