import type { DirectorDef } from '../types';
import type { Rng } from '../rng';

// Director profiles: archetypes you play a career with, not people.
// Two are free; the rest are bought with the money careers earn.
export const DIRECTORS: DirectorDef[] = [
  // ---- Starters ----
  { id: 'starterA', tier: 'basic', ceiling: { script: 72, shooting: 72 }, name: 'The Heartbreaker', genreAffinity: ['romance', 'drama'], specialties: [],
    unlock: { kind: 'start' }, blurb: 'At home with people and feelings. Romance and drama come naturally.' },
  { id: 'starterB', tier: 'basic', ceiling: { script: 72, shooting: 72 }, name: 'The Adrenaline Junkie', genreAffinity: ['action', 'thriller'], specialties: [],
    unlock: { kind: 'start' }, blurb: 'Speed, stakes and things exploding. Action and thrillers come naturally.' },
  // ---- Phase specialists ----
  { id: 'writer', tier: 'advanced', ceiling: { script: 96, shooting: 80 }, name: 'The Wordsmith', genreAffinity: [], specialties: ['script'],
    unlock: { kind: 'buy', cost: 1050 }, blurb: 'Better scripts, cheaper scenes.' },
  { id: 'scout', tier: 'advanced', ceiling: { script: 80, shooting: 82 }, name: 'The Star Whisperer', genreAffinity: [], specialties: ['casting'],
    unlock: { kind: 'buy', cost: 1000 }, blurb: 'Finds hidden gems; cheaper redraws.' },
  { id: 'cinematographer', tier: 'advanced', ceiling: { script: 80, shooting: 96 }, name: 'The Visionary Lens', genreAffinity: [], specialties: ['shooting'],
    unlock: { kind: 'buy', cost: 1100 }, blurb: 'Higher base take scores, learns faster on retakes.' },
  { id: 'editor', tier: 'advanced', ceiling: { script: 80, shooting: 84 }, name: 'The Cutting Room Wizard', genreAffinity: [], specialties: ['post'],
    unlock: { kind: 'buy', cost: 1100 }, blurb: 'Cheaper and stronger music, VFX and SFX.' },
  // ---- Production styles ----
  { id: 'budgetMaster', tier: 'advanced', ceiling: { script: 82, shooting: 82 }, name: 'The Budget Master', genreAffinity: [], specialties: ['budget'],
    unlock: { kind: 'buy', cost: 1000 }, blurb: 'Crew, sets and writing cost less. Tight-ship studios love you.' },
  { id: 'clockwork', tier: 'advanced', ceiling: { script: 82, shooting: 84 }, name: 'The Clockwork Director', genreAffinity: [], specialties: ['schedule'],
    unlock: { kind: 'buy', cost: 1000 }, blurb: 'The cast tires less and post runs faster.' },
  { id: 'festivalDarling', tier: 'advanced', ceiling: { script: 88, shooting: 86 }, name: 'The Festival Darling', genreAffinity: ['drama'], specialties: ['festival'],
    unlock: { kind: 'buy', cost: 1200 }, blurb: 'Critics adore you; festivals come easier.' },
  // ---- Genre masters ----
  { id: 'masterScifi', tier: 'premium', ceiling: { script: 88, shooting: 88 }, name: 'The Sci-Fi Genius', genreAffinity: ['scifi'], specialties: ['genre'], masterGenre: 'scifi',
    unlock: { kind: 'buy', cost: 950 }, blurb: 'Perfect in Sci-Fi; strong everywhere else.' },
  { id: 'masterHorror', tier: 'premium', ceiling: { script: 88, shooting: 88 }, name: 'The Scream King', genreAffinity: ['horror'], specialties: ['genre'], masterGenre: 'horror',
    unlock: { kind: 'buy', cost: 950 }, blurb: 'Perfect in Horror; strong everywhere else.' },
  { id: 'masterComedy', tier: 'premium', ceiling: { script: 88, shooting: 88 }, name: 'The Laugh Factory', genreAffinity: ['comedy'], specialties: ['genre'], masterGenre: 'comedy',
    unlock: { kind: 'buy', cost: 950 }, blurb: 'Perfect in Comedy; strong everywhere else.' },
  { id: 'masterFantasy', tier: 'premium', ceiling: { script: 88, shooting: 88 }, name: 'The Myth Maker', genreAffinity: ['fantasy'], specialties: ['genre'], masterGenre: 'fantasy',
    unlock: { kind: 'buy', cost: 950 }, blurb: 'Perfect in Fantasy; strong everywhere else.' },
  // ---- Legends: the best directors in the game ----
  { id: 'auteur', tier: 'premium', ceiling: { script: 100, shooting: 100 }, name: 'The Auteur', genreAffinity: [], specialties: ['script', 'festival'],
    unlock: { kind: 'buy', cost: 1500 }, blurb: 'Masterpieces in any genre. Critics and festivals worship you.' },
  { id: 'showman', tier: 'premium', ceiling: { script: 100, shooting: 100 }, name: 'The Showman', genreAffinity: [], specialties: ['shooting', 'crowd'],
    unlock: { kind: 'buy', cost: 1500 }, blurb: 'Crowd-pleasing spectacle in any genre: huge buzz, huge openings.' },
];

export const directorById = (id: string): DirectorDef => {
  const d = DIRECTORS.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown director ${id}`);
  return d;
};

// Names for the directors you create (one per career; editable when you start it).
const FIRST = ['Ana', 'Bruno', 'Carmen', 'Dmitri', 'Elif', 'Farah', 'Gustav', 'Hana', 'Iker', 'Juno', 'Kofi', 'Lucía', 'Mateo', 'Nadia',
  'Oskar', 'Priya', 'Quinn', 'Rafa', 'Sana', 'Tomás', 'Uma', 'Viggo', 'Wren', 'Ximena', 'Yusuf', 'Zoe'];
const LAST = ['Almeida', 'Brandt', 'Castell', 'Duarte', 'Eriksen', 'Falco', 'Grey', 'Haddad', 'Ito', 'Jensen', 'Kowalski', 'Lund', 'Moreno',
  'Novak', 'Ortega', 'Park', 'Quist', 'Rossi', 'Silva', 'Tanaka', 'Urquhart', 'Vega', 'Wolfe', 'Yamada', 'Zhou'];
export const randomDirectorName = (rng: Rng) => `${rng.pick(FIRST)} ${rng.pick(LAST)}`;
