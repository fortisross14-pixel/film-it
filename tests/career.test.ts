import { enterCareer, parkCareer, runningCareers } from '../src/engine/career';
import { newProfile, startFilm } from '../src/engine/profile';
import type { Film, Profile } from '../src/engine/types';
import { bestGrade, legacyTitle, levelAfter, recordFilm, retireCareer, startCareer, type CareerResult } from '../src/engine/career';
import { buyDirector, directorCost } from '../src/engine/progression';
import { directorById } from '../src/engine/data/directors';
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

const mk = (g: string, pack?: string) => ({ grade: g, report: { rewards: { pack } }, results: { nominations: [], wins: [], boxOffice: 0 } }) as unknown as Film;

describe('careers', () => {
  it('starts with a profile at level 1 and opens a board', () => {
    const p0 = newProfile('T', 7);
    expect(startCareer(p0, 'masterScifi').ok).toBe(false); // locked
    const p = okC(startCareer(p0, 'starterA', 1));
    expect(p.career).toMatchObject({ directorId: 'starterA', level: 1, topLevel: 1, status: 'active' });
    // Two at your level, a third (no safe step below level 1), and a locked teaser two levels up.
    expect(p.contractBoard.map((c) => [c.level, c.tag, !!c.locked])).toEqual([[1, 'match', false], [1, 'match', false], [1, 'match', false], [3, 'teaser', true]]);
    expect(p.contractBoard.filter((c) => !c.locked).every((c) => c.studio.tier === 1)).toBe(true);
    expect(p.contractBoard.every((c) => p.unlocks.genres.includes(c.genre))).toBe(true);
    expect(startFilm(p, p.contractBoard[3].id).ok).toBe(false); // teaser
    expect(startCareer(p, 'starterA').ok).toBe(false); // one career per director
  });

  it('runs up to 3 careers side by side, each with its own board and film', () => {
    let p = { ...newProfile('T', 7), money: 50_000 };
    p = okC(buyDirector(p, 'masterScifi'));
    p = okC(startCareer(p, 'starterA', 1));
    const a = p.career!.id;
    const boardA = p.contractBoard.map((c) => c.id);
    p = okC(startFilm(p, p.contractBoard[0].id) as never);
    const filmA = p.activeFilm!.id;
    p = okC(startCareer(p, 'starterB', 2));
    expect(p.activeFilm).toBeUndefined();
    expect(runningCareers(p)).toHaveLength(2);
    p = okC(startCareer(p, 'masterScifi', 3));
    expect(runningCareers(p)).toHaveLength(3);
    expect(startCareer(parkCareer(p), 'starterA').ok).toBe(false); // full
    p = okC(enterCareer(p, a));
    expect(p.career!.id).toBe(a);
    expect(p.activeFilm!.id).toBe(filmA);
    expect(p.contractBoard.map((c) => c.id)).toEqual(boardA.slice(1));
    p = parkCareer(p);
    expect(p.career).toBeUndefined();
    expect(p.parked).toHaveLength(3);
  });

  it('buys profiles with studio money, then starts careers with them', () => {
    let p = { ...newProfile('T', 7), money: directorCost(directorById('masterScifi')) + 100 };
    p = okC(buyDirector(p, 'masterScifi'));
    expect(p.money).toBe(100);
    p = okC(startCareer(p, 'masterScifi', 1));
    expect(p.career!.directorId).toBe('masterScifi');
  });

  it('retiring ends the career early', () => {
    const p = okC(startCareer(newProfile('T', 7), 'starterB', 1));
    const q = okC(retireCareer(p, 99));
    expect(q.career).toBeUndefined();
    expect(q.careers[0]).toMatchObject({ status: 'retired', endedAt: 99 });
    expect(q.money).toBe(p.money);
    expect(q.contractBoard).toHaveLength(0);
  });

  it('climbs the ladder with the grade', () => {
    expect([levelAfter(1, 'A'), levelAfter(1, 'B'), levelAfter(4, 'C'), levelAfter(4, 'D'), levelAfter(1, 'D'), levelAfter(9, 'A')]).toEqual([3, 2, 5, 4, 1, 10]); // A +2, B +1, C +1, D holds
    let p = okC(startCareer(newProfile('T', 7), 'starterB', 1));
    let r = recordFilm(p, mk('A', 'star'), 100, 0);
    expect(r.outcome).toMatchObject({ fired: false, wrapped: false, levelFrom: 1, levelTo: 3, genresOpened: ['horror'], pack: 'star' });
    p = r.profile;
    expect(p.career).toMatchObject({ level: 3, topLevel: 3, films: 1, earnings: 100, lastGrade: 'A', packsEarned: 1 });
    expect(p.talentPacks).toEqual({ casting: 1, star: 0 }); // no Talent agency yet: a Casting call
    expect(p.unlocks.genres).toContain('horror');
    expect(p.contractBoard.map((c) => c.tag)).toEqual(['match', 'match', 'stretch', 'teaser']);
    expect(p.contractBoard.map((c) => c.level)).toEqual([3, 3, 4, 5]);
    r = recordFilm(p, mk('D'), 10, 0);
    expect(r.profile.career).toMatchObject({ level: 3, topLevel: 3 });
    expect(r.profile.contractBoard.map((c) => c.tag)).toEqual(['match', 'match', 'safe', 'teaser']);
  });

  it('one F ends the career', () => {
    let p = okC(startCareer(newProfile('T', 7), 'starterB', 1));
    p = recordFilm(p, mk('B', 'casting'), 0, 0).profile;
    const r = recordFilm(p, mk('F'), 0, 0);
    expect(r.outcome.fired).toBe(true);
    expect(r.profile.career).toBeUndefined();
    expect(r.profile.careers[0]).toMatchObject({ status: 'fired', films: 2 });
    expect(bestGrade(r.profile.careers[0])).toBe('B');
    expect(legacyTitle(r.profile.careers[0])).toBe('A brief flame');
  });

  it('wraps after 10 films', () => {
    let p = okC(startCareer(newProfile('T', 7), 'starterB', 1));
    for (let i = 0; i < TUNING.ladder.maxFilms - 1; i++) p = recordFilm(p, mk('B'), 0, 0).profile;
    expect(p.career!.level).toBe(10);
    const r = recordFilm(p, mk('C'), 0, 0);
    expect(r.outcome.wrapped).toBe(true);
    expect(r.profile.careers[0]).toMatchObject({ status: 'wrapped', films: 10, topLevel: 10 });
    expect(r.profile.unlocks.genres).toEqual(expect.arrayContaining(['horror', 'scifi', 'fantasy']));
    expect(legacyTitle(r.profile.careers[0])).toBe('Blockbuster royalty');
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
      p = okP(doWeek(p, { kind: 'shoot', sceneId: s.id, setId: s.tone === 'thrill' ? 'warehouse' : 'apartment', focus: 'dialogue' }));
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
    const money = p.money;
    const after = deliverFilm(p);
    if (!after.ok) throw new Error(after.reason);
    expect(after.profile.filmography).toHaveLength(1);
    if (film.grade !== 'F') expect(after.profile.money).toBeGreaterThan(money);
    expect(after.outcome).toBeDefined();
    expect(budgetLeft).toBeDefined();
    expect(after.profile.career?.films ?? after.profile.careers[0].films).toBe(1);
  });
});
