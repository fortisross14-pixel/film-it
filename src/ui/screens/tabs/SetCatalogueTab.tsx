import { useState } from 'react';
import { useGame, useProfile } from '../../store';
import { SETS } from '../../../engine/data/sets';
import { actionById } from '../../../engine/data/actions';
import { toneById } from '../../../engine/data/tones';
import type { Tone } from '../../../engine/types';
import { buySet } from '../../../engine/progression';
import { topicById } from '../../../engine/data/topics';
import { money } from '../../../engine/format';
import { IsoSet } from '../../components/IsoSet';

export function SetCatalogueTab() {
  const p = useProfile();
  const { update } = useGame();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      {msg && <p className="bad">{msg}</p>}
      <div className="grid">
        {[...SETS].sort((a, b) => Number(p.unlocks.sets.includes(b.id)) - Number(p.unlocks.sets.includes(a.id))).map((s) => {
          const unlocked = p.unlocks.sets.includes(s.id);
          const best = (Object.entries(s.toneFit) as [Tone, number][])
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2)
            .map(([id]) => toneById(id).name.toLowerCase());
          const special = Object.keys(s.actionFit ?? {}).map((id) => actionById(id).verb);
          const u = s.unlock;
          return (
            <div key={s.id} className={`card ${unlocked ? '' : 'locked'}`}>
              <div className="row between">
                <h3>{s.name}</h3>
                <span className="tag">{money(s.dayCost)}/day</span>
              </div>
              <IsoSet set={s} extras={Math.min(s.extrasCapacity, 30)} height={130} />
              <p className="small">Best: {best.join(', ')}{special.length > 0 && <> · {special.join(', ')}</>}</p>
              {!unlocked && u.kind === 'topic' && <p className="small">🔒 Comes with the {topicById(u.topicId).name} topic</p>}
              {!unlocked && u.kind === 'buy' && (
                <button
                  className="primary"
                  disabled={p.money < u.cost}
                  onClick={() => {
                    const r = buySet(p, s.id);
                    if (r.ok) {
                      update(() => r.profile);
                      setMsg(null);
                    } else setMsg(r.reason);
                  }}
                >
                  Buy · {money(u.cost)}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
