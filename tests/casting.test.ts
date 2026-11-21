import { newProfile, startFilm } from '../src/engine/profile';
import type { Actor, Film, Profile } from '../src/engine/types';
import { generateContract } from '../src/engine/contracts';
import { createRng } from '../src/engine/rng';
import { addBeat, addRole, addScene, finishScript, screenTime, type EditResult } from '../src/engine/script';
import {
  actorFit, actorPay, baseFee, budgetLeft, castActor, castingBlockers, castingScore, drawCards, finishCasting,
  redrawFee, releaseRole, roleSkillNeeds, rolePay, type CastResult,
} from '../src/engine/casting';
import { TUNING } from '../src/engine/tuning';
import { checkRequirements } from '../src/engine/script';

const ok = (r: EditResult): Film => {
  if (!r.ok) throw new Error(r.reason);
  return r.film;
};
const okP = (r: CastResult): Profile => {
  if (!r.ok) throw new Error(r.reason);
  return r.profile;
};

/** Profile with a locked 3-scene script: Main (role1), Villain (role2). */
function castingProfile(budget = 25000, directorId = 'starterB'): Profile {
  const p = newProfile('T', 21);
  p.unlocks.directors.push('scout');
  p.directors.scout = { id: 'scout', level: 1, films: 0 };
  const c = { ...generateContract(createRng(9), 1, { archetype: 'crowd', genre: 'action' }), budget, rating: 'PG-13' as const };
  p.contractBoard = [c];
  const r = startFilm(p, c.id, directorId);
  if (!r.ok) throw new Error(r.reason);
  let f = ok(addRole(ok(addRole(r.profile.activeFilm!, 'main')), 'villain'));
  for (let i = 0; i < 3; i++) {
    f = ok(addScene(f, { duration: 'medium', tone: 'thrill' }));
    const id = f.scenes[i].id;
    f = ok(addBeat(f, id, { roleId: 'role2', actionId: 'threatens', targetId: 'role1' }));
    f = ok(addBeat(f, id, { roleId: 'role1', actionId: 'fights', targetId: 'role2' }));
  }
  f = ok(finishScript(f));
  return { ...r.profile, activeFilm: f };
}

const actor = (over: Partial<Actor> = {}): Actor => ({
  id: 'a', name: 'A', starPower: 50, acting: 60, rarity: 'rare', traits: [], age: 'adult',
  skills: { action: 50, comedy: 50, drama: 50, romance: 50, menace: 50 }, ...over,
});

describe('skill needs & fit', () => {
  it('derives needs from beats', () => {
    const f = castingProfile().activeFilm!;
    const villain = roleSkillNeeds(f, f.roles[1]);
    const main = roleSkillNeeds(f, f.roles[0]);
    expect(villain.menace).toBeGreaterThan(0.8);
    expect(main.action).toBeGreaterThan(main.comedy);
    expect(Object.values(main).reduce((a, b) => a + b, 0)).toBeCloseTo(1);
  });
  it('fits actors with the right skills', () => {
    const f = castingProfile().activeFilm!;
    const brute = actor({ skills: { action: 30, comedy: 20, drama: 30, romance: 20, menace: 95 } });
    const clown = actor({ skills: { action: 30, comedy: 95, drama: 30, romance: 20, menace: 10 } });
    expect(actorFit(f, f.roles[1], brute)).toBeGreaterThan(actorFit(f, f.roles[1], clown));
  });
});

describe('pay', () => {
  it('scales with star power, billing and screen time', () => {
    expect(baseFee(actor({ starPower: 90 }), 'lead')).toBeGreaterThan(baseFee(actor({ starPower: 30 }), 'lead') * 50);
    expect(baseFee(actor({ starPower: 60 }), 'minor')).toBeLessThan(baseFee(actor({ starPower: 60 }), 'lead'));
    expect(baseFee(actor({ starPower: 60, traits: ['diva'] }), 'lead')).toBeGreaterThan(baseFee(actor({ starPower: 60 }), 'lead'));
    const role = { id: 'r', name: 'R', type: 'main' as const, billing: 'lead' as const };
    expect(actorPay(actor(), role, 40).total).toBeGreaterThan(actorPay(actor(), role, 10).total);
  });
});

describe('draws', () => {
  it('every draw holds at least one card a tiny film can afford', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const base = castingProfile(2500);
      const p = okP(drawCards({ ...base, seed: seed * 101 }, 'role1'));
      const f = p.activeFilm!;
      const role = f.roles.find((r) => r.id === 'role1')!;
      const cap = f.contract.budget * TUNING.casting.affordShare[role.billing];
      expect(f.casting.role1.offered.some((a) => rolePay(f, role, a) <= cap)).toBe(true);
    }
  });

  it('first draw is free and shows 3 cards; redraws escalate and reject cards', () => {
    let p = castingProfile();
    expect(redrawFee(p.activeFilm!, 'role1')).toBe(0);
    p = okP(drawCards(p, 'role1'));
    const first = p.activeFilm!.casting.role1.offered;
    expect(first).toHaveLength(3);
    expect(p.activeFilm!.ledger).toHaveLength(1); // only the script
    const fee1 = redrawFee(p.activeFilm!, 'role1');
    p = okP(drawCards(p, 'role1'));
    const fee2 = redrawFee(p.activeFilm!, 'role1');
    expect(fee2).toBe(fee1 * 2);
    expect(p.activeFilm!.ledger.at(-1)!.amount).toBe(fee1);
    expect(p.activeFilm!.rejected).toEqual(expect.arrayContaining(first.map((a) => a.id)));
    const second = p.activeFilm!.casting.role1.offered;
    expect(second.some((a) => first.some((b) => b.id === a.id))).toBe(false);
  });
  it('casting a card rejects the other two', () => {
    let p = okP(drawCards(castingProfile(), 'role1'));
    const [a, b, c] = p.activeFilm!.casting.role1.offered;
    p = okP(castActor(p, 'role1', a.id));
    expect(p.activeFilm!.roles[0].actor!.id).toBe(a.id);
    expect(p.activeFilm!.rejected).toEqual(expect.arrayContaining([b.id, c.id]));
    expect(castActor(p, 'role1', b.id).ok).toBe(false);
    // The cast actor never appears for another role.
    p = okP(drawCards(p, 'role2'));
    expect(p.activeFilm!.casting.role2.offered.some((x) => [a.id, b.id, c.id].includes(x.id))).toBe(false);
  });
  it('tops up the pool with fresh faces when talent runs out', () => {
    let p = castingProfile(10_000_000);
    p = { ...p, actorPool: p.actorPool.slice(0, 4) };
    const start = p.actorPool.length;
    for (let i = 0; i < 3; i++) p = okP(drawCards(p, 'role1'));
    expect(p.actorPool.length).toBeGreaterThan(start);
    expect(p.activeFilm!.casting.role1.offered).toHaveLength(3);
  });
  it('refuses redraws you cannot afford', () => {
    let p = castingProfile(5);
    p = okP(drawCards(p, 'role1'));
    expect(drawCards(p, 'role1').ok).toBe(false);
  });
  it('Talent Scout redraws are cheaper', () => {
    const a = okP(drawCards(castingProfile(25000, 'starterB'), 'role1')).activeFilm!;
    const b = okP(drawCards(castingProfile(25000, 'scout'), 'role1')).activeFilm!;
    expect(redrawFee(b, 'role1')).toBeLessThan(redrawFee(a, 'role1'));
  });
});

describe('finish', () => {
  function castAll(p: Profile): Profile {
    for (const r of p.activeFilm!.roles) {
      p = okP(drawCards(p, r.id));
      p = okP(castActor(p, r.id, p.activeFilm!.casting[r.id].offered[0].id));
    }
    return p;
  }
  it('needs everyone cast, then charges pay and moves to shooting', () => {
    let p = castingProfile();
    expect(castingBlockers(p.activeFilm!)).toHaveLength(2);
    expect(finishCasting(p).ok).toBe(false);
    p = castAll(p);
    const before = budgetLeft(p.activeFilm!);
    expect(castingScore(p.activeFilm!).total).toBeGreaterThan(0);
    p = okP(finishCasting(p));
    const f = p.activeFilm!;
    expect(f.phase).toBe('shooting');
    expect(f.ledger.filter((e) => e.label.startsWith('Cast:'))).toHaveLength(2);
    const st = screenTime(f);
    expect(f.roles[0].pay).toBe(actorPay(f.roles[0].actor!, f.roles[0], st.role1).total);
    expect(budgetLeft(f)).toBe(before);
    expect(f.castingScore).toBeGreaterThan(0);
  });
  it('checks lead star power once the main is cast', () => {
    let p = castAll(castingProfile());
    p = { ...p, activeFilm: { ...p.activeFilm!, contract: { ...p.activeFilm!.contract, hardReqs: [{ kind: 'leadStarPower', min: 0 }] } } };
    expect(checkRequirements(p.activeFilm!)[0].status).toBe('met');
  });
  it('release lets you recast (actor is gone for this film)', () => {
    let p = castAll(castingProfile());
    const id = p.activeFilm!.roles[0].actor!.id;
    p = okP(releaseRole(p, 'role1'));
    expect(p.activeFilm!.roles[0].actor).toBeUndefined();
    expect(p.activeFilm!.rejected).toContain(id);
  });
});
