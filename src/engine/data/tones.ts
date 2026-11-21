import type { Axis, AxisVector, GenreId, Tone } from '../types';

export const AXES: { id: Axis; name: string; low: string; high: string }[] = [
  { id: 'action', name: 'Action', low: 'Calm', high: 'Thrill' },
  { id: 'humor', name: 'Humor', low: 'Sad', high: 'Happy' },
  { id: 'romance', name: 'Romance', low: 'Cold', high: 'Passionate' },
  { id: 'fear', name: 'Fear', low: 'Safe', high: 'Terrifying' },
];

const v = (action: number, humor: number, romance: number, fear: number): AxisVector => ({ action, humor, romance, fear });

export const TONES: { id: Tone; name: string; vec: AxisVector }[] = [
  { id: 'happy', name: 'Happy', vec: v(45, 90, 30, 5) },
  { id: 'sad', name: 'Sad', vec: v(25, 10, 30, 15) },
  { id: 'thrill', name: 'Thrill', vec: v(90, 50, 10, 45) },
  { id: 'calm', name: 'Calm', vec: v(15, 55, 20, 5) },
  { id: 'romantic', name: 'Romantic', vec: v(30, 65, 95, 5) },
  { id: 'scary', name: 'Scary', vec: v(65, 20, 5, 95) },
];

export const toneById = (id: Tone) => TONES.find((t) => t.id === id)!;

/** Ideal script profile per genre, and how much each axis matters (0–1). */
export const GENRE_PROFILE: Record<GenreId, { target: AxisVector; weight: AxisVector }> = {
  action: { target: v(85, 55, 25, 40), weight: v(1, 0.4, 0.3, 0.3) },
  drama: { target: v(30, 25, 50, 30), weight: v(0.6, 0.8, 0.4, 0.3) },
  romance: { target: v(30, 60, 90, 10), weight: v(0.4, 0.5, 1, 0.4) },
  comedy: { target: v(50, 90, 45, 10), weight: v(0.3, 1, 0.3, 0.4) },
  thriller: { target: v(75, 30, 20, 70), weight: v(0.8, 0.4, 0.2, 0.8) },
  horror: { target: v(60, 15, 10, 95), weight: v(0.4, 0.5, 0.2, 1) },
  scifi: { target: v(70, 45, 25, 50), weight: v(0.7, 0.3, 0.2, 0.4) },
  fantasy: { target: v(65, 60, 45, 40), weight: v(0.6, 0.5, 0.4, 0.3) },
};

/** The tone a genre's brief most likely asks for. */
export const GENRE_TONE: Record<GenreId, Tone> = {
  action: 'thrill', drama: 'sad', romance: 'romantic', comedy: 'happy',
  thriller: 'thrill', horror: 'scary', scifi: 'thrill', fantasy: 'happy',
};
