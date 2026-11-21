import { newProfile, startFilm } from '../src/engine/profile';
import type { Film, Profile } from '../src/engine/types';
import { bestGrade, recordFilm, retireCareer, retirementBonus, startCareer, type CareerResult } from '../src/engine/career';
import { buyDirector } from '../src/engine/progression';
import { addBeat, addRole, addScene, finishScript, type EditResult } from '../src/engine/script';
import { castActor, drawCards, finishCasting, rolePay, budgetLeft } from '../src/engine/casting';
import { chooseVersion, crewWeekCost, doWeek, wrapShooting } from '../src/engine/shooting';
import { finishPost } from '../src/engine/post';
import { deliverFilm, runPremiere } from '../src/engine/premiere';
import { TUNING } from '../src/engine/tuning';
import { okP } from './helpers';

const okC = (r: CareerResult | { ok: boolean; profile?: Profile; reason?: string }): Profile => {
  if (!r.ok) throw new Error((r as { reason: string }).reason);
  return (r as { profile: Profile }).profile;
};
const ok = (r: EditResult): Film => { if (!r.ok) throw new Error(r.reason); return r.film; };

describe('careers', () => {
  it('starts with a profile, resets its level, and opens a board', () => {
    const p0 = newProfile('T', 7);
    expect(startCareer(p0, 'masterScifi').ok).toBe(false); // locked
    const p = okC(startCareer(p0, 'starterA', 1));
    expect(p.career).toMatchObject({ directorId: 'starterA', reputation: 0, level: 1, status: 'active' });
    expect(p.contractBoard).toHaveLength(TUNING.contracts.boardSize);
    expect(p.contractBoard.every((c) => c.studio.tier === 1)).toBe(true);
    expect(startCareer(p, 'starterB').ok).toBe(false); // one at a time
  });

  it('unlocks profiles with credits from the bank, then starts careers with them', () => {
    let p = { ...newProfile('T', 7), credits: 700 };
    p = okC(buyDirector(p, 'masterScifi'));
    p = okC(startCareer(p, 'masterScifi', 1));
    expect(p.career!.directorId).toBe('masterScifi');
  });

  it('retiring pays a bonus from reputation and ends the career', () => {
    let p = okC(startCareer(newProfile('T', 7), 'starterB', 1));
    p = { ...p, career: { ...p.career!, reputation: 400 } };
    const credits = p.credits;
    const q = okC(retireCareer(p, 99));
    expect(q.career).toBeUndefined();
    expect(q.careers).toHaveLength(1);
    expect(q.careers[0]).toMatchObject({ status: 'retired', endedAt: 99 });
    expect(q.credits).toBe(credits + retirementBonus(p.career!));
    expect(q.contractBoard).toHaveLength(0);
  });

  it('is fired after too many F grades in a row', () => {
    let p = okC(startCareer(newProfile('T', 7), 'starterB', 1));
    const film = { grade: 'F', results: { nominations: [], wins: [], boxOffice: 0 } } as unknown as Film;
    for (let i = 0; i < TUNING.career.firedAfterFs - 1; i++) {
      const r = recordFilm(p, film, 5, 0);
      expect(r.fired).toBe(false);
      p = r.profile;
    }
    const r = recordFilm(p, film, 5, 0);
    expect(r.fired).toBe(true);
    expect(r.profile.career).toBeUndefined();
    expect(r.profile.careers[0].status).toBe('fired');
    expect(r.profile.careers[0].films).toBe(TUNING.career.firedAfterFs);
  });

  it('a B breaks the F streak', () => {
    let p = okC(startCareer(newProfile('T', 7), 'starterB', 1));
    const mk = (g: string) => ({ grade: g, results: { nominations: [], wins: [], boxOffice: 0 } }) as unknown as Film;
    p = recordFilm(p, mk('F'), 0, 0).profile;
    p = recordFilm(p, mk('B'), 0, 10).profile;
    p = recordFilm(p, mk('F'), 0, 0).profile;
    expect(p.career!.fStreak).toBe(1);
    expect(bestGrade(p.career!)).toBe('B');
  });
});

describe('end to end: one full contract through the engine, no UI', () => {
  it('plays brief → script → casting → shooting → post → premiere → delivery', () => {
    let p = okC(startCareer(newProfile('E2E', 2024), 'starterA', 1));
    // Pick the cheapest-feeling brief: the first one.
    const contract = p.contractBoard[0];
    p = okC(startFilm(p, contract.id));
    let f = p.activeFilm!;

    // Script: main + whatever role the brief needs, 3 scenes with 2 beats each, ending on a climax.
    f = ok(addRole(f, 'main'));
    for (const req of contract.hardReqs) if (req.kind === 'role') f = ok(addRole(f, req.roleType));
    if (!f.roles.some((r) => r.type === 'villain')) f = ok(addRole(f, 'villain'));
    const main = f.roles.find((r) => r.type === 'main')!.id;
    const other = f.roles.find((r) => r.type !== 'main')!.id;
    const plan: [Film['scenes'][0]['tone'], string, string][] = [['calm', 'plans', 'confesses'], ['thrill', 'chases', 'argues'], ['sad', 'revealsSecret', 'cries']];
    plan.forEach(([tone, a1, a2], i) => {
      f = ok(addScene(f, { duration: 'long', tone }));
      const id = f.scenes[i].id;
      f = ok(addBeat(f, id, { roleId: other, actionId: a1, targetId: a1 === 'plans' ? undefined : main }));
      f = ok(addBeat(f, id, { roleId: main, actionId: a2, targetId: a2 === 'cries' ? undefined : other }));
    });
    f = ok(finishScript(f));
    expect(f.phase).toBe('casting');
    p = { ...p, activeFilm: f };

    // Casting: draw once per role, cast the cheapest card.
    for (const role of p.activeFilm!.roles) {
      p = okP(drawCards(p, role.id));
      const fm = p.activeFilm!;
      const cheapest = [...fm.casting[role.id].offered].sort((a, b) => rolePay(fm, role, a) - rolePay(fm, role, b))[0];
      p = okP(castActor(p, role.id, cheapest.id));
    }
    p = okP(finishCasting(p));
    expect(p.activeFilm!.phase).toBe('shooting');

    // Shooting: one club week, then shoot each scene once on the best set and keep the better cut.
    p = okP(doWeek(p, { kind: 'club' }));
    for (const s of p.activeFilm!.scenes) {
      p = okP(doWeek(p, { kind: 'shoot', sceneId: s.id, setId: s.tone === 'thrill' ? 'cityStreet' : 'apartment', focus: 'dialogue' }));
      const v = [...p.activeFilm!.shooting!.pending!.versions].sort((a, b) => b.score - a.score)[0];
      p = okP(chooseVersion(p, v.id));
    }
    p = okP(wrapShooting(p));
    expect(p.activeFilm!.phase).toBe('post');
    expect(crewWeekCost(p.activeFilm!)).toBeGreaterThan(0);

    // Post: library music, lock.
    const post = finishPost({ ...p.activeFilm!, music: 'library' });
    if (!post.ok) throw new Error(post.reason);
    p = { ...p, activeFilm: post.film };

    // Premiere and delivery.
    p = okC(runPremiere(p));
    const film = p.activeFilm!;
    expect(film.results!.publicRating).toBeGreaterThan(0);
    expect(['A', 'B', 'C', 'D', 'F']).toContain(film.grade);
    const credits = p.credits;
    const after = deliverFilm(p);
    if (!after.ok) throw new Error(after.reason);
    expect(after.profile.filmography).toHaveLength(1);
    expect(after.profile.credits).toBeGreaterThan(credits);
    expect(budgetLeft).toBeDefined();
    // The career continues (one F does not get you fired).
    expect(after.profile.career?.films ?? after.profile.careers[0].films).toBe(1);
  });
});
