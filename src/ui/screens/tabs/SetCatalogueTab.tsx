import { useState } from 'react';
import { useGame, useProfile } from '../../store';
import { SETS } from '../../../engine/data/sets';
import { actionById } from '../../../engine/data/actions';
import { toneById } from '../../../engine/data/tones';
import type { Tone } from '../../../engine/types';
import { buySet, setUnlockText } from '../../../engine/progression';
import { money } from '../../../engine/format';
import { IsoSet } from '../../components/IsoSet';

export function SetCatalogueTab() {
  const p = useProfile();
  const { update } = useGame();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <h2>Set catalogue</h2>
      <p className="muted">Premade sets. You choose them per scene while shooting.</p>
      {msg && <p className="bad">{msg}</p>}
      <div className="grid">
        {SETS.map((s) => {
          const unlocked = p.unlocks.sets.includes(s.id);
          const best = (Object.entries(s.toneFit) as [Tone, number][])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([id]) => toneById(id).name.toLowerCase());
          const special = Object.keys(s.actionFit ?? {}).map((id) => actionById(id).verb);
          const buyable = !unlocked && s.unlock.kind === 'credits';
          return (
            <div key={s.id} className={`card ${unlocked ? '' : 'locked'}`}>
              <div className="row between">
                <h3>{s.name}</h3>
                <span className="tag">{money(s.dayCost)}/day</span>
              </div>
              <IsoSet set={s} extras={Math.min(s.extrasCapacity, 60)} />
              <p className="small muted">
                {s.footprint.w}×{s.footprint.d} {s.style} · up to {s.extrasCapacity} extras · {s.tags.filter((t) => t !== 'interior' && t !== 'exterior').join(' · ')}
              </p>
              <p className="small">Best for {best.join(' and ')} scenes{special.length > 0 && <> · {special.join(', ')}</>}</p>
              {!unlocked && <p className="small">🔒 {setUnlockText(s)}</p>}
              {buyable && s.unlock.kind === 'credits' && (
                <button
                  className="primary"
                  disabled={p.credits < s.unlock.cost}
                  onClick={() => {
                    const r = buySet(p, s.id);
                    if (r.ok) {
                      update(() => r.profile);
                      setMsg(null);
                    } else setMsg(r.reason);
                  }}
                >
                  Unlock
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
