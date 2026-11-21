// Working titles for briefs ("The Last Signal", "After Midnight", "The Summer Letter").
import type { GenreId } from './types';
import type { Rng } from './rng';

const NOUNS: Record<GenreId, string[]> = {
  action: ['Strike', 'Run', 'Protocol', 'Vendetta', 'Fury', 'Line', 'Hour', 'Target'],
  drama: ['Letter', 'House', 'Promise', 'Winter', 'Daughter', 'Garden', 'Witness', 'Harbor'],
  romance: ['Letter', 'Summer', 'Heart', 'Waltz', 'Kiss', 'Season', 'Postcard', 'Stars'],
  comedy: ['Wedding', 'Weekend', 'Roommate', 'Disaster', 'Vacation', 'Party', 'Plan', 'Mix-Up'],
  thriller: ['Signal', 'Witness', 'Silence', 'Alibi', 'Code', 'Shadow', 'Room', 'Stranger'],
  horror: ['House', 'Hollow', 'Whisper', 'Night', 'Woods', 'Visitor', 'Cellar', 'Ritual'],
  scifi: ['Signal', 'Orbit', 'Horizon', 'Frontier', 'Colony', 'Machine', 'Echo', 'Station'],
  fantasy: ['Crown', 'Kingdom', 'Sword', 'Dragon', 'Spell', 'Forest', 'Throne', 'Quest'],
};
const ADJ = ['Last', 'Silent', 'Hidden', 'Final', 'Lost', 'Broken', 'Golden', 'Long', 'Midnight', 'Secret', 'Burning', 'Paper'];
const TIMES = ['Midnight', 'Sunset', 'Dark', 'Hours', 'the Storm', 'the Fall'];

export function workingTitle(rng: Rng, genre: GenreId): string {
  const noun = rng.pick(NOUNS[genre]);
  switch (rng.int(0, 3)) {
    case 0: return `The ${rng.pick(ADJ)} ${noun}`;
    case 1: return `After ${rng.pick(TIMES)}`;
    case 2: return `The ${rng.pick(['Summer', 'Winter', 'Night', 'Morning'])} ${noun}`;
    default: return `${rng.pick(ADJ)} ${noun}`;
  }
}
