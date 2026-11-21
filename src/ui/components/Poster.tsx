// Procedural film poster: genre palette + motif + title, deterministic per seed.
// Placeholder until commissioned poster art; swap by passing `art`.
import type { GenreId } from '../../engine/types';
import { createRng } from '../../engine/rng';

const PAL: Record<GenreId, { sky: [string, string]; ground: string; light: string; accent: string }> = {
  scifi: { sky: ['#0f1a33', '#2b3f66'], ground: '#1b2336', light: '#f3ecc8', accent: '#e07b5f' },
  thriller: { sky: ['#140f24', '#3a2b52'], ground: '#1a1426', light: '#f6d36b', accent: '#f6d36b' },
  romance: { sky: ['#f2a07b', '#fbd3a5'], ground: '#9e6a6e', light: '#fff1c9', accent: '#d65c5c' },
  drama: { sky: ['#2c3e57', '#7f8fa6'], ground: '#2a2f3a', light: '#f5deb0', accent: '#f5deb0' },
  action: { sky: ['#3a0f0a', '#e0632d'], ground: '#1b0f0c', light: '#ffd27a', accent: '#ff8a3d' },
  horror: { sky: ['#07110d', '#24382d'], ground: '#0b100d', light: '#cfe6c8', accent: '#d63b3b' },
  comedy: { sky: ['#ffd35c', '#ffef9e'], ground: '#58b368', light: '#ffffff', accent: '#e8505b' },
  fantasy: { sky: ['#2b1846', '#6b4b9a'], ground: '#211433', light: '#f5d88a', accent: '#f5d88a' },
};

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function Poster({ title, genre, seed, width = 200, art, showTitle = true }: {
  title: string; genre: GenreId; seed?: string; width?: number; art?: string; showTitle?: boolean;
}) {
  const h = (width * 3) / 2;
  if (art) return <img src={art} alt={title} width={width} height={h} className="poster" />;
  const rng = createRng(hash((seed ?? '') + title + genre));
  const p = PAL[genre];
  const id = `g${hash(title + genre + (seed ?? ''))}`;
  const stars = genre === 'romance' || genre === 'comedy' ? [] : Array.from({ length: 28 }, () => [rng.int(4, 196), rng.int(4, 150), rng.next() * 1.2 + 0.3]);
  const ridge = (y: number, amp: number) => {
    let d = `M0 ${y}`;
    for (let x = 0; x <= 200; x += 25) d += ` L${x} ${y - rng.int(0, amp)}`;
    return `${d} L200 300 L0 300 Z`;
  };
  const words = title.toUpperCase().split(' ');
  const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words.length === 2 && title.length > 12 ? words : [title.toUpperCase()];

  return (
    <svg className="poster" width={width} height={h} viewBox="0 0 200 300" role="img" aria-label={`Poster: ${title}`}>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.sky[0]} /><stop offset="1" stopColor={p.sky[1]} />
        </linearGradient>
        <radialGradient id={`${id}l`}><stop offset="0" stopColor={p.light} stopOpacity="0.6" /><stop offset="1" stopColor={p.light} stopOpacity="0" /></radialGradient>
      </defs>
      <rect width="200" height="300" fill={`url(#${id}s)`} />
      {stars.map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="#fff" opacity={0.7} />)}
      {/* Motifs */}
      {(genre === 'scifi' || genre === 'drama' || genre === 'fantasy') && (
        <>
          <circle cx={rng.int(110, 150)} cy={rng.int(55, 80)} r="80" fill={`url(#${id}l)`} />
          <circle cx="130" cy="70" r={genre === 'scifi' ? 34 : 24} fill={p.light} />
          {genre === 'scifi' && <path d="M40 40 L150 95" stroke="#fff" strokeWidth="1.2" opacity="0.6" />}
        </>
      )}
      {genre === 'thriller' && (
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
      {(genre === 'romance' || genre === 'comedy') && (
        <>
          <circle cx="100" cy={genre === 'romance' ? 150 : 70} r={genre === 'romance' ? 40 : 30} fill={p.light} opacity="0.95" />
          {genre === 'comedy' && Array.from({ length: 22 }, (_, i) => (
            <rect key={i} x={rng.int(5, 190)} y={rng.int(5, 200)} width="5" height="9" fill={[p.accent, '#4aa3df', '#8e5bd6'][i % 3]} transform={`rotate(${rng.int(0, 90)})`} transform-origin="center" />
          ))}
        </>
      )}
      {genre === 'action' && <circle cx="100" cy="200" r="110" fill={`url(#${id}l)`} />}
      {genre === 'horror' && (
        <>
          <circle cx="40" cy="60" r="20" fill={p.light} opacity="0.8" />
          <path d="M110 150 L140 125 L170 150 V200 H110 Z" fill="#050806" />
          <rect x="134" y="160" width="10" height="12" fill={p.accent} />
          <path d="M60 200 L62 150 L50 130 M62 160 L75 140" stroke="#050806" strokeWidth="4" fill="none" />
        </>
      )}
      {genre === 'fantasy' && <path d="M70 200 V150 H80 V140 H90 V150 H110 V130 L118 118 L126 130 V150 H130 V200 Z" fill="#160d24" />}
      <path d={ridge(210, 40)} fill={p.ground} opacity="0.85" />
      <path d={ridge(235, 25)} fill={p.ground} />
      {/* A small lone figure */}
      {genre !== 'comedy' && (
        <g transform={`translate(${rng.int(70, 120)} 205)`}>
          <circle cx="0" cy="-16" r="5" fill="#3a2a22" />
          <path d="M-6 -10 H6 L7 6 H-7 Z" fill={p.accent} />
        </g>
      )}
      {showTitle && (
        <text x="100" y={lines.length > 1 ? 255 : 268} textAnchor="middle" className="poster-title" fill="#f6ecd8" fontSize={lines.some((l) => l.length > 14) ? 15 : 19}>
          {lines.map((l, i) => <tspan key={i} x="100" dy={i ? 22 : 0}>{l}</tspan>)}
        </text>
      )}
      <rect x="0.5" y="0.5" width="199" height="299" fill="none" stroke="rgba(0,0,0,0.3)" />
    </svg>
  );
}
