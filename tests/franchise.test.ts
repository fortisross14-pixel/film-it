import { castProfile, okP, postProfile } from './helpers';
import type { Film, Profile } from '../src/engine/types';
import { afterDelivery, franchiseEffect, isHit, loyaltyMult, sequelContract, updateActorCareers } from '../src/engine/franchise';
import { computeResults, deliverFilm, runPremiere, type PremiereResult } from '../src/engine/premiere';
import { finishPost } from '../src/engine/post';
import { drawCards, rolePay } from '../src/engine/casting';
import { startFilm } from '../src/engine/profile';
import { createRng } from '../src/engine/rng';
import { gradeFilm } from '../src/engine/grade';
import { TUNING } from '../src/engine/tuning';
import { FAMOUS } from '../src/engine/data/actors';

const okR = (r: PremiereResult): Profile => { if (!r.ok) throw new Error(r.reason); return r.profile; };
const graded = (grade: 'A' | 'F', wins: string[] = []): Film => {
  const f = postProfile().activeFilm!;
  const r = { ...computeResults(createRng(1), f), wins, boxOffice: grade === 'A' ? f.contract.boxOfficeTarget * 3 : 0 };
  return { ...f, grade, results: r };
};

describe('actor careers', () => {
  it('hits raise star power, flops lower it, wins add more', () => {
    const p = postProfile();
    const hit = graded('A'), flop = graded('F');
    const lead = hit.roles.find((r) => r.type === 'main')!.actor!;
    const before = p.actorPool.find((a) => a.id === lead.id)!.starPower;
    expect(updateActorCareers(p.actorPool, hit).find((a) => a.id === lead.id)!.starPower).toBe(Math.min(100, before + TUNING.actorCareers.starByGrade.A));
    expect(updateActorCareers(p.actorPool, flop).find((a) => a.id === lead.id)!.starPower).toBeLessThan(before);
    const win = graded('A', [`Best Lead Performance: ${lead.name}`]);
    expect(updateActorCareers(p.actorPool, win).find((a) => a.id === lead.id)!.wins).toBe(1);
    const a = updateActorCareers(p.actorPool, hit).find((x) => x.id === lead.id)!;
    expect(a.films).toBe(1);
    expect(a.credits?.[0]).toEqual({ title: hit.title, grade: 'A' });
  });

  it('actors you discovered give you a discount later', () => {
    const f = graded('A');
    const role = f.roles[0];
    const unknown = { ...role, actor: { ...role.actor!, starPower: 20 } };
    const film: Film = { ...f, roles: [unknown, ...f.roles.slice(1)] };
    const pool = updateActorCareers([{ ...role.actor!, starPower: 20 }], film);
    expect(pool[0].discoveredBy).toContain(f.directorId);
    expect(loyaltyMult(pool[0], f.directorId)).toBe(1 - TUNING.actorCareers.discoveryDiscount);
    expect(rolePay(f, role, pool[0])).toBeLessThan(rolePay(f, role, { ...pool[0], discoveredBy: [] }));
  });

  it('every actor has a gender for portraits; 36 parody stars, half and half', () => {
    expect(castProfile().actorPool.every((a) => a.gender === 'f' || a.gender === 'm')).toBe(true);
    expect(FAMOUS).toHaveLength(36);
    expect(FAMOUS.filter((x) => x.gender === 'f')).toHaveLength(18);
  });
});

describe('sequels', () => {
  it('a hit earns a sequel brief with a bigger budget and the lead as a bonus goal', () => {
    const hit = graded('A');
    expect(isHit(hit)).toBe(true);
    expect(isHit(graded('F'))).toBe(false);
    const s = sequelContract(createRng(2), hit, 1);
    expect(s.title).toBe(`${hit.title} 2`);
    expect(s.budget).toBeGreaterThan(hit.contract.budget);
    expect(s.studio).toEqual(hit.contract.studio);
    expect(s.genre).toBe(hit.contract.genre);
    expect(s.bonusGoals.some((b) => b.kind === 'returningLead')).toBe(true);
    expect(s.sequelOf).toMatchObject({ number: 2, franchise: hit.title });
  });

  it('afterDelivery puts the sequel first on the board', () => {
    const p = postProfile();
    const board = castProfile().contractBoard.length ? castProfile().contractBoard : [];
    const fresh = Array.from({ length: 4 }, (_, i) => ({ ...sequelContract(createRng(9 + i), graded('A'), 1), sequelOf: undefined, id: `c${i}` }));
    const q = afterDelivery({ ...p, activeFilm: undefined, contractBoard: board.length >= 4 ? board : fresh }, graded('A'), createRng(3));
    expect(q.contractBoard[0].sequelOf).toBeDefined();
    expect(q.contractBoard[0].rewards.fee).toBeGreaterThan(0);
    expect(q.contractBoard).toHaveLength(4);
  });

  it('sequels get a fanbase but some critics fatigue; the lead comes back in the first draw', () => {
    const hit = graded('A');
    const s = sequelContract(createRng(2), hit, 1);
    let p = castProfile();
    p = { ...p, activeFilm: undefined, contractBoard: [s] };
    const started = startFilm(p, s.id);
    if (!started.ok) throw new Error(started.reason);
    const film = started.profile.activeFilm!;
    expect(film.franchise).toEqual({ name: hit.title, number: 2 });
    expect(franchiseEffect(film).buzz).toBeGreaterThan(0);
    expect(franchiseEffect(film).critics).toBeLessThan(0);
    // Casting: copy the cast roles in and open casting.
    const lead = hit.roles.find((r) => r.type === 'main')!;
    const withRoles = { ...started.profile, activeFilm: { ...film, phase: 'casting' as const, roles: hit.roles.map((r) => ({ ...r, actor: undefined, pay: undefined })), scenes: hit.scenes } };
    const drawn = okP(drawCards(withRoles, lead.id));
    expect(drawn.activeFilm!.casting[lead.id].offered[0].id).toBe(lead.actor!.id);
  });

  it('bringing back the lead meets the bonus goal', () => {
    const hit = graded('A');
    const s = sequelContract(createRng(2), hit, 1);
    const film: Film = { ...hit, contract: s };
    expect(gradeFilm(film, hit.results!).bonusMet.some((b) => b.startsWith('Bring back'))).toBe(true);
  });
});

describe('rival films in award season', () => {
  it('nominations list rival films by rival directors and a winner', () => {
    const f = postProfile('drama', 8000).activeFilm!;
    const strong: Film = { ...f, scriptQuality: 100, scenes: f.scenes.map((s) => ({ ...s, duration: 'long' as const, takes: s.takes.map((t) => ({ ...t, score: 100, meters: { pace: 100, chemistry: 100, dialogue: 100 } })) })) };
    let found = false;
    for (let seed = 1; seed <= 20 && !found; seed++) {
      const r = computeResults(createRng(seed), strong);
      for (const d of r.awardDetails ?? []) {
        found = true;
        expect(d.nominees[0]).toBe(f.title);
        expect(d.nominees.length).toBe(TUNING.rivals.nomineesPerCategory);
        expect(d.nominees.slice(1).every((n) => /\(.+\)$/.test(n))).toBe(true);
        expect(d.nominees).toContain(d.winner);
        expect(r.wins.includes(d.category)).toBe(d.winner === f.title);
      }
    }
    expect(found).toBe(true);
  });

  it('delivery updates the actor pool', () => {
    let p = postProfile();
    const r = finishPost(p.activeFilm!);
    if (!r.ok) throw new Error(r.reason);
    p = okR(runPremiere({ ...p, activeFilm: r.film }));
    const lead = p.activeFilm!.roles.find((x) => x.type === 'main')!.actor!;
    const q = okR(deliverFilm(p));
    expect(q.actorPool.find((a) => a.id === lead.id)!.films).toBe(1);
  });
});
