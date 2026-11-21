// Casting phase: card-pack draws per role, actor pay, casting score.
//
// Each role is drawn separately. A draw shows 3 actor cards; the first draw per
// role is free, each redraw costs a rising fee (1×, 2×, 4× …). Cards you pass on
// are gone for this film. A role's fit depends on the skills its beats use.

import type { Actor, Billing, DirectorDef, Film, Profile, Rarity, Role, Skill, SkillMap } from './types';
import type { Rng } from './rng';
import { TUNING } from './tuning';
import { actionById } from './data/actions';
import { SKILLS, generateActorPool, isHiddenGem } from './data/actors';
import { directorById } from './data/directors';
import { affinityBonus, specialtyScale } from './director';
import { withRng } from './profile';
import { screenTime, spent } from './script';
import { initShooting } from './shooting';
import { loyaltyMult } from './franchise';

export type CastResult = { ok: true; profile: Profile } | { ok: false; reason: string };
const fail = (reason: string): CastResult => ({ ok: false, reason });
const C = () => TUNING.casting;

// ---------------- Skill needs & fit ----------------

/** Share of each skill a role needs (sums to 1), from the beats it acts in plus its role type. */
export function roleSkillNeeds(film: Film, role: Role): SkillMap {
  const w: SkillMap = { action: 0, comedy: 0, drama: 0, romance: 0, menace: 0 };
  for (const s of film.scenes) {
    for (const b of s.beats) {
      if (b.roleId === role.id) {
        const a = actionById(b.actionId);
        w[a.skill] += Math.max(0.5, a.impact);
      }
      if (b.targetId === role.id) w[C().targetSkill as Skill] += C().targetWeight;
    }
  }
  const beatTotal = SKILLS.reduce((a, k) => a + w[k], 0);
  const def = C().roleDefaultSkill[role.type] as Skill;
  const out = {} as SkillMap;
  const dw = beatTotal ? C().roleDefaultWeight : 1;
  for (const k of SKILLS) out[k] = (beatTotal ? (w[k] / beatTotal) * (1 - dw) : 0) + (k === def ? dw : 0);
  return out;
}

const AGE_FIT: Partial<Record<Role['type'], Partial<Record<Actor['age'], number>>>> = {
  romanticInterest: { young: 100, adult: 90, veteran: 65 },
  main: { young: 90, adult: 100, veteran: 85 },
  supporting: { young: 85, adult: 95, veteran: 100 },
};

/** How well an actor suits a role, 0–100. */
export function actorFit(film: Film, role: Role, actor: Actor): number {
  const needs = roleSkillNeeds(film, role);
  const skill = SKILLS.reduce((a, k) => a + actor.skills[k] * needs[k], 0);
  const base = skill * C().skillWeight + actor.acting * (1 - C().skillWeight);
  const age = (AGE_FIT[role.type]?.[actor.age] ?? 95) / 100;
  return Math.round(base * age);
}

// ---------------- Pay ----------------

export function baseFee(actor: Actor, billing: Billing): number {
  const T = C();
  const raw = T.feeAt30 * Math.pow(actor.starPower / 30, T.feeExponent) * T.billingFeeMult[billing];
  const diva = actor.traits.includes('diva') ? T.divaFeeMult : 1;
  return Math.round(Math.max(T.feeMin, raw) * diva);
}

/** Pay = base fee + screen-time minutes × per-minute rate (rate scales with star power). */
export function actorPay(actor: Actor, role: Role, minutes: number): { base: number; perMinute: number; total: number } {
  const base = baseFee(actor, role.billing);
  const perMinute = Math.round(base * C().perMinuteShare * 10) / 10;
  return { base, perMinute, total: Math.round(base + perMinute * minutes) };
}

export function rolePay(film: Film, role: Role, actor: Actor): number {
  return Math.round(actorPay(actor, role, screenTime(film)[role.id] ?? 0).total * loyaltyMult(actor, film.directorId));
}

/** Payroll of everyone cast so far (signed pay, or the current estimate before signing). */
export const payroll = (film: Film) => film.roles.reduce((a, r) => a + (r.actor ? r.pay ?? rolePay(film, r, r.actor) : 0), 0);

/** Pay of cast actors not yet on the ledger. */
const pendingPayroll = (film: Film) => film.roles.reduce((a, r) => a + (r.actor && r.pay === undefined ? rolePay(film, r, r.actor) : 0), 0);

// ---------------- Draws ----------------

export function redrawFee(film: Film, roleId: string, level = 1): number {
  const director = directorById(film.directorId);
  const state = film.casting[roleId];
  const draws = state?.draws ?? 0;
  if (draws === 0) return 0; // first draw is free
  const base = Math.max(C().redrawFeeMin, film.contract.budget * C().redrawFeeShare);
  const discount = C().scoutFeeDiscount * specialtyScale(director, 'casting', level);
  return Math.round(base * Math.pow(2, draws - 1) * (1 - Math.min(0.8, discount)));
}

/** Budget left after money spent and the pay owed to everyone cast so far. */
export const budgetLeft = (film: Film) => film.contract.budget - spent(film) - pendingPayroll(film);

function drawFrom(rng: Rng, pool: Actor[], billing: Billing, gemBoost: number, n: number, affordable: (a: Actor) => boolean = () => true): Actor[] {
  const weights = C().rarityWeights[billing] as Record<Rarity, number>;
  const picked: Actor[] = [];
  const left = [...pool];
  while (picked.length < n && left.length) {
    const ws = left.map((a) => weights[a.rarity] * (isHiddenGem(a) ? gemBoost : 1) * (affordable(a) ? 1 : C().overBudgetDrawWeight));
    const total = ws.reduce((a, b) => a + b, 0);
    let r = rng.next() * total;
    let i = 0;
    for (; i < ws.length - 1; i++) {
      r -= ws[i];
      if (r < 0) break;
    }
    picked.push(left[i]);
    left.splice(i, 1);
  }
  // Always at least one card the film can afford.
  const cheap = left.filter(affordable);
  if (picked.length && !picked.some(affordable) && cheap.length) picked[picked.length - 1] = cheap[Math.floor(rng.next() * cheap.length)];
  return picked;
}

/**
 * Draw 3 cards for a role. The first draw is free; each redraw charges a rising fee
 * and the cards on the table are rejected (gone for this film).
 */
export function drawCards(p: Profile, roleId: string): CastResult {
  const film = p.activeFilm;
  if (!film || film.phase !== 'casting') return fail('Not casting');
  const role = film.roles.find((r) => r.id === roleId);
  if (!role) return fail('Unknown role');
  const director = directorById(film.directorId);
  const level = p.directors[film.directorId]?.level ?? 1;
  const fee = redrawFee(film, roleId, level);
  if (fee > 0 && fee > budgetLeft(film)) return fail('Not enough budget for a redraw');

  const state = film.casting[roleId] ?? { draws: 0, offered: [] };
  const rejected = [...film.rejected, ...state.offered.map((a) => a.id)];
  const blocked = new Set([
    ...rejected,
    ...film.roles.flatMap((r) => (r.actor ? [r.actor.id] : [])),
    ...Object.entries(film.casting).flatMap(([id, c]) => (id === roleId ? [] : c.offered.map((a) => a.id))),
  ]);

  const gemBoost = 1 + (C().scoutGemWeight - 1) * Math.min(1, specialtyScale(director, 'casting', level));
  const { profile, value } = withRng(p, (rng) => {
    let pool = p.actorPool;
    let available = pool.filter((a) => !blocked.has(a.id));
    // Running low on talent: fresh faces join the pool.
    if (available.length < C().cardsPerDraw) {
      const fresh = generateActorPool(rng, 6, new Set(pool.map((a) => a.name)));
      pool = [...pool, ...fresh];
      available = [...available, ...fresh];
    }
    // A sequel's first draw for the lead brings back the original star (if still available).
    const returning = role.type === 'main' && state.draws === 0 ? available.find((a) => a.id === film.contract.sequelOf?.leadActorId) : undefined;
    // Stars far beyond this film's means turn up less often (agents know the budget).
    const cap = film.contract.budget * C().affordShare[role.billing];
    const affordable = (a: Actor) => rolePay(film, role, a) <= cap;
    const rest = drawFrom(rng, available.filter((a) => a.id !== returning?.id), role.billing, gemBoost, C().cardsPerDraw - (returning ? 1 : 0), affordable);
    return { pool, cards: returning ? [returning, ...rest] : rest };
  });

  const nextFilm: Film = {
    ...film,
    rejected,
    casting: { ...film.casting, [roleId]: { draws: state.draws + 1, offered: value.cards } },
    ledger: fee ? [...film.ledger, { label: `Casting redraw: ${role.name}`, amount: fee, phase: 'casting' }] : film.ledger,
  };
  return { ok: true, profile: { ...profile, actorPool: value.pool, activeFilm: nextFilm } };
}

/** Cast an offered card. The other cards on the table are rejected. */
export function castActor(p: Profile, roleId: string, actorId: string): CastResult {
  const film = p.activeFilm;
  if (!film || film.phase !== 'casting') return fail('Not casting');
  const role = film.roles.find((r) => r.id === roleId);
  const state = film.casting[roleId];
  const actor = state?.offered.find((a) => a.id === actorId);
  if (!role || !state || !actor) return fail('That card is not on the table');
  const others = state.offered.filter((a) => a.id !== actorId).map((a) => a.id);
  const roles = film.roles.map((r) => (r.id === roleId ? { ...r, actor: structuredClone(actor) } : r));
  return {
    ok: true,
    profile: {
      ...p,
      activeFilm: { ...film, roles, rejected: [...film.rejected, ...others], casting: { ...film.casting, [roleId]: { ...state, offered: [] } } },
    },
  };
}

/** Release a cast actor so the role can be drawn again (they are gone for this film). */
export function releaseRole(p: Profile, roleId: string): CastResult {
  const film = p.activeFilm;
  const role = film?.roles.find((r) => r.id === roleId);
  if (!film || !role?.actor) return fail('Nobody to release');
  return {
    ok: true,
    profile: {
      ...p,
      activeFilm: {
        ...film,
        rejected: [...film.rejected, role.actor.id],
        roles: film.roles.map((r) => (r.id === roleId ? { ...r, actor: undefined } : r)),
      },
    },
  };
}

// ---------------- Score & finish ----------------

export interface CastingBreakdown {
  fit: number;
  star: number;
  directorBonus: number;
  total: number;
  perRole: Record<string, number>;
}

export function castingScore(film: Film, director?: DirectorDef): CastingBreakdown {
  const T = C();
  const perRole: Record<string, number> = {};
  let wSum = 0, fSum = 0;
  for (const r of film.roles) {
    if (!r.actor) continue;
    const f = actorFit(film, r, r.actor);
    perRole[r.id] = f;
    const w = T.billingScoreWeight[r.billing];
    wSum += w;
    fSum += f * w;
  }
  const fit = wSum ? fSum / wSum : 0;
  const tierIdx = Math.max(0, TUNING.contracts.budgetTiers.findIndex((b) => film.contract.budget <= b * 1.25));
  const expected = T.expectedStar[tierIdx === -1 ? T.expectedStar.length - 1 : tierIdx];
  const lead = film.roles.find((r) => r.type === 'main')?.actor;
  const top = Math.max(0, ...film.roles.map((r) => r.actor?.starPower ?? 0));
  const starPower = lead ? (lead.starPower * 2 + top) / 3 : 0;
  const star = Math.min(100, (starPower / expected) * 100);
  const directorBonus = director ? affinityBonus(director, film.contract.genre) : 0;
  const total = wSum ? Math.max(0, Math.min(100, Math.round(fit * (1 - T.starShare) + star * T.starShare + directorBonus))) : 0;
  return { fit: Math.round(fit), star: Math.round(star), directorBonus, total, perRole };
}

export function castingBlockers(film: Film): string[] {
  return film.roles.filter((r) => !r.actor).map((r) => `Cast ${r.name}`);
}

/** Sign the cast: each actor's pay goes on the ledger and the film moves to shooting. */
export function finishCasting(p: Profile): CastResult {
  const film = p.activeFilm;
  if (!film || film.phase !== 'casting') return fail('Not casting');
  const blockers = castingBlockers(film);
  if (blockers.length) return fail(blockers[0]);
  const roles = film.roles.map((r) => ({ ...r, pay: rolePay(film, r, r.actor!) }));
  const ledger = [...film.ledger, ...roles.map((r) => ({ label: `Cast: ${r.actor!.name} as ${r.name}`, amount: r.pay!, phase: 'casting' as const }))];
  const score = castingScore(film, directorById(film.directorId)).total;
  return {
    ok: true,
    profile: { ...p, activeFilm: { ...film, roles, ledger, phase: 'shooting', castingScore: score, casting: {}, shooting: initShooting({ ...film, roles }) } },
  };
}
