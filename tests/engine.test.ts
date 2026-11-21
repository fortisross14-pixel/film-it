import { createRng } from '../src/engine/rng';
import { generateBoard, generateContract } from '../src/engine/contracts';
import { newProfile, refreshBoard, startFilm } from '../src/engine/profile';
import { buyDirector, buySet, buyTopicPack, reputationTier, unlockProgress } from '../src/engine/progression';
import { startCareer } from '../src/engine/career';
import { deleteSlot, listSlots, loadProfile, saveProfile, type KeyValueStore } from '../src/engine/save';
import { TUNING } from '../src/engine/tuning';
import { ACTIONS, BASE_ACTIONS, GENRE_SIGNATURE_ACTIONS } from '../src/engine/data/actions';
import { GENRE_PROFILE } from '../src/engine/data/tones';
import { SETS } from '../src/engine/data/sets';
import { TOPICS, TOPIC_PACKS } from '../src/engine/data/topics';
import { DIRECTORS } from '../src/engine/data/directors';
import { describeBeat, describeHardReq, money } from '../src/engine/format';
import { applyDelivery, letterFor, satisfaction } from '../src/engine/grade';

function memoryStore(): KeyValueStore {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
}

describe('content', () => {
  it('meets MVP content counts', () => {
    expect(DIRECTORS.filter((d) => d.unlock.kind === 'start')).toHaveLength(2);
    expect(TOPIC_PACKS.find((p) => p.id === 'starter')!.topicIds).toHaveLength(4);
    expect(SETS.filter((s) => s.unlock.kind === 'start')).toHaveLength(8);
    expect(BASE_ACTIONS.length).toBeGreaterThanOrEqual(20);
    expect(Object.keys(GENRE_PROFILE)).toHaveLength(8);
  });

  it('references only existing ids', () => {
    const actionIds = new Set(ACTIONS.map((s) => s.id));
    const setIds = new Set(SETS.map((s) => s.id));
    const topicIds = new Set(TOPICS.map((t) => t.id));
    for (const t of TOPICS) {
      t.actions.forEach((id) => expect(actionIds.has(id), id).toBe(true));
      t.setIds.forEach((id) => expect(setIds.has(id), id).toBe(true));
    }
    for (const s of SETS) Object.keys(s.actionFit ?? {}).forEach((id) => expect(actionIds.has(id), `${s.id}:${id}`).toBe(true));
    for (const ids of Object.values(GENRE_SIGNATURE_ACTIONS)) ids.forEach((id) => expect(actionIds.has(id), id).toBe(true));
    for (const p of TOPIC_PACKS) p.topicIds.forEach((id) => expect(topicIds.has(id), id).toBe(true));
    for (const a of ACTIONS) if (a.topicId) expect(topicIds.has(a.topicId), a.id).toBe(true);
  });

  it('applies delivery effects after weighting', () => {
    const normal = { late: 1, overBudget: 1 };
    expect(applyDelivery(90, 0, 0, normal).final).toBe(90);
    expect(applyDelivery(90, 1, 0, normal).final).toBe(88); // slightly late
    expect(applyDelivery(90, 2, 0, normal).final).toBe(85); // a bit late
    expect(applyDelivery(90, 10, 0, normal).final).toBe(8); // very late
    expect(applyDelivery(90, 2, 0, { late: 1.6, overBudget: 1 }).final).toBeLessThan(85);
    expect(applyDelivery(90, 0, 10, normal).final).toBe(85);
    expect(applyDelivery(90, 0, -20, normal).final).toBe(90);
    expect(letterFor(88)).toBe('B');
    expect(satisfaction({ boxOffice: 100, public: 50, critics: 0, awards: 0 }, { boxOffice: 0.5, public: 0.5, critics: 0, awards: 0 })).toBe(75);
  });

  it('expectation weights sum to 1', () => {
    for (const w of Object.values(TUNING.weights)) {
      expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    }
  });
});

describe('rng', () => {
  it('is reproducible', () => {
    const a = createRng(42);
    const b = createRng(42);
    for (let i = 0; i < 10; i++) expect(a.next()).toBe(b.next());
  });
});

describe('contracts', () => {
  it('generates valid contracts', () => {
    const rng = createRng(7);
    for (let i = 0; i < 300; i++) {
      const c = generateContract(rng, 1 + (i % 5));
      expect(c.budget).toBeGreaterThan(0);
      expect(c.deadlineWeeks).toBeGreaterThanOrEqual(TUNING.contracts.minDeadlineWeeks);
      expect(c.difficulty).toBeGreaterThanOrEqual(1);
      expect(c.difficulty).toBeLessThanOrEqual(5);
      expect(c.hardReqs[0].kind).toBe('runtime');
      expect(c.studio.tier).toBeLessThanOrEqual(1 + (i % 5));
      expect(c.bonusGoals.length).toBeGreaterThan(0);
      expect(Object.values(c.weights).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 5);
    }
  });

  it('respects forced archetype and genre and genre role rules', () => {
    const c = generateContract(createRng(1), 1, { archetype: 'indie', genre: 'romance' });
    expect(c.archetype).toBe('indie');
    expect(c.genre).toBe('romance');
    expect(c.hardReqs).toContainEqual({ kind: 'role', roleType: 'romanticInterest' });
    expect(c.budget).toBeLessThanOrEqual(TUNING.contracts.budgetTiers[0] * 1.2);
  });

  it('fills the board', () => {
    expect(generateBoard(createRng(3), { reputation: 0 })).toHaveLength(TUNING.contracts.boardSize);
  });

  it('formats requirements', () => {
    expect(describeHardReq({ kind: 'leadStarPower', min: 60 })).toContain('60');
    expect(money(25000)).toBe('$25M');
    expect(money(750)).toBe('$750K');
    expect(describeBeat('Ann', 'dances', 'Bob')).toBe('Ann dances with Bob');
    expect(describeBeat('Ann', 'fightsAndWins', 'Bob')).toBe('Ann fights and wins Bob');
    expect(describeBeat('Ann', 'escapes')).toBe('Ann escapes');
  });
});

/** A profile with a career started (board generated). */
const careerProfile = (seed = 5, directorId = 'starterA') => {
  const r = startCareer(newProfile('T', seed), directorId, 1);
  if (!r.ok) throw new Error(r.reason);
  return r.profile;
};

describe('profile & film start', () => {
  it('creates a starting profile with no career yet', () => {
    const p = newProfile('Test', 123);
    expect(p.unlocks.directors).toEqual(['starterA', 'starterB']);
    expect(p.unlocks.topics).toHaveLength(4);
    expect(p.unlocks.sets).toHaveLength(8);
    expect(p.actorPool).toHaveLength(TUNING.actors.poolSize);
    expect(p.career).toBeUndefined();
    expect(p.contractBoard).toHaveLength(0);
    expect(new Set(p.actorPool.map((a) => a.id)).size).toBe(p.actorPool.length);
  });

  it('is deterministic per seed', () => {
    expect(careerProfile(99).contractBoard).toEqual(careerProfile(99).contractBoard);
    expect(newProfile('A', 99).actorPool).toEqual(newProfile('A', 99).actorPool);
  });

  it('starts a film from a contract with the career director', () => {
    const p = careerProfile();
    const c = p.contractBoard[0];
    const r = startFilm(p, c.id);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.activeFilm?.directorId).toBe('starterA');
    expect(r.profile.activeFilm?.phase).toBe('script');
    expect(r.profile.activeFilm?.runtime).toBe(c.runtime);
    expect(r.profile.contractBoard.find((x) => x.id === c.id)).toBeUndefined();
    expect(startFilm(r.profile, r.profile.contractBoard[0].id).ok).toBe(false);
    expect(startFilm(p, c.id, 'starterB').ok).toBe(false); // not this career's director
  });

  it('needs a career (or a director) to start a film', () => {
    const p = newProfile('T', 5);
    p.contractBoard = careerProfile().contractBoard;
    expect(startFilm(p, p.contractBoard[0].id).ok).toBe(false);
    expect(startFilm(p, p.contractBoard[0].id, 'writer').ok).toBe(false); // locked
  });

  it('refreshes the board', () => {
    const p = careerProfile();
    const q = refreshBoard(p);
    expect(q.contractBoard).toHaveLength(TUNING.contracts.boardSize);
    expect(q.contractBoard[0].id).not.toBe(p.contractBoard[0].id);
  });
});

describe('progression', () => {
  it('computes tiers', () => {
    expect(reputationTier(0)).toBe(1);
    expect(reputationTier(TUNING.reputationTiers[1])).toBe(2);
    expect(reputationTier(99999)).toBe(TUNING.reputationTiers.length);
  });

  it('buys director profiles with credits', () => {
    const p = { ...newProfile('T', 1), credits: 1000 };
    const r = buyDirector(p, 'masterScifi');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.unlocks.directors).toContain('masterScifi');
    expect(r.profile.credits).toBe(400);
    expect(buyDirector(r.profile, 'masterScifi').ok).toBe(false);
    expect(buyDirector({ ...p, credits: 10 }, 'budgetMaster').ok).toBe(false);
  });

  it('buys topic packs and their sets', () => {
    const p = { ...newProfile('T', 1), credits: 1000 };
    const r = buyTopicPack(p, 'future');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.unlocks.topics).toContain('spaceTravel');
    expect(r.profile.unlocks.sets).toContain('spaceshipBridge');
    expect(r.profile.credits).toBe(700);
    expect(buyTopicPack(r.profile, 'future').ok).toBe(false);
    expect(buyTopicPack({ ...p, credits: 0 }, 'epic').ok).toBe(false);
  });

  it('buys sets with credits only', () => {
    const p = { ...newProfile('T', 1), credits: 1000 };
    expect(buySet(p, 'rooftop').ok).toBe(true);
    expect(buySet(p, 'forest').ok).toBe(true);
    expect(buySet(p, 'apartment').ok).toBe(false); // already owned
    expect(buySet({ ...p, credits: 0 }, 'forest').ok).toBe(false);
  });

  it('tracks unlock-everything progress', () => {
    const p = newProfile('T', 1);
    const u = unlockProgress(p);
    expect(u.owned).toBeGreaterThan(0);
    expect(u.remainingCost).toBeGreaterThan(1000);
  });
});

describe('save slots', () => {
  it('saves, lists, loads and deletes', () => {
    const store = memoryStore();
    expect(listSlots(store).every((s) => s.empty)).toBe(true);
    const p = newProfile('Slot', 2);
    saveProfile(1, p, store);
    expect(loadProfile(1, store)).toEqual(p);
    const slots = listSlots(store);
    expect(slots).toHaveLength(3);
    expect(slots[1]).toMatchObject({ empty: false, name: 'Slot' });
    deleteSlot(1, store);
    expect(loadProfile(1, store)).toBeUndefined();
    expect(() => saveProfile(3, p, store)).toThrow();
  });

  it('flags corrupt saves', () => {
    const store = memoryStore();
    store.setItem('directors-cut:slot:0', '{nope');
    expect(listSlots(store)[0].corrupt).toBe(true);
    expect(loadProfile(0, store)).toBeUndefined();
  });
});
