import { useEffect, useMemo, useRef, useState } from 'react';
import type { Film, Meter, PendingShoot, Profile } from '../../engine/types';
import { useGame, useProfile } from '../store';
import { Face } from '../components/Face';
import { IsoSet } from '../components/IsoSet';
import { SETS, setById } from '../../engine/data/sets';
import { toneById } from '../../engine/data/tones';
import { actionById } from '../../engine/data/actions';
import { money } from '../../engine/format';
import { participants } from '../../engine/script';
import {
  METERS, chooseVersion, chosenTake, crewWeekCost, doWeek, predictMeters, setFit, shootWeekCost, shootingBlockers,
  tryAgain, weeksLeft, weeksUsed, wrapShooting, budgetLeftShooting, type ShootResult,
} from '../../engine/shooting';

const METER_LABEL: Record<Meter, string> = { pace: 'Pace', chemistry: 'Chemistry', dialogue: 'Dialogue' };
const SHOOT_MS = 4000;

export function ShootingScreen() {
  const p = useProfile();
  const { update } = useGame();
  const film = p.activeFilm!;
  const st = film.shooting!;
  const level = p.directors[film.directorId]?.level ?? 1;
  const [sceneId, setSceneId] = useState(st.pending?.sceneId ?? film.scenes.find((s) => !s.chosenTakeId)?.id ?? film.scenes[0].id);
  const scene = film.scenes.find((s) => s.id === sceneId)!;
  const unlockedSets = SETS.filter((s) => p.unlocks.sets.includes(s.id));
  const bestSet = useMemo(
    () => [...unlockedSets].sort((a, b) => setFit(b, scene) - setFit(a, scene))[0],
    [scene, unlockedSets],
  );
  const [setId, setSetId] = useState(scene.setId ?? bestSet.id);
  const [focus, setFocus] = useState<Meter>('pace');
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setSetId(scene.setId ?? bestSet.id), [sceneId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = setById(setId);
  const prediction = predictMeters(film, scene, set, focus, level);
  const apply = (r: ShootResult) => {
    if (!r.ok) return setMsg(r.reason), false;
    update(() => r.profile);
    setMsg(null);
    return true;
  };
  const blockers = shootingBlockers(film);
  const late = weeksLeft(film) < 0;

  return (
    <div className="shoot">
      <Calendar film={film} />
      {msg && <p className="bad">{msg}</p>}
      {st.pending ? (
        <ShootStage key={st.pending.versions[0].id} p={p} pending={st.pending} onPick={(id) => apply(chooseVersion(p, id))} onRetry={() => apply(tryAgain(p))} />
      ) : (
        <div className="script-grid">
          <div className="script-main">
            <div className="card">
              <h3>Scenes</h3>
              <div className="role-list">
                {film.scenes.map((s, i) => {
                  const take = chosenTake(s);
                  const pr = st.practice[s.id];
                  return (
                    <button key={s.id} className={`role-row ${s.id === sceneId ? 'selected' : ''}`} onClick={() => setSceneId(s.id)}>
                      <span className={`tone-dot t-${s.tone}`} />
                      <span className="role-text">
                        <strong>Scene {i + 1}</strong> <span className="muted small">{toneById(s.tone).name} · {s.beats.map((b) => actionById(b.actionId).verb).join(', ')}</span>
                        <br />
                        <span className="small">
                          {take ? <>Take <strong>{take.score}</strong> ({take.version}) · {setById(take.setId).name}</> : <span className="muted">Not shot</span>}
                          {pr && (pr.pace > 0 || pr.dialogue > 0) && <span className="muted"> · practiced {pr.dialogue}</span>}
                          {(st.shoots[s.id] ?? 0) > 0 && <span className="muted"> · {st.shoots[s.id]} shoot(s)</span>}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <div className="row between wrap">
                <h3>Scene {film.scenes.indexOf(scene) + 1}: {toneById(scene.tone).name}</h3>
                <div className="row">
                  {participants(scene).map((id) => {
                    const r = film.roles.find((x) => x.id === id)!;
                    return r.actor ? <Face key={id} actor={r.actor} size={36} /> : null;
                  })}
                </div>
              </div>
              <div className="shoot-setup">
                <div>
                  <label className="form-grid">
                    <span>Set</span>
                    <select value={setId} onChange={(e) => setSetId(e.target.value)}>
                      {[...unlockedSets].sort((a, b) => setFit(b, scene) - setFit(a, scene)).map((s) => (
                        <option key={s.id} value={s.id}>{s.name} · fit {setFit(s, scene)} · {money(s.dayCost)}/day</option>
                      ))}
                    </select>
                  </label>
                  <IsoSet set={set} extras={Math.min(set.extrasCapacity, 12)} height={140} />
                </div>
                <div>
                  <div className="section-label">Focus</div>
                  <div className="row">
                    {METERS.map((m) => (
                      <button key={m} className={focus === m ? 'primary' : ''} onClick={() => setFocus(m)}>{METER_LABEL[m]}</button>
                    ))}
                  </div>
                  <div className="section-label">Expected</div>
                  {METERS.map((m) => (
                    <div key={m} className="weight">
                      <span>{METER_LABEL[m]}</span>
                      <span className={`bar m-${m}`}><span style={{ width: `${prediction.meters[m]}%` }} /></span>
                      <span className="muted">~{prediction.meters[m]}</span>
                    </div>
                  ))}
                  <div className="row wrap factor-chips">
                    {prediction.factors.map((f) => <span key={f.label} className="tag">{f.label} {f.value}</span>)}
                  </div>
                </div>
              </div>
              <div className="row wrap">
                <button className="primary" onClick={() => apply(doWeek(p, { kind: 'shoot', sceneId, setId, focus }))}>
                  🎬 Shoot · 1 week ({money(shootWeekCost(film, scene, set))})
                </button>
                <button onClick={() => apply(doWeek(p, { kind: 'practice', sceneId }))}>
                  Practice this scene · 1 week ({money(crewWeekCost(film))})
                </button>
              </div>
            </div>
          </div>

          <aside className="script-side">
            <CastPanel film={film} />
            <div className="card">
              <h3>Cast activities</h3>
              <button className="wide" onClick={() => apply(doWeek(p, { kind: 'club' }))}>🍸 Club meetup · 1 week <span className="muted small">+chemistry</span></button>
              <button className="wide" onClick={() => apply(doWeek(p, { kind: 'relax' }))}>🌴 Relax · 1 week <span className="muted small">−fatigue, lines fade</span></button>
              <p className="small muted">Each week costs {money(crewWeekCost(film))} in crew.</p>
            </div>
            <button
              className="primary wide"
              disabled={blockers.length > 0}
              onClick={() => apply(wrapShooting(p))}
            >
              Wrap shooting → Post
            </button>
            <p className="small muted">Wrapping shoots the filler in one block (1 week).</p>
            {blockers.length > 0 && <p className="small bad">{blockers[0]}</p>}
            {late && <p className="small bad">You are past the deadline: every extra week costs grade points.</p>}
            <div className="card log">
              <h3>Log</h3>
              {[...st.log].reverse().slice(0, 8).map((l, i) => <p key={i} className="small"><span className="muted">W{l.week}</span> {l.text}</p>)}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export function Calendar({ film }: { film: Film }) {
  const used = weeksUsed(film);
  const total = Math.max(film.contract.deadlineWeeks, used);
  return (
    <div className="card calendar">
      <div className="row between wrap">
        <strong>Week {used} of {film.contract.deadlineWeeks}</strong>
        <span className="small">{weeksLeft(film) >= 0 ? `${weeksLeft(film)} weeks left for shooting and post` : <span className="bad">{-weeksLeft(film)} weeks late</span>}</span>
        <span className="small">Budget left <strong className={budgetLeftShooting(film) < 0 ? 'bad' : ''}>{money(budgetLeftShooting(film))}</strong></span>
      </div>
      <div className="weeks">
        {Array.from({ length: total }, (_, i) => (
          <span key={i} className={`wk ${i < used ? 'used' : ''} ${i >= film.contract.deadlineWeeks ? 'late' : ''}`} />
        ))}
      </div>
    </div>
  );
}

function CastPanel({ film }: { film: Film }) {
  const st = film.shooting!;
  const revealed = Object.entries(st.revealedPairs);
  const nameOf = (actorId: string) => film.roles.find((r) => r.actor?.id === actorId)?.actor?.name ?? '?';
  return (
    <div className="card">
      <h3>Cast</h3>
      {film.roles.map((r) => (
        <div key={r.id} className="row cast-row">
          {r.actor && <Face actor={r.actor} size={36} />}
          <span className="role-text small">
            <strong>{r.actor?.name}</strong> <span className="muted">as {r.name}</span>
            <span className="bar fatigue"><span style={{ width: `${st.fatigue[r.id] ?? 0}%` }} /></span>
          </span>
          <span className="small muted">{st.fatigue[r.id] ?? 0}% tired</span>
        </div>
      ))}
      <div className="weight"><span>Bond</span><span className="bar m-chemistry"><span style={{ width: `${st.bond}%` }} /></span><span className="muted">{st.bond}</span></div>
      <div className="section-label">Chemistry discovered</div>
      {revealed.length === 0 ? (
        <p className="small muted">Revealed when actors first shoot together.</p>
      ) : (
        revealed.map(([k, v]) => {
          const [a, b] = k.split('|');
          return <p key={k} className="small">{nameOf(a)} × {nameOf(b)}: <strong className={v >= 15 ? 'good' : v < 0 ? 'bad' : ''}>{v >= 15 ? 'sparks' : v < 0 ? 'friction' : 'okay'} ({v > 0 ? '+' : ''}{v})</strong></p>;
        })
      )}
    </div>
  );
}

function ShootStage({ p, pending, onPick, onRetry }: { p: Profile; pending: PendingShoot; onPick: (id: string) => void; onRetry: () => void }) {
  const film = p.activeFilm!;
  const scene = film.scenes.find((s) => s.id === pending.sceneId)!;
  const set = setById(pending.setId);
  const ids = participants(scene);
  const [time, setTime] = useState(0);
  const start = useRef<number | null>(null);
  useEffect(() => {
    let raf = 0;
    const tick = (now: number) => {
      start.current ??= now;
      const t = Math.min(1, (now - start.current) / SHOOT_MS);
      setTime(t);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  const done = time >= 1;
  const shown = pending.bubbles.filter((b) => b.t <= time);
  const meters = Object.fromEntries(METERS.map((m) => [m, shown.filter((b) => b.meter === m).reduce((a, b) => a + b.value, 0)])) as Record<Meter, number>;
  const spot = (roleId?: string) => {
    const i = Math.max(0, ids.indexOf(roleId ?? ''));
    return ((i + 1) / (ids.length + 1)) * 100;
  };
  const nameOf = (actorId: string) => film.roles.find((r) => r.actor?.id === actorId)?.actor?.name ?? '?';

  return (
    <div className="card stage-card">
      <div className="row between">
        <h3>🎬 Shooting scene {film.scenes.indexOf(scene) + 1} on the {set.name} set</h3>
        {!done && <button onClick={() => setTime(1)}>Skip ▶▶</button>}
      </div>
      <div className="stage">
        <IsoSet set={set} extras={Math.min(set.extrasCapacity, 30)} height={280} />
        <div className="stage-actors">
          {ids.map((id) => {
            const r = film.roles.find((x) => x.id === id);
            return r?.actor ? (
              <div key={id} className="stage-actor" style={{ left: `${spot(id)}%` }}>
                <Face actor={r.actor} size={56} />
                <span className="small">{r.name}</span>
              </div>
            ) : null;
          })}
          {!done && shown.filter((b) => time - b.t < 0.18).map((b, i) => (
            <span key={`${b.t}-${i}`} className={`bubble m-${b.meter}`} style={{ left: `${spot(b.roleId) + ((b.t * 997) % 10) - 5}%` }}>
              +{b.value}
            </span>
          ))}
        </div>
      </div>
      <div className="stage-meters">
        {METERS.map((m) => (
          <div key={m} className="weight">
            <span>{METER_LABEL[m]}{pending.focus === m ? ' ★' : ''}</span>
            <span className={`bar m-${m}`}><span style={{ width: `${meters[m]}%` }} /></span>
            <span>{meters[m]}</span>
          </div>
        ))}
      </div>
      {done && (
        <>
          {pending.revealed.length > 0 && (
            <p className="small">
              Chemistry discovered:{' '}
              {pending.revealed.map((k) => {
                const v = film.shooting!.revealedPairs[k];
                const [a, b] = k.split('|');
                return <span key={k} className={v >= 15 ? 'good' : v < 0 ? 'bad' : ''}>{nameOf(a)} × {nameOf(b)} ({v > 0 ? '+' : ''}{v}) </span>;
              })}
            </p>
          )}
          <div className="cards">
            {pending.versions.map((v) => (
              <div key={v.id} className={`card version v-${v.version}`}>
                <div className="row between">
                  <strong>{v.version === 'pace' ? 'Pace cut' : v.version === 'chemistry' ? 'Chemistry cut' : 'Rough cut'}</strong>
                  <span className="big">{v.score}</span>
                </div>
                {METERS.map((m) => (
                  <div key={m} className="weight">
                    <span>{METER_LABEL[m]}</span>
                    <span className={`bar m-${m}`}><span style={{ width: `${v.meters[m]}%` }} /></span>
                    <span className="muted">{v.meters[m]}</span>
                  </div>
                ))}
                <p className="small muted">“{v.feedback}”</p>
                <button className="primary" onClick={() => onPick(v.id)}>Use this take</button>
              </div>
            ))}
          </div>
          <button onClick={onRetry}>Try again another week</button>
          {chosenTake(scene) && <span className="small muted"> · current take for this scene: {chosenTake(scene)!.score}</span>}
        </>
      )}
    </div>
  );
}
