import type { Topic, TopicPack } from '../types';
import { gm } from './genres';

export const TOPICS: Topic[] = [
  // Starter
  { id: 'urbanProfessional', name: 'Urban Professional', packId: 'starter', sceneTypes: [], setIds: [],
    genreFit: gm({ drama: 90, romance: 80, comedy: 80, thriller: 60, action: 35, horror: 25, scifi: 20, fantasy: 10 }) },
  { id: 'romantic', name: 'Romantic', packId: 'starter', sceneTypes: [], setIds: [],
    genreFit: gm({ romance: 100, drama: 85, comedy: 75, fantasy: 50, thriller: 25, action: 20, horror: 10, scifi: 25 }) },
  { id: 'smallTown', name: 'Small Town', packId: 'starter', sceneTypes: [], setIds: [],
    genreFit: gm({ drama: 85, horror: 80, comedy: 75, romance: 70, thriller: 65, action: 30, scifi: 30, fantasy: 30 }) },
  { id: 'crime', name: 'Crime', packId: 'starter', sceneTypes: [], setIds: [],
    genreFit: gm({ thriller: 100, action: 85, drama: 80, comedy: 50, horror: 45, romance: 30, scifi: 30, fantasy: 15 }) },
  // Epic
  { id: 'medieval', name: 'Medieval', packId: 'epic', sceneTypes: ['swordDuel'], setIds: ['castleHall'],
    genreFit: gm({ fantasy: 100, action: 90, drama: 70, romance: 60, horror: 45, comedy: 40, thriller: 40, scifi: 10 }) },
  { id: 'ancientRome', name: 'Ancient Rome', packId: 'epic', sceneTypes: ['arenaBattle'], setIds: ['colosseum'],
    genreFit: gm({ action: 95, drama: 85, fantasy: 60, romance: 50, thriller: 55, comedy: 35, horror: 30, scifi: 10 }) },
  { id: 'pirates', name: 'Pirates', packId: 'epic', sceneTypes: ['shipBoarding'], setIds: ['galleonDeck'],
    genreFit: gm({ action: 90, fantasy: 85, comedy: 75, romance: 60, drama: 40, thriller: 40, horror: 40, scifi: 15 }) },
  // Future
  { id: 'spaceTravel', name: 'Space Travel', packId: 'future', sceneTypes: ['spaceBattle'], setIds: ['spaceshipBridge'],
    genreFit: gm({ scifi: 100, action: 85, thriller: 70, horror: 70, drama: 55, fantasy: 50, romance: 35, comedy: 40 }) },
  { id: 'cyberpunk', name: 'Cyberpunk', packId: 'future', sceneTypes: ['hack'], setIds: ['neonAlley'],
    genreFit: gm({ scifi: 95, thriller: 90, action: 85, drama: 50, horror: 45, romance: 30, comedy: 25, fantasy: 30 }) },
  { id: 'postApocalyptic', name: 'Post-Apocalyptic', packId: 'future', sceneTypes: ['scavenge'], setIds: ['wasteland'],
    genreFit: gm({ scifi: 90, action: 85, horror: 85, thriller: 75, drama: 65, fantasy: 40, romance: 25, comedy: 20 }) },
  // Fight
  { id: 'martialArts', name: 'Martial Arts', packId: 'fight', sceneTypes: ['trainingMontage'], setIds: ['dojo'],
    genreFit: gm({ action: 100, comedy: 65, drama: 60, fantasy: 60, thriller: 55, romance: 30, scifi: 35, horror: 20 }) },
  { id: 'boxing', name: 'Boxing', packId: 'fight', sceneTypes: ['bigFight'], setIds: ['boxingRing'],
    genreFit: gm({ drama: 95, action: 85, comedy: 45, romance: 45, thriller: 40, horror: 10, scifi: 10, fantasy: 10 }) },
  { id: 'military', name: 'Military', packId: 'fight', sceneTypes: ['battlefield'], setIds: ['barracks'],
    genreFit: gm({ action: 95, drama: 85, thriller: 75, scifi: 55, horror: 40, comedy: 35, romance: 30, fantasy: 20 }) },
  // Prestige
  { id: 'periodDrama', name: 'Period Drama', packId: 'prestige', sceneTypes: ['ballroom'], setIds: ['manor'],
    genreFit: gm({ drama: 100, romance: 95, comedy: 45, thriller: 45, horror: 35, fantasy: 30, action: 20, scifi: 5 }) },
  { id: 'biopic', name: 'Biopic', packId: 'prestige', sceneTypes: ['turningPoint'], setIds: ['pressRoom'],
    genreFit: gm({ drama: 100, romance: 55, comedy: 45, thriller: 40, action: 30, horror: 10, scifi: 10, fantasy: 10 }) },
  { id: 'courtroom', name: 'Courtroom', packId: 'prestige', sceneTypes: ['crossExam'], setIds: ['courtroom'],
    genreFit: gm({ drama: 95, thriller: 95, comedy: 40, romance: 30, action: 20, horror: 15, scifi: 15, fantasy: 10 }) },
];

export const TOPIC_PACKS: TopicPack[] = [
  { id: 'starter', name: 'Starter', topicIds: ['urbanProfessional', 'romantic', 'smallTown', 'crime'], cost: 0 },
  { id: 'epic', name: 'Epic', topicIds: ['medieval', 'ancientRome', 'pirates'], cost: 300 },
  { id: 'future', name: 'Future', topicIds: ['spaceTravel', 'cyberpunk', 'postApocalyptic'], cost: 300 },
  { id: 'fight', name: 'Fight', topicIds: ['martialArts', 'boxing', 'military'], cost: 250 },
  { id: 'prestige', name: 'Prestige', topicIds: ['periodDrama', 'biopic', 'courtroom'], cost: 350 },
];

export const topicById = (id: string): Topic => {
  const t = TOPICS.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown topic ${id}`);
  return t;
};
