// Profile creation and film start.

import type { Contract, Film, Profile } from './types';
import { createRng, makeId } from './rng';
import { TUNING } from './tuning';
import { DIRECTORS } from './data/directors';
import { STARTER_SET_IDS } from './data/sets';
import { TOPIC_PACKS } from './data/topics';
import { FILM_TITLE_PARTS } from './data/studios';
import { generateActorPool } from './data/actors';
import { generateBoard } from './contracts';

export function newProfile(name: string, seed = Date.now() >>> 0): Profile {
  const rng = createRng(seed);
  const starterDirectors = DIRECTORS.filter((d) => d.unlock.kind === 'start').map((d) => d.id);
  const starterPack = TOPIC_PACKS.find((p) => p.id === 'starter')!;
  const base: Profile = {
    version: TUNING.saveVersion,
    name,
    createdAt: Date.now(),
    seed,
    credits: TUNING.startingCredits,
    careers: [],
    unlocks: {
      directors: starterDirectors,
      topics: [...starterPack.topicIds],
      packs: ['starter'],
      sets: [...STARTER_SET_IDS],
    },
    directors: Object.fromEntries(starterDirectors.map((id) => [id, { id, level: 1, films: 0 }])),
    actorPool: generateActorPool(rng),
    contractBoard: [],
    filmography: [],
  };
  base.seed = rng.state();
  return base;
}

/** Run a function with the profile's RNG and store the advanced state back. */
export function withRng<T>(p: Profile, fn: (rng: ReturnType<typeof createRng>) => T): { profile: Profile; value: T } {
  const rng = createRng(p.seed);
  const value = fn(rng);
  return { profile: { ...p, seed: rng.state() }, value };
}

/** New briefs for the active career, scaled by its reputation. No career → no board. */
export function refreshBoard(p: Profile): Profile {
  if (!p.career) return { ...p, contractBoard: [] };
  const { profile, value } = withRng(p, (rng) => generateBoard(rng, { reputation: p.career!.reputation }));
  return { ...profile, contractBoard: value };
}

export type StartResult = { ok: true; profile: Profile } | { ok: false; reason: string };

/**
 * Accept a contract. In a career the career's director profile directs it; without a career
 * (sandbox / tests) a director id must be given. The film starts in the Script phase.
 */
export function startFilm(p: Profile, contractId: string, directorIdArg?: string): StartResult {
  if (p.activeFilm) return { ok: false, reason: 'A film is already in production' };
  if (p.career && directorIdArg && directorIdArg !== p.career.directorId) return { ok: false, reason: 'This career has its own director' };
  const directorId = p.career?.directorId ?? directorIdArg;
  if (!directorId) return { ok: false, reason: 'Start a career first' };
  const contract = p.contractBoard.find((c) => c.id === contractId);
  if (!contract) return { ok: false, reason: 'Contract not on the board' };
  if (!p.unlocks.directors.includes(directorId)) return { ok: false, reason: 'Director is locked' };

  const { profile, value: film } = withRng(p, (rng): Film => ({
    id: makeId('film', rng),
    title: contract.title ?? `${rng.pick(FILM_TITLE_PARTS.first)} ${rng.pick(FILM_TITLE_PARTS.second)}`,
    contract: structuredClone(contract) as Contract,
    directorId,
    phase: 'script',
    runtime: contract.runtime,
    roles: [],
    scenes: [],
    music: 'none',
    ledger: [],
    calendar: { shootWeeks: 0, postWeeks: 0 },
    casting: {},
    rejected: [],
    fillerShot: false,
  }));
  return {
    ok: true,
    profile: { ...profile, activeFilm: film, contractBoard: p.contractBoard.filter((c) => c.id !== contractId) },
  };
}

/** Walk away from the film in production. The contract is lost. */
export function abandonFilm(p: Profile): Profile {
  return { ...p, activeFilm: undefined };
}
