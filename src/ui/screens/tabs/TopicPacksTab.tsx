import { useState } from 'react';
import { useGame, useProfile } from '../../store';
import { TOPIC_PACKS, topicById } from '../../../engine/data/topics';
import { setById } from '../../../engine/data/sets';
import { actionById } from '../../../engine/data/actions';
import { buyTopicPack } from '../../../engine/progression';
import { packArt } from '../../art';

export function TopicPacksTab() {
  const p = useProfile();
  const { update } = useGame();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div>
      <h2>Topic packs</h2>
      <p className="muted">Topics unlock for every director. Each topic adds actions and sets.</p>
      {msg && <p className="bad">{msg}</p>}
      <div className="grid">
        {TOPIC_PACKS.map((pack) => {
          const owned = p.unlocks.packs.includes(pack.id);
          return (
            <div key={pack.id} className={`card pack-tile ${owned ? '' : 'locked'}`}>
              {packArt(pack.id) && <img src={packArt(pack.id)} alt="" className="pack-tile-img" />}
              <div className="row between">
                <h3>{pack.name}</h3>
                {owned ? <span className="tag">Owned</span> : <span className="tag">{pack.cost} credits</span>}
              </div>
              <ul className="reqs">
                {pack.topicIds.map((id) => {
                  const t = topicById(id);
                  return (
                    <li key={id}>
                      <strong>{t.name}</strong>
                      {t.actions.length > 0 && (
                        <span className="small muted"> · actions: {t.actions.map((s) => actionById(s).verb).join(', ')}</span>
                      )}
                      {t.setIds.length > 0 && (
                        <span className="small muted"> · sets: {t.setIds.map((s) => setById(s).name).join(', ')}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              {!owned && (
                <button
                  className="primary"
                  disabled={p.credits < pack.cost}
                  onClick={() => {
                    const r = buyTopicPack(p, pack.id);
                    if (r.ok) {
                      update(() => r.profile);
                      setMsg(null);
                    } else setMsg(r.reason);
                  }}
                >
                  Buy
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
