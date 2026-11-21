// Milestone 8: actor careers across films, and sequels/franchises.
//
// Actor careers: after each film the cast's star power moves with the result (hits and
// awards up, flops down), strong performances sharpen acting a little, and actors you
// cast while still unknown remember you (a fee discount for that director later).
//
// Sequels: a hit (grade B or better and box office at/above target) earns a sequel
// brief on the next board: same studio, genre and topic, a bigger budget, a built-in
// fanbase (buzz + opening), a bonus for bringing back the original lead, and a little
// critics fatigue.

import type { Actor, Contract, Film, Grade, Profile } from './types';
import type { Rng } from './rng';
import { TUNING } from './tuning';
import { generateContract } from './contracts';
import { effectiveBoxOfficeTarget } from './marketing';
import { chosenTake } from './shooting';
import { participants } from './script';

const A = () => TUNING.actorCareers;
const Q = () => TUNING.sequel;
const ORDER: Grade[] = ['A', 'B', 'C', 'D', 'F'];

/** Update the actor pool after a delivered film. */
export function updateActorCareers(pool: Actor[], film: Film): Actor[] {
  const grade = (film.grade ?? 'C') as Grade;
  const wins = film.results?.wins ?? [];
  const byId = new Map(film.roles.filter((r) => r.actor).map((r) => [r.actor!.id, r]));
  return pool.map((a) => {
    const role = byId.get(a.id);
    if (!role) return a;
    const share = role.billing === 'lead' ? 1 : A().otherShare;
    const myWins = wins.filter((w) => w.includes(a.name)).length + (role.billing === 'lead' && wins.includes('Best Picture') ? 1 : 0);
    const star = Math.round(A().starByGrade[grade] * share + myWins * A().starPerWin);
    const takes = film.scenes.filter((s) => !s.cut && participants(s).includes(role.id)).map((s) => chosenTake(s)?.score ?? 0);
    const avgTake = takes.length ? takes.reduce((x, y) => x + y, 0) / takes.length : 0;
    const discovered = (role.actor!.starPower < A().discoveredBelow) && !(a.discoveredBy ?? []).includes(film.directorId);
    return {
      ...a,
      starPower: Math.max(1, Math.min(100, a.starPower + star)),
      acting: Math.min(100, a.acting + (avgTake >= A().actingGainAt ? A().actingGain : 0)),
      films: (a.films ?? 0) + 1,
      wins: (a.wins ?? 0) + myWins,
      credits: [{ title: film.title, grade }, ...(a.credits ?? [])].slice(0, A().creditsKept),
      discoveredBy: discovered ? [...(a.discoveredBy ?? []), film.directorId] : a.discoveredBy,
    };
  });
}

/** Fee multiplier for an actor this director discovered. */
export const loyaltyMult = (actor: Actor, directorId: string) =>
  actor.discoveredBy?.includes(directorId) ? 1 - A().discoveryDiscount : 1;

export function isHit(film: Film): boolean {
  if (!film.grade || !film.results) return false;
  return ORDER.indexOf(film.grade) <= ORDER.indexOf(Q().minGrade as Grade) && film.results.boxOffice >= effectiveBoxOfficeTarget(film) * Q().minBoxOfficeRatio;
}

const roundTo = (n: number, step: number) => Math.round(n / step) * step;

/** The sequel brief for a hit film. */
export function sequelContract(rng: Rng, film: Film, level: number): Contract {
  const franchise = film.franchise?.name ?? film.title;
  const number = (film.franchise?.number ?? 1) + 1;
  const base = generateContract(rng, level, { archetype: film.contract.archetype, genre: film.contract.genre });
  const lead = film.roles.find((r) => r.type === 'main')?.actor;
  const budget = roundTo(film.contract.budget * Q().budgetMult, 500);
  const bonusGoals: Contract['bonusGoals'] = [
    ...(lead ? [{ kind: 'returningLead' as const, actorId: lead.id, name: lead.name, points: Q().returningLeadPoints }] : []),
    ...(film.topicId ? [{ kind: 'topic' as const, topicId: film.topicId, points: 3 }] : []),
  ];
  return {
    ...base,
    title: `${franchise} ${number}`,
    studio: film.contract.studio,
    genre: film.contract.genre,
    secondaryGenre: film.contract.secondaryGenre,
    rating: film.contract.rating,
    runtime: film.runtime,
    hardReqs: base.hardReqs.map((r) => (r.kind === 'runtime' ? { ...r, target: film.runtime } : r)),
    budget,
    boxOfficeTarget: roundTo(film.contract.boxOfficeTarget * Q().budgetMult, 500),
    marketing: roundTo(budget * TUNING.marketing.shareOfBudget, 100),
    bonusGoals,
    rewards: { fee: Math.round((base.rewards.fee * Q().rewardMult) / 5) * 5 },
    sequelOf: { filmId: film.id, franchise, number, topicId: film.topicId, leadActorId: lead?.id },
  };
}

/** Premiere effects of being a sequel: fanbase buzz and opening, critics fatigue. */
export function franchiseEffect(film: Film) {
  const n = film.franchise?.number ?? 1;
  if (n < 2) return { buzz: 0, opening: 1, critics: 0 };
  return { buzz: Q().buzzBonus, opening: Q().openingMult, critics: -Math.min(Q().criticsFatigueMax, Q().criticsFatiguePer * (n - 1)) };
}

/** After delivery: update actors, and put a sequel brief on the board for a hit. */
export function afterDelivery(p: Profile, film: Film, rng: Rng): Profile {
  const actorPool = updateActorCareers(p.actorPool, film);
  // The sequel takes the place of one of the briefs at your level.
  const board = p.career && isHit(film)
    ? [{ ...sequelContract(rng, film, p.career.level), tag: 'match' as const }, ...p.contractBoard.filter((_, i) => i !== 1)]
    : p.contractBoard;
  return { ...p, actorPool, contractBoard: board };
}
