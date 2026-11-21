import { newProfile, startFilm } from '../src/engine/profile';
import type { Contract, Film } from '../src/engine/types';
import { generateContract } from '../src/engine/contracts';
import { createRng } from '../src/engine/rng';
import { directorById } from '../src/engine/data/directors';
import {
  actAt, addRole, addScene, availableSceneTypes, checkRequirements, fillerSegments, findFreeSlot, finishScript,
  removeRole, removeScene, renameRole, sceneCost, screenTime, scriptBlockers, scriptCost, scriptQuality, setRuntime,
  setTopic, updateScene, type EditResult,
} from '../src/engine/script';

const ok = (r: EditResult): Film => {
  if (!r.ok) throw new Error(r.reason);
  return r.film;
};

function filmFor(overrides: Partial<Contract> = {}): Film {
  const p = newProfile('T', 11);
  const c = { ...generateContract(createRng(4), 1, { archetype: 'crowd', genre: 'action' }), rating: 'PG-13' as const, ...overrides };
  p.contractBoard = [c];
  const r = startFilm(p, c.id, 'starterB');
  if (!r.ok) throw new Error(r.reason);
  return r.profile.activeFilm!;
}

/** Film with main + villain roles. */
function withCast(f = filmFor()): Film {
  return ok(addRole(ok(addRole(f, 'main')), 'villain'));
}

describe('runtime & acts', () => {
  it('starts as 100% filler', () => {
    const f = filmFor({ runtime: 100 });
    expect(fillerSegments(f)).toEqual([[0, 100]]);
    expect(scriptQuality(f).total).toBe(0);
  });
  it('validates runtime and protects placed scenes', () => {
    let f = withCast(filmFor());
    expect(setRuntime(f, 30).ok).toBe(false);
    f = ok(setRuntime(f, 100));
    f = ok(addScene(f, { typeId: 'chase', roleIds: ['role1'], minutes: 5, startMin: 90, intensity: 'high' }));
    expect(setRuntime(f, 92).ok).toBe(false);
    expect(setRuntime(f, 95).ok).toBe(true);
  });
  it('splits acts 25/50/25', () => {
    expect(actAt(10, 100)).toBe(1);
    expect(actAt(50, 100)).toBe(2);
    expect(actAt(80, 100)).toBe(3);
  });
});

describe('roles', () => {
  it('enforces limits and billing', () => {
    let f = filmFor();
    f = ok(addRole(f, 'main'));
    expect(f.roles[0]).toMatchObject({ type: 'main', billing: 'lead', name: 'The Hero' });
    expect(addRole(f, 'main').ok).toBe(false);
    for (let i = 0; i < 4; i++) f = ok(addRole(f, 'supporting'));
    expect(addRole(f, 'supporting').ok).toBe(false);
    f = ok(renameRole(f, 'role1', 'Jack'));
    expect(f.roles[0].name).toBe('Jack');
    expect(renameRole(f, 'role1', ' ').ok).toBe(false);
  });
  it('removing a role drops scenes that need it', () => {
    let f = withCast();
    f = ok(addScene(f, { typeId: 'showdown', roleIds: ['role1', 'role2'], minutes: 5, startMin: 80, intensity: 'high' }));
    f = ok(addScene(f, { typeId: 'chase', roleIds: ['role1', 'role2'], minutes: 5, startMin: 10, intensity: 'high' }));
    const r = removeRole(f, 'role2');
    expect(r.ok && r.removedScenes).toEqual(['scene1']);
    if (r.ok) expect(r.film.scenes[0].roleIds).toEqual(['role1']);
  });
});

describe('scenes', () => {
  it('validates placement and participants', () => {
    const f = withCast();
    const base = { roleIds: ['role1', 'role2'], minutes: 5, startMin: 0, intensity: 'medium' as const };
    expect(addScene(f, { ...base, typeId: 'romance' }).ok).toBe(false); // needs romantic interest
    expect(addScene(f, { ...base, typeId: 'chase', minutes: 11 }).ok).toBe(false);
    expect(addScene(f, { ...base, typeId: 'chase', startMin: f.runtime - 2 }).ok).toBe(false);
    expect(addScene(f, { ...base, typeId: 'swordDuel' }).ok).toBe(false); // needs Medieval topic
    const g = ok(addScene(f, { ...base, typeId: 'chase' }));
    expect(addScene(g, { ...base, typeId: 'fight', startMin: 3 }).ok).toBe(false); // overlap
    expect(findFreeSlot(g, 5)).toBe(5);
    const h = ok(updateScene(g, 'scene1', { ...base, typeId: 'chase', startMin: 20 }));
    expect(h.scenes[0].startMin).toBe(20);
    expect(ok(removeScene(h, 'scene1')).scenes).toHaveLength(0);
  });
  it('blocks scene types above the rating', () => {
    const f = withCast(filmFor({ rating: 'PG' }));
    expect(availableSceneTypes(f).some((t) => t.id === 'scare')).toBe(false);
    expect(addScene(f, { typeId: 'scare', roleIds: ['role1'], minutes: 3, startMin: 0, intensity: 'high' }).ok).toBe(false);
  });
  it('topic adds and removes topic scene types', () => {
    let f = withCast();
    const unlocked = ['medieval', 'crime'];
    f = ok(setTopic(f, 'medieval', unlocked));
    f = ok(addScene(f, { typeId: 'swordDuel', roleIds: ['role1', 'role2'], minutes: 4, startMin: 0, intensity: 'high' }));
    const r = setTopic(f, 'crime', unlocked);
    expect(r.ok && r.film.scenes).toHaveLength(0);
    expect(setTopic(f, 'pirates', unlocked).ok).toBe(false);
  });
  it('computes screen time and cost', () => {
    let f = withCast();
    f = ok(addScene(f, { typeId: 'chase', roleIds: ['role1', 'role2'], minutes: 5, startMin: 0, intensity: 'high' }));
    f = ok(addScene(f, { typeId: 'dialogue', roleIds: ['role1', 'role2'], minutes: 3, startMin: 10, intensity: 'low' }));
    f = ok(addScene(f, { typeId: 'chase', roleIds: ['role1'], minutes: 2, startMin: 20, intensity: 'high' }));
    expect(screenTime(f)).toEqual({ role1: 10, role2: 8 });
    expect(scriptCost(f)).toBe(400 + 5 * 120 + 60 + 3 * 25 + 400 + 2 * 120);
    expect(sceneCost({ typeId: 'chase', minutes: 5 }, directorById('writer'))).toBeLessThan(1000);
  });
});

describe('quality', () => {
  function goodScript(): Film {
    let f = withCast(filmFor({ runtime: 100 }));
    f = ok(setRuntime(f, 100));
    f = ok(setTopic(f, 'crime', ['crime']));
    const plan: [string, string[], number, number][] = [
      ['chase', ['role1', 'role2'], 0, 8], ['dialogue', ['role1', 'role2'], 8, 6], ['fight', ['role1', 'role2'], 18, 8],
      ['betrayal', ['role1', 'role2'], 30, 6], ['chase', ['role1'], 38, 8], ['reveal', ['role1', 'role2'], 48, 6],
      ['fight', ['role1', 'role2'], 56, 8], ['montage', ['role1'], 66, 6], ['twist', ['role1', 'role2'], 74, 6],
      ['dialogue', ['role1', 'role2'], 80, 4], ['showdown', ['role1', 'role2'], 86, 10],
    ];
    for (const [typeId, roleIds, startMin, minutes] of plan) {
      f = ok(addScene(f, { typeId, roleIds, startMin, minutes, intensity: 'high' }));
    }
    return f;
  }
  it('rewards a full, structured, varied script', () => {
    const f = goodScript();
    const q = scriptQuality(f);
    expect(q.coverage).toBeGreaterThan(75);
    expect(q.structure).toBeGreaterThanOrEqual(85);
    expect(q.total).toBeGreaterThan(70);
  });
  it('punishes thin scripts', () => {
    let f = withCast();
    f = ok(addScene(f, { typeId: 'chase', roleIds: ['role1'], minutes: 5, startMin: 0, intensity: 'high' }));
    const q = scriptQuality(f);
    expect(q.total).toBeLessThan(40);
    expect(q.notes.some((n) => n.includes('filler'))).toBe(true);
    expect(q.notes).toContain('Act 3 has no climax');
  });
  it('director affinity shifts quality', () => {
    const f = goodScript();
    expect(scriptQuality(f, directorById('starterB')).total).toBeGreaterThan(scriptQuality(f, directorById('starterA')).total);
  });
});

describe('requirements & finish', () => {
  it('checks hard requirements live', () => {
    let f = filmFor({
      runtime: 100,
      hardReqs: [
        { kind: 'runtime', target: 100, tolerance: 5 },
        { kind: 'role', roleType: 'villain' },
        { kind: 'sceneType', sceneTypeId: 'chase', count: 1 },
        { kind: 'leadStarPower', min: 60 },
      ],
    });
    f = ok(setRuntime(f, 100));
    expect(checkRequirements(f).map((c) => c.status)).toEqual(['met', 'missing', 'missing', 'pending']);
    f = withCast(f);
    f = ok(addScene(f, { typeId: 'chase', roleIds: ['role1'], minutes: 5, startMin: 0, intensity: 'high' }));
    f = ok(setRuntime(f, 110));
    expect(checkRequirements(f).map((c) => c.status)).toEqual(['missing', 'met', 'met', 'pending']);
  });
  it('finishes into casting and charges the ledger', () => {
    const f = withCast();
    expect(scriptBlockers(filmFor())).toContain('Add a main lead');
    expect(finishScript(f).ok).toBe(false);
    const g = ok(addScene(f, { typeId: 'chase', roleIds: ['role1'], minutes: 5, startMin: 0, intensity: 'high' }));
    const done = ok(finishScript(g));
    expect(done.phase).toBe('casting');
    expect(done.ledger).toEqual([{ label: 'Script', amount: scriptCost(g), phase: 'script' }]);
    expect(done.scriptQuality).toBe(scriptQuality(g).total);
    expect(finishScript(done).ok).toBe(false);
  });
});
