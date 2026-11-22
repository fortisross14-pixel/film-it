import { createRng } from '../src/engine/rng';
import { generateBoard, generateContract } from '../src/engine/contracts';
import { newProfile, refreshBoard, startFilm } from '../src/engine/profile';
import { bestLevel, buyDirector, buySet, buyTalentPack, buyTopicPack, collection, grantTalentPack, openTalentPack, packForSale, unlockGenresForLevel, unlockProgress } from '../src/engine/progression';
import { FAMOUS, famousRarity, generateStar } from '../src/engine/data/actors';
import { startCareer } from '../src/engine/career';
import { SAVE_KEY, eraseSave, load, loadProfile, saveProfile, type KeyValueStore } from '../src/engine/save';
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
    expect(SETS.filter((s) => s.unlock.kind === 'start')).toHaveLength(3);
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
    expect(generateBoard(createRng(3), { level: 1 })).toHaveLength(4);
    expect(generateBoard(createRng(3), { level: 10 })).toHaveLength(3); // no teaser above the top
  });

  it('scales studios, budgets and fees with the level, in the open genres only', () => {
    for (let level = 1; level <= 10; level++) {
      const board = generateBoard(createRng(level), { level, genres: ['drama', 'comedy'] });
      for (const c of board.filter((x) => !x.locked && x.tag === 'match')) {
        expect(c.level).toBe(level);
        expect(c.studio.tier).toBe(TUNING.ladder.studioTier[level - 1]);
        expect(c.budget).toBeLessThanOrEqual(TUNING.contracts.budgetTiers[TUNING.ladder.budgetTier[level - 1]] * 1.2);
        expect(['drama', 'comedy']).toContain(c.genre);
      }
    }
    const lo = generateContract(createRng(1), 1, { archetype: 'crowd' });
    const hi = generateContract(createRng(1), 10, { archetype: 'crowd' });
    expect(hi.rewards.fee).toBeGreaterThan(lo.rewards.fee);
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
    expect(p.unlocks.sets).toEqual(['apartment', 'park', 'warehouse']);
    expect(p.unlocks.genres).toEqual(TUNING.genres.start);
    expect(p.money).toBe(TUNING.startingMoney);
    expect(p.talentPacks).toEqual({ casting: 0, star: 0 });
    // Commons and uncommons only, no named stars.
    expect(p.actorPool).toHaveLength(26);
    expect(p.actorPool.every((a) => (a.rarity === 'common' || a.rarity === 'uncommon') && !a.famous)).toBe(true);
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
    expect(q.contractBoard).toHaveLength(4);
    expect(q.contractBoard[0].id).not.toBe(p.contractBoard[0].id);
  });
});

describe('progression', () => {
  it('buys director profiles with studio money', () => {
    const cost = DIRECTORS.find((d) => d.id === 'masterScifi')!.unlock as { cost: number };
    const p = { ...newProfile('T', 1), money: cost.cost + 400 };
    const r = buyDirector(p, 'masterScifi');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.unlocks.directors).toContain('masterScifi');
    expect(r.profile.money).toBe(400);
    expect(buyDirector(r.profile, 'masterScifi').ok).toBe(false);
    expect(buyDirector({ ...p, money: 10 }, 'budgetMaster')).toMatchObject({ ok: false, reason: expect.stringMatching(/more/) });
  });

  it('buys topic packs and their sets', () => {
    const p = { ...newProfile('T', 1), money: 1000 };
    const r = buyTopicPack(p, 'future');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.unlocks.topics).toContain('spaceTravel');
    expect(r.profile.unlocks.sets).toContain('spaceshipBridge');
    expect(r.profile.money).toBe(700);
    expect(buyTopicPack(r.profile, 'future').ok).toBe(false);
    expect(buyTopicPack({ ...p, money: 0 }, 'epic').ok).toBe(false);
  });

  it('buys sets', () => {
    const p = { ...newProfile('T', 1), money: 1000 };
    expect(buySet(p, 'cityStreet').ok).toBe(true);
    expect(buySet(p, 'forest').ok).toBe(true);
    expect(buySet(p, 'apartment').ok).toBe(false); // already owned
    expect(buySet(p, 'colosseum').ok).toBe(false); // comes with its topic pack
    expect(buySet({ ...p, money: 0 }, 'forest').ok).toBe(false);
  });

  it('opens genres for good as careers climb', () => {
    const p = newProfile('T', 1);
    expect(unlockGenresForLevel(p, 2).opened).toEqual([]);
    const r = unlockGenresForLevel(p, 5);
    expect(r.opened.sort()).toEqual(['horror', 'scifi']);
    expect(unlockGenresForLevel(r.profile, 5).opened).toEqual([]);
  });

  it('named stars are always epic or legendary', () => {
    expect(FAMOUS.every((f) => ['epic', 'legendary'].includes(famousRarity(f.name)!))).toBe(true);
    expect(FAMOUS.filter((f) => famousRarity(f.name) === 'legendary')).toHaveLength(TUNING.actors.legendaryFamous);
  });

  it('sells and opens talent packs', () => {
    let p = { ...newProfile('T', 1), money: 1000 };
    expect(packForSale(p, 'casting')).toBe(true);
    expect(packForSale(p, 'star')).toBe(false); // needs the Talent agency
    expect(buyTalentPack(p, 'star').ok).toBe(false);
    const r = buyTalentPack(p, 'casting');
    if (!r.ok) throw new Error(r.reason);
    p = r.profile;
    expect(p.money).toBe(1000 - TUNING.talentPacks.casting.price);
    expect(p.talentPacks.casting).toBe(1);
    const o = openTalentPack(p, 'casting');
    if (!o.ok) throw new Error(o.reason);
    expect(o.cards).toHaveLength(3);
    // No agency: commons and uncommons only.
    expect(o.cards.every((c) => ['common', 'uncommon'].includes(c.actor.rarity) && !c.actor.famous)).toBe(true);
    expect(o.profile.actorPool).toHaveLength(p.actorPool.length + o.cards.filter((c) => !c.duplicate).length);
    expect(o.profile.talentPacks.casting).toBe(0);
    expect(openTalentPack(o.profile, 'casting').ok).toBe(false);
    expect(new Set(o.profile.actorPool.map((a) => a.portrait)).size).toBe(o.profile.actorPool.length);
  });

  it('agencies open better cards: unnamed rare/epic, then legendary and named stars', () => {
    const open = (upgrades: string[], id: 'casting' | 'star', n = 30) => {
      let p = newProfile('T', 4);
      p = { ...p, unlocks: { ...p.unlocks, upgrades } };
      for (let i = 0; i < n; i++) p = grantTalentPack(p, id);
      const cards = [];
      for (let i = 0; i < n; i++) { const o = openTalentPack(p, id); if (!o.ok) throw new Error(o.reason); p = o.profile; cards.push(...o.cards); }
      return cards;
    };
    const one = open(['agency1'], 'casting');
    expect(one.some((c) => c.actor.rarity === 'epic')).toBe(true);
    expect(one.every((c) => c.actor.rarity !== 'legendary' && !c.actor.famous && c.actor.rarity !== 'common')).toBe(true);
    const two = open(['agency1', 'agency2'], 'casting');
    expect(two.some((c) => c.actor.rarity === 'legendary')).toBe(true);
    expect(two.filter((c) => c.actor.rarity === 'legendary').every((c) => c.actor.famous)).toBe(true);
    expect(two.some((c) => c.actor.rarity === 'epic' && c.actor.famous)).toBe(true);
    // Without the Talent agency a Star pack can't be bought, and an A earns a Casting call.
    const p = newProfile('T', 4);
    expect(buyTalentPack({ ...p, money: 9999 }, 'star').ok).toBe(false);
    expect(grantTalentPack(p, 'star').talentPacks).toEqual({ casting: 1, star: 0 });
  });

  it('a star pack always holds an epic or better; duplicates boost the star you have', () => {
    let p = newProfile('T', 3);
    p = { ...p, unlocks: { ...p.unlocks, upgrades: ['agency1', 'agency2'] } };
    for (let i = 0; i < 40; i++) p = grantTalentPack(p, 'star');
    for (let i = 0; i < 40; i++) {
      const o = openTalentPack(p, 'star');
      if (!o.ok) throw new Error(o.reason);
      expect(o.cards.some((c) => c.actor.rarity === 'epic' || c.actor.rarity === 'legendary')).toBe(true);
      p = o.profile;
    }
    expect(collection(p).stars[0]).toBeGreaterThan(20);
    expect(new Set(p.actorPool.map((a) => a.name)).size).toBe(p.actorPool.length);
    // With every star collected, epic and legendary cards are duplicates that boost yours.
    const rng = createRng(5);
    let full = grantTalentPack({ ...p, actorPool: FAMOUS.map((f) => generateStar(rng, f)) }, 'star');
    const o = openTalentPack(full, 'star');
    if (!o.ok) throw new Error(o.reason);
    const dup = o.cards.find((c) => c.duplicate)!;
    const before = full.actorPool.find((a) => a.name === dup.actor.name)!;
    expect(dup.actor.starPower).toBe(Math.min(100, before.starPower + TUNING.actors.duplicateStar));
    expect(o.profile.actorPool.filter((a) => a.famous)).toHaveLength(FAMOUS.length);
    full = o.profile;
    expect(collection(full).stars).toEqual([FAMOUS.length, FAMOUS.length]);
  });

  it('tracks the best level across careers', () => {
    const p = careerProfile();
    expect(bestLevel(p)).toBe(1);
    expect(bestLevel({ ...p, careers: [{ ...p.career!, topLevel: 6 }] })).toBe(6);
  });

  it('tracks unlock-everything progress', () => {
    const p = newProfile('T', 1);
    const u = unlockProgress(p);
    expect(u.owned).toBeGreaterThan(0);
    expect(u.remainingCost).toBeGreaterThan(1000);
  });
});

describe('the save (save-systems skill checks)', () => {
  it('saves, loads and erases', () => {
    const store = memoryStore();
    expect(load(store).status).toBe('empty');
    const p = newProfile('Me', 2);
    expect(saveProfile(p, store)).toEqual({ ok: true });
    expect(loadProfile(store)).toEqual(p);
    eraseSave(store);
    expect(load(store).status).toBe('empty');
  });

  it('round-trips a career mid-production', () => {
    const store = memoryStore();
    const r = startCareer(newProfile('R', 4), 'starterA', 1);
    if (!r.ok) throw new Error(r.reason);
    const s = startFilm(r.profile, r.profile.contractBoard[0].id);
    if (!s.ok) throw new Error(s.reason);
    saveProfile(s.profile, store);
    expect(loadProfile(store)).toEqual(s.profile);
  });

  it('flags corrupt saves and falls back to the backup', () => {
    const store = memoryStore();
    store.setItem(SAVE_KEY, '{nope');
    expect(load(store).status).toBe('corrupt');
    // Two good saves: the first becomes the backup; truncating the primary loads the backup.
    const a = newProfile('A', 1), b = { ...a, money: 999 };
    saveProfile(a, store);
    saveProfile(b, store);
    store.setItem(SAVE_KEY, '{"version": 7, "na');
    const r = load(store);
    expect(r.status).toBe('fromBackup');
    expect(r.profile?.money).toBe(a.money);
  });

  it('carries over the old 3-slot saves: the one with most films, converted to the ladder', () => {
    const store = memoryStore();
    const started = startCareer(newProfile('Old', 1), 'starterA', 1);
    if (!started.ok) throw new Error(started.reason);
    const { money: _m, talentPacks: _t, ...cur } = started.profile;
    const oldCareer = { ...cur.career!, reputation: 300, level: 6, fStreak: 0 };
    delete (oldCareer as Record<string, unknown>).topLevel;
    const old = {
      ...cur, version: 6, credits: 420, career: oldCareer,
      unlocks: { directors: cur.unlocks.directors, topics: cur.unlocks.topics, packs: cur.unlocks.packs, sets: [...cur.unlocks.sets, 'office', 'diner'] },
      actorPool: [...cur.actorPool, { ...cur.actorPool[0], id: 'x', name: 'Meryl Streak', rarity: 'rare' }],
      filmography: [{}, {}],
    };
    store.setItem('directors-cut:slot:0', JSON.stringify({ ...old, filmography: [] }));
    store.setItem('directors-cut:slot:2', JSON.stringify(old));
    const r = load(store);
    expect(r.status).toBe('migrated');
    const p = r.profile!;
    expect(p.version).toBe(TUNING.saveVersion);
    expect(p.money).toBe(420);
    expect((p as unknown as Record<string, unknown>).credits).toBeUndefined();
    expect(p.career).toMatchObject({ level: 6, topLevel: 6 });
    expect((p.career as unknown as Record<string, unknown>).reputation).toBeUndefined();
    expect(p.unlocks.sets).toContain('office');
    expect(p.unlocks.genres).toEqual(expect.arrayContaining(['horror', 'scifi']));
    expect(p.unlocks.genres).not.toContain('fantasy');
    expect(p.contractBoard.every((c) => c.level >= 5 && c.rewards.fee > 0)).toBe(true);
    expect(p.actorPool.find((a) => a.name === 'Meryl Streak')!.rarity).toBe(famousRarity('Meryl Streak'));
    // Once saved under the new key, the old slots are no longer read.
    saveProfile({ ...p, money: 1 }, store);
    expect(load(store)).toMatchObject({ status: 'ok', profile: { money: 1 } });
  });

  it('refuses newer saves and explains older ones', () => {
    const store = memoryStore();
    store.setItem(SAVE_KEY, JSON.stringify({ ...newProfile('N', 1), version: TUNING.saveVersion + 1 }));
    expect(load(store)).toMatchObject({ status: 'newer' });
    store.setItem(SAVE_KEY, JSON.stringify({ version: 2, name: 'old' }));
    expect(load(store)).toMatchObject({ status: 'older', message: expect.stringMatching(/early test build/) });
  });

  it('validates on load and drops ids that no longer exist', () => {
    const store = memoryStore();
    const p = newProfile('V', 1);
    store.setItem(SAVE_KEY, JSON.stringify({ ...p, unlocks: { ...p.unlocks, sets: [...p.unlocks.sets, 'deletedSet'] } }));
    expect(loadProfile(store)!.unlocks.sets).not.toContain('deletedSet');
    store.setItem(SAVE_KEY, JSON.stringify({ ...p, money: 'lots' }));
    expect(load(store).status).toBe('corrupt');
  });

  it('reports a full storage instead of throwing', () => {
    const full: KeyValueStore = { getItem: () => null, setItem: () => { throw Object.assign(new Error('exceeded'), { name: 'QuotaExceededError' }); }, removeItem: () => {} };
    const r = saveProfile(newProfile('F', 1), full);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/full/);
  });
});
