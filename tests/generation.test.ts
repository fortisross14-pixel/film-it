// Checks from the procedural-gen and card-game skills.
import { createRng } from '../src/engine/rng';
import { generateContract } from '../src/engine/contracts';
import { newProfile } from '../src/engine/profile';
import { TUNING } from '../src/engine/tuning';
import { ACTIONS } from '../src/engine/data/actions';
import { ratingIndex } from '../src/engine/data/genres';
import { FAMOUS, generateStar, isHiddenGem } from '../src/engine/data/actors';
import { assignPortraits } from '../src/engine/portraits';
import { castActor, drawCards, releaseRole } from '../src/engine/casting';
import type { Contract, Film, Profile } from '../src/engine/types';
import { castProfile } from './helpers';
import { addRole, type EditResult } from '../src/engine/script';

describe('procedural-gen: seeded RNG', () => {
  it('pins the first outputs so a refactor cannot change every seed', () => {
    const r = createRng(0);
    expect([r.next(), r.next(), r.next()].map((x) => x.toFixed(10))).toEqual(['0.2664292087', '0.0003297457', '0.2232720274']);
  });
  it('the same seed builds the same world; different seeds differ', () => {
    const a = JSON.stringify(newProfile('X', 42).actorPool);
    expect(JSON.stringify(newProfile('X', 42).actorPool)).toBe(a);
    expect(JSON.stringify(newProfile('X', 43).actorPool)).not.toBe(a);
  });
});

/** Can a brief's hard requirements be met with the game's rules? */
function unmetReason(c: Contract): string | undefined {
  const S = TUNING.script;
  for (const r of c.hardReqs) {
    switch (r.kind) {
      case 'runtime':
        if (r.target - r.tolerance > S.maxRuntime || r.target + r.tolerance < S.minRuntime) return 'runtime out of range';
        break;
      case 'action': {
        const a = ACTIONS.find((x) => x.id === r.actionId);
        if (!a) return 'unknown action';
        if (ratingIndex(a.minRating) > ratingIndex(c.rating)) return `${a.id} not allowed at ${c.rating}`;
        if (a.topicId) return 'requires a topic action';
        break;
      }
      case 'tone':
        if (r.count > S.maxScenes) return 'too many tone scenes';
        break;
      case 'role':
        if (S.roleLimits[r.roleType][1] < 1) return 'role not allowed';
        break;
      case 'leadStarPower':
        if (r.min > TUNING.actors.starPower.legendary[1]) return 'star power unreachable';
        break;
      case 'maxRating':
        break;
    }
  }
  const minWeeks = S.minScenes + 1 /* filler block */ + 1; /* post */
  if (c.deadlineWeeks < minWeeks) return 'deadline shorter than the fastest possible production';
  return undefined;
}

describe('procedural-gen: contract seed sweep', () => {
  it('600 briefs across all tiers: valid, achievable, varied, deterministic', () => {
    const failures: string[] = [];
    const digests = new Set<string>();
    for (let seed = 0; seed < 600; seed++) {
      const tier = 1 + (seed % 5);
      const c = generateContract(createRng(seed), tier);
      if (JSON.stringify(c) !== JSON.stringify(generateContract(createRng(seed), tier))) failures.push(`${seed}: not deterministic`);
      const why = unmetReason(c);
      if (why) failures.push(`${seed}: ${why}`);
      digests.add(`${c.genre}|${c.archetype}|${c.runtime}|${c.hardReqs.length}|${c.budget}`);
    }
    expect(failures).toEqual([]);
    expect(digests.size).toBeGreaterThan(400);
  });
});

const ok = (r: EditResult) => { if (!r.ok) throw new Error(r.reason); return r.film; };

describe('card-game: casting zones and odds', () => {
  it('random bot: no actor is ever in two places, rejected cards never come back', () => {
    let p: Profile = castProfile('thriller', 10_000_000);
    // Re-open casting with every role empty and two extra roles.
    let f: Film = { ...p.activeFilm!, phase: 'casting' as const, roles: p.activeFilm!.roles.map((r) => ({ ...r, actor: undefined, pay: undefined })), casting: {}, rejected: [] };
    f = ok(addRole(ok(addRole(f, 'supporting')), 'comicRelief'));
    p = { ...p, activeFilm: f };
    const rng = createRng(7);
    for (let step = 0; step < 1500; step++) {
      const film = p.activeFilm!;
      const role = rng.pick(film.roles);
      const offered = film.casting[role.id]?.offered ?? [];
      const roll = rng.next();
      const before = new Set(film.rejected);
      const r = roll < 0.45 ? drawCards(p, role.id)
        : roll < 0.85 && offered.length ? castActor(p, role.id, rng.pick(offered).id)
        : releaseRole(p, role.id);
      if (!r.ok) continue;
      p = r.profile;
      const g = p.activeFilm!;
      // Invariant: each actor id appears at most once across cast roles and all tables.
      const ids = [...g.roles.flatMap((x) => (x.actor ? [x.actor.id] : [])), ...Object.values(g.casting).flatMap((c) => c.offered.map((a) => a.id))];
      expect(new Set(ids).size).toBe(ids.length);
      // Actors rejected before this step are never on a table or cast again.
      expect(ids.filter((id) => before.has(id))).toEqual([]);
    }
  });

  it('draw odds follow the rarity weights for the billing tier', () => {
    const zero = () => ({ common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 });
    const counts = { lead: zero(), minor: zero() };
    // A roster with named stars in it (as after a few talent packs).
    const base = castProfile('thriller', 10_000_000);
    const starRng = createRng(77);
    const roster = assignPortraits([...base.actorPool, ...FAMOUS.slice(0, 8).map((f) => generateStar(starRng, f)), ...FAMOUS.slice(18, 26).map((f) => generateStar(starRng, f))]);
    for (let seed = 0; seed < 300; seed++) {
      for (const [type, bucket] of [['main', 'lead'], ['supporting', 'minor']] as const) {
        let p = { ...base, actorPool: roster };
        p = { ...p, seed, activeFilm: { ...p.activeFilm!, phase: 'casting', casting: {}, rejected: [], roles: p.activeFilm!.roles.map((r) => ({ ...r, actor: undefined })) } };
        if (type === 'supporting') p = { ...p, activeFilm: ok(addRole(p.activeFilm!, 'supporting')) };
        const role = p.activeFilm!.roles.find((r) => r.type === type)!;
        const r = drawCards(p, role.id);
        if (!r.ok) throw new Error(r.reason);
        for (const a of r.profile.activeFilm!.casting[role.id].offered) counts[bucket][a.rarity]++;
      }
    }
    const share = (c: Record<string, number>, k: string) => c[k] / Object.values(c).reduce((a, b) => a + b, 0);
    // Leads see clearly more epic + legendary cards than minor roles do.
    expect(share(counts.lead, 'legendary') + share(counts.lead, 'epic')).toBeGreaterThan(2 * (share(counts.minor, 'legendary') + share(counts.minor, 'epic')));
    expect(share(counts.minor, 'common')).toBeGreaterThan(share(counts.lead, 'common'));
    expect(isHiddenGem).toBeDefined();
  });
});
