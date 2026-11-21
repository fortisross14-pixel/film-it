// Low-poly isometric diorama for a set: a slab of cubes (footprint w × d),
// back walls for interiors, a green cyclorama for chroma stages, simple props
// and optional crowd extras. Pure SVG, deterministic per set id.

import { useMemo } from 'react';
import type { FilmSet } from '../../engine/types';
import { createRng } from '../../engine/rng';

const HALF = 16; // half-width of one cube in px; height of one unit = HALF

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)));
  const r = c((n >> 16) & 255), g = c((n >> 8) & 255), b = c(n & 255);
  return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
}

const project = (x: number, y: number, z: number): [number, number] => [(x - y) * HALF, (x + y) * (HALF / 2) - z * HALF];

interface Box { x: number; y: number; z: number; w: number; d: number; h: number; color: string }

function boxFaces(b: Box) {
  const P = (x: number, y: number, z: number) => project(x, y, z).join(',');
  const { x, y, z, w, d, h } = b;
  return {
    top: [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)].join(' '),
    left: [P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)].join(' '),
    right: [P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)].join(' '),
  };
}

function buildScene(set: FilmSet, extras: number): Box[] {
  const rng = createRng(hashString(set.id));
  const { w, d } = set.footprint;
  const boxes: Box[] = [];
  const slab = 0.3;

  // Floor: one low-poly cube per cell, alternating tone.
  for (let x = 0; x < w; x++)
    for (let y = 0; y < d; y++)
      boxes.push({ x, y, z: 0, w: 1, d: 1, h: slab, color: shade(set.palette.floor, (x + y) % 2 ? 0.92 : 1) });

  // Walls along the two back edges for interiors and chroma.
  if (set.style !== 'exterior') {
    const wall = set.palette.wall ?? set.palette.floor;
    const H = set.style === 'chroma' ? 2.6 : 2.2;
    for (let x = 0; x < w; x++) boxes.push({ x, y: -0.15, z: 0, w: 1, d: 0.15, h: H, color: wall });
    for (let y = 0; y < d; y++) boxes.push({ x: -0.15, y, z: 0, w: 0.15, d: 1, h: H, color: shade(wall, 0.95) });
  }

  // Props.
  const cells = w * d;
  const propCount = set.style === 'chroma' ? 2 : Math.max(2, Math.round(cells * (set.style === 'interior' ? 0.5 : 0.25)));
  for (let i = 0; i < propCount; i++) {
    const px = rng.int(0, w - 1) + 0.15 + rng.next() * 0.3;
    const py = rng.int(0, d - 1) + 0.15 + rng.next() * 0.3;
    if (set.style === 'chroma') {
      // Mark-up crates and a light stand.
      boxes.push({ x: px, y: py, z: slab, w: 0.4, d: 0.4, h: 0.4, color: '#1f7a33' });
    } else if (set.style === 'interior') {
      const fw = 0.3 + rng.next() * 0.4, fd = 0.3 + rng.next() * 0.3, fh = 0.25 + rng.next() * 0.6;
      boxes.push({ x: px, y: py, z: slab, w: fw, d: fd, h: fh, color: rng.chance(0.5) ? set.palette.accent : shade(set.palette.floor, 0.6) });
    } else if (rng.chance(0.55)) {
      // Tree: trunk + crown.
      boxes.push({ x: px + 0.15, y: py + 0.15, z: slab, w: 0.15, d: 0.15, h: 0.5, color: '#6b4a2b' });
      boxes.push({ x: px, y: py, z: slab + 0.5, w: 0.45, d: 0.45, h: 0.55, color: shade(set.palette.accent, 1.1) });
    } else {
      boxes.push({ x: px, y: py, z: slab, w: 0.35, d: 0.3, h: 0.25, color: shade(set.palette.accent, 0.8) });
    }
  }

  // Crowd extras: tiny two-cube figures.
  const shown = Math.min(extras, cells * 6);
  for (let i = 0; i < shown; i++) {
    const ex = rng.next() * (w - 0.2), ey = rng.next() * (d - 0.2);
    const tone = rng.pick(['#c0392b', '#2e86c1', '#d4ac0d', '#7d3c98', '#5d6d7e', '#ca6f1e']);
    boxes.push({ x: ex, y: ey, z: slab, w: 0.14, d: 0.14, h: 0.3, color: tone });
    boxes.push({ x: ex + 0.02, y: ey + 0.02, z: slab + 0.3, w: 0.1, d: 0.1, h: 0.1, color: '#e8c39e' });
  }

  // Painter's order: far first.
  return boxes.sort((a, b) => a.x + a.w / 2 + a.y + a.d / 2 + a.z * 0.01 - (b.x + b.w / 2 + b.y + b.d / 2 + b.z * 0.01));
}

export function IsoSet({ set, extras = 0, height = 150 }: { set: FilmSet; extras?: number; height?: number }) {
  const boxes = useMemo(() => buildScene(set, extras), [set, extras]);
  const { w, d } = set.footprint;
  // Bounds of the projected footprint plus wall height.
  const minX = project(0, d, 0)[0] - HALF, maxX = project(w, 0, 0)[0] + HALF;
  const minY = project(0, 0, 3)[1] - 4, maxY = project(w, d, 0)[1] + 4;
  return (
    <svg
      className="iso-set"
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      style={{ height, width: '100%' }}
      role="img"
      aria-label={`${set.name}, ${w}×${d} ${set.style} set`}
    >
      {boxes.map((b, i) => {
        const f = boxFaces(b);
        return (
          <g key={i} strokeWidth={0.4} stroke="rgba(0,0,0,0.25)" strokeLinejoin="round">
            <polygon points={f.left} fill={shade(b.color, 0.8)} />
            <polygon points={f.right} fill={shade(b.color, 0.65)} />
            <polygon points={f.top} fill={b.color} />
          </g>
        );
      })}
    </svg>
  );
}
