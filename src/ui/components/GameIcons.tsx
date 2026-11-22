// Game icons: line glyphs drawn on a 24×24 grid, shown on their own or on a gold medallion.
// They replace emoji, which render differently on every device and look cheap.

import type { ReactNode } from 'react';

const sw = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const GLYPHS = {
  // Roles
  hero: <><path d="M12 3 L14.6 8.3 L20.4 9.1 L16.2 13.2 L17.2 19 L12 16.3 L6.8 19 L7.8 13.2 L3.6 9.1 L9.4 8.3 Z" {...sw} /><circle cx="12" cy="11.5" r="1.6" fill="currentColor" /></>,
  villain: <><path d="M5 4 L8 9 M19 4 L16 9" {...sw} /><path d="M5 10 Q12 6 19 10 V13 Q19 20 12 20 Q5 20 5 13 Z" {...sw} /><path d="M8.5 13 L10.8 14.2 M15.5 13 L13.2 14.2 M10 17 Q12 16 14 17" {...sw} /></>,
  coVillain: <><path d="M4 9 Q12 4 20 9 L18 17 Q12 21 6 17 Z" {...sw} /><path d="M8 11.5 H10.5 M13.5 11.5 H16 M9.5 15.5 H14.5" {...sw} /></>,
  romance: <path d="M12 20 C4 14 3 10 4.5 7 C6 4.5 9.5 4.5 12 7.5 C14.5 4.5 18 4.5 19.5 7 C21 10 20 14 12 20 Z" {...sw} />,
  comic: <><path d="M4 10 Q6 4 12 4 Q18 4 20 10 L17 8 L15 11 L12 7.5 L9 11 L7 8 Z" {...sw} /><circle cx="12" cy="15" r="5" {...sw} /><path d="M9.8 15.8 Q12 18 14.2 15.8" {...sw} /></>,
  supporting: <><circle cx="12" cy="8" r="3.6" {...sw} /><path d="M5 20 Q5 13.5 12 13.5 Q19 13.5 19 20" {...sw} /></>,
  // Collection and studio
  star: <path d="M12 3 L14.6 8.3 L20.4 9.1 L16.2 13.2 L17.2 19 L12 16.3 L6.8 19 L7.8 13.2 L3.6 9.1 L9.4 8.3 Z" {...sw} />,
  clapper: <><rect x="4" y="10" width="16" height="10" rx="1.5" {...sw} /><path d="M4 10 L5.5 5 L19.5 5 L20 10 M8.5 5 L7.5 10 M13 5 L12 10 M17.5 5 L16.5 10" {...sw} /></>,
  building: <><path d="M3 20 H21 M5 20 V9 L12 4 L19 9 V20" {...sw} /><path d="M9 20 V13 H15 V20 M8 10 H9 M15 10 H16" {...sw} /></>,
  sliders: <><path d="M6 4 V20 M12 4 V20 M18 4 V20" {...sw} /><rect x="4" y="13" width="4" height="3" rx="1" fill="currentColor" /><rect x="10" y="7" width="4" height="3" rx="1" fill="currentColor" /><rect x="16" y="15" width="4" height="3" rx="1" fill="currentColor" /></>,
  // Production
  clock: <><circle cx="12" cy="12" r="8.5" {...sw} /><path d="M12 7 V12 L15.5 14" {...sw} /></>,
  calendar: <><rect x="4" y="5.5" width="16" height="14.5" rx="2" {...sw} /><path d="M4 10 H20 M8.5 3.5 V7.5 M15.5 3.5 V7.5" {...sw} /></>,
  film: <><rect x="4" y="4" width="16" height="16" rx="2" {...sw} /><path d="M8 4 V20 M16 4 V20 M4 9 H8 M4 15 H8 M16 9 H20 M16 15 H20" {...sw} /></>,
  sweat: <><circle cx="11" cy="13" r="7" {...sw} /><path d="M8 12 H10 M12 12 H14 M8.5 16 Q11 14.5 13.5 16" {...sw} /><path d="M18.5 3.5 Q20.5 6.5 18.5 8 Q16.5 6.5 18.5 3.5 Z" fill="currentColor" /></>,
  heart: <path d="M12 20 C4 14 3 10 4.5 7 C6 4.5 9.5 4.5 12 7.5 C14.5 4.5 18 4.5 19.5 7 C21 10 20 14 12 20 Z" fill="currentColor" />,
  coins: <><ellipse cx="12" cy="7" rx="7" ry="3" {...sw} /><path d="M5 7 V12 Q5 15 12 15 Q19 15 19 12 V7 M5 12 V17 Q5 20 12 20 Q19 20 19 17 V12" {...sw} /></>,
  sparkle: <path d="M12 3 Q13 10 20 12 Q13 14 12 21 Q11 14 4 12 Q11 10 12 3 Z" {...sw} />,
  speaker: <><path d="M4 9.5 H8 L13 5 V19 L8 14.5 H4 Z" {...sw} /><path d="M16.5 9 Q18.5 12 16.5 15 M19 6.5 Q22.5 12 19 17.5" {...sw} /></>,
  target: <><circle cx="12" cy="12" r="8.5" {...sw} /><circle cx="12" cy="12" r="4.5" {...sw} /><circle cx="12" cy="12" r="1.3" fill="currentColor" /></>,
  book: <><path d="M12 6.5 Q8 4 4 5 V19 Q8 18 12 20 Q16 18 20 19 V5 Q16 4 12 6.5 Z" {...sw} /><path d="M12 6.5 V20" {...sw} /></>,
  glass: <><path d="M5 4 H19 L12 12 Z" {...sw} /><path d="M12 12 V20 M8 20 H16" {...sw} /><circle cx="15.5" cy="6" r="1" fill="currentColor" /></>,
  rest: <><path d="M4 18 Q8 12 13 12 Q20 12 20 18 Z" {...sw} /><path d="M14 4 H18 L14 8.5 H18" {...sw} /></>,
  bolt: <path d="M13 3 L5 13.5 H11 L10 21 L19 9.5 H13 Z" {...sw} />,
  speech: <path d="M4 5 H20 V15 H11 L6.5 19 V15 H4 Z" {...sw} />,
  plus: <path d="M12 5 V19 M5 12 H19" {...sw} strokeWidth={2.4} />,
  lock: <><rect x="5" y="10.5" width="14" height="9.5" rx="2" {...sw} /><path d="M8 10.5 V7.5 Q8 4 12 4 Q16 4 16 7.5 V10.5" {...sw} /></>,
  music: <><path d="M9 17 V5.5 L19 3.5 V15" {...sw} /><circle cx="6.5" cy="17.5" r="2.5" {...sw} /><circle cx="16.5" cy="15.5" r="2.5" {...sw} /></>,
  up: <path d="M12 5 L19 13 H14.5 V19 H9.5 V13 H5 Z" {...sw} />,
  down: <path d="M12 19 L19 11 H14.5 V5 H9.5 V11 H5 Z" {...sw} />,
  // Tones (scenes)
  happy: <><circle cx="12" cy="12" r="8.5" {...sw} /><path d="M8.5 10 H9.5 M14.5 10 H15.5 M8 14 Q12 18 16 14" {...sw} /></>,
  sad: <><circle cx="12" cy="12" r="8.5" {...sw} /><path d="M8.5 10 H9.5 M14.5 10 H15.5 M8 17 Q12 13.5 16 17" {...sw} /></>,
  thrill: <path d="M13 3 L5 13.5 H11 L10 21 L19 9.5 H13 Z" {...sw} />,
  calm: <><path d="M3 15 Q7.5 11 12 15 T21 15" {...sw} /><path d="M3 10 Q7.5 6 12 10 T21 10" {...sw} /></>,
  romantic: <path d="M12 20 C4 14 3 10 4.5 7 C6 4.5 9.5 4.5 12 7.5 C14.5 4.5 18 4.5 19.5 7 C21 10 20 14 12 20 Z" {...sw} />,
  scary: <><path d="M5 20 V11 Q5 4 12 4 Q19 4 19 11 V20 L16.5 18 L14 20 L12 18 L10 20 L7.5 18 Z" {...sw} /><circle cx="9.5" cy="11" r="1.2" fill="currentColor" /><circle cx="14.5" cy="11" r="1.2" fill="currentColor" /></>,
} satisfies Record<string, ReactNode>;

export type GlyphName = keyof typeof GLYPHS;

export function Glyph({ name, size = 22, className }: { name: GlyphName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`glyph ${className ?? ''}`} aria-hidden="true">
      {GLYPHS[name]}
    </svg>
  );
}

/** A glyph on a gold coin: the game's icon style for actions, stats and collection tiles. */
export function Medallion({ name, size = 44, tone = 'gold', className }: { name: GlyphName; size?: number; tone?: 'gold' | 'ruby' | 'dark' | 'muted'; className?: string }) {
  return (
    <span className={`medallion m-${tone} ${className ?? ''}`} style={{ width: size, height: size }} aria-hidden="true">
      <Glyph name={name} size={Math.round(size * 0.56)} />
    </span>
  );
}
