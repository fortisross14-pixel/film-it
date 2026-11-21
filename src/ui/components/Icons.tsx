// Inline SVG icons. Placeholder art until commissioned icons arrive; each takes `size`.
import type { ReactElement } from 'react';

type P = { size?: number; className?: string; title?: string };
const S = (size: number, body: ReactElement, title?: string, className?: string, vb = '0 0 24 24') => (
  <svg width={size} height={size} viewBox={vb} className={`icon ${className ?? ''}`} role={title ? 'img' : 'presentation'} aria-label={title} aria-hidden={title ? undefined : true}>
    {body}
  </svg>
);

/** Critics: a tomato. */
export const Tomato = ({ size = 24, className, title }: P) =>
  S(size, <>
    <circle cx="12" cy="14" r="8" fill="#e2412f" />
    <ellipse cx="9" cy="11.5" rx="2.2" ry="1.4" fill="#ff8a73" opacity="0.7" />
    <path d="M12 6 L9 3.5 L12 5 L14 2.8 L13.5 5.5 L17 5 L13 7.2 Z" fill="#3c9a3c" />
  </>, title, className);

/** Audience: a popcorn bucket. */
export const Popcorn = ({ size = 24, className, title }: P) =>
  S(size, <>
    <circle cx="8" cy="7" r="3" fill="#fff3d1" /><circle cx="12" cy="5.5" r="3.2" fill="#fff8e3" /><circle cx="16" cy="7" r="3" fill="#fff3d1" />
    <path d="M5 9 L19 9 L17 22 L7 22 Z" fill="#fff" />
    <path d="M7.5 9 L9 22 M12 9 L12 22 M16.5 9 L15 22" stroke="#d6362f" strokeWidth="2" />
  </>, title, className);

export const Clapper = ({ size = 24, className, title }: P) =>
  S(size, <>
    <rect x="3" y="10" width="18" height="11" rx="1.5" fill="currentColor" />
    <path d="M3 6.5 L20 3 L21 7 L4 10.5 Z" fill="currentColor" />
    <path d="M7 5.7 L9 9.6 M11.5 4.8 L13.5 8.7 M16 3.9 L18 7.8" stroke="var(--icon-cut, #f4e9d8)" strokeWidth="1.6" />
  </>, title, className);

export const Reel = ({ size = 24, className, title }: P) =>
  S(size, <>
    <circle cx="12" cy="12" r="10" fill="currentColor" />
    {[0, 72, 144, 216, 288].map((a) => (
      <circle key={a} cx={12 + 5.2 * Math.cos((a * Math.PI) / 180)} cy={12 + 5.2 * Math.sin((a * Math.PI) / 180)} r="2.3" fill="var(--icon-cut, #1c1714)" />
    ))}
    <circle cx="12" cy="12" r="1.4" fill="var(--icon-cut, #1c1714)" />
  </>, title, className);

export const Trophy = ({ size = 24, className, title }: P) =>
  S(size, <>
    <path d="M7 3 H17 V9 A5 5 0 0 1 7 9 Z" fill="#e3b341" />
    <path d="M7 5 H4 V7 A3 3 0 0 0 7 10 M17 5 H20 V7 A3 3 0 0 1 17 10" fill="none" stroke="#e3b341" strokeWidth="1.6" />
    <rect x="10.8" y="13.5" width="2.4" height="4" fill="#c9952c" />
    <rect x="7.5" y="17.5" width="9" height="3" rx="0.8" fill="#8a5a1c" />
  </>, title, className);

export const Ticket = ({ size = 24, className, title }: P) =>
  S(size, <>
    <path d="M3 7 H21 V10 A2 2 0 0 0 21 14 V17 H3 V14 A2 2 0 0 0 3 10 Z" fill="#e3b341" />
    <path d="M12 9.2 L12.9 11.2 L15 11.4 L13.4 12.8 L13.9 14.9 L12 13.8 L10.1 14.9 L10.6 12.8 L9 11.4 L11.1 11.2 Z" fill="#8a5a1c" />
  </>, title, className);

export const Star = ({ size = 24, className, title }: P) =>
  S(size, <path d="M12 2.5 L14.9 8.6 L21.5 9.4 L16.6 13.9 L17.9 20.5 L12 17.2 L6.1 20.5 L7.4 13.9 L2.5 9.4 L9.1 8.6 Z" fill="currentColor" />, title, className);

export const Calendar = ({ size = 24, className, title }: P) =>
  S(size, <>
    <rect x="3" y="5" width="18" height="16" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M3 10 H21 M8 3 V7 M16 3 V7" stroke="currentColor" strokeWidth="2" />
  </>, title, className);

export const Coins = ({ size = 24, className, title }: P) =>
  S(size, <>
    <ellipse cx="12" cy="7" rx="7" ry="3" fill="currentColor" />
    <path d="M5 7 V11 A7 3 0 0 0 19 11 V7" fill="currentColor" opacity="0.8" />
    <path d="M5 11 V15 A7 3 0 0 0 19 15 V11" fill="currentColor" opacity="0.6" />
  </>, title, className);

export const People = ({ size = 24, className, title }: P) =>
  S(size, <>
    <circle cx="8" cy="8" r="3.2" fill="currentColor" /><circle cx="16.5" cy="8.5" r="2.7" fill="currentColor" opacity="0.75" />
    <path d="M2 20 A6 6 0 0 1 14 20 Z" fill="currentColor" /><path d="M12.5 20 A4.5 4.5 0 0 1 22 20 Z" fill="currentColor" opacity="0.75" />
  </>, title, className);

/** Meter icons used on bubbles and meters. */
export const Bolt = ({ size = 24, className, title }: P) => S(size, <path d="M13 2 L4 14 H11 L10 22 L20 9 H13 Z" fill="currentColor" />, title, className);
export const Heart = ({ size = 24, className, title }: P) =>
  S(size, <path d="M12 21 C5 15.5 2 12.5 2 8.5 A4.8 4.8 0 0 1 12 6 A4.8 4.8 0 0 1 22 8.5 C22 12.5 19 15.5 12 21 Z" fill="currentColor" />, title, className);
export const Speech = ({ size = 24, className, title }: P) =>
  S(size, <path d="M4 4 H20 A2 2 0 0 1 22 6 V15 A2 2 0 0 1 20 17 H10 L5 21 V17 H4 A2 2 0 0 1 2 15 V6 A2 2 0 0 1 4 4 Z M6 9 H18 M6 12.5 H14" fill="currentColor" stroke="var(--icon-cut, #fff)" strokeWidth="1.4" />, title, className);

export const Home = ({ size = 24, className, title }: P) =>
  S(size, <path d="M3 11 L12 3 L21 11 V21 H14 V15 H10 V21 H3 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />, title, className);
export const Film = ({ size = 24, className, title }: P) =>
  S(size, <>
    <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M7 3 V21 M17 3 V21 M3 8 H7 M3 12 H7 M3 16 H7 M17 8 H21 M17 12 H21 M17 16 H21" stroke="currentColor" strokeWidth="1.6" />
  </>, title, className);
export const Masks = ({ size = 24, className, title }: P) =>
  S(size, <>
    <path d="M3 4 H13 V10 A5 5 0 0 1 3 10 Z" fill="currentColor" />
    <path d="M11 9 H21 V15 A5 5 0 0 1 11 15 Z" fill="currentColor" opacity="0.7" />
  </>, title, className);
export const Box = ({ size = 24, className, title }: P) =>
  S(size, <path d="M12 2 L21 7 V17 L12 22 L3 17 V7 Z M3 7 L12 12 L21 7 M12 12 V22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />, title, className);
export const Gear = ({ size = 24, className, title }: P) =>
  S(size, <>
    <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M4.9 4.9 L7 7 M17 17 L19.1 19.1 M4.9 19.1 L7 17 M17 7 L19.1 4.9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </>, title, className);

/** Laurel branches either side of a value (studio verdict, awards). */
export function Laurels({ children, size = 120 }: { children: React.ReactNode; size?: number }) {
  const leaf = (x: number, y: number, r: number, flip: boolean) => (
    <ellipse cx={x} cy={y} rx="3" ry="7" transform={`rotate(${flip ? -r : r} ${x} ${y})`} fill="#e3b341" />
  );
  const side = (flip: boolean) => (
    <g transform={flip ? 'translate(100,0) scale(-1,1)' : undefined}>
      <path d="M22 88 C8 70 8 40 22 18" fill="none" stroke="#c9952c" strokeWidth="2" />
      {[[16, 78, 40], [12, 64, 20], [11, 50, 5], [13, 36, -15], [18, 24, -30]].map(([x, y, r], i) => <g key={i}>{leaf(x, y, r, false)}</g>)}
    </g>
  );
  return (
    <span className="laurels" style={{ width: size, height: size * 0.9 }}>
      <svg viewBox="0 0 100 100" aria-hidden="true">{side(false)}{side(true)}</svg>
      <span className="laurels-inner">{children}</span>
    </span>
  );
}
