import { useEffect, useMemo, useRef, useState } from 'react';
import type { Film, Meter, PendingShoot, Profile, Scene } from '../../engine/types';
import { useGame, useProfile } from '../store';
import { Face } from '../components/Face';
import { reducedMotion } from '../prefs';
import { art } from '../art';
import { IsoSet, stageActorFor, type StageActor, type StageBubble } from '../components/IsoSet';
import { Bolt, Clapper, Heart, People, Speech } from '../components/Icons';
import { SETS, setById } from '../../engine/data/sets';
import { toneById } from '../../engine/data/tones';
import { actionById } from '../../engine/data/actions';
import { describeBeat, money } from '../../engine/format';
import { participants } from '../../engine/script';
import {
  METERS, chooseVersion, chosenTake, crewWeekCost, doWeek, predictMeters, setFit, shootWeekCost, shootingBlockers,
  tryAgain, weeksLeft, weeksUsed, wrapShooting, budgetLeftShooting, type ShootResult,
} from '../../engine/shooting';

const METER_LABEL: Record<Meter, string> = { pace: 'Pace', chemistry: 'Chemistry', dialogue: 'Dialogue' };
const METER_ICON: Record<Meter, JSX.Element> = { pace: <Bolt size={22} />, chemistry: <Heart size={22} />, dialogue: <Speech size={22} /> };
const SHOOT_MS = 4500;

/** A short name for a scene from its first beat ("The Villain fights and wins"). */
export function sceneName(film: Film, s: Scene) {
  const b = s.beats[0];
  if (!b) return toneById(s.tone).name;
  const who = film.roles.find((r) => r.id === b.roleId)?.name ?? '';
  return describeBeat(who, b.actionId);
}

/** Stage figures for a scene: participants who have been cast. */
export function stageCast(film: Film, s: Scene): StageActor[] {
  return participants(s).flatMap((id) => {
    const r = film.roles.find((x) => x.id === id);
    return r?.actor ? [{ ...stageActorFor(r.actor), id }] : [];
  });
}

export function ShootingScreen() {
  const p = useProfile();
  const { update } = useGame();
  const film = p.activeFilm!;
  const st = film.shooting!;
  const level = p.directors[film.directorId]?.level ?? 1;
  const [sceneId, setSceneId] = useState(st.pending?.sceneId ?? film.scenes.find((s) => !s.chosenTakeId)?.id ?? film.scenes[0].id);
  const scene = film.scenes.find((s) => s.id === sceneId)!;
  const unlockedSets = SETS.filter((s) => p.unlocks.sets.includes(s.id));
  const sortedSets = useMemo(() => [...unlockedSets].sort((a, b) => setFit(b, scene) - setFit(a, scene)), [scene, unlockedSets]);
  const [setId, setSetId] = useState(scene.setId ?? sortedSets[0].id);
  const [focus, setFocus] = useState<Meter>('pace');
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => setSetId(scene.setId ?? sortedSets[0].id), [sceneId]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = setById(setId);
  const prediction = predictMeters(film, scene, set, focus, level);
  const apply = (r: ShootResult) => {
    if (!r.ok) return setMsg(r.reason), false;
    update(() => r.profile);
    setMsg(null);
    return true;
  };
  const blockers = shootingBlockers(film);
  const pending = st.pending;

  return (
    <div className="shoot">
      <Calendar film={film} />
      {msg && <p className="bad">{msg}</p>}
      <div className="shoot-grid">
        <aside className="card on-set">
          <span className="kicker">On set</span>
          <h2 className="scene-heading">Scene {String(film.scenes.indexOf(scene) + 1).padStart(2, '0')}</h2>
          <p className="small muted">{sceneName(film, scene)} · {set.name}</p>
          <div className="scene-thumbs">
            {film.scenes.map((s, i) => {
              const take = chosenTake(s);
              const thumbSet = setById(s.setId ?? (s.id === sceneId ? setId : [...unlockedSets].sort((a, b) => setFit(b, s) - setFit(a, s))[0].id));
              return (
                <button key={s.id} className={`scene-thumb ${s.id === sceneId ? 'selected' : ''}`} disabled={!!pending} onClick={() => setSceneId(s.id)}>
                  <IsoSet set={thumbSet} height={64} />
                  <span className="thumb-text">
                    <strong>▶ Scene {String(i + 1).padStart(2, '0')}</strong>
                    <span className="small">{sceneName(film, s)}</span>
                    <span className="small muted">{take ? `Take ${take.score} · ${take.version} cut` : (st.shoots[s.id] ?? 0) > 0 ? 'Shot, no take kept' : 'Not shot'}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="stage-wrap">
          {pending ? (
            <ShootStage key={pending.versions[0].id} p={p} pending={pending} onPick={(id) => apply(chooseVersion(p, id))} onRetry={() => apply(tryAgain(p))} />
          ) : (
            <div className="studio-stage" style={{ backgroundImage: `url(${art('stage-bg')})` }}>
              <IsoSet set={set} extras={Math.min(set.extrasCapacity, 14)} height={400} studio lights={false} actors={stageCast(film, scene)} />
              <div className="stage-caption">{scene.beats.map((b) => {
                const name = (id?: string) => film.roles.find((r) => r.id === id)?.name ?? '';
                return describeBeat(name(b.roleId), b.actionId, b.targetId ? name(b.targetId) : undefined);
              }).join(' · then ')}</div>
            </div>
          )}
        </section>

        <aside className="card focus-panel">
          <h3 className="panel-title small-title"><Clapper size={22} /> Directing focus</h3>
          {METERS.map((m) => (
            <button key={m} className={`focus-row ${focus === m ? 'on' : ''}`} aria-pressed={focus === m} disabled={!!pending} onClick={() => setFocus(m)}>
              <span className={`m-icon m-${m}`}>{METER_ICON[m]}</span>
              <span className="focus-label">{METER_LABEL[m]}{focus === m && <span className="chip">Focus</span>}</span>
              <span className="focus-value">{prediction.meters[m]}</span>
              <span className={`bar m-${m}`}><span style={{ width: `${prediction.meters[m]}%` }} /></span>
            </button>
          ))}
          <p className="small muted">Expected with this cast, set and focus.</p>
          <div className="row wrap factor-chips">
            {prediction.factors.map((f) => <span key={f.label} className="tag">{f.label} {f.value}</span>)}
          </div>
          <button className="record" disabled={!!pending} onClick={() => apply(doWeek(p, { kind: 'shoot', sceneId, setId, focus }))}>
            <span className="rec-dot" /> Record take
            <span className="rec-cost">1 week · {money(shootWeekCost(film, scene, set))}</span>
          </button>
          <button disabled={!!pending} onClick={() => apply(doWeek(p, { kind: 'practice', sceneId }))}>
            Practice this scene · 1 week ({money(crewWeekCost(film))})
          </button>
        </aside>
      </div>

      <div className="card bottom-bar">
        <div className="cast-strip">
          <h3 className="panel-title small-title"><People size={22} /> Cast</h3>
          <div className="cast-cards">
            {film.roles.map((r) => (
              <div key={r.id} className={`cast-card ${participants(scene).includes(r.id) ? 'in-scene' : ''}`}>
                {r.actor && <Face actor={r.actor} size={58} />}
                <strong>{r.actor?.name.split(' ').map((w, i) => (i ? w : w[0] + '.')).join(' ')}</strong>
                <span className="small muted">{r.name}</span>
                <span className="bar fatigue" title={`${st.fatigue[r.id] ?? 0}% tired`}><span style={{ width: `${st.fatigue[r.id] ?? 0}%` }} /></span>
              </div>
            ))}
          </div>
          <div className="weight"><span>Bond</span><span className="bar m-chemistry"><span style={{ width: `${st.bond}%` }} /></span><span className="muted">{st.bond}</span></div>
          <Chemistry film={film} />
        </div>
        <div className="set-strip">
          <h3 className="panel-title small-title">▲ Select a set</h3>
          <div className="set-picks">
            {sortedSets.map((s) => (
              <button key={s.id} className={`set-pick ${s.id === setId ? 'selected' : ''}`} disabled={!!pending} onClick={() => setSetId(s.id)} aria-pressed={s.id === setId}>
                <IsoSet set={s} height={76} />
                <strong>{s.name}</strong>
                <span className="small muted">fit {setFit(s, scene)} · {money(s.dayCost)}/day</span>
                {s.id === setId && <span className="check">✓</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="shoot-footer">
        <div className="card">
          <h3>Cast activities</h3>
          <div className="row">
            <button disabled={!!pending} onClick={() => apply(doWeek(p, { kind: 'club' }))}>🍸 Club meetup · 1 week <span className="muted small">+chemistry</span></button>
            <button disabled={!!pending} onClick={() => apply(doWeek(p, { kind: 'relax' }))}>🌴 Relax · 1 week <span className="muted small">−fatigue, lines fade</span></button>
          </div>
          <p className="small muted">Each week costs {money(crewWeekCost(film))} in crew.</p>
        </div>
        <div className="card">
          <button className="primary wide" disabled={blockers.length > 0} onClick={() => apply(wrapShooting(p))}>Wrap shooting → Edit</button>
          <p className="small muted">Wrapping shoots the filler in one block (1 week).</p>
          {blockers.length > 0 && <p className="small bad">{blockers[0]}</p>}
          {weeksLeft(film) < 0 && <p className="small bad">You are past the deadline: every extra week costs grade points.</p>}
        </div>
        <div className="card log">
          <h3>Log</h3>
          {[...st.log].reverse().slice(0, 6).map((l, i) => <p key={i} className="small"><span className="muted">W{l.week}</span> {l.text}</p>)}
        </div>
      </div>
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
        <span className="small">{weeksLeft(film) >= 0 ? `${weeksLeft(film)} weeks left for shooting and editing` : <span className="bad">{-weeksLeft(film)} weeks late</span>}</span>
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

function Chemistry({ film }: { film: Film }) {
  const revealed = Object.entries(film.shooting!.revealedPairs);
  const nameOf = (actorId: string) => film.roles.find((r) => r.actor?.id === actorId)?.actor?.name ?? '?';
  if (!revealed.length) return <p className="small muted">Chemistry between actors is revealed when they first shoot together.</p>;
  return (
    <p className="small">
      {revealed.map(([k, v]) => {
        const [a, b] = k.split('|');
        return <span key={k} className={`chip ${v >= 15 ? 'win' : ''}`}>{nameOf(a).split(' ')[0]} × {nameOf(b).split(' ')[0]}: {v >= 15 ? 'sparks' : v < 0 ? 'friction' : 'okay'} ({v > 0 ? '+' : ''}{v})</span>;
      })}
    </p>
  );
}

function ShootStage({ p, pending, onPick, onRetry }: { p: Profile; pending: PendingShoot; onPick: (id: string) => void; onRetry: () => void }) {
  const film = p.activeFilm!;
  const scene = film.scenes.find((s) => s.id === pending.sceneId)!;
  const set = setById(pending.setId);
  const cast = stageCast(film, scene);
  const [time, setTime] = useState(() => (reducedMotion() ? 1 : 0));
  const start = useRef<number | null>(null);
  useEffect(() => {
    if (reducedMotion()) return;
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
  const passed = pending.bubbles.filter((b) => b.t <= time);
  const live: StageBubble[] = done ? [] : passed
    .map((b, i) => ({ b, i }))
    .filter(({ b }) => time - b.t < 0.16)
    .map(({ b, i }) => ({ key: `${i}-${b.t}`, actorId: b.roleId, meter: b.meter, value: b.value }));
  const acting = [...new Set(live.map((b) => b.actorId).filter(Boolean) as string[])];
  const meters = Object.fromEntries(METERS.map((m) => [m, passed.filter((b) => b.meter === m).reduce((a, b) => a + b.value, 0)])) as Record<Meter, number>;
  const nameOf = (actorId: string) => film.roles.find((r) => r.actor?.id === actorId)?.actor?.name ?? '?';

  return (
    <div className="studio-stage shooting-now" style={{ backgroundImage: `url(${art('stage-bg')})` }}>
      <div className="row between stage-top">
        <span className="rec-badge">● REC</span>
        <span className="kicker light">Scene {film.scenes.indexOf(scene) + 1} · {set.name} · focus {METER_LABEL[pending.focus]}</span>
        {!done && <button className="ghost-dark" onClick={() => setTime(1)}>Skip ▶▶</button>}
      </div>
      <IsoSet set={set} extras={Math.min(set.extrasCapacity, 14)} height={400} studio lights={false} actors={cast} acting={acting} bubbles={live} />
      <div className="live-meters">
        {METERS.map((m) => (
          <div key={m} className="weight live">
            <span className={`m-icon m-${m}`}>{METER_ICON[m]}</span>
            <span className={`bar m-${m}`}><span style={{ width: `${meters[m]}%` }} /></span>
            <strong>{meters[m]}</strong>
          </div>
        ))}
      </div>
      {done && (
        <div className="takes">
          {pending.revealed.length > 0 && (
            <p className="small light-text">
              Chemistry discovered:{' '}
              {pending.revealed.map((k) => {
                const v = film.shooting!.revealedPairs[k];
                const [a, b] = k.split('|');
                return <span key={k} className={`chip ${v >= 15 ? 'win' : ''}`}>{nameOf(a).split(' ')[0]} × {nameOf(b).split(' ')[0]} ({v > 0 ? '+' : ''}{v})</span>;
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
          <div className="row">
            <button onClick={onRetry}>Try again another week</button>
            {chosenTake(scene) && <span className="small light-text">Current take for this scene: {chosenTake(scene)!.score}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

// Re-exported for the edit (post) screen.
export { actionById };
