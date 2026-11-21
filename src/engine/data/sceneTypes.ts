import type { SceneType } from '../types';
import { gm } from './genres';

// Base scene types (~12) plus topic-specific ones. Costs in $K.
export const SCENE_TYPES: SceneType[] = [
  {
    id: 'chase', name: 'Chase',
    genreFit: gm({ action: 95, thriller: 85, scifi: 75, comedy: 50, fantasy: 60, horror: 60, romance: 15, drama: 25 }),
    requiredRoles: ['main'], minParticipants: 1, maxParticipants: 3,
    baseCost: 400, costPerMin: 120, difficulty: 4, minRating: 'PG',
  },
  {
    id: 'fight', name: 'Fight',
    genreFit: gm({ action: 95, fantasy: 80, scifi: 70, thriller: 65, horror: 50, comedy: 35, drama: 30, romance: 10 }),
    requiredRoles: [], minParticipants: 2, maxParticipants: 4,
    baseCost: 350, costPerMin: 110, difficulty: 4, minRating: 'PG',
  },
  {
    id: 'romance', name: 'Romance',
    genreFit: gm({ romance: 100, drama: 75, comedy: 60, fantasy: 45, scifi: 30, action: 25, thriller: 25, horror: 10 }),
    requiredRoles: ['romanticInterest'], minParticipants: 2, maxParticipants: 2,
    baseCost: 120, costPerMin: 40, difficulty: 2, minRating: 'G',
  },
  {
    id: 'dialogue', name: 'Dialogue',
    genreFit: gm({ drama: 90, romance: 70, comedy: 70, thriller: 65, scifi: 50, fantasy: 50, horror: 40, action: 35 }),
    requiredRoles: [], minParticipants: 2, maxParticipants: 4,
    baseCost: 60, costPerMin: 25, difficulty: 1, minRating: 'G',
  },
  {
    id: 'reveal', name: 'Reveal',
    genreFit: gm({ thriller: 90, drama: 75, horror: 75, scifi: 70, fantasy: 65, action: 55, romance: 45, comedy: 40 }),
    requiredRoles: [], minParticipants: 1, maxParticipants: 4,
    baseCost: 150, costPerMin: 50, difficulty: 2, minRating: 'G',
  },
  {
    id: 'betrayal', name: 'Betrayal',
    genreFit: gm({ thriller: 90, drama: 85, action: 60, fantasy: 60, romance: 55, scifi: 50, horror: 45, comedy: 20 }),
    requiredRoles: [], minParticipants: 2, maxParticipants: 3,
    baseCost: 140, costPerMin: 45, difficulty: 3, minRating: 'PG',
  },
  {
    id: 'showdown', name: 'Showdown',
    genreFit: gm({ action: 100, fantasy: 85, scifi: 80, thriller: 80, horror: 70, drama: 40, comedy: 35, romance: 15 }),
    requiredRoles: ['main', 'villain'], minParticipants: 2, maxParticipants: 4,
    baseCost: 500, costPerMin: 140, difficulty: 5, minRating: 'PG', climax: true,
  },
  {
    id: 'comicRelief', name: 'Comic Relief',
    genreFit: gm({ comedy: 100, romance: 60, action: 55, fantasy: 55, scifi: 45, drama: 30, thriller: 20, horror: 25 }),
    requiredRoles: [], minParticipants: 1, maxParticipants: 3,
    baseCost: 80, costPerMin: 30, difficulty: 2, minRating: 'G',
  },
  {
    id: 'montage', name: 'Montage',
    genreFit: gm({ comedy: 70, romance: 70, action: 65, drama: 60, scifi: 50, fantasy: 50, thriller: 40, horror: 30 }),
    requiredRoles: [], minParticipants: 1, maxParticipants: 4,
    baseCost: 100, costPerMin: 60, difficulty: 2, minRating: 'G',
  },
  {
    id: 'emotionalClimax', name: 'Emotional Climax',
    genreFit: gm({ drama: 100, romance: 95, fantasy: 65, scifi: 55, comedy: 50, thriller: 50, action: 45, horror: 35 }),
    requiredRoles: ['main'], minParticipants: 1, maxParticipants: 3,
    baseCost: 180, costPerMin: 55, difficulty: 3, minRating: 'G', climax: true,
  },
  {
    id: 'twist', name: 'Twist',
    genreFit: gm({ thriller: 100, horror: 85, scifi: 80, drama: 65, fantasy: 60, action: 50, comedy: 45, romance: 35 }),
    requiredRoles: [], minParticipants: 1, maxParticipants: 4,
    baseCost: 160, costPerMin: 50, difficulty: 3, minRating: 'G', climax: true,
  },
  {
    id: 'scare', name: 'Scare',
    genreFit: gm({ horror: 100, thriller: 75, scifi: 45, fantasy: 45, comedy: 30, action: 30, drama: 15, romance: 5 }),
    requiredRoles: ['main'], minParticipants: 1, maxParticipants: 3,
    baseCost: 130, costPerMin: 50, difficulty: 3, minRating: 'PG-13',
  },
  // ---- Topic-specific scene types ----
  {
    id: 'swordDuel', name: 'Sword Duel', topicId: 'medieval',
    genreFit: gm({ action: 90, fantasy: 95, drama: 50, romance: 30 }),
    requiredRoles: [], minParticipants: 2, maxParticipants: 2,
    baseCost: 420, costPerMin: 120, difficulty: 4, minRating: 'PG',
  },
  {
    id: 'arenaBattle', name: 'Arena Battle', topicId: 'ancientRome',
    genreFit: gm({ action: 95, drama: 60, fantasy: 70 }),
    requiredRoles: ['main'], minParticipants: 1, maxParticipants: 4,
    baseCost: 700, costPerMin: 180, difficulty: 5, minRating: 'PG-13', climax: true,
  },
  {
    id: 'shipBoarding', name: 'Ship Boarding', topicId: 'pirates',
    genreFit: gm({ action: 90, fantasy: 75, comedy: 60, romance: 35 }),
    requiredRoles: [], minParticipants: 2, maxParticipants: 4,
    baseCost: 600, costPerMin: 160, difficulty: 5, minRating: 'PG',
  },
  {
    id: 'spaceBattle', name: 'Space Battle', topicId: 'spaceTravel',
    genreFit: gm({ scifi: 100, action: 90, fantasy: 60 }),
    requiredRoles: [], minParticipants: 1, maxParticipants: 4,
    baseCost: 900, costPerMin: 220, difficulty: 4, minRating: 'PG', climax: true,
  },
  {
    id: 'hack', name: 'Hack', topicId: 'cyberpunk',
    genreFit: gm({ scifi: 90, thriller: 90, action: 65, drama: 40 }),
    requiredRoles: [], minParticipants: 1, maxParticipants: 3,
    baseCost: 200, costPerMin: 70, difficulty: 2, minRating: 'PG',
  },
  {
    id: 'scavenge', name: 'Scavenge', topicId: 'postApocalyptic',
    genreFit: gm({ scifi: 85, horror: 75, action: 70, drama: 60, thriller: 70 }),
    requiredRoles: [], minParticipants: 1, maxParticipants: 4,
    baseCost: 220, costPerMin: 70, difficulty: 3, minRating: 'PG-13',
  },
  {
    id: 'trainingMontage', name: 'Training Montage', topicId: 'martialArts',
    genreFit: gm({ action: 90, drama: 60, comedy: 70 }),
    requiredRoles: ['main'], minParticipants: 1, maxParticipants: 2,
    baseCost: 150, costPerMin: 60, difficulty: 2, minRating: 'G',
  },
  {
    id: 'bigFight', name: 'The Big Fight', topicId: 'boxing',
    genreFit: gm({ drama: 85, action: 90 }),
    requiredRoles: ['main'], minParticipants: 2, maxParticipants: 3,
    baseCost: 450, costPerMin: 120, difficulty: 4, minRating: 'PG', climax: true,
  },
  {
    id: 'battlefield', name: 'Battlefield', topicId: 'military',
    genreFit: gm({ action: 95, drama: 80, thriller: 60 }),
    requiredRoles: ['main'], minParticipants: 1, maxParticipants: 4,
    baseCost: 800, costPerMin: 200, difficulty: 5, minRating: 'PG-13', climax: true,
  },
  {
    id: 'ballroom', name: 'Ballroom', topicId: 'periodDrama',
    genreFit: gm({ romance: 95, drama: 85, comedy: 50 }),
    requiredRoles: [], minParticipants: 2, maxParticipants: 4,
    baseCost: 300, costPerMin: 90, difficulty: 2, minRating: 'G',
  },
  {
    id: 'turningPoint', name: 'Turning Point', topicId: 'biopic',
    genreFit: gm({ drama: 100, romance: 50, comedy: 40 }),
    requiredRoles: ['main'], minParticipants: 1, maxParticipants: 3,
    baseCost: 170, costPerMin: 50, difficulty: 3, minRating: 'G', climax: true,
  },
  {
    id: 'crossExam', name: 'Cross-Examination', topicId: 'courtroom',
    genreFit: gm({ drama: 95, thriller: 90, comedy: 40 }),
    requiredRoles: [], minParticipants: 2, maxParticipants: 4,
    baseCost: 110, costPerMin: 35, difficulty: 2, minRating: 'G', climax: true,
  },
];

export const sceneTypeById = (id: string): SceneType => {
  const t = SCENE_TYPES.find((s) => s.id === id);
  if (!t) throw new Error(`Unknown scene type ${id}`);
  return t;
};

export const BASE_SCENE_TYPES = SCENE_TYPES.filter((s) => !s.topicId);
