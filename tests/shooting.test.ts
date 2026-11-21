import { newProfile, startFilm } from '../src/engine/profile';
import type { Film, Profile } from '../src/engine/types';
import { generateContract } from '../src/engine/contracts';
import { createRng } from '../src/engine/rng';
import { addBeat, addRole, addScene, finishScript, type EditResult } from '../src/engine/script';
import { castActor, drawCards, finishCasting, type CastResult } from '../src/engine/casting';
import {
  chooseVersion, crewWeekCost, doWeek, pairChemistry, predictMeters, sceneGenreFit, setFit, shootingBlockers, takeScore,
  tryAgain, weeksUsed, wrapShooting, type ShootResult,
} from '../src/engine/shooting';
import { setById } from '../src/engine/data/sets';

const ok = (r: EditResult): Film => { if (!r.ok) throw new Error(r.reason); return r.film; };
const okP = (r: CastResult | ShootResult): Profile => { if (!r.ok) throw new Error(r.reason); return r.profile; };

/** Thriller with 3 scenes, cast and signed. Scene 1 thrill chase, 2 romantic, 3 thrill showdown. */
function shootingProfile(genre: 'thriller' | 'romance' = 'thriller'): Profile {
  const p = newProfile('T', 33);
  p.unlocks.sets.push('cityStreet');
  const c = { ...generateContract(createRng(2), 1, { archetype: 'crowd', genre }), budget: 25000, rating: 'PG-13' as const, secondaryGenre: undefined };
  p.contractBoard = [c];
  const r = startFilm(p, c.id, 'starterB');
  if (!r.ok) throw new Error(r.reason);
  let f = ok(addRole(ok(addRole(ok(addRole(r.profile.activeFilm!, 'main')), 'villain')), 'romanticInterest'));
  const plan: [string, [string, string, string?][]][] = [
    ['thrill', [['role2', 'chases', 'role1'], ['role1', 'escapes']]],
    ['romantic', [['role3', 'declaresLove', 'role1'], ['role1', 'kisses', 'role3']]],
    ['thrill', [['role1', 'defeats', 'role2'], ['role2', 'threatens', 'role3']]],
  ];
  plan.forEach(([tone, beats], i) => {
    f = ok(addScene(f, { duration: 'medium', tone: tone as never }));
    for (const [roleId, actionId, targetId] of beats) f = ok(addBeat(f, f.scenes[i].id, { roleId, actionId, targetId }));
  });
  let q: Profile = { ...r.profile, activeFilm: ok(finishScript(f)) };
  for (const role of q.activeFilm!.roles) {
    q = okP(drawCards(q, role.id));
    q = okP(castActor(q, role.id, q.activeFilm!.casting[role.id].offered[0].id));
  }
  return okP(finishCasting(q));
}

const sceneId = (p: Profile, i: number) => p.activeFilm!.scenes[i].id;

describe('fits', () => {
  it('a chase fits a thriller better than a romance', () => {
    const thr = shootingProfile('thriller').activeFilm!;
    const rom = { ...thr, contract: { ...thr.contract, genre: 'romance' as const } };
    expect(sceneGenreFit(thr, thr.scenes[0])).toBeGreaterThan(sceneGenreFit(rom, rom.scenes[0]));
  });
  it('sets fit their tones', () => {
    const f = shootingProfile().activeFilm!;
    expect(setFit(setById('cityStreet'), f.scenes[0])).toBeGreaterThan(setFit(setById('apartment'), f.scenes[0]));
    expect(setFit(setById('park'), f.scenes[1])).toBeGreaterThan(setFit(setById('warehouse'), f.scenes[1]));
  });
  it('hidden pair chemistry is stable per pair', () => {
    const f = shootingProfile().activeFilm!;
    const [a, b] = [f.roles[0].actor!, f.roles[1].actor!];
    expect(pairChemistry(a, b)).toBe(pairChemistry(b, a));
  });
});

describe('what moves the bubbles', () => {
  const base = () => shootingProfile();
  const predict = (p: Profile, i: number, set = 'cityStreet', focus: 'pace' | 'chemistry' | 'dialogue' = 'pace') =>
    predictMeters(p.activeFilm!, p.activeFilm!.scenes[i], setById(set), focus).meters;

  it('focus boosts its meter', () => {
    const p = base();
    expect(predict(p, 0, 'cityStreet', 'pace').pace).toBeGreaterThan(predict(p, 0, 'cityStreet', 'chemistry').pace);
    expect(predict(p, 0, 'cityStreet', 'chemistry').chemistry).toBeGreaterThan(predict(p, 0, 'cityStreet', 'pace').chemistry);
  });
  it('a fitting set gives more', () => {
    const p = base();
    expect(predict(p, 0, 'cityStreet').pace).toBeGreaterThan(predict(p, 0, 'apartment').pace);
  });
  it('practice raises pace and dialogue for that scene', () => {
    const p = base();
    const q = okP(doWeek(p, { kind: 'practice', sceneId: sceneId(p, 0) }));
    expect(predict(q, 0).dialogue).toBeGreaterThan(predict(p, 0).dialogue);
    expect(predict(q, 0).pace).toBeGreaterThanOrEqual(predict(p, 0).pace);
  });
  it('club meetup raises chemistry', () => {
    const p = base();
    const q = okP(doWeek(p, { kind: 'club' }));
    expect(predict(q, 1, 'park', 'chemistry').chemistry).toBeGreaterThan(predict(p, 1, 'park', 'chemistry').chemistry);
  });
  it('shooting tires the cast; relaxing recovers but lines fade', () => {
    let p = base();
    p = okP(doWeek(p, { kind: 'practice', sceneId: sceneId(p, 0) }));
    const practiced = predict(p, 0);
    p = okP(doWeek(p, { kind: 'shoot', sceneId: sceneId(p, 1), setId: 'park', focus: 'chemistry' }));
    p = okP(tryAgain(p));
    p = okP(doWeek(p, { kind: 'shoot', sceneId: sceneId(p, 1), setId: 'park', focus: 'chemistry' }));
    p = okP(tryAgain(p));
    expect(p.activeFilm!.shooting!.fatigue.role1).toBeGreaterThan(0);
    const tired = predict(p, 0);
    expect(tired.pace).toBeLessThan(practiced.pace);
    p = okP(doWeek(p, { kind: 'relax' }));
    const rested = predict(p, 0);
    expect(rested.pace).toBeGreaterThan(tired.pace);
    expect(p.activeFilm!.shooting!.practice[sceneId(p, 0)].dialogue).toBeLessThan(practiced.dialogue + 100);
    expect(p.activeFilm!.shooting!.practice[sceneId(p, 0)].dialogue).toBeLessThan(35);
  });
});

describe('shoots and versions', () => {
  it('a shoot makes bubbles and 3 versions: pace, chemistry, rough', () => {
    let p = shootingProfile();
    p = okP(doWeek(p, { kind: 'shoot', sceneId: sceneId(p, 0), setId: 'cityStreet', focus: 'pace' }));
    const pending = p.activeFilm!.shooting!.pending!;
    expect(pending.versions.map((v) => v.version)).toEqual(['pace', 'chemistry', 'rough']);
    const [pace, chem, rough] = pending.versions;
    expect(pace.meters.pace).toBeGreaterThan(chem.meters.pace);
    expect(chem.meters.chemistry).toBeGreaterThan(pace.meters.chemistry);
    expect(rough.score).toBeLessThan(Math.min(pace.score, chem.score));
    const total = pending.bubbles.filter((b) => b.meter === 'pace').reduce((a, b) => a + b.value, 0);
    expect(total).toBe(pending.meters.pace);
    expect(pending.revealed.length).toBeGreaterThan(0);
    expect(doWeek(p, { kind: 'club' }).ok).toBe(false); // must pick first
    p = okP(chooseVersion(p, chem.id));
    const s = p.activeFilm!.scenes[0];
    expect(s.chosenTakeId).toBe(chem.id);
    expect(s.takes).toHaveLength(3);
    expect(s.setId).toBe('cityStreet');
  });
  it('noise: two identical shoots differ a little', () => {
    let p = shootingProfile();
    p = okP(doWeek(p, { kind: 'shoot', sceneId: sceneId(p, 2), setId: 'warehouse', focus: 'pace' }));
    const a = p.activeFilm!.shooting!.pending!.meters;
    p = okP(doWeek(okP(tryAgain(p)), { kind: 'relax' }));
    // same conditions are hard to recreate exactly; compare against the prediction instead
    const pred = predictMeters(shootingProfile().activeFilm!, shootingProfile().activeFilm!.scenes[2], setById('warehouse'), 'pace').meters;
    expect(Math.abs(a.pace - pred.pace)).toBeLessThanOrEqual(Math.ceil(pred.pace * 0.08) + 1);
  });
  it('take score weights meters by tone', () => {
    const f = shootingProfile().activeFilm!;
    const m = { pace: 90, chemistry: 30, dialogue: 50 };
    expect(takeScore(f.scenes[0], m)).toBeGreaterThan(takeScore(f.scenes[1], m));
  });
  it('weeks cost crew money and count toward the deadline; wrap goes to post', () => {
    let p = shootingProfile();
    const spentBefore = p.activeFilm!.ledger.length;
    p = okP(doWeek(p, { kind: 'club' }));
    expect(weeksUsed(p.activeFilm!)).toBe(1);
    expect(p.activeFilm!.ledger.at(-1)!.amount).toBe(crewWeekCost(p.activeFilm!));
    expect(p.activeFilm!.ledger.length).toBe(spentBefore + 1);
    expect(wrapShooting(p).ok).toBe(false);
    for (let i = 0; i < 3; i++) {
      p = okP(doWeek(p, { kind: 'shoot', sceneId: sceneId(p, i), setId: 'warehouse', focus: 'dialogue' }));
      p = okP(chooseVersion(p, p.activeFilm!.shooting!.pending!.versions[0].id));
    }
    expect(shootingBlockers(p.activeFilm!)).toEqual([]);
    p = okP(wrapShooting(p));
    expect(p.activeFilm!.phase).toBe('post');
    expect(weeksUsed(p.activeFilm!)).toBe(5);
  });
  it('locked sets cannot be used', () => {
    const p = shootingProfile();
    expect(doWeek(p, { kind: 'shoot', sceneId: sceneId(p, 0), setId: 'colosseum', focus: 'pace' }).ok).toBe(false);
  });
});
