// Seeded RNG (mulberry32) so generation is reproducible and testable.

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  chance(p: number): boolean;
  /** Pick a key by weight. */
  weighted<K extends string>(weights: Record<K, number>): K;
  shuffle<T>(items: readonly T[]): T[];
  /** Current internal state, to persist and resume. */
  state(): number;
}

export function createRng(seed: number): Rng {
  let s = seed >>> 0;
  const next = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
    weighted: (weights) => {
      const entries = Object.entries(weights) as [string, number][];
      const total = entries.reduce((a, [, w]) => a + w, 0);
      let r = next() * total;
      for (const [k, w] of entries) {
        r -= w;
        if (r < 0) return k as never;
      }
      return entries[entries.length - 1][0] as never;
    },
    shuffle: (items) => {
      const a = [...items];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    },
    state: () => s,
  };
  return rng;
}

/** Short id drawn from the RNG, so ids are reproducible inside tests. */
export function makeId(prefix: string, rng: Rng): string {
  const a = Math.floor(rng.next() * 36 ** 5).toString(36).padStart(5, '0');
  const b = Math.floor(rng.next() * 36 ** 5).toString(36).padStart(5, '0');
  return `${prefix}_${a}${b}`;
}
