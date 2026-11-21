// Low-poly isometric diorama for a set: a slab of cubes, walls for interiors, a
// cyclorama for chroma stages, hand-placed furniture for the main sets, low-poly
// actors, an optional studio rig (lights, camera, director's chair) and speech
// bubbles (pace / chemistry / dialogue). Pure SVG, deterministic per set id.
// Placeholder art: commissioned sprites can replace any prop later.

import { useMemo } from 'react';
import type { FilmSet, Meter } from '../../engine/types';
import { createRng } from '../../engine/rng';

const HALF = 16; // half-width of one cube in px; one height unit = HALF

export interface StageActor { id: string; skin: string; shirt: string; hair: string }
export interface StageBubble { key: string; actorId?: string; meter: Meter; value: number }

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  return '#' + ((1 << 24) | (c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).slice(1);
}
const project = (x: number, y: number, z: number): [number, number] => [(x - y) * HALF, (x + y) * (HALF / 2) - z * HALF];
const P = (x: number, y: number, z: number) => project(x, y, z).join(',');

interface Box { x: number; y: number; z: number; w: number; d: number; h: number; color: string; glow?: boolean }
interface Figure { kind: 'figure'; x: number; y: number; z: number; actor: StageActor; acting: boolean }
interface Glow { kind: 'glow'; x: number; y: number; z: number; r: number; color: string }
interface Cone { kind: 'cone'; from: [number, number, number]; to: [number, number, number]; spread: number }
type Drawable = (Box & { kind?: 'box' }) | Figure | Glow | Cone;

const B = (x: number, y: number, z: number, w: number, d: number, h: number, color: string, glow = false): Box => ({ x, y, z, w, d, h, color, glow });

// ---------------- Props (positions in cubes; z is height above the floor slab) ----------------
type Prop = (x: number, y: number, z: number, c: string) => Drawable[];
const PROPS: Record<string, Prop> = {
  sofa: (x, y, z, c) => [B(x, y + 0.2, z, 1.2, 0.5, 0.22, c), B(x, y, z, 1.2, 0.2, 0.55, shade(c, 0.9)), B(x, y + 0.2, z, 0.15, 0.5, 0.38, shade(c, 0.95)), B(x + 1.05, y + 0.2, z, 0.15, 0.5, 0.38, shade(c, 0.95))],
  armchair: (x, y, z, c) => [B(x, y + 0.18, z, 0.55, 0.5, 0.22, c), B(x, y, z, 0.55, 0.18, 0.55, shade(c, 0.9))],
  table: (x, y, z) => [B(x + 0.25, y + 0.15, z, 0.1, 0.1, 0.28, '#5b3b26'), B(x, y, z + 0.28, 0.6, 0.4, 0.06, '#7a5134'), B(x + 0.15, y + 0.12, z + 0.34, 0.2, 0.14, 0.02, '#f2eee6')],
  desk: (x, y, z) => [B(x, y, z, 0.9, 0.45, 0.4, '#6f4b31'), B(x + 0.3, y + 0.05, z + 0.4, 0.4, 0.06, 0.3, '#1d2a3a'), B(x + 0.33, y + 0.11, z + 0.45, 0.34, 0.01, 0.22, '#5fd0e8', true)],
  lamp: (x, y, z) => [B(x, y, z, 0.18, 0.18, 0.05, '#3a2c22'), B(x + 0.07, y + 0.07, z, 0.04, 0.04, 0.85, '#3a2c22'), B(x - 0.02, y - 0.02, z + 0.85, 0.22, 0.22, 0.2, '#f7d58b', true), { kind: 'glow', x: x + 0.1, y: y + 0.1, z: z + 0.9, r: 1.6, color: '#ffd27a' }],
  plant: (x, y, z) => [B(x, y, z, 0.22, 0.22, 0.22, '#b5653d'), B(x - 0.06, y - 0.06, z + 0.22, 0.34, 0.34, 0.2, '#4f8a3a'), B(x, y, z + 0.42, 0.22, 0.22, 0.2, '#62a345'), B(x + 0.05, y + 0.05, z + 0.62, 0.12, 0.12, 0.12, '#76b955')],
  bookshelf: (x, y, z) => {
    const out: Drawable[] = [B(x, y, z, 0.8, 0.25, 1.3, '#6b4630')];
    ['#c0392b', '#2e86c1', '#d4ac0d', '#7d3c98', '#5d6d7e', '#ca6f1e'].forEach((col, i) => out.push(B(x + 0.05 + (i % 3) * 0.24, y + 0.2, z + 0.15 + Math.floor(i / 3) * 0.5, 0.2, 0.06, 0.35, col)));
    return out;
  },
  bed: (x, y, z) => [B(x, y, z, 1, 1.4, 0.3, '#6b4630'), B(x + 0.05, y + 0.05, z + 0.3, 0.9, 1.3, 0.12, '#eae3d6'), B(x + 0.1, y + 0.08, z + 0.42, 0.8, 0.3, 0.1, '#ffffff'), B(x, y, z, 1, 0.12, 0.8, '#5b3b26')],
  counter: (x, y, z, c) => [B(x, y, z, 1.6, 0.4, 0.55, c), B(x, y, z + 0.55, 1.6, 0.45, 0.05, '#e9dfcf')],
  stool: (x, y, z) => [B(x + 0.06, y + 0.06, z, 0.06, 0.06, 0.4, '#3a2c22'), B(x, y, z + 0.4, 0.18, 0.18, 0.05, '#c0392b')],
  crate: (x, y, z) => [B(x, y, z, 0.4, 0.4, 0.4, '#9a6b3e'), B(x + 0.02, y + 0.39, z + 0.18, 0.36, 0.02, 0.04, '#6b4630')],
  barrel: (x, y, z) => [B(x, y, z, 0.3, 0.3, 0.45, '#7a4a2a'), B(x - 0.01, y - 0.01, z + 0.1, 0.32, 0.32, 0.04, '#3a2c22')],
  tree: (x, y, z) => [B(x + 0.12, y + 0.12, z, 0.14, 0.14, 0.55, '#6b4a2b'), B(x - 0.08, y - 0.08, z + 0.5, 0.54, 0.54, 0.4, '#3f7a3a'), B(x, y, z + 0.9, 0.38, 0.38, 0.3, '#529a48'), B(x + 0.09, y + 0.09, z + 1.2, 0.2, 0.2, 0.18, '#67b35c')],
  rock: (x, y, z) => [B(x, y, z, 0.4, 0.3, 0.22, '#8a8278'), B(x + 0.1, y + 0.05, z + 0.22, 0.2, 0.18, 0.1, '#9d958b')],
  streetlamp: (x, y, z) => [B(x, y, z, 0.06, 0.06, 1.6, '#2b2f36'), B(x - 0.08, y - 0.08, z + 1.6, 0.22, 0.22, 0.1, '#ffe8a8', true), { kind: 'glow', x: x + 0.03, y: y + 0.03, z: z + 1.5, r: 1.8, color: '#ffd27a' }],
  car: (x, y, z, c) => [B(x, y, z + 0.1, 1.1, 0.5, 0.28, c), B(x + 0.25, y + 0.05, z + 0.38, 0.55, 0.4, 0.2, shade(c, 1.15)), B(x + 0.15, y - 0.02, z, 0.18, 0.54, 0.14, '#1d1d1d'), B(x + 0.8, y - 0.02, z, 0.18, 0.54, 0.14, '#1d1d1d')],
  building: (x, y, z, c) => {
    const out: Drawable[] = [B(x, y, z, 0.9, 0.9, 2.4, c)];
    for (let r = 0; r < 4; r++) for (let k = 0; k < 2; k++) out.push(B(x + 0.15 + k * 0.4, y + 0.9, z + 0.4 + r * 0.5, 0.2, 0.02, 0.25, (r + k) % 3 ? '#ffd98a' : '#3a4250', (r + k) % 3 > 0));
    return out;
  },
  console: (x, y, z) => [B(x, y, z, 1.2, 0.4, 0.45, '#3d4757'), B(x, y + 0.05, z + 0.45, 1.2, 0.3, 0.08, '#2a323e'), B(x + 0.1, y + 0.1, z + 0.53, 1, 0.15, 0.02, '#43c6db', true)],
  bench: (x, y, z) => [B(x, y, z, 1.2, 0.35, 0.3, '#7a5134'), B(x, y, z, 1.2, 0.08, 0.65, '#6b4630')],
  judge: (x, y, z) => [B(x, y, z, 1.4, 0.5, 0.95, '#5b3b26'), B(x, y + 0.45, z + 0.3, 1.4, 0.05, 0.4, '#7a5134')],
  ringpost: (x, y, z) => [B(x, y, z, 0.08, 0.08, 0.8, '#d9d9d9')],
  chromaLight: (x, y, z) => [B(x + 0.05, y + 0.05, z, 0.05, 0.05, 1.2, '#2b2f36'), B(x - 0.05, y - 0.05, z + 1.2, 0.25, 0.25, 0.18, '#f2f2f2', true)],
  rug: (x, y, z, c) => [B(x, y, z, 1.4, 1, 0.02, c)],
  sandbag: (x, y, z) => [B(x, y, z, 0.6, 0.3, 0.2, '#a89466'), B(x + 0.1, y, z + 0.2, 0.5, 0.3, 0.18, '#968457')],
  tent: (x, y, z) => [B(x, y, z, 1, 0.8, 0.5, '#6b7a3a'), B(x + 0.1, y + 0.1, z + 0.5, 0.8, 0.6, 0.25, '#7d8c46')],
};

/** Wall-mounted items: on the back-right wall (y=0) or back-left wall (x=0). */
function wallWindow(along: 'x' | 'y', at: number, z: number, w = 0.8, h = 0.7): Drawable[] {
  return along === 'x'
    ? [B(at - 0.05, -0.03, z - 0.05, w + 0.1, 0.03, h + 0.1, '#e8e0d0'), B(at, -0.02, z, w, 0.03, h, '#8fc3e8', true), B(at + w / 2 - 0.02, -0.01, z, 0.04, 0.03, h, '#e8e0d0')]
    : [B(-0.03, at - 0.05, z - 0.05, 0.03, w + 0.1, h + 0.1, '#e8e0d0'), B(-0.02, at, z, 0.03, w, h, '#8fc3e8', true)];
}
function painting(along: 'x' | 'y', at: number, z: number, c: string): Drawable[] {
  return along === 'x'
    ? [B(at - 0.04, -0.03, z - 0.04, 0.58, 0.03, 0.48, '#c9a45c'), B(at, -0.02, z, 0.5, 0.03, 0.4, c)]
    : [B(-0.03, at - 0.04, z - 0.04, 0.03, 0.58, 0.48, '#c9a45c'), B(-0.02, at, z, 0.03, 0.5, 0.4, c)];
}

type Recipe = (w: number, d: number, z: number, accent: string) => Drawable[];
const p = (name: string, x: number, y: number, z: number, c = '#b5523f') => PROPS[name](x, y, z, c);

/** Hand-placed layouts for the main sets; others fall back to themed procedural props. */
const RECIPES: Record<string, Recipe> = {
  apartment: (_w, _d, z, a) => [...wallWindow('x', 0.6, 0.9), ...painting('y', 0.7, 1.0, '#e07b5f'), ...p('rug', 0.3, 0.6, z, '#d8c7a8'), ...p('sofa', 0.35, 0.05, z, a === '#5c7fa3' ? '#b5523f' : a), ...p('table', 0.6, 0.95, z), ...p('lamp', 1.62, 0.1, z), ...p('plant', 0.05, 1.65, z)],
  suburbanHouse: (_w, _d, z) => [...wallWindow('x', 0.5, 0.9), ...painting('y', 0.6, 1.0, '#7a9e7e'), ...p('armchair', 0.2, 0.05, z, '#7a9e7e'), ...p('armchair', 1.1, 0.05, z, '#7a9e7e'), ...p('table', 0.7, 0.85, z), ...p('bookshelf', 0.05, 1.0, z), ...p('lamp', 1.7, 1.6, z)],
  office: (_w, _d, z) => [...wallWindow('x', 0.4, 0.9, 1.1), ...wallWindow('x', 1.8, 0.9, 0.9), ...p('desk', 0.2, 0.1, z), ...p('desk', 1.6, 0.1, z), ...p('plant', 2.6, 1.5, z), ...p('bookshelf', 0.05, 1.2, z)],
  diner: (_w, _d, z) => [...wallWindow('x', 0.3, 0.8, 1.3), ...p('counter', 0.2, 1.8, z, '#9fd0c9'), ...p('stool', 0.4, 2.3, z), ...p('stool', 0.9, 2.3, z), ...p('stool', 1.4, 2.3, z), ...p('table', 0.6, 0.4, z), ...p('lamp', 1.6, 0.1, z)],
  bar: (_w, _d, z) => [...painting('x', 0.6, 1.0, '#d9a441'), ...p('counter', 0.15, 0.1, z, '#4a3a35'), ...p('stool', 0.4, 0.75, z), ...p('stool', 0.9, 0.75, z), ...p('stool', 1.4, 0.75, z), ...p('barrel', 1.6, 2.4, z), ...p('lamp', 0.1, 2.5, z)],
  warehouse: (w, d, z) => [...p('crate', 0.2, 0.2, z), ...p('crate', 0.2, 0.62, z), ...p('crate', 0.2, 0.41, z + 0.4), ...p('barrel', 3.4, 0.3, z), ...p('barrel', 3.1, 0.3, z), ...p('crate', w - 0.7, d - 0.8, z), ...p('streetlamp', 2, 0.2, z)],
  cityStreet: (_w, d, z) => [...p('building', -0.2, 0.2, z, '#6b6f78'), ...p('building', -0.2, 1.4, z, '#7d7368'), ...p('building', -0.2, 2.6, z, '#5d6470'), ...p('building', -0.2, 3.8, z, '#7a6c66'), ...p('streetlamp', 1.6, 1, z), ...p('streetlamp', 1.6, 3.6, z), ...p('car', 0.9, d - 1.2, z, '#c0392b')],
  park: (w, d, z) => [...p('tree', 0.3, 0.3, z), ...p('tree', w - 0.8, 0.4, z), ...p('tree', 0.4, d - 0.9, z), ...p('bench', 1.4, 1.2, z), ...p('streetlamp', 2.6, 2.4, z), ...p('rock', w - 0.9, d - 0.8, z)],
  boxingRing: (w, d, z) => {
    const out: Drawable[] = [B(0.4, 0.4, z, w - 0.8, d - 0.8, 0.2, '#2f4f8f')];
    for (const [x, y] of [[0.4, 0.4], [w - 0.48, 0.4], [0.4, d - 0.48], [w - 0.48, d - 0.48]]) out.push(...p('ringpost', x, y, z + 0.2));
    out.push(B(0.4, 0.42, z + 0.75, w - 0.8, 0.02, 0.03, '#c8313a'), B(0.42, 0.4, z + 0.75, 0.02, d - 0.8, 0.03, '#c8313a'));
    return out;
  },
  spaceshipBridge: (w, _d, z) => [...wallWindow('x', 0.5, 0.8, w - 1, 0.9), ...p('console', 0.6, 0.15, z), ...p('console', 0.05, 1.2, z), ...p('armchair', 1.2, 1.3, z, '#3d4757')],
  courtroom: (_w, d, z) => [...p('judge', 0.8, 0.1, z), ...p('bench', 0.3, d - 1.3, z), ...p('bench', 1.6, d - 1.3, z), ...painting('y', 0.8, 1.1, '#4a3426')],
  dojo: (w, _d, z) => [...painting('x', 1.2, 1.0, '#a23b2a'), ...p('rug', 0.5, 0.6, z, '#e7d6a6'), ...p('plant', w - 0.5, 0.2, z), ...p('plant', 0.2, 0.2, z)],
  manor: (_w, _d, z) => [...wallWindow('x', 0.4, 1.0, 0.7, 1.0), ...wallWindow('x', 1.8, 1.0, 0.7, 1.0), ...painting('y', 1, 1.1, '#4f6b4a'), ...p('rug', 0.6, 0.8, z, '#7d2b3a'), ...p('sofa', 0.7, 0.1, z, '#4f6b4a'), ...p('lamp', 2.3, 0.2, z), ...p('bookshelf', 0.05, 2.4, z)],
  hospital: (_w, _d, z) => [...wallWindow('x', 0.3, 0.9), ...p('bed', 0.2, 0.1, z), ...p('plant', 1.6, 2.4, z), ...p('armchair', 1.3, 1.5, z, '#3fa7a0')],
  warField: (w, d, z) => [...p('tent', 0.3, 0.3, z), ...p('tent', 2.5, 0.5, z), ...p('sandbag', 1.2, 4, z), ...p('sandbag', 2.2, 6, z), ...p('rock', 3, 8, z), ...p('tree', 0.3, d - 1.2, z), ...p('crate', w - 0.7, 3, z)],
  chromaStage: (w, d, z) => [...p('chromaLight', w - 0.4, 0.3, z), ...p('chromaLight', 0.3, d - 0.4, z), ...p('crate', 1.3, 1.3, z)],
};

function themedFallback(set: FilmSet, rng: ReturnType<typeof createRng>, z: number): Drawable[] {
  const { w, d } = set.footprint;
  const pool = set.style === 'interior' ? ['sofa', 'table', 'lamp', 'plant', 'bookshelf', 'armchair'] : set.tags.includes('future') ? ['crate', 'rock', 'barrel'] : ['tree', 'rock', 'crate', 'streetlamp'];
  const n = Math.max(2, Math.round(w * d * (set.style === 'interior' ? 0.35 : 0.25)));
  const out: Drawable[] = [];
  for (let i = 0; i < n; i++) out.push(...p(rng.pick(pool), rng.int(0, w - 1) + 0.15, rng.int(0, d - 1) + 0.15, z, set.palette.accent));
  if (set.style === 'interior') out.push(...wallWindow('x', Math.min(0.6, w - 1), 0.9));
  return out;
}

// ---------------- Scene assembly ----------------

function buildScene(set: FilmSet, extras: number, actors: StageActor[], acting: Set<string>, studio: boolean) {
  const rng = createRng(hashString(set.id));
  const { w, d } = set.footprint;
  const slab = 0.3;
  const out: Drawable[] = [];

  for (let x = 0; x < w; x++)
    for (let y = 0; y < d; y++) out.push(B(x, y, 0, 1, 1, slab, shade(set.palette.floor, (x + y) % 2 ? 0.93 : 1)));

  if (set.style !== 'exterior') {
    const wall = set.palette.wall ?? set.palette.floor;
    const H = set.style === 'chroma' ? 2.8 : 2.3;
    for (let x = 0; x < w; x++) out.push(B(x, -0.15, 0, 1, 0.15, H, wall), B(x, -0.01, slab, 1, 0.02, 0.12, shade(wall, 0.75)));
    for (let y = 0; y < d; y++) out.push(B(-0.15, y, 0, 0.15, 1, H, shade(wall, 0.92)), B(-0.01, y, slab, 0.02, 1, 0.12, shade(wall, 0.7)));
  }

  out.push(...(RECIPES[set.id]?.(w, d, slab, set.palette.accent) ?? themedFallback(set, rng, slab)));

  // Crowd extras: tiny two-cube figures, kept off the actors' line.
  const shown = Math.min(extras, w * d * 5);
  for (let i = 0; i < shown; i++) {
    const ex = rng.next() * (w - 0.2), ey = rng.next() * (d - 0.2);
    const tone = rng.pick(['#c0392b', '#2e86c1', '#d4ac0d', '#7d3c98', '#5d6d7e', '#ca6f1e']);
    out.push(B(ex, ey, slab, 0.12, 0.12, 0.26, tone), B(ex + 0.02, ey + 0.02, slab + 0.26, 0.09, 0.09, 0.09, '#e8c39e'));
  }

  // Actors stand on a line across the front half of the set.
  const spots = actors.map((a, i) => {
    const t = (i + 1) / (actors.length + 1);
    return { a, x: Math.max(0.3, w * t * 0.9 + 0.2), y: Math.min(d - 0.4, d * 0.62 + (i % 2) * 0.25) };
  });
  for (const s of spots) out.push({ kind: 'figure', x: s.x, y: s.y, z: slab, actor: s.a, acting: acting.has(s.a.id) });

  if (studio) {
    // Light stands with beams, a camera on a dolly track, the director's chair.
    const lights: [number, number][] = [[w + 0.8, -0.4], [-0.6, d + 0.6]];
    for (const [lx, ly] of lights) {
      out.push(B(lx, ly, 0, 0.06, 0.06, 2.6, '#2b2f36'), B(lx - 0.15, ly - 0.15, 2.6, 0.36, 0.36, 0.28, '#1f2329'));
      out.push({ kind: 'cone', from: [lx + 0.03, ly + 0.03, 2.6], to: [w / 2, d / 2, slab], spread: 1.4 });
    }
    const cx = w + 0.9, cy = d * 0.55 + 0.6;
    out.push(B(cx - 0.6, cy - 1, 0, 0.05, 2.4, 0.04, '#5c5f66'), B(cx - 0.2, cy - 1, 0, 0.05, 2.4, 0.04, '#5c5f66'));
    out.push(B(cx - 0.45, cy - 0.1, 0, 0.06, 0.06, 0.9, '#2b2f36'), B(cx - 0.75, cy - 0.3, 0.9, 0.55, 0.4, 0.35, '#202328'), B(cx - 0.95, cy - 0.15, 1.0, 0.22, 0.12, 0.14, '#3a3f47'));
    const chx = w * 0.4, chy = d + 0.7;
    out.push(B(chx, chy, 0, 0.45, 0.4, 0.38, '#8a5a32'), B(chx, chy + 0.02, 0.38, 0.45, 0.36, 0.04, '#1f1f1f'), B(chx, chy - 0.02, 0.4, 0.45, 0.06, 0.4, '#1f1f1f'));
  }

  const depth = (o: Drawable) => {
    if (o.kind === 'figure') return o.x + o.y + 0.05;
    if (o.kind === 'glow') return -1000;
    if (o.kind === 'cone') return 1000;
    return o.x + o.w / 2 + o.y + o.d / 2 + o.z * 0.01;
  };
  return { drawables: out.sort((a, b) => depth(a) - depth(b)), spots, slab };
}

// ---------------- Rendering ----------------

function BoxView({ b }: { b: Box }) {
  const { x, y, z, w, d, h } = b;
  const top = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)].join(' ');
  const left = [P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)].join(' ');
  const right = [P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)].join(' ');
  return (
    <g strokeWidth={0.35} stroke="rgba(0,0,0,0.22)" strokeLinejoin="round">
      <polygon points={left} fill={b.glow ? b.color : shade(b.color, 0.8)} />
      <polygon points={right} fill={b.glow ? shade(b.color, 0.9) : shade(b.color, 0.64)} />
      <polygon points={top} fill={b.glow ? shade(b.color, 1.1) : b.color} />
    </g>
  );
}

/** Actors are drawn larger than real scale so they read at a glance (as in the concept art). */
const FIG = 1.6;
function FigureView({ f }: { f: Figure }) {
  const { x, y, z, actor } = f;
  const s = FIG;
  const parts = [
    B(x, y, z, 0.2 * s, 0.14 * s, 0.32 * s, '#2d2a33'),
    B(x - 0.02 * s, y - 0.02 * s, z + 0.32 * s, 0.24 * s, 0.18 * s, 0.34 * s, actor.shirt),
    B(x + 0.01 * s, y, z + 0.66 * s, 0.18 * s, 0.16 * s, 0.18 * s, actor.skin),
    B(x, y - 0.01 * s, z + 0.82 * s, 0.2 * s, 0.18 * s, 0.06 * s, actor.hair),
    B(x, y - 0.03 * s, z + 0.7 * s, 0.2 * s, 0.05 * s, 0.14 * s, actor.hair),
  ];
  const [e1x, e1y] = project(x + 0.06 * s, y + 0.16 * s, z + 0.76 * s);
  const [e2x, e2y] = project(x + 0.13 * s, y + 0.16 * s, z + 0.76 * s);
  return (
    <g className={`iso-figure ${f.acting ? 'acting' : ''}`}>
      <ellipse cx={project(x + 0.1 * s, y + 0.07 * s, z)[0]} cy={project(x + 0.1 * s, y + 0.07 * s, z)[1]} rx={7 * s} ry={3.2 * s} fill="rgba(0,0,0,0.25)" />
      {parts.map((b, i) => <BoxView key={i} b={b} />)}
      <circle cx={e1x} cy={e1y} r={1.3} fill="#1d1d1d" />
      <circle cx={e2x} cy={e2y} r={1.3} fill="#1d1d1d" />
    </g>
  );
}

const BUBBLE_FILL: Record<Meter, string> = { pace: '#ee6c4d', chemistry: '#e86a9a', dialogue: '#4f86c6' };
function BubbleIcon({ meter }: { meter: Meter }) {
  if (meter === 'pace') return <path d="M1 -6 L-4 1 H0 L-1 6 L4 -1 H0 Z" fill="#fff" />;
  if (meter === 'chemistry') return <path d="M0 5 C-5 1 -6 -1 -6 -3 A3 3 0 0 1 0 -4 A3 3 0 0 1 6 -3 C6 -1 5 1 0 5 Z" fill="#fff" />;
  return <path d="M-6 -4 H6 V3 H-1 L-4 6 V3 H-6 Z" fill="#fff" />;
}

export function IsoSet({
  set, extras = 0, height = 150, actors = [], acting = [], bubbles = [], studio = false,
}: {
  set: FilmSet; extras?: number; height?: number; actors?: StageActor[]; acting?: string[]; bubbles?: StageBubble[]; studio?: boolean;
}) {
  const actingKey = acting.join(',');
  const scene = useMemo(
    () => buildScene(set, extras, actors, new Set(acting), studio),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [set, extras, actors.map((a) => a.id).join(','), actingKey, studio],
  );
  const { w, d } = set.footprint;
  const pad = studio ? 1.6 : 0.3;
  const minX = project(0, d + pad, 0)[0] - HALF, maxX = project(w + pad, 0, 0)[0] + HALF;
  const minY = project(-pad, -pad, studio ? 3.2 : 3)[1] - 6, maxY = project(w + pad, d + pad, 0)[1] + 6;
  const spotOf = (id?: string) => scene.spots.find((s) => s.a.id === id) ?? scene.spots[0];

  return (
    <svg className="iso-set" viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} style={{ height, width: '100%' }} role="img"
      aria-label={`${set.name}, ${w}×${d} ${set.style} set`}>
      <defs>
        <radialGradient id="glow"><stop offset="0" stopColor="#ffd27a" stopOpacity="0.55" /><stop offset="1" stopColor="#ffd27a" stopOpacity="0" /></radialGradient>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6d6" stopOpacity="0.35" /><stop offset="1" stopColor="#fff6d6" stopOpacity="0" /></linearGradient>
      </defs>
      {scene.drawables.map((o, i) => {
        if (o.kind === 'figure') return <FigureView key={i} f={o} />;
        if (o.kind === 'glow') {
          const [gx, gy] = project(o.x, o.y, o.z);
          return <ellipse key={i} cx={gx} cy={gy} rx={o.r * HALF} ry={o.r * HALF * 0.7} fill="url(#glow)" />;
        }
        if (o.kind === 'cone') {
          const [fx, fy] = project(...o.from);
          const [tx, ty] = project(...o.to);
          const s = o.spread * HALF;
          return <polygon key={i} points={`${fx},${fy} ${tx - s},${ty} ${tx + s},${ty}`} fill="url(#beam)" className="light-beam" />;
        }
        return <BoxView key={i} b={o} />;
      })}
      {bubbles.map((b) => {
        const s = spotOf(b.actorId);
        if (!s) return null;
        // Spread simultaneous bubbles so they don't stack on one spot.
        const hsh = hashString(b.key);
        const jx = ((hsh % 11) - 5) * 6;
        const jy = -((hsh >>> 4) % 4) * 9;
        const [bx, by] = project(s.x + 0.16, s.y + 0.1, scene.slab + 1.65);
        return (
          <g key={b.key} className="iso-bubble" transform={`translate(${bx + jx} ${by + jy})`}>
            <g className="iso-bubble-inner">
              <path d="M-15 -11 H15 A4 4 0 0 1 19 -7 V5 A4 4 0 0 1 15 9 H3 L0 14 L-3 9 H-15 A4 4 0 0 1 -19 5 V-7 A4 4 0 0 1 -15 -11 Z" fill={BUBBLE_FILL[b.meter]} stroke="#fff" strokeWidth="1.2" />
              <g transform="translate(-10 -1) scale(0.8)"><BubbleIcon meter={b.meter} /></g>
              <text x="5" y="3" textAnchor="middle" fontSize="9" fontWeight="800" fill="#fff">+{b.value}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

/** Colours for a stage figure derived from the actor's face (same palette as Face). */
export function stageActorFor(actor: { id: string; name: string; age: string }): StageActor {
  const r = createRng(hashString(actor.id + actor.name));
  const skin = r.pick(['#f6d3b3', '#eebb94', '#d9a066', '#b97a4a', '#8d5a3b', '#5e3b26']);
  const hair = actor.age === 'veteran' && r.chance(0.7) ? '#b8b8b8' : r.pick(['#2b1d14', '#5a3a22', '#a0662d', '#d9b45a', '#c0392b', '#1c1c1c', '#6d4c41']);
  const shirt = ['#c0392b', '#2e86c1', '#e1a23b', '#7d3c98', '#3f8f5b', '#d65c7a', '#34495e'][hashString(actor.id) % 7];
  return { id: actor.id, skin, hair, shirt };
}
