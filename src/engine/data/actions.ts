import type { ActionDef, AgeRating, AxisVector, GenreId, Skill, Tone } from '../types';

type Opts = { climax?: boolean; stunt?: boolean; minRating?: AgeRating; topicId?: string };
const A = (
  id: string, verb: string, target: ActionDef['target'], prep: string, skill: Skill, impact: number,
  tones: Tone[], [action, humor, romance, fear]: [number, number, number, number], cost: number, o: Opts = {},
): ActionDef => ({
  id, verb, target, prep, skill, impact, tones, vec: { action, humor, romance, fear } as AxisVector, cost,
  climax: o.climax, stunt: o.stunt, minRating: o.minRating ?? 'G', topicId: o.topicId,
});

export const ACTIONS: ActionDef[] = [
  // ---- Action ----
  A('fights', 'fights', 'required', 'To', 'action', 2, ['thrill', 'scary'], [90, 45, 5, 50], 120, { stunt: true }),
  A('fightsAndWins', 'fights and wins', 'required', 'To', 'action', 3, ['thrill'], [90, 60, 5, 40], 150, { stunt: true, climax: true }),
  A('chases', 'chases', 'required', 'To', 'action', 2, ['thrill', 'scary'], [95, 50, 5, 45], 140, { stunt: true }),
  A('escapes', 'escapes', 'optional', 'From', 'action', 2, ['thrill', 'scary'], [85, 55, 5, 50], 100, { stunt: true }),
  A('saves', 'saves', 'required', 'To', 'action', 3, ['thrill', 'romantic', 'happy'], [80, 70, 40, 30], 120, { stunt: true, climax: true }),
  A('defeats', 'defeats', 'required', 'To', 'action', 3, ['thrill'], [85, 65, 5, 35], 130, { stunt: true, climax: true }),
  // ---- Menace ----
  A('kills', 'kills', 'required', 'To', 'menace', 3, ['thrill', 'scary', 'sad'], [80, 15, 0, 85], 120, { climax: true, minRating: 'PG-13' }),
  A('threatens', 'threatens', 'required', 'To', 'menace', 2, ['scary', 'thrill'], [60, 25, 0, 85], 40),
  A('scares', 'scares', 'required', 'To', 'menace', 2, ['scary'], [70, 30, 0, 100], 60, { minRating: 'PG' }),
  // ---- Drama ----
  A('dies', 'dies', 'none', '', 'drama', 3, ['sad', 'scary'], [40, 5, 30, 50], 60, { climax: true, minRating: 'PG' }),
  A('betrays', 'betrays', 'required', 'To', 'drama', 3, ['sad', 'thrill', 'scary'], [55, 15, 10, 60], 50, { climax: true }),
  A('breaksUp', 'breaks up', 'required', 'With', 'drama', 2, ['sad'], [30, 10, 60, 5], 30),
  A('argues', 'argues', 'required', 'With', 'drama', 2, ['sad', 'thrill'], [55, 30, 20, 20], 20),
  A('confesses', 'confesses', 'required', 'To', 'drama', 2, ['sad', 'calm', 'romantic'], [25, 30, 40, 10], 20),
  A('revealsSecret', 'reveals a secret', 'required', 'To', 'drama', 3, ['thrill', 'sad', 'scary'], [60, 30, 20, 55], 40, { climax: true }),
  A('cries', 'cries', 'none', '', 'drama', 1, ['sad'], [15, 5, 30, 10], 10),
  A('plans', 'plans', 'optional', 'With', 'drama', 1, ['calm', 'thrill'], [30, 50, 5, 15], 15),
  A('watches', 'watches', 'optional', '', 'drama', 0, ['happy', 'sad', 'thrill', 'calm', 'romantic', 'scary'], [40, 45, 10, 20], 0),
  // ---- Romance ----
  A('declaresLove', 'declares love', 'required', 'To', 'romance', 3, ['romantic', 'sad', 'happy'], [30, 70, 100, 0], 40, { climax: true }),
  A('kisses', 'kisses', 'required', 'With', 'romance', 2, ['romantic', 'happy'], [35, 75, 100, 0], 40, { climax: true }),
  A('dances', 'dances', 'required', 'With', 'romance', 2, ['happy', 'romantic'], [55, 85, 80, 0], 60),
  // ---- Comedy ----
  A('jokes', 'jokes', 'optional', 'With', 'comedy', 1, ['happy', 'calm'], [40, 100, 10, 0], 20),
  A('pranks', 'pranks', 'required', 'To', 'comedy', 2, ['happy'], [60, 95, 5, 10], 40),
  A('celebrates', 'celebrates', 'optional', 'With', 'comedy', 1, ['happy'], [55, 95, 30, 0], 40),
  A('stumbles', 'makes a fool of themselves', 'optional', 'In front of', 'comedy', 2, ['happy', 'romantic'], [50, 100, 30, 5], 30),
  // ---- Topic actions ----
  A('duels', 'duels', 'required', 'With', 'action', 3, ['thrill'], [90, 45, 10, 45], 160, { stunt: true, climax: true, topicId: 'medieval' }),
  A('arenaBattle', 'battles in the arena', 'optional', 'Against', 'action', 3, ['thrill', 'scary'], [95, 35, 0, 60], 220, { stunt: true, climax: true, minRating: 'PG-13', topicId: 'ancientRome' }),
  A('boardsShip', 'boards the ship of', 'required', '', 'action', 2, ['thrill', 'happy'], [90, 65, 10, 35], 180, { stunt: true, topicId: 'pirates' }),
  A('dogfights', 'dogfights in space', 'required', 'With', 'action', 3, ['thrill'], [100, 50, 5, 45], 260, { stunt: true, climax: true, topicId: 'spaceTravel' }),
  A('hacks', 'hacks', 'optional', 'Into', 'drama', 2, ['thrill', 'calm'], [65, 45, 0, 40], 60, { topicId: 'cyberpunk' }),
  A('scavenges', 'scavenges', 'none', '', 'action', 1, ['calm', 'scary', 'sad'], [45, 30, 5, 55], 60, { topicId: 'postApocalyptic' }),
  A('trains', 'trains', 'optional', 'With', 'action', 2, ['calm', 'thrill', 'happy'], [70, 60, 10, 5], 50, { topicId: 'martialArts' }),
  A('boxes', 'boxes', 'required', 'Against', 'action', 3, ['thrill', 'sad'], [90, 40, 5, 30], 140, { stunt: true, climax: true, topicId: 'boxing' }),
  A('leadsCharge', 'leads the charge', 'optional', 'Against', 'action', 3, ['thrill', 'sad'], [100, 20, 0, 60], 240, { stunt: true, climax: true, minRating: 'PG-13', topicId: 'military' }),
  A('ballDance', 'dances at the ball', 'required', 'With', 'romance', 2, ['romantic', 'happy'], [40, 75, 95, 0], 90, { topicId: 'periodDrama' }),
  A('givesSpeech', 'gives a speech', 'optional', 'To', 'drama', 3, ['sad', 'happy', 'calm'], [35, 55, 15, 10], 40, { climax: true, topicId: 'biopic' }),
  A('crossExamines', 'cross-examines', 'required', '', 'drama', 3, ['thrill', 'calm'], [60, 35, 5, 45], 40, { climax: true, topicId: 'courtroom' }),
];

export const actionById = (id: string): ActionDef => {
  const a = ACTIONS.find((x) => x.id === id);
  if (!a) throw new Error(`Unknown action ${id}`);
  return a;
};

export const BASE_ACTIONS = ACTIONS.filter((a) => !a.topicId);

/** Actions a genre's brief may require. */
export const GENRE_SIGNATURE_ACTIONS: Record<GenreId, string[]> = {
  action: ['fights', 'chases', 'defeats'],
  drama: ['confesses', 'dies', 'argues', 'revealsSecret'],
  romance: ['declaresLove', 'kisses'],
  comedy: ['jokes', 'pranks', 'stumbles'],
  thriller: ['chases', 'betrays', 'revealsSecret'],
  horror: ['scares', 'threatens'],
  scifi: ['escapes', 'saves', 'revealsSecret'],
  fantasy: ['saves', 'defeats', 'fights'],
};
