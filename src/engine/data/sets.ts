import type { FilmSet } from '../types';

// Premade sets. sceneFit is 0–100 per scene type id; missing = DEFAULT_SET_FIT.
export const DEFAULT_SET_FIT = 45;

export const SETS: FilmSet[] = [
  // ---- 8 starter sets ----
  { id: 'apartment', name: 'Apartment', tags: ['interior', 'intimate', 'urbanProfessional', 'romantic'], dayCost: 15,
    unlock: { kind: 'start' },
    sceneFit: { romance: 85, dialogue: 85, betrayal: 70, comicRelief: 70, emotionalClimax: 75, reveal: 65, scare: 60, fight: 35, chase: 10, showdown: 25 } },
  { id: 'office', name: 'Office', tags: ['interior', 'urbanProfessional', 'crime'], dayCost: 20,
    unlock: { kind: 'start' },
    sceneFit: { dialogue: 85, betrayal: 85, reveal: 75, comicRelief: 70, twist: 70, montage: 55, romance: 40, chase: 25, fight: 30 } },
  { id: 'cityStreet', name: 'City Street', tags: ['exterior', 'urbanProfessional', 'crime'], dayCost: 40,
    unlock: { kind: 'start' },
    sceneFit: { chase: 95, fight: 70, montage: 80, showdown: 65, romance: 50, dialogue: 50, comicRelief: 60, reveal: 50 } },
  { id: 'diner', name: 'Diner', tags: ['interior', 'smallTown', 'crime'], dayCost: 12,
    unlock: { kind: 'start' },
    sceneFit: { dialogue: 90, comicRelief: 80, romance: 65, betrayal: 70, reveal: 60, fight: 50, scare: 45 } },
  { id: 'park', name: 'Park', tags: ['exterior', 'romantic', 'smallTown'], dayCost: 18,
    unlock: { kind: 'start' },
    sceneFit: { romance: 90, montage: 85, dialogue: 70, emotionalClimax: 70, comicRelief: 65, chase: 55, scare: 50 } },
  { id: 'warehouse', name: 'Warehouse', tags: ['interior', 'gritty', 'crime'], dayCost: 25,
    unlock: { kind: 'start' },
    sceneFit: { fight: 95, showdown: 90, betrayal: 75, scare: 75, twist: 70, reveal: 65, chase: 60, romance: 10 } },
  { id: 'suburbanHouse', name: 'Suburban House', tags: ['interior', 'smallTown'], dayCost: 15,
    unlock: { kind: 'start' },
    sceneFit: { dialogue: 80, emotionalClimax: 85, scare: 85, comicRelief: 70, romance: 65, reveal: 70, twist: 65, fight: 35 } },
  { id: 'bar', name: 'Bar', tags: ['interior', 'urbanProfessional', 'crime', 'smallTown'], dayCost: 14,
    unlock: { kind: 'start' },
    sceneFit: { dialogue: 80, fight: 75, romance: 70, betrayal: 75, comicRelief: 75, reveal: 55 } },
  // ---- Topic sets (unlocked with their topic) ----
  { id: 'castleHall', name: 'Castle Hall', tags: ['interior', 'medieval', 'epic'], dayCost: 60,
    unlock: { kind: 'topic', topicId: 'medieval' },
    sceneFit: { swordDuel: 95, showdown: 90, betrayal: 85, dialogue: 70, romance: 65, fight: 80, reveal: 75 } },
  { id: 'colosseum', name: 'Colosseum', tags: ['exterior', 'ancientRome', 'epic'], dayCost: 110,
    unlock: { kind: 'topic', topicId: 'ancientRome' },
    sceneFit: { arenaBattle: 100, fight: 90, showdown: 90, montage: 60, dialogue: 30 } },
  { id: 'galleonDeck', name: 'Galleon Deck', tags: ['exterior', 'pirates', 'epic'], dayCost: 90,
    unlock: { kind: 'topic', topicId: 'pirates' },
    sceneFit: { shipBoarding: 100, fight: 85, swordDuel: 85, showdown: 80, comicRelief: 60, romance: 55 } },
  { id: 'spaceshipBridge', name: 'Spaceship Bridge', tags: ['interior', 'spaceTravel', 'future'], dayCost: 100,
    unlock: { kind: 'topic', topicId: 'spaceTravel' },
    sceneFit: { spaceBattle: 100, dialogue: 75, reveal: 80, twist: 80, betrayal: 75, showdown: 70, scare: 60 } },
  { id: 'neonAlley', name: 'Neon Alley', tags: ['exterior', 'cyberpunk', 'future'], dayCost: 55,
    unlock: { kind: 'topic', topicId: 'cyberpunk' },
    sceneFit: { hack: 85, chase: 90, fight: 85, betrayal: 70, showdown: 75, romance: 40 } },
  { id: 'wasteland', name: 'Wasteland', tags: ['exterior', 'postApocalyptic', 'future'], dayCost: 50,
    unlock: { kind: 'topic', topicId: 'postApocalyptic' },
    sceneFit: { scavenge: 100, chase: 90, fight: 80, showdown: 80, scare: 70, montage: 65 } },
  { id: 'dojo', name: 'Dojo', tags: ['interior', 'martialArts'], dayCost: 22,
    unlock: { kind: 'topic', topicId: 'martialArts' },
    sceneFit: { trainingMontage: 100, fight: 95, showdown: 85, dialogue: 60, emotionalClimax: 60 } },
  { id: 'boxingRing', name: 'Boxing Ring', tags: ['interior', 'boxing'], dayCost: 35,
    unlock: { kind: 'topic', topicId: 'boxing' },
    sceneFit: { bigFight: 100, fight: 90, montage: 75, emotionalClimax: 70, showdown: 75 } },
  { id: 'barracks', name: 'Barracks', tags: ['interior', 'exterior', 'military'], dayCost: 45,
    unlock: { kind: 'topic', topicId: 'military' },
    sceneFit: { battlefield: 85, montage: 80, dialogue: 70, comicRelief: 60, betrayal: 65, emotionalClimax: 70 } },
  { id: 'manor', name: 'Manor', tags: ['interior', 'periodDrama', 'prestige'], dayCost: 70,
    unlock: { kind: 'topic', topicId: 'periodDrama' },
    sceneFit: { ballroom: 100, romance: 90, dialogue: 85, betrayal: 85, emotionalClimax: 85, reveal: 80 } },
  { id: 'pressRoom', name: 'Press Room', tags: ['interior', 'biopic', 'prestige'], dayCost: 30,
    unlock: { kind: 'topic', topicId: 'biopic' },
    sceneFit: { turningPoint: 90, dialogue: 80, reveal: 85, emotionalClimax: 70 } },
  { id: 'courtroom', name: 'Courtroom', tags: ['interior', 'courtroom', 'prestige'], dayCost: 40,
    unlock: { kind: 'topic', topicId: 'courtroom' },
    sceneFit: { crossExam: 100, reveal: 90, twist: 90, dialogue: 85, betrayal: 75, emotionalClimax: 75 } },
  // ---- Bought with credits ----
  { id: 'rooftop', name: 'Rooftop', tags: ['exterior', 'urbanProfessional', 'crime'], dayCost: 45,
    unlock: { kind: 'credits', cost: 120, repTier: 1 },
    sceneFit: { showdown: 90, chase: 75, romance: 80, emotionalClimax: 85, fight: 75, reveal: 70 } },
  { id: 'hospital', name: 'Hospital', tags: ['interior', 'smallTown', 'urbanProfessional'], dayCost: 35,
    unlock: { kind: 'credits', cost: 120, repTier: 1 },
    sceneFit: { emotionalClimax: 95, dialogue: 80, scare: 80, reveal: 80, twist: 70, comicRelief: 45 } },
  { id: 'forest', name: 'Forest', tags: ['exterior', 'smallTown', 'medieval'], dayCost: 30,
    unlock: { kind: 'credits', cost: 150, repTier: 2 },
    sceneFit: { scare: 95, chase: 80, romance: 70, montage: 75, fight: 70, swordDuel: 75, reveal: 60 } },
  { id: 'mansion', name: 'Mansion', tags: ['interior', 'crime', 'periodDrama'], dayCost: 65,
    unlock: { kind: 'credits', cost: 220, repTier: 2 },
    sceneFit: { betrayal: 90, twist: 90, reveal: 85, dialogue: 80, romance: 75, scare: 75, showdown: 70 } },
  { id: 'soundStageGreen', name: 'Green Screen Stage', tags: ['interior', 'future', 'epic'], dayCost: 80,
    unlock: { kind: 'credits', cost: 300, repTier: 3 },
    sceneFit: { spaceBattle: 85, showdown: 75, fight: 70, chase: 70, arenaBattle: 75, battlefield: 75, shipBoarding: 70 } },
];

export const setById = (id: string): FilmSet => {
  const s = SETS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown set ${id}`);
  return s;
};

export const STARTER_SET_IDS = SETS.filter((s) => s.unlock.kind === 'start').map((s) => s.id);
