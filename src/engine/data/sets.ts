import type { FilmSet } from '../types';

// Premade sets. toneFit is 0–100 per tone; actionFit covers specific actions.
export const DEFAULT_ACTION_FIT = 50;

export const SETS: FilmSet[] = [
  // ---- 3 starter sets (apartment, park, warehouse); the other basics are bought ----
  { id: 'apartment', name: 'Apartment', tags: ['interior', 'intimate', 'urbanProfessional', 'romantic'], dayCost: 15, style: 'interior', footprint: { w: 2, d: 2 }, extrasCapacity: 4,
    palette: { floor: '#b98b5e', wall: '#d9cdb8', accent: '#5c7fa3' },
   
    tier: 'basic', unlock: { kind: 'start' },
    toneFit: { happy: 75, sad: 85, thrill: 35, calm: 85, romantic: 90, scary: 60 } },
  { id: 'office', name: 'Office', tags: ['interior', 'urbanProfessional', 'crime'], dayCost: 20, style: 'interior', footprint: { w: 3, d: 2 }, extrasCapacity: 8,
    palette: { floor: '#8d939c', wall: '#c9ced6', accent: '#3e6c8f' },
   
    tier: 'advanced', unlock: { kind: 'buy', cost: 90 },
    toneFit: { happy: 60, sad: 60, thrill: 50, calm: 85, romantic: 35, scary: 40 },
    actionFit: { hacks: 80, crossExamines: 50 } },
  { id: 'cityStreet', name: 'City Street', tags: ['exterior', 'urbanProfessional', 'crime'], dayCost: 40, style: 'exterior', footprint: { w: 2, d: 6 }, extrasCapacity: 40,
    palette: { floor: '#5b5e66', accent: '#d8b44a' },
   
    tier: 'advanced', unlock: { kind: 'buy', cost: 140 },
    toneFit: { happy: 70, sad: 45, thrill: 95, calm: 50, romantic: 55, scary: 50 } },
  { id: 'diner', name: 'Diner', tags: ['interior', 'smallTown', 'crime'], dayCost: 12, style: 'interior', footprint: { w: 2, d: 3 }, extrasCapacity: 10,
    palette: { floor: '#c9c1b0', wall: '#9fd0c9', accent: '#d0473f' },
   
    tier: 'advanced', unlock: { kind: 'buy', cost: 70 },
    toneFit: { happy: 85, sad: 60, thrill: 45, calm: 80, romantic: 65, scary: 45 } },
  { id: 'park', name: 'Park', tags: ['exterior', 'romantic', 'smallTown'], dayCost: 18, style: 'exterior', footprint: { w: 4, d: 4 }, extrasCapacity: 30,
    palette: { floor: '#6fae5a', accent: '#3f7a3a' },
   
    tier: 'basic', unlock: { kind: 'start' },
    toneFit: { happy: 90, sad: 60, thrill: 55, calm: 85, romantic: 95, scary: 45 },
    actionFit: { trains: 70 } },
  { id: 'warehouse', name: 'Warehouse', tags: ['interior', 'gritty', 'crime'], dayCost: 25, style: 'interior', footprint: { w: 4, d: 4 }, extrasCapacity: 20,
    palette: { floor: '#6e6a64', wall: '#8a7f72', accent: '#c07a37' },
   
    tier: 'basic', unlock: { kind: 'start' },
    toneFit: { happy: 25, sad: 50, thrill: 95, calm: 35, romantic: 15, scary: 85 },
    actionFit: { boxes: 60 } },
  { id: 'suburbanHouse', name: 'Suburban House', tags: ['interior', 'smallTown'], dayCost: 15, style: 'interior', footprint: { w: 2, d: 2 }, extrasCapacity: 4,
    palette: { floor: '#a8784d', wall: '#e6dcc6', accent: '#7a9e7e' },
   
    tier: 'advanced', unlock: { kind: 'buy', cost: 80 },
    toneFit: { happy: 80, sad: 85, thrill: 40, calm: 80, romantic: 70, scary: 85 } },
  { id: 'bar', name: 'Bar', tags: ['interior', 'urbanProfessional', 'crime', 'smallTown'], dayCost: 14, style: 'interior', footprint: { w: 2, d: 3 }, extrasCapacity: 15,
    palette: { floor: '#6b4630', wall: '#4a3a35', accent: '#d9a441' },
   
    tier: 'advanced', unlock: { kind: 'buy', cost: 80 },
    toneFit: { happy: 85, sad: 70, thrill: 65, calm: 55, romantic: 70, scary: 45 } },
  // ---- Topic sets (unlocked with their topic) ----
  { id: 'castleHall', name: 'Castle Hall', tags: ['interior', 'medieval', 'epic'], dayCost: 60, style: 'interior', footprint: { w: 3, d: 5 }, extrasCapacity: 40,
    palette: { floor: '#8a8178', wall: '#a59c90', accent: '#8c2f39' },
   
    tier: 'premium', unlock: { kind: 'topic', topicId: 'medieval' },
    toneFit: { happy: 55, sad: 70, thrill: 85, calm: 55, romantic: 70, scary: 70 },
    actionFit: { duels: 100, ballDance: 75 } },
  { id: 'colosseum', name: 'Colosseum', tags: ['exterior', 'ancientRome', 'epic'], dayCost: 110, style: 'exterior', footprint: { w: 6, d: 6 }, extrasCapacity: 300,
    palette: { floor: '#d6b98c', accent: '#a8623c' },
   
    tier: 'premium', unlock: { kind: 'topic', topicId: 'ancientRome' },
    toneFit: { happy: 30, sad: 40, thrill: 100, calm: 20, romantic: 15, scary: 70 },
    actionFit: { arenaBattle: 100, duels: 80 } },
  { id: 'galleonDeck', name: 'Galleon Deck', tags: ['exterior', 'pirates', 'epic'], dayCost: 90, style: 'exterior', footprint: { w: 2, d: 6 }, extrasCapacity: 25,
    palette: { floor: '#8a5a36', accent: '#e8e1cf' },
   
    tier: 'premium', unlock: { kind: 'topic', topicId: 'pirates' },
    toneFit: { happy: 75, sad: 40, thrill: 95, calm: 50, romantic: 55, scary: 45 },
    actionFit: { boardsShip: 100, duels: 85 } },
  { id: 'spaceshipBridge', name: 'Spaceship Bridge', tags: ['interior', 'spaceTravel', 'future'], dayCost: 100, style: 'interior', footprint: { w: 3, d: 3 }, extrasCapacity: 10,
    palette: { floor: '#3d4757', wall: '#6f7d91', accent: '#43c6db' },
   
    tier: 'premium', unlock: { kind: 'topic', topicId: 'spaceTravel' },
    toneFit: { happy: 40, sad: 50, thrill: 90, calm: 70, romantic: 30, scary: 70 },
    actionFit: { dogfights: 100, hacks: 75 } },
  { id: 'neonAlley', name: 'Neon Alley', tags: ['exterior', 'cyberpunk', 'future'], dayCost: 55, style: 'exterior', footprint: { w: 2, d: 5 }, extrasCapacity: 25,
    palette: { floor: '#2f2a3d', accent: '#e04fd0' },
   
    tier: 'premium', unlock: { kind: 'topic', topicId: 'cyberpunk' },
    toneFit: { happy: 40, sad: 50, thrill: 95, calm: 35, romantic: 45, scary: 75 },
    actionFit: { hacks: 90 } },
  { id: 'wasteland', name: 'Wasteland', tags: ['exterior', 'postApocalyptic', 'future'], dayCost: 50, style: 'exterior', footprint: { w: 5, d: 8 }, extrasCapacity: 60,
    palette: { floor: '#b59a6a', accent: '#6b5a3e' },
   
    tier: 'premium', unlock: { kind: 'topic', topicId: 'postApocalyptic' },
    toneFit: { happy: 20, sad: 70, thrill: 90, calm: 45, romantic: 20, scary: 90 },
    actionFit: { scavenges: 100 } },
  { id: 'dojo', name: 'Dojo', tags: ['interior', 'martialArts'], dayCost: 22, style: 'interior', footprint: { w: 3, d: 3 }, extrasCapacity: 12,
    palette: { floor: '#d7b97f', wall: '#efe6d2', accent: '#a23b2a' },
   
    tier: 'premium', unlock: { kind: 'topic', topicId: 'martialArts' },
    toneFit: { happy: 55, sad: 50, thrill: 85, calm: 85, romantic: 30, scary: 30 },
    actionFit: { trains: 100, duels: 70 } },
  { id: 'boxingRing', name: 'Boxing Ring', tags: ['interior', 'boxing'], dayCost: 35, style: 'interior', footprint: { w: 3, d: 3 }, extrasCapacity: 80,
    palette: { floor: '#3a3f4b', wall: '#22252c', accent: '#c8313a' },
   
    tier: 'premium', unlock: { kind: 'topic', topicId: 'boxing' },
    toneFit: { happy: 60, sad: 60, thrill: 95, calm: 30, romantic: 20, scary: 35 },
    actionFit: { boxes: 100 } },
  { id: 'warField', name: 'War Field', tags: ['exterior', 'military', 'epic'], dayCost: 140, style: 'exterior', footprint: { w: 4, d: 10 }, extrasCapacity: 500,
    palette: { floor: '#7b8f4a', accent: '#5a4a32' },
   
    tier: 'premium', unlock: { kind: 'topic', topicId: 'military' },
    toneFit: { happy: 10, sad: 85, thrill: 100, calm: 20, romantic: 10, scary: 80 },
    actionFit: { leadsCharge: 100, arenaBattle: 60 } },
  { id: 'manor', name: 'Manor', tags: ['interior', 'periodDrama', 'prestige'], dayCost: 70, style: 'interior', footprint: { w: 3, d: 4 }, extrasCapacity: 30,
    palette: { floor: '#7a4d35', wall: '#c9b79a', accent: '#4f6b4a' },
   
    tier: 'premium', unlock: { kind: 'topic', topicId: 'periodDrama' },
    toneFit: { happy: 70, sad: 80, thrill: 45, calm: 80, romantic: 95, scary: 70 },
    actionFit: { ballDance: 100 } },
  { id: 'pressRoom', name: 'Press Room', tags: ['interior', 'biopic', 'prestige'], dayCost: 30, style: 'interior', footprint: { w: 2, d: 3 }, extrasCapacity: 25,
    palette: { floor: '#4b5563', wall: '#d1d5db', accent: '#2563eb' },
   
    tier: 'premium', unlock: { kind: 'topic', topicId: 'biopic' },
    toneFit: { happy: 60, sad: 60, thrill: 55, calm: 75, romantic: 30, scary: 30 },
    actionFit: { givesSpeech: 100 } },
  { id: 'courtroom', name: 'Courtroom', tags: ['interior', 'courtroom', 'prestige'], dayCost: 40, style: 'interior', footprint: { w: 3, d: 3 }, extrasCapacity: 30,
    palette: { floor: '#8b5a3c', wall: '#e2d6c2', accent: '#4a3426' },
   
    tier: 'premium', unlock: { kind: 'topic', topicId: 'courtroom' },
    toneFit: { happy: 40, sad: 70, thrill: 80, calm: 70, romantic: 20, scary: 45 },
    actionFit: { crossExamines: 100, givesSpeech: 70 } },
  // ---- Bought with studio money ----
  { id: 'rooftop', name: 'Rooftop', tags: ['exterior', 'urbanProfessional', 'crime'], dayCost: 45, style: 'exterior', footprint: { w: 3, d: 3 }, extrasCapacity: 6,
    palette: { floor: '#6b6f76', accent: '#e0a63b' },
   
    tier: 'advanced', unlock: { kind: 'buy', cost: 140 },
    toneFit: { happy: 65, sad: 70, thrill: 85, calm: 60, romantic: 90, scary: 55 } },
  { id: 'hospital', name: 'Hospital', tags: ['interior', 'smallTown', 'urbanProfessional'], dayCost: 35, style: 'interior', footprint: { w: 2, d: 3 }, extrasCapacity: 10,
    palette: { floor: '#d9e4e6', wall: '#f3f6f7', accent: '#3fa7a0' },
   
    tier: 'advanced', unlock: { kind: 'buy', cost: 140 },
    toneFit: { happy: 40, sad: 95, thrill: 60, calm: 70, romantic: 50, scary: 75 } },
  { id: 'forest', name: 'Forest', tags: ['exterior', 'smallTown', 'medieval'], dayCost: 30, style: 'exterior', footprint: { w: 4, d: 6 }, extrasCapacity: 20,
    palette: { floor: '#4f7a3a', accent: '#2f4f28' },
   
    tier: 'advanced', unlock: { kind: 'buy', cost: 180 },
    toneFit: { happy: 60, sad: 55, thrill: 80, calm: 70, romantic: 70, scary: 95 },
    actionFit: { scavenges: 60, duels: 60 } },
  { id: 'mansion', name: 'Mansion', tags: ['interior', 'crime', 'periodDrama'], dayCost: 65, style: 'interior', footprint: { w: 4, d: 4 }, extrasCapacity: 30,
    palette: { floor: '#5e3b2c', wall: '#bba68a', accent: '#7d2b3a' },
   
    tier: 'premium', unlock: { kind: 'buy', cost: 260 },
    toneFit: { happy: 65, sad: 75, thrill: 70, calm: 70, romantic: 80, scary: 85 },
    actionFit: { ballDance: 80 } },
  { id: 'chromaStage', name: 'Green Screen Stage', tags: ['interior', 'future', 'epic'], dayCost: 80, style: 'chroma', footprint: { w: 3, d: 3 }, extrasCapacity: 40,
    palette: { floor: '#2fb34a', wall: '#2fb34a', accent: '#1f7a33' },
   
    tier: 'premium', unlock: { kind: 'buy', cost: 350 },
    toneFit: { happy: 50, sad: 40, thrill: 85, calm: 40, romantic: 40, scary: 70 },
    actionFit: { dogfights: 90, arenaBattle: 80, leadsCharge: 80, boardsShip: 70 } },
];

export const setById = (id: string): FilmSet => {
  const s = SETS.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown set ${id}`);
  return s;
};

export const STARTER_SET_IDS = SETS.filter((s) => s.unlock.kind === 'start').map((s) => s.id);
