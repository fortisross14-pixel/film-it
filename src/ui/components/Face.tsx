// Cartoon face for an actor. Uses commissioned art (actor.portrait) when present,
// otherwise a procedural cartoon face derived from the actor's id and skills:
// comedians grin, menacing actors scowl, romantics blush, veterans go grey.

import type { Actor } from '../../engine/types';
import { createRng } from '../../engine/rng';

const SKIN = ['#f6d3b3', '#eebb94', '#d9a066', '#b97a4a', '#8d5a3b', '#5e3b26'];
const HAIR = ['#2b1d14', '#5a3a22', '#a0662d', '#d9b45a', '#c0392b', '#1c1c1c', '#6d4c41'];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function Face({ actor, size = 72 }: { actor: Actor; size?: number }) {
  if (actor.portrait) {
    return <img src={actor.portrait} alt={actor.name} width={size} height={size} className="face" />;
  }
  const rng = createRng(hash(actor.id + actor.name));
  const skin = rng.pick(SKIN);
  const hair = actor.age === 'veteran' && rng.chance(0.7) ? '#b8b8b8' : rng.pick(HAIR);
  const style = rng.int(0, 5);
  const rx = 30 + rng.int(-3, 4);
  const ry = 36 + rng.int(-3, 4);
  const eyeY = 48 + rng.int(-2, 2);
  const eyeGap = 12 + rng.int(-1, 2);
  const eyeR = actor.age === 'young' ? 4.5 : 3.6;
  const { comedy, menace, romance } = actor.skills;
  const smile = comedy - menace; // >0 grin, <0 frown/smirk
  const brow = menace > 70 ? 6 : menace > 50 ? 3 : 0; // angry tilt
  const mouthW = 10 + Math.max(0, smile) / 8;
  const mouthCurve = Math.max(-6, Math.min(10, smile / 6));
  const beard = rng.chance(0.18);
  const glasses = rng.chance(0.12);

  return (
    <svg className="face" width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={actor.name}>
      <circle cx={50} cy={50} r={49} fill="#2b2838" />
      {/* Long hair behind the face */}
      {(style === 2 || style === 5) && <ellipse cx={50} cy={58} rx={rx + 8} ry={ry + 4} fill={hair} />}
      {/* Ears + head */}
      <circle cx={50 - rx} cy={eyeY + 4} r={6} fill={skin} />
      <circle cx={50 + rx} cy={eyeY + 4} r={6} fill={skin} />
      <ellipse cx={50} cy={54} rx={rx} ry={ry} fill={skin} />
      {beard && <path d={`M${50 - rx + 4} 62 Q50 ${96} ${50 + rx - 4} 62 Q50 80 ${50 - rx + 4} 62`} fill={hair} />}
      {/* Hair on top */}
      {style === 1 && <path d={`M${50 - rx} 46 Q50 ${2} ${50 + rx} 46 Q50 28 ${50 - rx} 46`} fill={hair} />}
      {style === 2 && <path d={`M${50 - rx - 2} 52 Q50 ${0} ${50 + rx + 2} 52 Q60 26 ${50 - rx - 2} 52`} fill={hair} />}
      {style === 3 && (
        <>
          <circle cx={50} cy={14} r={10} fill={hair} />
          <path d={`M${50 - rx} 44 Q50 ${8} ${50 + rx} 44 Q50 30 ${50 - rx} 44`} fill={hair} />
        </>
      )}
      {style === 4 && <path d={`M${50 - rx} 42 L32 12 L42 30 L50 6 L58 30 L68 12 L${50 + rx} 42 Q50 30 ${50 - rx} 42`} fill={hair} />}
      {style === 5 && <path d={`M${50 - rx} 46 Q50 ${4} ${50 + rx} 46 Q50 30 ${50 - rx} 46`} fill={hair} />}
      {/* Brows */}
      <path d={`M${50 - eyeGap - 6} ${eyeY - 9 - brow / 2} L${50 - eyeGap + 5} ${eyeY - 9 + brow / 2}`} stroke={hair === '#b8b8b8' ? '#888' : hair} strokeWidth={3} strokeLinecap="round" />
      <path d={`M${50 + eyeGap + 6} ${eyeY - 9 - brow / 2} L${50 + eyeGap - 5} ${eyeY - 9 + brow / 2}`} stroke={hair === '#b8b8b8' ? '#888' : hair} strokeWidth={3} strokeLinecap="round" />
      {/* Eyes */}
      <ellipse cx={50 - eyeGap} cy={eyeY} rx={eyeR} ry={eyeR + 1} fill="#fff" />
      <ellipse cx={50 + eyeGap} cy={eyeY} rx={eyeR} ry={eyeR + 1} fill="#fff" />
      <circle cx={50 - eyeGap + 0.5} cy={eyeY + 0.5} r={eyeR * 0.55} fill="#222" />
      <circle cx={50 + eyeGap + 0.5} cy={eyeY + 0.5} r={eyeR * 0.55} fill="#222" />
      {glasses && (
        <g fill="none" stroke="#222" strokeWidth={2}>
          <circle cx={50 - eyeGap} cy={eyeY} r={8} />
          <circle cx={50 + eyeGap} cy={eyeY} r={8} />
          <path d={`M${50 - eyeGap + 8} ${eyeY} L${50 + eyeGap - 8} ${eyeY}`} />
        </g>
      )}
      {/* Blush for romantics */}
      {romance > 70 && (
        <>
          <ellipse cx={50 - eyeGap - 4} cy={eyeY + 12} rx={5} ry={3} fill="#e8747c" opacity={0.5} />
          <ellipse cx={50 + eyeGap + 4} cy={eyeY + 12} rx={5} ry={3} fill="#e8747c" opacity={0.5} />
        </>
      )}
      {/* Nose */}
      <path d={`M50 ${eyeY + 4} q-3 8 1 9`} stroke="rgba(0,0,0,0.35)" strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* Mouth */}
      <path
        d={`M${50 - mouthW} ${eyeY + 20} Q50 ${eyeY + 20 + mouthCurve} ${50 + mouthW} ${eyeY + 20 - (smile < 0 ? 3 : 0)}`}
        stroke="#6b2a2a" strokeWidth={3} fill={smile > 30 ? '#fff' : 'none'} strokeLinecap="round"
      />
      {/* Wrinkles for veterans */}
      {actor.age === 'veteran' && (
        <path d={`M${50 - 14} ${eyeY - 16} q14 -4 28 0`} stroke="rgba(0,0,0,0.25)" strokeWidth={1.5} fill="none" />
      )}
      {actor.famous && <text x={84} y={20} fontSize={16}>⭐</text>}
    </svg>
  );
}
