import type { Actor, ActorTrait, AgeBracket, Rarity } from '../types';
import type { Rng } from '../rng';
import { makeId } from '../rng';
import { TUNING } from '../tuning';
import { GENRE_IDS } from './genres';

const FIRST = ['Mila', 'Jonah', 'Priya', 'Theo', 'Sana', 'Lucas', 'Ines', 'Omar', 'Hana', 'Felix', 'Nora', 'Dev', 'Clara', 'Kenji', 'Zoe', 'Rafael', 'Ayla', 'Bruno', 'Lena', 'Malik', 'Esme', 'Tomas', 'Yara', 'Hugo', 'Iris', 'Caleb', 'Freya', 'Nico', 'Leila', 'Owen'];
const LAST = ['Hart', 'Okafor', 'Varga', 'Moreau', 'Sato', 'Quinn', 'Albescu', 'Brandt', 'Castell', 'Dunmore', 'Ekwueme', 'Ferro', 'Galloway', 'Halvorsen', 'Ivers', 'Jansen', 'Kowal', 'Lindgren', 'Marchetti', 'Novak', 'Ortega', 'Pryce', 'Rahimi', 'Stroud', 'Tanaka', 'Underwood', 'Vance', 'Whitlock', 'Yilmaz', 'Zeller'];
const TRAITS: ActorTrait[] = ['method', 'diva', 'charming', 'oneTake'];
const AGES: AgeBracket[] = ['young', 'adult', 'veteran'];

const inRange = (rng: Rng, [a, b]: readonly [number, number]) => rng.int(a, b);

export function generateActor(rng: Rng, usedNames: Set<string>, forcedRarity?: Rarity): Actor {
  const t = TUNING.actors;
  const rarity: Rarity = forcedRarity ?? rng.weighted(t.rarityOdds);
  let name = '';
  for (let i = 0; i < 50; i++) {
    name = `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
    if (!usedNames.has(name)) break;
  }
  usedNames.add(name);

  let starPower = inRange(rng, t.starPower[rarity]);
  let acting = inRange(rng, t.acting[rarity]);
  // Hidden gem: low star power, high acting. Only on common/rare cards.
  if ((rarity === 'common' || rarity === 'rare') && rng.chance(t.hiddenGemChance)) {
    starPower = Math.min(starPower, rng.int(5, 30));
    acting = inRange(rng, t.hiddenGemActing);
  }

  // Genre range: 2 strong genres, the rest middling or weak.
  const strong = rng.shuffle(GENRE_IDS).slice(0, 2);
  const genreRange = {} as Actor['genreRange'];
  for (const g of GENRE_IDS) genreRange[g] = strong.includes(g) ? rng.int(75, 100) : rng.int(25, 70);

  const traits: ActorTrait[] = [];
  if (rng.chance(t.traitChance)) traits.push(rng.pick(TRAITS));
  if (rng.chance(t.traitChance / 3)) {
    const second = rng.pick(TRAITS);
    if (!traits.includes(second)) traits.push(second);
  }

  return { id: makeId('act', rng), name, starPower, acting, genreRange, rarity, traits, age: rng.pick(AGES) };
}

export function generateActorPool(rng: Rng, size = TUNING.actors.poolSize): Actor[] {
  const used = new Set<string>();
  const pool: Actor[] = [];
  // Guarantee at least a couple of legendaries and epics for the lead draws.
  pool.push(generateActor(rng, used, 'legendary'), generateActor(rng, used, 'legendary'));
  for (let i = 0; i < 4; i++) pool.push(generateActor(rng, used, 'epic'));
  while (pool.length < size) pool.push(generateActor(rng, used));
  return pool;
}

export const isHiddenGem = (a: Actor) => a.starPower <= 35 && a.acting >= 75;
