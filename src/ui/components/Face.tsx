// Actor portrait: one cell of a commissioned 6×6 face sheet (public/art/faces-*.webp),
// picked by the engine (portraits.ts) from gender, age and strongest skill, or by name for
// the famous parodies. Rendered as SVG so it also works inside the SVG posters.

import { useId } from 'react';
import type { Actor } from '../../engine/types';
import { SHEET_SIZE, parsePortrait, portraitOf } from '../../engine/portraits';
import { faceSheet } from '../art';

export function Face({ actor, size = 72 }: { actor: Actor; size?: number }) {
  const clip = `face${useId().replace(/:/g, '')}`;
  const cell = parsePortrait(portraitOf(actor)) ?? { sheet: 'adult' as const, row: 0, col: 5 };
  const full = 100 * SHEET_SIZE;
  return (
    <svg className="face" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={actor.name}>
      <clipPath id={clip}><circle cx={50} cy={50} r={50} /></clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect width={100} height={100} fill="#f3e4c8" />
        <image href={faceSheet(cell.sheet)} x={-cell.col * 100} y={-cell.row * 100} width={full} height={full} preserveAspectRatio="none" />
      </g>
    </svg>
  );
}
