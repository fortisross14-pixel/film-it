// Bot players for the balance simulation: they play whole films through the real engine.
import type { ActionDef, Beat, Contract, Meter, Profile, RoleType, Tone } from '../../src/engine/types';
import { newProfile, startFilm } from '../../src/engine/profile';
import { retireCareer, startCareer } from '../../src/engine/career';
import { buyDirector, buySet, buyTalentPack, buyTopicPack, directorCost, openTalentPack } from '../../src/engine/progression';
import { DIRECTORS } from '../../src/engine/data/directors';
import { TOPIC_PACKS } from '../../src/engine/data/topics';
import {
  addBeat, addRole, addScene, availableActions, checkRequirements, finishScript, genreTarget, layout, placeScene, setTopic,
} from '../../src/engine/script';
import { actorFit, budgetLeft, castActor, drawCards, finishCasting, redrawFee, rolePay } from '../../src/engine/casting';
import { chooseVersion, doWeek, predictMeters, setFit, weeksLeft, wrapShooting } from '../../src/engine/shooting';
import { autoPolish, finishPost, postSummary, setMusic } from '../../src/engine/post';
import { POSTER_FONTS, POSTER_STYLES, editPoster, posterOf, regenerateFee, regeneratePoster } from '../../src/engine/marketing';
import { deliverFilm, runPremiere } from '../../src/engine/premiere';
import { directorById } from '../../src/engine/data/directors';
import { genreCloseness } from '../../src/engine/data/genres';
import { SETS } from '../../src/engine/data/sets';
import { TOPICS } from '../../src/engine/data/topics';
import { FAMOUS, generateStar } from '../../src/engine/data/actors';
import { assignPortraits } from '../../src/engine/portraits';
import { createRng } from '../../src/engine/rng';
import { TUNING } from '../../src/engine/tuning';
import { spent } from '../../src/engine/script';

export type Bot = 'careful' | 'average' | 'naive';

const TONE_PLAN: Record<Contract['genre'], Tone[]> = {
  action: ['thrill', 'calm', 'thrill', 'thrill'],
  drama: ['calm', 'sad', 'romantic', 'sad'],
  romance: ['happy', 'romantic', 'sad', 'romantic'],
  comedy: ['happy', 'happy', 'romantic', 'happy'],
  thriller: ['calm', 'thrill', 'scary', 'thrill'],
  horror: ['calm', 'scary', 'scary', 'scary'],
  scifi: ['calm', 'thrill', 'scary', 'thrill'],
  fantasy: ['happy', 'thrill', 'romantic', 'thrill'],
};

const ok = <T extends { ok: boolean }>(r: T, what: string): T & { ok: true } => {
  if (!r.ok) throw new Error(`${what}: ${(r as unknown as { reason: string }).reason}`);
  return r as T & { ok: true };
};

function rolesFor(c: Contract): RoleType[] {
  const roles = new Set<RoleType>(['main']);
  if (['action', 'thriller', 'horror', 'scifi', 'fantasy'].includes(c.genre)) roles.add('villain');
  if (['romance', 'drama', 'comedy', 'fantasy'].includes(c.genre)) roles.add('romanticInterest');
  if (c.genre === 'comedy') roles.add('comicRelief');
  for (const r of c.hardReqs) if (r.kind === 'role') roles.add(r.roleType);
  return [...roles];
}

/** Write a sensible script for the brief (the careful bot; the naive bot uses fewer, shallower scenes). */
export function writeScript(p: Profile, bot: Bot): Profile {
  let f = p.activeFilm!;
  const c = f.contract;
  for (const t of rolesFor(c)) f = ok(addRole(f, t), 'role').film;
  if (bot === 'careful') {
    const topic = [...TOPICS].filter((t) => p.unlocks.topics.includes(t.id)).sort((a, b) => b.genreFit[c.genre] - a.genreFit[c.genre])[0];
    f = ok(setTopic(f, topic.id, p.unlocks.topics), 'topic').film;
  }
  const tones = [...TONE_PLAN[c.genre]];
  const toneReq = c.hardReqs.find((r) => r.kind === 'tone');
  if (toneReq && toneReq.kind === 'tone' && !tones.includes(toneReq.tone)) tones[1] = toneReq.tone;
  const actionReq = c.hardReqs.find((r) => r.kind === 'action');
  const nScenes = bot === 'naive' ? 3 : 4;
  const durations = bot === 'careful' ? (['long', 'medium', 'medium', 'long'] as const) : bot === 'average' ? (['medium', 'medium', 'medium', 'medium'] as const) : (['medium', 'short', 'medium'] as const);
  const { target } = genreTarget(f);
  const roleOf = (t: RoleType) => f.roles.find((r) => r.type === t)?.id;
  const actorFor = (a: ActionDef) =>
    (a.skill === 'menace' && roleOf('villain')) || (a.skill === 'romance' && roleOf('romanticInterest')) || (a.skill === 'comedy' && roleOf('comicRelief')) || roleOf('main')!;
  const dist = (a: ActionDef) => (['action', 'humor', 'romance', 'fear'] as const).reduce((s, k) => s + Math.abs(a.vec[k] - target[k]), 0);
  let usedReq = false;
  for (let i = 0; i < nScenes; i++) {
    const tone = tones[i % tones.length];
    const r = addScene(f, { duration: durations[i], tone });
    f = ok(r, 'scene').film;
    const sceneId = (r as { sceneId: string }).sceneId;
    const last = i === nScenes - 1;
    const pool = availableActions(f)
      .filter((a) => a.impact > 0)
      .map((a) => ({ a, s: (a.tones.includes(tone) ? 60 : 0) + (100 - dist(a) / 4) + (last && a.climax ? 80 : 0) + (actionReq?.kind === 'action' && a.id === actionReq.actionId && !usedReq ? 200 : 0) }))
      .sort((x, y) => y.s - x.s);
    const picks = bot === 'naive' ? 1 : 2;
    let added = 0;
    for (const { a } of pool) {
      if (added >= picks) break;
      const roleId = actorFor(a);
      const other = f.roles.find((x) => x.id !== roleId)?.id;
      const beat: Beat = { roleId, actionId: a.id, targetId: a.target === 'none' ? undefined : a.target === 'required' ? other : other };
      if (a.target !== 'none' && !beat.targetId) continue;
      const res = addBeat(f, sceneId, beat);
      if (res.ok) {
        f = res.film;
        added++;
        if (actionReq?.kind === 'action' && a.id === actionReq.actionId) usedReq = true;
      }
    }
  }
  // Spread scenes evenly over the runtime (the careful bot uses the timeline).
  if (bot === 'careful') {
    const slots = layout(f);
    const total = slots.reduce((s, x) => s + x.minutes, 0);
    const gap = (f.runtime - total) / (slots.length + 1);
    let cursor = gap;
    for (const sl of slots) {
      f = ok(placeScene(f, sl.sceneId, Math.round(cursor)), 'place').film;
      cursor += sl.minutes + gap;
    }
  }
  const d = directorById(f.directorId);
  f = ok(finishScript(f, d, p.directors[f.directorId]?.level ?? 1), 'lock').film;
  return { ...p, activeFilm: f };
}

export function cast(p: Profile, bot: Bot): Profile {
  const film = p.activeFilm!;
  const share = { lead: 0.45, second: 0.25, support: 0.15, minor: 0.08 };
  const castBudget = film.contract.budget * 0.38;
  const order = [...film.roles].sort((a, b) => ['lead', 'second', 'support', 'minor'].indexOf(a.billing) - ['lead', 'second', 'support', 'minor'].indexOf(b.billing));
  for (const role of order) {
    p = ok(drawCards(p, role.id), 'draw').profile;
    if (bot === 'naive') {
      p = ok(castActor(p, role.id, p.activeFilm!.casting[role.id].offered[0].id), 'cast').profile;
      continue;
    }
    if (bot === 'average') {
      const f = p.activeFilm!;
      const minStar = role.type === 'main' ? (f.contract.hardReqs.find((r) => r.kind === 'leadStarPower') as { min: number } | undefined)?.min ?? 0 : 0;
      const offered = [...f.casting[role.id].offered].sort((a, b) => rolePay(f, role, a) - rolePay(f, role, b));
      const pick = offered.find((a) => a.starPower >= minStar) ?? offered[0];
      p = ok(castActor(p, role.id, pick.id), 'cast').profile;
      continue;
    }
    const pick = () => {
      const f = p.activeFilm!;
      const cap = castBudget * share[role.billing];
      const scored = f.casting[role.id].offered.map((a) => {
        const pay = rolePay(f, role, a);
        return { a, pay, v: actorFit(f, role, a) + a.starPower * 0.2 - (pay > cap ? 40 + ((pay - cap) / cap) * 30 : 0) };
      }).sort((x, y) => y.v - x.v);
      return scored[0];
    };
    const minStar = role.type === 'main' ? (film.contract.hardReqs.find((r) => r.kind === 'leadStarPower') as { min: number } | undefined)?.min ?? 0 : 0;
    const meets = () => p.activeFilm!.casting[role.id].offered.filter((a) => a.starPower >= minStar);
    let best = pick();
    for (let tries = 0; tries < 4 && (best.v < 55 || best.a.starPower < minStar) && redrawFee(p.activeFilm!, role.id) < Math.min(p.activeFilm!.contract.budget * 0.02, budgetLeft(p.activeFilm!)); tries++) {
      if (minStar && meets().length) break;
      p = ok(drawCards(p, role.id), 'redraw').profile;
      best = pick();
    }
    if (minStar && meets().length) {
      const f = p.activeFilm!;
      best = meets().map((a) => ({ a, pay: rolePay(f, role, a), v: actorFit(f, role, a) })).sort((x, y) => x.pay - y.pay)[0];
    }
    p = ok(castActor(p, role.id, best.a.id), 'cast').profile;
  }
  return ok(finishCasting(p), 'sign').profile;
}

export function shoot(p: Profile, bot: Bot): Profile {
  if (bot === 'careful') p = ok(doWeek(p, { kind: 'club' }), 'club').profile;
  const sets = SETS.filter((s) => p.unlocks.sets.includes(s.id));
  for (const s of p.activeFilm!.scenes) {
    const set = bot !== 'naive' ? [...sets].sort((a, b) => setFit(b, s) - setFit(a, s))[0] : sets[0];
    const w = TUNING.shooting.toneWeights[s.tone];
    const focus = (Object.keys(w) as Meter[]).sort((a, b) => w[b] - w[a])[0];
    for (let attempt = 0; attempt < (bot === 'careful' ? 2 : 1); attempt++) {
      p = ok(doWeek(p, { kind: 'shoot', sceneId: s.id, setId: set.id, focus }), 'shoot').profile;
      const best = [...p.activeFilm!.shooting!.pending!.versions].sort((a, b) => b.score - a.score)[0];
      p = ok(chooseVersion(p, best.id), 'choose').profile;
      const remaining = p.activeFilm!.scenes.filter((x) => !x.chosenTakeId).length;
      if (best.score >= 62 || weeksLeft(p.activeFilm!) < remaining + 4) break;
    }
    void predictMeters;
  }
  return ok(wrapShooting(p), 'wrap').profile;
}

export function post(p: Profile, bot: Bot): Profile {
  let f = p.activeFilm!;
  const level = p.directors[f.directorId]?.level ?? 1;
  if (bot === 'average') f = ok(setMusic(f, 'library'), 'music').film;
  if (bot === 'careful') {
    const left = f.contract.budget - spent(f);
    f = ok(setMusic(f, left > f.contract.budget * 0.25 ? 'composer' : 'library'), 'music').film;
    const leftAfter = f.contract.budget - spent(f) - postSummary(f, level).musicCost;
    if (leftAfter > 0) f = autoPolish(f, leftAfter * 0.3, level);
    // Poster: suitable style, fitting font, stars billed big, superstar faces.
    for (let i = 0; i < 2; i++) {
      const style = POSTER_STYLES.find((s) => s.id === posterOf(f).style)!;
      if (style.fit[f.contract.genre] >= 60 || regenerateFee(f) > f.contract.budget * 0.01) break;
      f = ok(regeneratePoster(f), 'poster').film;
    }
    const font = [...POSTER_FONTS].sort((a, b) => b.fit[f.contract.genre] - a.fit[f.contract.genre])[0];
    const billing = Object.fromEntries(f.roles.filter((r) => r.actor).map((r) => {
      const sp = r.actor!.starPower;
      return [r.id, sp >= TUNING.poster.starAt ? 'l' : sp < TUNING.poster.nobodyBelow ? 'hidden' : 's'];
    }));
    const faces = f.roles.filter((r) => (r.actor?.starPower ?? 0) >= TUNING.poster.superstarAt).map((r) => r.id).slice(0, 3);
    f = ok(editPoster(f, { titleFont: font.id, titleSize: 'l', billing: billing as never, faces }), 'edit poster').film;
  }
  f = ok(finishPost(f, level), 'post').film;
  return { ...p, activeFilm: f };
}

export interface FilmLog {
  bot: Bot; genre: string; archetype: string; budget: number; grade: string; score: number; satisfaction: number;
  audience: number; critics: number; boRatio: number; spentRatio: number; weeksLate: number; noms: number; wins: number;
  script: number; casting: number; cut: number; poster: number; money: number; pay: { fee: number; boxOffice: number; rating: number; awards: number }; level: number; sequel: boolean;
  components: Record<string, number>; missed: number; factors: Record<string, number>; missedList: string[]; awards: string[]; winList: string[]; film: number; costs?: Record<string, number>;
}

/** Play one film from the current board; returns the new profile and a log line. */
export function playFilm(p: Profile, bot: Bot): { profile: Profile; log: FilmLog } {
  const d = directorById(p.career!.directorId);
  const board = p.contractBoard.filter((c) => !c.locked);
  const pickScore = (c: Contract) => (c.sequelOf ? 50 : 0) + Math.max(0, ...(d.genreAffinity.length ? d.genreAffinity.map((g) => genreCloseness(g, c.genre)) : [0.5])) * 10 - c.difficulty;
  const contract = bot === 'careful' ? board.sort((a, b) => pickScore(b) - pickScore(a))[0] : board[0];
  p = ok(startFilm(p, contract.id), 'start').profile;
  p = writeScript(p, bot);
  p = cast(p, bot);
  p = shoot(p, bot);
  p = post(p, bot);
  p = ok(runPremiere(p), 'premiere').profile;
  const f = p.activeFilm!;
  const rep = f.report!;
  const log: FilmLog = {
    bot, genre: f.contract.genre, archetype: f.contract.archetype, budget: f.contract.budget, grade: rep.grade, score: rep.score,
    satisfaction: rep.satisfaction, audience: f.results!.publicRating, critics: f.results!.criticsRating,
    boRatio: f.results!.boxOffice / f.contract.boxOfficeTarget, spentRatio: spent(f) / f.contract.budget, weeksLate: rep.weeksLate,
    noms: f.results!.nominations.length, wins: f.results!.wins.length, script: f.scriptQuality ?? 0, casting: f.castingScore ?? 0,
    cut: postSummary(f).cutQuality, poster: f.results!.posterScore ?? 0, money: rep.rewards.total, pay: { fee: rep.rewards.fee, boxOffice: rep.rewards.boxOfficeBonus, rating: rep.rewards.ratingBonus, awards: rep.rewards.awardBonus },
    level: f.contract.level, sequel: !!f.franchise, components: rep.components, missed: rep.missedReqs.length,
    factors: f.results!.factors, missedList: rep.missedReqs, awards: f.results!.nominations, winList: f.results!.wins, film: (p.career?.films ?? 0) + 1,
    costs: f.ledger.reduce<Record<string, number>>((m, e) => {
      const k = e.label.replace(/^Week \d+: /, '').replace(/:.*$/, '').replace(/ —.*$/, '');
      m[k] = (m[k] ?? 0) + e.amount;
      return m;
    }, {}),
  };
  void checkRequirements; void budgetLeft;
  p = ok(deliverFilm(p, 0), 'deliver').profile;
  // Open every talent pack earned straight away.
  for (const id of ['casting', 'star'] as const) {
    while (p.talentPacks[id] > 0) p = ok(openTalentPack(p, id), 'open pack').profile;
  }
  return { profile: p, log };
}

/** Play a career of up to n films (stops when it ends). */
export function playCareer(seed: number, bot: Bot, n = 6, directorId = 'starterA') {
  let p = ok(startCareer(newProfile('Sim', seed), directorId, 0), 'career').profile;
  const logs: FilmLog[] = [];
  for (let i = 0; i < n && p.career; i++) {
    const r = playFilm(p, bot);
    p = r.profile;
    logs.push(r.log);
  }
  return { profile: p, logs };
}

/** Spend like a player between careers: a couple of packs, then the cheapest sets and topics, a director when affordable. */
export function shop(p: Profile): Profile {
  const tryBuy = (r: { ok: true; profile: Profile } | { ok: false; reason: string }) => (r.ok ? r.profile : p);
  const dir = DIRECTORS.filter((d) => !p.unlocks.directors.includes(d.id)).sort((a, b) => directorCost(a) - directorCost(b))[0];
  if (dir && p.money >= directorCost(dir)) return tryBuy(buyDirector(p, dir.id));
  for (let i = 0; i < 2; i++) p = tryBuy(buyTalentPack(p, 'casting'));
  const goods = [
    ...SETS.filter((x) => x.unlock.kind === 'buy' && !p.unlocks.sets.includes(x.id)).map((x) => ({ cost: (x.unlock as { cost: number }).cost, buy: (q: Profile) => buySet(q, x.id) })),
    ...TOPIC_PACKS.filter((x) => x.cost && !p.unlocks.packs.includes(x.id)).map((x) => ({ cost: x.cost, buy: (q: Profile) => buyTopicPack(q, x.id) })),
  ].sort((a, b) => a.cost - b.cost);
  for (const g of goods) if (p.money >= g.cost) p = tryBuy(g.buy(p));
  for (const id of ['casting', 'star'] as const) while (p.talentPacks[id] > 0) p = ok(openTalentPack(p, id), 'open pack').profile;
  return p;
}

/** Several careers one after another on the same studio, shopping in between. */
export function playStudio(seed: number, bot: Bot, careers = 3, films = 10, start?: (p: Profile) => Profile) {
  let p = newProfile('Sim', seed);
  if (start) p = start(p);
  const byCareer: FilmLog[][] = [];
  for (let k = 0; k < careers; k++) {
    const owned = DIRECTORS.filter((d) => p.unlocks.directors.includes(d.id));
    const directorId = owned.length > 2 ? owned[owned.length - 1].id : k % 2 ? 'starterB' : 'starterA';
    p = ok(startCareer(p, directorId, 0), 'career').profile;
    const logs: FilmLog[] = [];
    for (let i = 0; i < films && p.career; i++) {
      const r = playFilm(p, bot);
      p = r.profile;
      logs.push(r.log);
    }
    if (p.career) p = ok(retireCareer(p, 0), 'retire').profile;
    byCareer.push(logs);
    p = shop(p);
  }
  return { profile: p, byCareer };
}

/** A studio with everything unlocked and every named star on the roster. */
export function veteranStudio(p: Profile): Profile {
  const rng = createRng(p.seed);
  const stars = FAMOUS.map((f) => generateStar(rng, f));
  return {
    ...p,
    unlocks: {
      directors: DIRECTORS.map((d) => d.id), sets: SETS.map((s) => s.id), topics: TOPICS.map((t) => t.id),
      packs: TOPIC_PACKS.map((t) => t.id), genres: [...p.unlocks.genres, 'horror', 'scifi', 'fantasy'],
    },
    actorPool: assignPortraits([...p.actorPool, ...stars]),
  };
}
