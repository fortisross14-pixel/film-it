// Builds films up to a given phase through the real engine, for tests.
import { newProfile, startFilm } from '../src/engine/profile';
import type { Film, GenreId, Profile, Tone } from '../src/engine/types';
import { generateContract } from '../src/engine/contracts';
import { createRng } from '../src/engine/rng';
import { addBeat, addRole, addScene, finishScript, type EditResult } from '../src/engine/script';
import { castActor, drawCards, finishCasting, type CastResult } from '../src/engine/casting';
import { chooseVersion, doWeek, wrapShooting, type ShootResult } from '../src/engine/shooting';
import { startCareer } from '../src/engine/career';

export const ok = (r: EditResult): Film => { if (!r.ok) throw new Error(r.reason); return r.film; };
export const okP = (r: CastResult | ShootResult): Profile => { if (!r.ok) throw new Error(r.reason); return r.profile; };

/** 3 scenes: thrill chase, romantic declaration, thrill climax. Main=role1, Villain=role2, Love=role3. */
export function castProfile(genre: GenreId = 'thriller', budget = 25000): Profile {
  const started = startCareer(newProfile('T', 33), 'starterB', 1);
  if (!started.ok) throw new Error(started.reason);
  const c = { ...generateContract(createRng(2), 1, { archetype: 'crowd', genre }), budget, rating: 'PG-13' as const, secondaryGenre: undefined };
  const p = { ...started.profile, contractBoard: [c] };
  const r = startFilm(p, c.id);
  if (!r.ok) throw new Error(r.reason);
  let f = ok(addRole(ok(addRole(ok(addRole(r.profile.activeFilm!, 'main')), 'villain')), 'romanticInterest'));
  const plan: [Tone, [string, string, string?][]][] = [
    ['thrill', [['role2', 'chases', 'role1'], ['role1', 'escapes']]],
    ['romantic', [['role3', 'declaresLove', 'role1'], ['role1', 'kisses', 'role3']]],
    ['thrill', [['role1', 'defeats', 'role2'], ['role2', 'threatens', 'role3']]],
  ];
  plan.forEach(([tone, beats], i) => {
    f = ok(addScene(f, { duration: 'medium', tone }));
    for (const [roleId, actionId, targetId] of beats) f = ok(addBeat(f, f.scenes[i].id, { roleId, actionId, targetId }));
  });
  let q: Profile = { ...r.profile, activeFilm: ok(finishScript(f)) };
  for (const role of q.activeFilm!.roles) {
    q = okP(drawCards(q, role.id));
    q = okP(castActor(q, role.id, q.activeFilm!.casting[role.id].offered[0].id));
  }
  return okP(finishCasting(q));
}

/** Shot (pace cut each time on the warehouse/park) and wrapped: film in post. */
export function postProfile(genre: GenreId = 'thriller', budget = 25000): Profile {
  let p = castProfile(genre, budget);
  p.activeFilm!.scenes.forEach((s) => {
    p = okP(doWeek(p, { kind: 'shoot', sceneId: s.id, setId: s.tone === 'romantic' ? 'park' : 'warehouse', focus: 'pace' }));
    p = okP(chooseVersion(p, p.activeFilm!.shooting!.pending!.versions[0].id));
  });
  return okP(wrapShooting(p));
}
