import { newProfile, startFilm } from '../src/engine/profile';
import type { Beat, Contract, Film } from '../src/engine/types';
import { generateContract } from '../src/engine/contracts';
import { createRng } from '../src/engine/rng';
import { directorById } from '../src/engine/data/directors';
import {
  addBeat, addRole, addScene, availableActions, beatDepth, checkRequirements, fillerShare, finishScript, layout, moveScene,
  participants, removeBeat, removeRole, removeScene, renameRole, screenTime, scriptBlockers, scriptCost, scriptProfile,
  scriptQuality, setRuntime, setTopic, updateBeat, updateScene, type EditResult,
} from '../src/engine/script';

const ok = (r: EditResult): Film => {
  if (!r.ok) throw new Error(r.reason);
  return r.film;
};

function filmFor(overrides: Partial<Contract> = {}): Film {
  const p = newProfile('T', 11);
  const c = { ...generateContract(createRng(4), 1, { archetype: 'crowd', genre: 'drama' }), rating: 'PG-13' as const, secondaryGenre: undefined, ...overrides };
  p.contractBoard = [c];
  const r = startFilm(p, c.id, 'starterA');
  if (!r.ok) throw new Error(r.reason);
  return r.profile.activeFilm!;
}

/** Main (role1), Villain (role2), Romantic interest (role3). */
function withCast(f = filmFor()): Film {
  return ok(addRole(ok(addRole(ok(addRole(f, 'main')), 'villain')), 'romanticInterest'));
}

function scene(f: Film, duration: 'short' | 'medium' | 'long', tone: Film['scenes'][0]['tone'], beats: Beat[], others: string[] = []): Film {
  const r = addScene(f, { duration, tone });
  let g = ok(r);
  const id = (r as { sceneId: string }).sceneId;
  for (const b of beats) g = ok(addBeat(g, id, b));
  if (others.length) g = ok(updateScene(g, id, { others }));
  return g;
}

/** The example from the design: a dramatic ending in 4 scenes. */
function dramaScript(): Film {
  let f = withCast(filmFor({ runtime: 100 }));
  f = ok(setRuntime(f, 100));
  f = ok(setTopic(f, 'romantic', ['romantic']));
  f = scene(f, 'medium', 'happy', [{ roleId: 'role1', actionId: 'celebrates', targetId: 'role3' }, { roleId: 'role3', actionId: 'dances', targetId: 'role1' }]);
  f = scene(f, 'long', 'thrill', [{ roleId: 'role2', actionId: 'fightsAndWins', targetId: 'role1' }, { roleId: 'role2', actionId: 'escapes' }]);
  f = scene(f, 'long', 'sad', [{ roleId: 'role3', actionId: 'declaresLove', targetId: 'role2' }, { roleId: 'role1', actionId: 'watches', targetId: 'role3' }]);
  f = scene(f, 'long', 'sad', [{ roleId: 'role3', actionId: 'breaksUp', targetId: 'role2' }, { roleId: 'role1', actionId: 'dies' }]);
  return f;
}

describe('characters', () => {
  it('enforces role limits and billing', () => {
    let f = filmFor();
    f = ok(addRole(f, 'main'));
    expect(f.roles[0]).toMatchObject({ type: 'main', billing: 'lead', name: 'The Hero' });
    expect(addRole(f, 'main').ok).toBe(false);
    f = ok(addRole(ok(addRole(f, 'supporting')), 'supporting'));
    expect(addRole(f, 'supporting').ok).toBe(false);
    f = ok(renameRole(f, 'role1', 'Jack'));
    expect(f.roles[0].name).toBe('Jack');
  });
  it('removing a role removes its beats and dangling targets', () => {
    let f = withCast();
    f = scene(f, 'short', 'thrill', [{ roleId: 'role2', actionId: 'fights', targetId: 'role1' }, { roleId: 'role1', actionId: 'escapes', targetId: 'role2' }], ['role3']);
    f = ok(removeRole(f, 'role2'));
    expect(f.scenes[0].beats).toEqual([{ roleId: 'role1', actionId: 'escapes', targetId: undefined }]);
    f = ok(removeRole(f, 'role3'));
    expect(f.scenes[0].others).toEqual([]);
  });
});

describe('scenes and beats', () => {
  it('limits scenes to 7 and to the runtime', () => {
    let f = withCast(filmFor({ runtime: 180 }));
    f = ok(setRuntime(f, 180));
    for (let i = 0; i < 7; i++) f = ok(addScene(f, { duration: 'short' }));
    expect(addScene(f, { duration: 'short' }).ok).toBe(false);
  });
  it('rejects scenes longer than the runtime', () => {
    let f = withCast(filmFor({ runtime: 100 }));
    for (let i = 0; i < 4; i++) f = ok(addScene(f, { duration: 'long' }));
    expect(addScene(f, { duration: 'short' }).ok).toBe(false);
    expect(updateScene(f, f.scenes[0].id, { duration: 'short' }).ok).toBe(true);
  });
  it('validates beats', () => {
    let f = ok(addScene(withCast(), {}));
    const id = f.scenes[0].id;
    expect(addBeat(f, id, { roleId: 'role2', actionId: 'fights' }).ok).toBe(false); // needs target
    expect(addBeat(f, id, { roleId: 'role2', actionId: 'fights', targetId: 'role2' }).ok).toBe(false); // self
    expect(addBeat(f, id, { roleId: 'role1', actionId: 'dies', targetId: 'role2' }).ok).toBe(false); // no target
    expect(addBeat(f, id, { roleId: 'role1', actionId: 'duels', targetId: 'role2' }).ok).toBe(false); // topic
    f = ok(addBeat(f, id, { roleId: 'role2', actionId: 'fights', targetId: 'role1' }));
    f = ok(updateBeat(f, id, 0, { roleId: 'role2', actionId: 'threatens', targetId: 'role1' }));
    expect(f.scenes[0].beats[0].actionId).toBe('threatens');
    expect(ok(removeBeat(f, id, 0)).scenes[0].beats).toHaveLength(0);
  });
  it('filters actions by rating and topic', () => {
    const pg = withCast(filmFor({ rating: 'PG' }));
    expect(availableActions(pg).some((a) => a.id === 'kills')).toBe(false);
    const med = ok(setTopic(pg, 'medieval', ['medieval']));
    expect(availableActions(med).some((a) => a.id === 'duels')).toBe(true);
    let f = scene(med, 'short', 'thrill', [{ roleId: 'role1', actionId: 'duels', targetId: 'role2' }]);
    const r = setTopic(f, undefined, []);
    expect(r.ok && r.removedBeats).toBe(1);
    f = ok(r);
    expect(f.scenes[0].beats).toHaveLength(0);
  });
  it('orders scenes and spreads filler', () => {
    const f = dramaScript();
    const l = layout(f);
    expect(l.map((x) => x.minutes)).toEqual([18, 25, 25, 25]);
    expect(fillerShare(f)).toBeCloseTo(0.07, 2);
    expect(l[0].start).toBeCloseTo(7 / 5);
    expect(l[3].act).toBe(3);
    const g = ok(moveScene(f, f.scenes[3].id, -1));
    expect(g.scenes[2].id).toBe(f.scenes[3].id);
    expect(moveScene(f, f.scenes[0].id, -1).ok).toBe(false);
    expect(ok(removeScene(f, f.scenes[0].id)).scenes).toHaveLength(3);
  });
  it('computes participants and screen time', () => {
    const f = dramaScript();
    expect(participants(f.scenes[2]).sort()).toEqual(['role1', 'role2', 'role3']);
    expect(screenTime(f)).toEqual({ role1: 93, role2: 75, role3: 68 });
    expect(scriptCost(f)).toBeGreaterThan(0);
  });
});

describe('quality', () => {
  it('rates depth by beat count: 1 shallow, 2 ideal, 3 good, 4 too complex', () => {
    const mk = (n: number) => ({ beats: Array.from({ length: n }, () => ({ roleId: 'r', actionId: 'argues', targetId: 'x' })) }) as never;
    expect(beatDepth(mk(1))).toBeLessThan(beatDepth(mk(3)));
    expect(beatDepth(mk(2))).toBe(100);
    expect(beatDepth(mk(4))).toBeLessThan(beatDepth(mk(3)));
  });
  it('the 4-scene drama example scores well', () => {
    const f = dramaScript();
    const q = scriptQuality(f);
    expect(q.structure).toBeGreaterThanOrEqual(80);
    expect(q.depth).toBeGreaterThan(80);
    expect(q.total).toBeGreaterThan(70);
    const p = scriptProfile(f);
    expect(p.humor).toBeLessThan(50); // a sad film
  });
  it('the same script fits drama better than comedy', () => {
    const drama = scriptQuality(dramaScript()).fit;
    const asComedy = scriptQuality({ ...dramaScript(), contract: { ...dramaScript().contract, genre: 'comedy' } }).fit;
    expect(drama).toBeGreaterThan(asComedy);
  });
  it('punishes thin scripts', () => {
    const f = scene(withCast(), 'short', 'calm', [{ roleId: 'role1', actionId: 'plans' }]);
    const q = scriptQuality(f);
    expect(q.total).toBeLessThan(45);
    expect(q.notes).toContain('The last scene needs a climax action');
  });
  it('director affinity shifts quality', () => {
    const f = dramaScript();
    expect(scriptQuality(f, directorById('starterA')).total).toBeGreaterThan(scriptQuality(f, directorById('starterB')).total);
  });
});

describe('requirements & finish', () => {
  it('checks hard requirements live', () => {
    let f = filmFor({
      runtime: 100,
      hardReqs: [
        { kind: 'runtime', target: 100, tolerance: 5 },
        { kind: 'role', roleType: 'villain' },
        { kind: 'tone', tone: 'sad', count: 2 },
        { kind: 'action', actionId: 'declaresLove' },
        { kind: 'leadStarPower', min: 60 },
      ],
    });
    f = ok(setRuntime(f, 100));
    expect(checkRequirements(f).map((c) => c.status)).toEqual(['met', 'missing', 'missing', 'missing', 'pending']);
    const g = { ...dramaScript(), contract: f.contract };
    expect(checkRequirements(g).map((c) => c.status)).toEqual(['met', 'met', 'met', 'met', 'pending']);
  });
  it('needs 3 scenes with actions to lock', () => {
    const f = scene(withCast(), 'short', 'calm', [{ roleId: 'role1', actionId: 'plans' }]);
    expect(scriptBlockers(f)).toContain('Write at least 3 scenes');
    const done = ok(finishScript(dramaScript()));
    expect(done.phase).toBe('casting');
    expect(done.ledger[0]).toMatchObject({ label: 'Script', phase: 'script' });
    expect(finishScript(done).ok).toBe(false);
  });
});
