import type { Actor, ActorTrait, AgeBracket, Rarity, Skill, SkillMap } from '../types';
import type { Rng } from '../rng';
import { makeId } from '../rng';
import { TUNING } from '../tuning';
import { assignPortraits } from '../portraits';

export const SKILLS: Skill[] = ['action', 'comedy', 'drama', 'romance', 'menace'];

// Common everyday names ("John Smith", "Hannah Myers"), split by gender for portrait matching.
const COMMON_F = ['Hannah', 'Sarah', 'Emily', 'Laura', 'Anna', 'Kate', 'Lisa', 'Rachel', 'Megan', 'Julia', 'Amy', 'Nina'];
const COMMON_M = ['John', 'Chris', 'Mike', 'David', 'James', 'Tom', 'Paul', 'Mark', 'Dan', 'Steve', 'Ben', 'Sam'];
const COMMON_LAST = ['Smith', 'Mills', 'Myers', 'Johnson', 'Brown', 'Taylor', 'Walker', 'Hall', 'Young', 'King', 'Wright', 'Green', 'Baker', 'Carter', 'Turner', 'Parker', 'Cooper', 'Ward', 'Price', 'Bell', 'Reed', 'Hayes', 'Fox', 'Lane'];
// Syllables for totally random names ("Zarvo Quillent").
/** Gender implied by a common first name, if any (older saves have no gender field). */
export function genderFromName(name: string): 'f' | 'm' | undefined {
  const first = name.split(' ')[0];
  return COMMON_F.includes(first) ? 'f' : COMMON_M.includes(first) ? 'm' : FAMOUS.find((f) => f.name === name)?.gender;
}
const SYL_A = ['Za', 'Ko', 'Mir', 'Vel', 'Tor', 'Lu', 'Bri', 'Ost', 'Fen', 'Ri', 'Dax', 'Yo', 'Quil', 'Sev', 'Ar', 'Ném'];
const SYL_B = ['ro', 'lin', 'ka', 'vo', 'ett', 'is', 'ana', 'den', 'ux', 'ari', 'el', 'ova', 'ent', 'ick', 'yn', 'oss'];
/** Parody stars (18 women, 18 men). Order matches the portrait grid in docs/art/face-prompts.md. */
export const FAMOUS: { name: string; gender: 'f' | 'm' }[] = [
  ...['Jennifer Balliston', 'Meryl Streak', 'Scarlett Johanssen', 'Natalie Portmans', 'Angelina Jolly', 'Julia Roberds',
    'Emma Stoned', 'Cate Blanchet', 'Nicole Kidmon', 'Viola Daviss', 'Zendayah', 'Charlize Theronn',
    'Anne Hathaweigh', 'Halle Berri', 'Margot Robbee', 'Lupita Nyongoh', 'Kate Winslate', 'Sandra Bullseye'].map((name) => ({ name, gender: 'f' as const })),
  ...['Leonardo DiBario', 'Brad Pitts', 'Tom Hanxs', 'Denzel Washingtown', 'Keanu Leaves', 'Morgan Freedman',
    'Will Smit', 'Samuel L. Jacksun', 'Robert Downey Jnr.', 'Johnny Deppth', 'Matt Damoon', 'Ryan Goslin',
    'Chris Hemsworm', 'Hugh Jackmann', 'George Clooneigh', 'Al Pacinot', 'Harrison Fordd', 'Idris Elbow'].map((name) => ({ name, gender: 'm' as const })),
];
export const FAMOUS_NAMES = FAMOUS.map((f) => f.name);

function makeName(rng: Rng, kind: 'common' | 'random', gender: 'f' | 'm'): string {
  if (kind === 'common') return `${rng.pick(gender === 'f' ? COMMON_F : COMMON_M)} ${rng.pick(COMMON_LAST)}`;
  const part = () => rng.pick(SYL_A) + rng.pick(SYL_B) + (rng.chance(0.4) ? rng.pick(SYL_B) : '');
  return `${part()} ${part()}`;
}

const TRAITS: ActorTrait[] = ['method', 'diva', 'charming', 'oneTake'];
const AGES: AgeBracket[] = ['young', 'adult', 'veteran'];

const inRange = (rng: Rng, [a, b]: readonly [number, number]) => rng.int(a, b);

export function generateActor(rng: Rng, usedNames: Set<string>, forcedRarity?: Rarity): Actor {
  const t = TUNING.actors;
  const rarity: Rarity = forcedRarity ?? rng.weighted(t.rarityOdds);
  const unusedFamous = FAMOUS.filter((n) => !usedNames.has(n.name));
  const wantsFamous = rarity === 'legendary' || (rarity === 'epic' && rng.chance(0.5));
  const famous = wantsFamous && unusedFamous.length > 0;
  let name = '';
  let gender: 'f' | 'm' = rng.chance(0.5) ? 'f' : 'm';
  if (famous) {
    const f = rng.pick(unusedFamous);
    name = f.name;
    gender = f.gender;
  } else {
    const kind = rng.chance(0.6) ? 'common' : 'random';
    for (let i = 0; i < 50; i++) {
      name = makeName(rng, kind, gender);
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

  const actor: Actor = { id: makeId('act', rng), name, starPower, acting, skills, rarity, traits, age: rng.pick(AGES), gender };
  if (famous) actor.famous = true;
  return actor;
}

export function generateActorPool(rng: Rng, size: number = TUNING.actors.poolSize, used = new Set<string>()): Actor[] {
  const pool: Actor[] = [];
  // Guarantee at least a couple of legendaries and epics for the lead draws.
  pool.push(generateActor(rng, used, 'legendary'), generateActor(rng, used, 'legendary'));
  for (let i = 0; i < 4; i++) pool.push(generateActor(rng, used, 'epic'));
  while (pool.length < size) pool.push(generateActor(rng, used));
  return assignPortraits(pool);
}

export const isHiddenGem = (a: Actor) => a.starPower <= 35 && a.acting >= 75;
