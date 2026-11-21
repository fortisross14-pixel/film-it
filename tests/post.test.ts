import { postProfile } from './helpers';
import type { Film } from '../src/engine/types';
import {
  autoPolish, chooseTake, finishPost, isEmotional, overproduction, postSummary, sceneScores, setCut, setMusic, setPolish,
  type PostResult,
} from '../src/engine/post';
import { weeksUsed } from '../src/engine/shooting';
import { spent } from '../src/engine/script';

const okF = (r: PostResult): Film => { if (!r.ok) throw new Error(r.reason); return r.film; };
const film = (genre: 'thriller' | 'drama' | 'scifi' = 'thriller') => postProfile(genre).activeFilm!;

describe('take selection & cuts', () => {
  it('defaults to the take chosen on set and can switch', () => {
    const f = film();
    const s = f.scenes[0];
    const before = sceneScores(f)[0].take;
    const other = s.takes.find((t) => t.id !== s.chosenTakeId)!;
    const g = okF(chooseTake(f, s.id, other.id));
    expect(sceneScores(g)[0].take).toBe(other.score);
    expect(sceneScores(g)[0].take).not.toBe(before === other.score ? -1 : before);
    expect(chooseTake(f, s.id, 'nope').ok).toBe(false);
  });
  it('cutting returns minutes to filler but keeps at least 2 scenes', () => {
    const f = film();
    const g = okF(setCut(f, f.scenes[0].id, true));
    expect(postSummary(g).fillerMinutes).toBeGreaterThan(postSummary(f).fillerMinutes);
    expect(sceneScores(g)).toHaveLength(2);
    expect(setCut(g, g.scenes[1].id, true).ok).toBe(false);
    expect(sceneScores(okF(setCut(g, g.scenes[0].id, false)))).toHaveLength(3);
  });
});

describe('music', () => {
  it('composers lift emotional scenes more', () => {
    const f = film();
    expect(isEmotional(f.scenes[1])).toBe(true); // romantic
    const lib = sceneScores(okF(setMusic(f, 'library')));
    const comp = sceneScores(okF(setMusic(f, 'composer')));
    expect(comp[1].music).toBeGreaterThan(lib[1].music);
    expect(comp[0].music).toBe(lib[0].music); // thrill chase: flat only
    expect(postSummary(okF(setMusic(f, 'star'))).musicCost).toBeGreaterThan(postSummary(okF(setMusic(f, 'composer'))).musicCost);
  });
});

describe('vfx & sfx', () => {
  it('matter more in vfx genres', () => {
    const sci = film('scifi'), dra = film('drama');
    const a = sceneScores(okF(setPolish(sci, sci.scenes[0].id, 'vfx', 'premium')))[0].vfx;
    const b = sceneScores(okF(setPolish(dra, dra.scenes[0].id, 'vfx', 'premium')))[0].vfx;
    expect(a).toBeGreaterThan(b * 3);
  });
  it('diminishing returns across the film', () => {
    let f = film('scifi');
    for (const s of f.scenes) f = okF(setPolish(f, s.id, 'vfx', 'premium'));
    const v = sceneScores(f).map((s) => s.vfx).sort((a, b) => b - a);
    expect(v[2]).toBeLessThan(v[0]);
  });
  it('overproduction: a drama full of CGI costs critics points', () => {
    let d = film('drama'), s = film('scifi');
    for (const sc of d.scenes) d = okF(setPolish(d, sc.id, 'vfx', 'premium'));
    for (const sc of s.scenes) s = okF(setPolish(s, sc.id, 'vfx', 'premium'));
    expect(overproduction(d)).toBeGreaterThan(0);
    expect(overproduction(s)).toBe(0);
  });
  it('polish costs money and post days', () => {
    const f = film();
    const g = okF(setPolish(okF(setPolish(f, f.scenes[0].id, 'vfx', 'premium')), f.scenes[0].id, 'sfx', 'premium'));
    expect(postSummary(g).polishCost).toBeGreaterThan(0);
    expect(postSummary(g).days).toBeGreaterThan(postSummary(f).days);
  });
});

describe('auto-polish', () => {
  it('spends within budget and improves the cut', () => {
    const f = film();
    const g = autoPolish(f, 2000);
    const s = postSummary(g);
    expect(s.musicCost + s.polishCost).toBeLessThanOrEqual(2000);
    expect(s.scores.reduce((a, x) => a + x.total, 0)).toBeGreaterThan(postSummary(f).scores.reduce((a, x) => a + x.total, 0));
    expect(autoPolish(f, 0)).toMatchObject({ music: 'none' });
  });
});

describe('finish', () => {
  it('charges post and moves to premiere', () => {
    let f = film();
    f = okF(setMusic(f, 'composer'));
    const s = postSummary(f);
    const before = spent(f), weeks = weeksUsed(f);
    const g = okF(finishPost(f));
    expect(g.phase).toBe('premiere');
    expect(spent(g)).toBe(before + s.cost);
    expect(weeksUsed(g)).toBe(weeks + s.weeks);
    expect(finishPost(g).ok).toBe(false);
  });
  it('cut quality blends scenes with filler', () => {
    const s = postSummary(film());
    expect(s.cutQuality).toBeGreaterThan(0);
    expect(s.cutQuality).toBeLessThanOrEqual(100);
    expect(s.best).toBeGreaterThanOrEqual(s.worst);
  });
});
