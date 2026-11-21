import type { FilmSet } from '../types';

// Premade sets. sceneFit is 0–100 per scene type id; missing = DEFAULT_SET_FIT.
export const DEFAULT_SET_FIT = 45;

export const SETS: FilmSet[] = [
  // ---- 8 starter sets ----
  { id: 'apartment', name: 'Apartment', tags: ['interior', 'intimate', 'urbanProfessional', 'romantic'], dayCost: 15, style: 'interior', footprint: { w: 2, d: 2 }, extrasCapacity: 4,
    palette: { floor: '#b98b5e', wall: '#d9cdb8', accent: '#5c7fa3' },
   
    unlock: { kind: 'start' },
    sceneFit: { romance: 85, dialogue: 85, betrayal: 70, comicRelief: 70, emotionalClimax: 75, reveal: 65, scare: 60, fight: 35, chase: 10, showdown: 25 } },
  { id: 'office', name: 'Office', tags: ['interior', 'urbanProfessional', 'crime'], dayCost: 20, style: 'interior', footprint: { w: 3, d: 2 }, extrasCapacity: 8,
    palette: { floor: '#8d939c', wall: '#c9ced6', accent: '#3e6c8f' },
   
    unlock: { kind: 'start' },
    sceneFit: { dialogue: 85, betrayal: 85, reveal: 75, comicRelief: 70, twist: 70, montage: 55, romance: 40, chase: 25, fight: 30 } },
  { id: 'cityStreet', name: 'City Street', tags: ['exterior', 'urbanProfessional', 'crime'], dayCost: 40, style: 'exterior', footprint: { w: 2, d: 6 }, extrasCapacity: 40,
    palette: { floor: '#5b5e66', accent: '#d8b44a' },
   
    unlock: { kind: 'start' },
    sceneFit: { chase: 95, fight: 70, montage: 80, showdown: 65, romance: 50, dialogue: 50, comicRelief: 60, reveal: 50 } },
  { id: 'diner', name: 'Diner', tags: ['interior', 'smallTown', 'crime'], dayCost: 12, style: 'interior', footprint: { w: 2, d: 3 }, extrasCapacity: 10,
    palette: { floor: '#c9c1b0', wall: '#9fd0c9', accent: '#d0473f' },
   
    unlock: { kind: 'start' },
    sceneFit: { dialogue: 90, comicRelief: 80, romance: 65, betrayal: 70, reveal: 60, fight: 50, scare: 45 } },
  { id: 'park', name: 'Park', tags: ['exterior', 'romantic', 'smallTown'], dayCost: 18, style: 'exterior', footprint: { w: 4, d: 4 }, extrasCapacity: 30,
    palette: { floor: '#6fae5a', accent: '#3f7a3a' },
   
    unlock: { kind: 'start' },
    sceneFit: { romance: 90, montage: 85, dialogue: 70, emotionalClimax: 70, comicRelief: 65, chase: 55, scare: 50 } },
  { id: 'warehouse', name: 'Warehouse', tags: ['interior', 'gritty', 'crime'], dayCost: 25, style: 'interior', footprint: { w: 4, d: 4 }, extrasCapacity: 20,
    palette: { floor: '#6e6a64', wall: '#8a7f72', accent: '#c07a37' },
   
    unlock: { kind: 'start' },
    sceneFit: { fight: 95, showdown: 90, betrayal: 75, scare: 75, twist: 70, reveal: 65, chase: 60, romance: 10 } },
  { id: 'suburbanHouse', name: 'Suburban House', tags: ['interior', 'smallTown'], dayCost: 15, style: 'interior', footprint: { w: 2, d: 2 }, extrasCapacity: 4,
    palette: { floor: '#a8784d', wall: '#e6dcc6', accent: '#7a9e7e' },
   
    unlock: { kind: 'start' },
    sceneFit: { dialogue: 80, emotionalClimax: 85, scare: 85, comicRelief: 70, romance: 65, reveal: 70, twist: 65, fight: 35 } },
  { id: 'bar', name: 'Bar', tags: ['interior', 'urbanProfessional', 'crime', 'smallTown'], dayCost: 14, style: 'interior', footprint: { w: 2, d: 3 }, extrasCapacity: 15,
    palette: { floor: '#6b4630', wall: '#4a3a35', accent: '#d9a441' },
   
    unlock: { kind: 'start' },
    sceneFit: { dialogue: 80, fight: 75, romance: 70, betrayal: 75, comicRelief: 75, reveal: 55 } },
  // ---- Topic sets (unlocked with their topic) ----
  { id: 'castleHall', name: 'Castle Hall', tags: ['interior', 'medieval', 'epic'], dayCost: 60, style: 'interior', footprint: { w: 3, d: 5 }, extrasCapacity: 40,
    palette: { floor: '#8a8178', wall: '#a59c90', accent: '#8c2f39' },
   
    unlock: { kind: 'topic', topicId: 'medieval' },
    sceneFit: { swordDuel: 95, showdown: 90, betrayal: 85, dialogue: 70, romance: 65, fight: 80, reveal: 75 } },
  { id: 'colosseum', name: 'Colosseum', tags: ['exterior', 'ancientRome', 'epic'], dayCost: 110, style: 'exterior', footprint: { w: 6, d: 6 }, extrasCapacity: 300,
    palette: { floor: '#d6b98c', accent: '#a8623c' },
   
    unlock: { kind: 'topic', topicId: 'ancientRome' },
    sceneFit: { arenaBattle: 100, fight: 90, showdown: 90, montage: 60, dialogue: 30 } },
  { id: 'galleonDeck', name: 'Galleon Deck', tags: ['exterior', 'pirates', 'epic'], dayCost: 90, style: 'exterior', footprint: { w: 2, d: 6 }, extrasCapacity: 25,
    palette: { floor: '#8a5a36', accent: '#e8e1cf' },
   
    unlock: { kind: 'topic', topicId: 'pirates' },
    sceneFit: { shipBoarding: 100, fight: 85, swordDuel: 85, showdown: 80, comicRelief: 60, romance: 55 } },
  { id: 'spaceshipBridge', name: 'Spaceship Bridge', tags: ['interior', 'spaceTravel', 'future'], dayCost: 100, style: 'interior', footprint: { w: 3, d: 3 }, extrasCapacity: 10,
    palette: { floor: '#3d4757', wall: '#6f7d91', accent: '#43c6db' },
   
    unlock: { kind: 'topic', topicId: 'spaceTravel' },
    sceneFit: { spaceBattle: 100, dialogue: 75, reveal: 80, twist: 80, betrayal: 75, showdown: 70, scare: 60 } },
  { id: 'neonAlley', name: 'Neon Alley', tags: ['exterior', 'cyberpunk', 'future'], dayCost: 55, style: 'exterior', footprint: { w: 2, d: 5 }, extrasCapacity: 25,
    palette: { floor: '#2f2a3d', accent: '#e04fd0' },
   
    unlock: { kind: 'topic', topicId: 'cyberpunk' },
    sceneFit: { hack: 85, chase: 90, fight: 85, betrayal: 70, showdown: 75, romance: 40 } },
  { id: 'wasteland', name: 'Wasteland', tags: ['exterior', 'postApocalyptic', 'future'], dayCost: 50, style: 'exterior', footprint: { w: 5, d: 8 }, extrasCapacity: 60,
    palette: { floor: '#b59a6a', accent: '#6b5a3e' },
   
    unlock: { kind: 'topic', topicId: 'postApocalyptic' },
    sceneFit: { scavenge: 100, chase: 90, fight: 80, showdown: 80, scare: 70, montage: 65 } },
  { id: 'dojo', name: 'Dojo', tags: ['interior', 'martialArts'], dayCost: 22, style: 'interior', footprint: { w: 3, d: 3 }, extrasCapacity: 12,
    palette: { floor: '#d7b97f', wall: '#efe6d2', accent: '#a23b2a' },
   
    unlock: { kind: 'topic', topicId: 'martialArts' },
    sceneFit: { trainingMontage: 100, fight: 95, showdown: 85, dialogue: 60, emotionalClimax: 60 } },
  { id: 'boxingRing', name: 'Boxing Ring', tags: ['interior', 'boxing'], dayCost: 35, style: 'interior', footprint: { w: 3, d: 3 }, extrasCapacity: 80,
    palette: { floor: '#3a3f4b', wall: '#22252c', accent: '#c8313a' },
   
    unlock: { kind: 'topic', topicId: 'boxing' },
    sceneFit: { bigFight: 100, fight: 90, montage: 75, emotionalClimax: 70, showdown: 75 } },
  { id: 'warField', name: 'War Field', tags: ['exterior', 'military', 'epic'], dayCost: 140, style: 'exterior', footprint: { w: 4, d: 10 }, extrasCapacity: 500,
    palette: { floor: '#7b8f4a', accent: '#5a4a32' },
   
    unlock: { kind: 'topic', topicId: 'military' },
    sceneFit: { battlefield: 100, showdown: 80, fight: 80, montage: 75, emotionalClimax: 65, chase: 60 } },
  { id: 'manor', name: 'Manor', tags: ['interior', 'periodDrama', 'prestige'], dayCost: 70, style: 'interior', footprint: { w: 3, d: 4 }, extrasCapacity: 30,
    palette: { floor: '#7a4d35', wall: '#c9b79a', accent: '#4f6b4a' },
   
    unlock: { kind: 'topic', topicId: 'periodDrama' },
    sceneFit: { ballroom: 100, romance: 90, dialogue: 85, betrayal: 85, emotionalClimax: 85, reveal: 80 } },
  { id: 'pressRoom', name: 'Press Room', tags: ['interior', 'biopic', 'prestige'], dayCost: 30, style: 'interior', footprint: { w: 2, d: 3 }, extrasCapacity: 25,
    palette: { floor: '#4b5563', wall: '#d1d5db', accent: '#2563eb' },
   
    unlock: { kind: 'topic', topicId: 'biopic' },
    sceneFit: { turningPoint: 90, dialogue: 80, reveal: 85, emotionalClimax: 70 } },
  { id: 'courtroom', name: 'Courtroom', tags: ['interior', 'courtroom', 'prestige'], dayCost: 40, style: 'interior', footprint: { w: 3, d: 3 }, extrasCapacity: 30,
    palette: { floor: '#8b5a3c', wall: '#e2d6c2', accent: '#4a3426' },
   
    unlock: { kind: 'topic', topicId: 'courtroom' },
    sceneFit: { crossExam: 100, reveal: 90, twist: 90, dialogue: 85, betrayal: 75, emotionalClimax: 75 } },
  // ---- Bought with credits ----
  { id: 'rooftop', name: 'Rooftop', tags: ['exterior', 'urbanProfessional', 'crime'], dayCost: 45, style: 'exterior', footprint: { w: 3, d: 3 }, extrasCapacity: 6,
    palette: { floor: '#6b6f76', accent: '#e0a63b' },
   
    unlock: { kind: 'credits', cost: 120, repTier: 1 },
    sceneFit: { showdown: 90, chase: 75, romance: 80, emotionalClimax: 85, fight: 75, reveal: 70 } },
  { id: 'hospital', name: 'Hospital', tags: ['interior', 'smallTown', 'urbanProfessional'], dayCost: 35, style: 'interior', footprint: { w: 2, d: 3 }, extrasCapacity: 10,
    palette: { floor: '#d9e4e6', wall: '#f3f6f7', accent: '#3fa7a0' },
   
    unlock: { kind: 'credits', cost: 120, repTier: 1 },
    sceneFit: { emotionalClimax: 95, dialogue: 80, scare: 80, reveal: 80, twist: 70, comicRelief: 45 } },
  { id: 'forest', name: 'Forest', tags: ['exterior', 'smallTown', 'medieval'], dayCost: 30, style: 'exterior', footprint: { w: 4, d: 6 }, extrasCapacity: 20,
    palette: { floor: '#4f7a3a', accent: '#2f4f28' },
   
    unlock: { kind: 'credits', cost: 150, repTier: 2 },
    sceneFit: { scare: 95, chase: 80, romance: 70, montage: 75, fight: 70, swordDuel: 75, reveal: 60 } },
  { id: 'mansion', name: 'Mansion', tags: ['interior', 'crime', 'periodDrama'], dayCost: 65, style: 'interior', footprint: { w: 4, d: 4 }, extrasCapacity: 30,
    palette: { floor: '#5e3b2c', wall: '#bba68a', accent: '#7d2b3a' },
   
    unlock: { kind: 'credits', cost: 220, repTier: 2 },
    sceneFit: { betrayal: 90, twist: 90, reveal: 85, dialogue: 80, romance: 75, scare: 75, showdown: 70 } },
  { id: 'chromaStage', name: 'Green Screen Stage', tags: ['interior', 'future', 'epic'], dayCost: 80, style: 'chroma', footprint: { w: 3, d: 3 }, extrasCapacity: 40,
    palette: { floor: '#2fb34a', wall: '#2fb34a', accent: '#1f7a33' },
   
    unlock: { kind: 'credits', cost: 300, repTier: 3 },
    sceneFit: { spaceBattle: 85, showdown: 75, fight: 70, chase: 70, arenaBattle: 75, battlefield: 75, shipBoarding: 70 } },
];

export const setById = (id: string): FilmSet => {
  const s = SETS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown set ${id}`);
  return s;
};

export const STARTER_SET_IDS = SETS.filter((s) => s.unlock.kind === 'start').map((s) => s.id);
