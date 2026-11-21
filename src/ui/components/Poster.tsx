// Procedural film poster: a background style (motif + palette) plus the poster
// designer's choices — title font/size, director credit, billed star names, a lineup
// of star faces and a frame. Deterministic per seed. Commissioned art can replace the
// background via `art`.
import type { Actor, GenreId, PosterDesign, PosterFont, PosterSize, PosterStyle } from '../../engine/types';
import { createRng } from '../../engine/rng';
import { Face } from './Face';

type Motif = 'scifi' | 'thriller' | 'romance' | 'drama' | 'action' | 'horror' | 'comedy' | 'fantasy';
const STYLE_MOTIF: Record<PosterStyle, Motif> = {
  moon: 'scifi', skyline: 'thriller', sunset: 'romance', haunted: 'horror', confetti: 'comedy', castle: 'fantasy', blast: 'action', portrait: 'drama',
};
export const GENRE_STYLE: Record<GenreId, PosterStyle> = {
  scifi: 'moon', thriller: 'skyline', romance: 'sunset', horror: 'haunted', comedy: 'confetti', fantasy: 'castle', action: 'blast', drama: 'moon',
};
const PAL: Record<Motif, { sky: [string, string]; ground: string; light: string; accent: string }> = {
  scifi: { sky: ['#0f1a33', '#2b3f66'], ground: '#1b2336', light: '#f3ecc8', accent: '#e07b5f' },
  thriller: { sky: ['#140f24', '#3a2b52'], ground: '#1a1426', light: '#f6d36b', accent: '#f6d36b' },
  romance: { sky: ['#f2a07b', '#fbd3a5'], ground: '#9e6a6e', light: '#fff1c9', accent: '#d65c5c' },
  drama: { sky: ['#2c3e57', '#7f8fa6'], ground: '#2a2f3a', light: '#f5deb0', accent: '#f5deb0' },
  action: { sky: ['#3a0f0a', '#e0632d'], ground: '#1b0f0c', light: '#ffd27a', accent: '#ff8a3d' },
  horror: { sky: ['#07110d', '#24382d'], ground: '#0b100d', light: '#cfe6c8', accent: '#d63b3b' },
  comedy: { sky: ['#ffd35c', '#ffef9e'], ground: '#58b368', light: '#ffffff', accent: '#e8505b' },
  fantasy: { sky: ['#2b1846', '#6b4b9a'], ground: '#211433', light: '#f5d88a', accent: '#f5d88a' },
};
export const FONT_FAMILY: Record<PosterFont, string> = {
  classic: "'Playfair Display', Georgia, serif",
  bold: "'Bebas Neue', Impact, sans-serif",
  elegant: "'Great Vibes', cursive",
  scratch: "'Creepster', fantasy",
  playful: "'Fredoka', 'Comic Sans MS', sans-serif",
  future: "'Orbitron', sans-serif",
  epic: "'Cinzel', Georgia, serif",
};
const TITLE_SIZE = { s: 14, m: 19, l: 25 };
const CREDIT_SIZE: Record<PosterSize, number> = { hidden: 0, s: 6.5, m: 9, l: 12 };

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export interface PosterCredits {
  director?: string;
  /** Billed names with their size, in billing order. */
  names?: { name: string; size: PosterSize }[];
  faces?: Actor[];
}

export function Poster({ title, genre, seed, width = 200, art, showTitle = true, design, credits }: {
  title: string; genre: GenreId; seed?: string | number; width?: number; art?: string; showTitle?: boolean;
  design?: Partial<PosterDesign>; credits?: PosterCredits;
}) {
  const h = (width * 3) / 2;
  if (art) return <img src={art} alt={title} width={width} height={h} className="poster" />;
  const style = design?.style ?? GENRE_STYLE[genre];
  const motif = STYLE_MOTIF[style];
  const seedKey = `${seed ?? ''}|${design?.seed ?? ''}|${title}|${style}`;
  const rng = createRng(hash(seedKey));
  const p = PAL[motif];
  const id = `g${hash(seedKey)}`;
  const font = FONT_FAMILY[design?.titleFont ?? 'epic'];
  const tSize = TITLE_SIZE[design?.titleSize ?? 'm'];
  const faces = credits?.faces ?? [];
  const names = (credits?.names ?? []).filter((n) => n.size !== 'hidden');
  const dirSize = CREDIT_SIZE[design?.directorSize ?? 'hidden'];
  const frame = design?.frame ?? 'none';

  const stars = motif === 'romance' || motif === 'comedy' ? [] : Array.from({ length: 28 }, () => [rng.int(4, 196), rng.int(4, 150), rng.next() * 1.2 + 0.3]);
  const ridge = (y: number, amp: number) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= 200; x += 25) d += ` L${x} ${y - rng.int(0, amp)}`;
    return `${d} L200 300 L0 300 Z`;
  };
  const words = title.toUpperCase().split(' ');
  const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words.length === 2 && title.length * tSize > 260 ? words : [title.toUpperCase()];
  const titleText = design?.titleFont === 'elegant' ? lines.map((l) => l.charAt(0) + l.slice(1).toLowerCase()) : lines;
  const titleY = 262 - (lines.length - 1) * tSize * 0.9 - (dirSize ? 4 : 0);

  // Faces lineup: big centre portrait for one face, an ensemble row for several (Avengers-style).
  const faceSize = faces.length <= 1 ? 92 : faces.length === 2 ? 74 : faces.length <= 4 ? 56 : 44;
  const faceRowW = faces.length * (faceSize * 0.82);
  const faceX0 = 100 - faceRowW / 2 + (faceSize * 0.82 - faceSize) / 2;

  return (
    <svg className="poster" width={width} height={h} viewBox="0 0 200 300" role="img" aria-label={`Poster: ${title}`}>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.sky[0]} /><stop offset="1" stopColor={p.sky[1]} /></linearGradient>
        <radialGradient id={`${id}l`}><stop offset="0" stopColor={p.light} stopOpacity="0.6" /><stop offset="1" stopColor={p.light} stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}fade`} x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.75" /></linearGradient>
        <filter id={`${id}glow`}><feGaussianBlur stdDeviation="2" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      </defs>
      <rect width="200" height="300" fill={`url(#${id}s)`} />
      {stars.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.7} />)}
      {(motif === 'scifi' || motif === 'drama' || motif === 'fantasy') && (
        <>
          <circle cx={rng.int(110, 150)} cy={rng.int(55, 80)} r="80" fill={`url(#${id}l)`} />
          <circle cx="130" cy="70" r={motif === 'scifi' ? 34 : 24} fill={p.light} />
          {motif === 'scifi' && <path d="M40 40 L150 95" stroke="#fff" strokeWidth="1.2" opacity="0.6" />}
        </>
      )}
      {motif === 'thriller' && (
        <>
          <path d="M150 40 A16 16 0 1 0 166 62 A12 12 0 1 1 150 40 Z" fill={p.light} />
          {Array.from({ length: 9 }, (_, i) => {
            const bw = rng.int(14, 24), bh = rng.int(60, 140), x = i * 22 - 4;
            return (
              <g key={i}>
                <rect x={x} y={240 - bh} width={bw} height={bh + 60} fill="#0c0916" />
                {Array.from({ length: 6 }, (_, j) => rng.chance(0.3) && <rect key={j} x={x + 4 + (j % 2) * 7} y={250 - bh + Math.floor(j / 2) * 18} width="4" height="6" fill={p.light} />)}
              </g>
            );
          })}
        </>
      )}
      {(motif === 'romance' || motif === 'comedy') && (
        <>
          <circle cx="100" cy={motif === 'romance' ? 150 : 70} r={motif === 'romance' ? 40 : 30} fill={p.light} opacity="0.95" />
          {motif === 'comedy' && Array.from({ length: 22 }, (_, i) => (
            <rect key={i} x={rng.int(5, 190)} y={rng.int(5, 200)} width="5" height="9" fill={[p.accent, '#4aa3df', '#8e5bd6'][i % 3]} transform={`rotate(${rng.int(-40, 40)} ${100} ${100})`} />
          ))}
        </>
      )}
      {motif === 'action' && <circle cx="100" cy="200" r="110" fill={`url(#${id}l)`} />}
      {motif === 'horror' && (
        <>
          <circle cx="40" cy="60" r="20" fill={p.light} opacity="0.8" />
          <path d="M110 150 L140 125 L170 150 V200 H110 Z" fill="#050806" />
          <rect x="134" y="160" width="10" height="12" fill={p.accent} />
          <path d="M60 200 L62 150 L50 130 M62 160 L75 140" stroke="#050806" strokeWidth="4" fill="none" />
        </>
      )}
      {motif === 'fantasy' && <path d="M70 200 V150 H80 V140 H90 V150 H110 V130 L118 118 L126 130 V150 H130 V200 Z" fill="#160d24" />}
      <path d={ridge(210, 40)} fill={p.ground} opacity="0.85" />
      <path d={ridge(235, 25)} fill={p.ground} />
      {faces.length === 0 && motif !== 'comedy' && (
        <g transform={`translate(${rng.int(70, 120)} 205)`}>
          <circle cx="0" cy="-16" r="5" fill="#3a2a22" />
          <path d="M-6 -10 H6 L7 6 H-7 Z" fill={p.accent} />
        </g>
      )}
      {faces.map((a, i) => (
        <g key={a.id} transform={`translate(${faceX0 + i * faceSize * 0.82} ${faces.length <= 1 ? 70 : 92 + (i % 2) * 8})`}>
          <Face actor={a} size={faceSize} />
        </g>
      ))}
      <rect width="200" height="300" fill={`url(#${id}fade)`} />
      {names.length > 0 && (
        <text x="100" y="22" textAnchor="middle" fill="#f6ecd8" fontFamily="'Nunito', sans-serif" fontWeight="800" letterSpacing="1.2">
          {names.map((n, i) => (
            <tspan key={i} fontSize={CREDIT_SIZE[n.size]} dx={i ? 6 : 0}>{n.name.toUpperCase()}</tspan>
          ))}
        </text>
      )}
      {showTitle && (
        <text x="100" y={titleY} textAnchor="middle" className="poster-title" fill="#f6ecd8" fontSize={tSize} fontFamily={font} letterSpacing={design?.titleFont === 'elegant' ? 0 : 1.5}
          style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.45)', strokeWidth: 1.5 }}>
          {titleText.map((l, i) => <tspan key={i} x="100" dy={i ? tSize * 0.95 : 0}>{l}</tspan>)}
        </text>
      )}
      {dirSize > 0 && credits?.director && (
        <text x="100" y="290" textAnchor="middle" fill="#e9d9b6" fontSize={dirSize} fontFamily="'Nunito', sans-serif" fontWeight="700" letterSpacing="2">
          A FILM BY {credits.director.toUpperCase()}
        </text>
      )}
      {frame === 'gold' && <rect x="5" y="5" width="190" height="290" fill="none" stroke="#d9b45a" strokeWidth="3" rx="3" />}
      {frame === 'neon' && <rect x="6" y="6" width="188" height="288" fill="none" stroke="#ff4fd8" strokeWidth="2.5" rx="8" filter={`url(#${id}glow)`} />}
      {frame === 'film' && (
        <>
          <rect x="0" y="0" width="12" height="300" fill="#111" /><rect x="188" y="0" width="12" height="300" fill="#111" />
          {Array.from({ length: 15 }, (_, i) => <g key={i}><rect x="3" y={6 + i * 20} width="6" height="9" rx="1.5" fill="#e9dcc5" /><rect x="191" y={6 + i * 20} width="6" height="9" rx="1.5" fill="#e9dcc5" /></g>)}
        </>
      )}
      <rect x="0.5" y="0.5" width="199" height="299" fill="none" stroke="rgba(0,0,0,0.3)" />
    </svg>
  );
}

/** A film's own poster, as designed in the poster studio. */
export function FilmPoster({ film, width = 200 }: { film: import('../../engine/types').Film; width?: number }) {
  const d = film.poster;
  const order = [...film.roles].sort((a, b) => ['lead', 'second', 'support', 'minor'].indexOf(a.billing) - ['lead', 'second', 'support', 'minor'].indexOf(b.billing));
  const credits: PosterCredits = {
    director: film.directorName,
    names: d ? order.filter((r) => r.actor).map((r) => ({ name: r.actor!.name, size: d.billing[r.id] ?? 'hidden' })) : [],
    faces: d ? d.faces.map((id) => film.roles.find((r) => r.id === id)?.actor).filter(Boolean) as Actor[] : [],
  };
  return <Poster title={film.title} genre={film.contract.genre} seed={film.id} width={width} design={d} credits={credits} />;
}
