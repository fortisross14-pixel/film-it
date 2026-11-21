import type { Actor, ActorTrait, AgeBracket, Rarity, Skill, SkillMap } from '../types';
import type { Rng } from '../rng';
import { makeId } from '../rng';
import { TUNING } from '../tuning';

export const SKILLS: Skill[] = ['action', 'comedy', 'drama', 'romance', 'menace'];

// Common everyday names ("John Smith", "Hannah Myers").
const COMMON_FIRST = ['John', 'Chris', 'Hannah', 'Sarah', 'Mike', 'Emily', 'David', 'Laura', 'James', 'Anna', 'Tom', 'Kate', 'Paul', 'Lisa', 'Mark', 'Rachel', 'Dan', 'Megan', 'Steve', 'Julia', 'Ben', 'Amy', 'Sam', 'Nina'];
const COMMON_LAST = ['Smith', 'Mills', 'Myers', 'Johnson', 'Brown', 'Taylor', 'Walker', 'Hall', 'Young', 'King', 'Wright', 'Green', 'Baker', 'Carter', 'Turner', 'Parker', 'Cooper', 'Ward', 'Price', 'Bell', 'Reed', 'Hayes', 'Fox', 'Lane'];
// Syllables for totally random names ("Zarvo Quillent").
const SYL_A = ['Za', 'Ko', 'Mir', 'Vel', 'Tor', 'Lu', 'Bri', 'Ost', 'Fen', 'Ri', 'Dax', 'Yo', 'Quil', 'Sev', 'Ar', 'Ném'];
const SYL_B = ['ro', 'lin', 'ka', 'vo', 'ett', 'is', 'ana', 'den', 'ux', 'ari', 'el', 'ova', 'ent', 'ick', 'yn', 'oss'];
// Parody-famous names. Assigned to legendary and some epic cards, each used once per pool.
export const FAMOUS_NAMES = [
  'Leonardo DiBario', 'Jennifer Balliston', 'Brad Pitts', 'Meryl Streak', 'Tom Hanxs', 'Scarlett Johanssen',
  'Denzel Washingtown', 'Natalie Portmans', 'Keanu Leaves', 'Julia Roberds', 'Morgan Freedman', 'Angelina Jolly',
  'Will Smit', 'Emma Stoned', 'Samuel L. Jacksun', 'Nicole Kidmon', 'Robert Downey Jnr.', 'Cate Blanchet',
];

type NameKind = 'famous' | 'common' | 'random';

function makeName(rng: Rng, kind: Exclude<NameKind, 'famous'>): string {
  if (kind === 'common') return `${rng.pick(COMMON_FIRST)} ${rng.pick(COMMON_LAST)}`;
  const part = () => rng.pick(SYL_A) + rng.pick(SYL_B) + (rng.chance(0.4) ? rng.pick(SYL_B) : '');
  return `${part()} ${part()}`;
}

const TRAITS: ActorTrait[] = ['method', 'diva', 'charming', 'oneTake'];
const AGES: AgeBracket[] = ['young', 'adult', 'veteran'];

const inRange = (rng: Rng, [a, b]: readonly [number, number]) => rng.int(a, b);

export function generateActor(rng: Rng, usedNames: Set<string>, forcedRarity?: Rarity): Actor {
  const t = TUNING.actors;
  const rarity: Rarity = forcedRarity ?? rng.weighted(t.rarityOdds);
  const unusedFamous = FAMOUS_NAMES.filter((n) => !usedNames.has(n));
  const wantsFamous = rarity === 'legendary' || (rarity === 'epic' && rng.chance(0.5));
  const famous = wantsFamous && unusedFamous.length > 0;
  let name = '';
  if (famous) name = rng.pick(unusedFamous);
  else {
    const kind = rng.chance(0.6) ? 'common' : 'random';
    for (let i = 0; i < 50; i++) {
      name = makeName(rng, kind);
      if (!usedNames.has(name)) break;
    }
  }
  usedNames.add(name);

  let starPower = inRange(rng, t.starPower[rarity]);
  let acting = inRange(rng, t.acting[rarity]);
  // Hidden gem: low star power, high acting. Only on common/rare cards.
  if ((rarity === 'common' || rarity === 'rare') && rng.chance(t.hiddenGemChance)) {
    starPower = Math.min(starPower, rng.int(5, 30));
    acting = inRange(rng, t.hiddenGemActing);
  }

  // Skills: 1–2 strong skills, the rest middling or weak, nudged by overall acting.
  const strong = rng.shuffle(SKILLS).slice(0, rng.chance(0.5) ? 1 : 2);
  const skills = {} as SkillMap;
  for (const s of SKILLS) {
    const raw = strong.includes(s) ? rng.int(75, 100) : rng.int(20, 65);
    skills[s] = Math.max(5, Math.min(100, Math.round(raw * 0.75 + acting * 0.25)));
  }

  const traits: ActorTrait[] = [];
  if (rng.chance(t.traitChance)) traits.push(rng.pick(TRAITS));
  if (rng.chance(t.traitChance / 3)) {
    const second = rng.pick(TRAITS);
    if (!traits.includes(second)) traits.push(second);
  }

  const actor: Actor = { id: makeId('act', rng), name, starPower, acting, skills, rarity, traits, age: rng.pick(AGES) };
  if (famous) actor.famous = true;
  return actor;
}

export function generateActorPool(rng: Rng, size: number = TUNING.actors.poolSize, used = new Set<string>()): Actor[] {
  const pool: Actor[] = [];
  // Guarantee at least a couple of legendaries and epics for the lead draws.
  pool.push(generateActor(rng, used, 'legendary'), generateActor(rng, used, 'legendary'));
  for (let i = 0; i < 4; i++) pool.push(generateActor(rng, used, 'epic'));
  while (pool.length < size) pool.push(generateActor(rng, used));
  return pool;
}

export const isHiddenGem = (a: Actor) => a.starPower <= 35 && a.acting >= 75;
