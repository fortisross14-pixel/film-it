import type { DirectorDef } from '../types';
import type { Rng } from '../rng';

// Director profiles: archetypes you play a career with, not people.
// Two are free; the rest are bought with the money careers earn.
export const DIRECTORS: DirectorDef[] = [
  // ---- Starters ----
  { id: 'starterA', name: 'The Heartbreaker', genreAffinity: ['romance', 'drama'], specialties: [],
    unlock: { kind: 'start' }, blurb: 'At home with people and feelings. Romance and drama come naturally.' },
  { id: 'starterB', name: 'The Adrenaline Junkie', genreAffinity: ['action', 'thriller'], specialties: [],
    unlock: { kind: 'start' }, blurb: 'Speed, stakes and things exploding. Action and thrillers come naturally.' },
  // ---- Phase specialists ----
  { id: 'writer', name: 'The Wordsmith', genreAffinity: [], specialties: ['script'],
    unlock: { kind: 'buy', cost: 1500 }, blurb: 'Better scripts, cheaper scenes.' },
  { id: 'scout', name: 'The Star Whisperer', genreAffinity: [], specialties: ['casting'],
    unlock: { kind: 'buy', cost: 1500 }, blurb: 'Finds hidden gems; cheaper redraws.' },
  { id: 'cinematographer', name: 'The Visionary Lens', genreAffinity: [], specialties: ['shooting'],
    unlock: { kind: 'buy', cost: 1800 }, blurb: 'Higher base take scores, learns faster on retakes.' },
  { id: 'editor', name: 'The Cutting Room Wizard', genreAffinity: [], specialties: ['post'],
    unlock: { kind: 'buy', cost: 1800 }, blurb: 'Cheaper and stronger music, VFX and SFX.' },
  // ---- Production styles ----
  { id: 'budgetMaster', name: 'The Budget Master', genreAffinity: [], specialties: ['budget'],
    unlock: { kind: 'buy', cost: 1800 }, blurb: 'Crew, sets and writing cost less. Tight-ship studios love you.' },
  { id: 'clockwork', name: 'The Clockwork Director', genreAffinity: [], specialties: ['schedule'],
    unlock: { kind: 'buy', cost: 1800 }, blurb: 'The cast tires less and post runs faster.' },
  { id: 'festivalDarling', name: 'The Festival Darling', genreAffinity: ['drama'], specialties: ['festival'],
    unlock: { kind: 'buy', cost: 2000 }, blurb: 'Critics adore you; festivals come easier.' },
  // ---- Genre masters ----
  { id: 'masterScifi', name: 'The Sci-Fi Genius', genreAffinity: ['scifi'], specialties: ['genre'], masterGenre: 'scifi',
    unlock: { kind: 'buy', cost: 2400 }, blurb: 'Brilliant in Sci-Fi; a small edge everywhere.' },
  { id: 'masterHorror', name: 'The Scream King', genreAffinity: ['horror'], specialties: ['genre'], masterGenre: 'horror',
    unlock: { kind: 'buy', cost: 2400 }, blurb: 'Brilliant in Horror; a small edge everywhere.' },
  { id: 'masterComedy', name: 'The Laugh Factory', genreAffinity: ['comedy'], specialties: ['genre'], masterGenre: 'comedy',
    unlock: { kind: 'buy', cost: 2400 }, blurb: 'Brilliant in Comedy; a small edge everywhere.' },
  { id: 'masterFantasy', name: 'The Myth Maker', genreAffinity: ['fantasy'], specialties: ['genre'], masterGenre: 'fantasy',
    unlock: { kind: 'buy', cost: 2400 }, blurb: 'Brilliant in Fantasy; a small edge everywhere.' },
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
