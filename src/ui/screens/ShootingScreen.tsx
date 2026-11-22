import { useEffect, useMemo, useRef, useState } from 'react';
import type { Film, Meter, PendingShoot, Profile, Scene } from '../../engine/types';
import { useGame, useProfile } from '../store';
import { Face } from '../components/Face';
import { reducedMotion } from '../prefs';
import { art } from '../art';
import { IsoSet, stageActorFor, type StageActor, type StageBubble } from '../components/IsoSet';
import { Bolt, Heart, Speech } from '../components/Icons';
import { ActionBar, Sheet, Stat, Tabs, useToast } from '../components/ui';
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

type ShootTab = 'week' | 'scenes' | 'cast' | 'log';
type Flow = null | { kind: 'shoot'; sceneId?: string } | { kind: 'practice' } | { kind: 'club' } | { kind: 'relax' };

/** Shooting is a week-by-week loop: see where you stand, pick this week's activity, play it. */
export function ShootingScreen() {
  const p = useProfile();
  const { update } = useGame();
  const film = p.activeFilm!;
  const st = film.shooting!;
  const [tab, setTab] = useState<ShootTab>('week');
  const [flow, setFlow] = useState<Flow>(null);
  const toast = useToast();
  const blockers = shootingBlockers(film);
  const kept = film.scenes.filter((s) => s.chosenTakeId).length;

  const apply = (r: ShootResult) => {
    if (!r.ok) return toast.show(r.reason), false;
    update(() => r.profile);
    const log = r.profile.activeFilm?.shooting?.log;
    const last = log?.[log.length - 1];
    if (last && last !== st.log[st.log.length - 1] && !r.profile.activeFilm?.shooting?.pending) toast.show(`Week ${last.week}: ${last.text}`);
    return true;
  };

  return (
    <div className="stack phase-screen">
      <Tabs label="Shooting" value={tab} onChange={setTab} tabs={[
        { id: 'week', label: 'This week' },
        { id: 'scenes', label: 'Scenes', badge: `${kept}/${film.scenes.length}` },
        { id: 'cast', label: 'Cast' },
        { id: 'log', label: 'Log' },
      ]} />

      {tab === 'week' && (
        <>
          <WeekStatus film={film} />
          <div className="activity-grid">
            <button className="activity a-shoot" onClick={() => setFlow({ kind: 'shoot' })}>
              <span className="a-icon">🎬</span><strong>Shoot a scene</strong>
              <span className="small">Record a take</span>
            </button>
            <button className="activity a-practice" onClick={() => setFlow({ kind: 'practice' })}>
              <span className="a-icon">📖</span><strong>Rehearse</strong>
              <span className="small">Sharper pace and lines</span>
            </button>
            <button className="activity a-club" onClick={() => setFlow({ kind: 'club' })}>
              <span className="a-icon">🍸</span><strong>Club night</strong>
              <span className="small">Cast bonds</span>
            </button>
            <button className="activity a-relax" onClick={() => setFlow({ kind: 'relax' })}>
              <span className="a-icon">🌴</span><strong>Day off</strong>
              <span className="small">Rest the cast</span>
            </button>
          </div>
        </>
      )}
      {tab === 'scenes' && <ScenesStatus film={film} onShoot={(id) => setFlow({ kind: 'shoot', sceneId: id })} />}
      {tab === 'cast' && <CastStatus film={film} />}
      {tab === 'log' && (
        <div className="card">
          {st.log.length === 0 ? <p className="muted">Nothing yet.</p> : [...st.log].reverse().map((l, i) => <p key={i} className="small"><span className="muted">W{l.week}</span> {l.text}</p>)}
        </div>
      )}

      {flow?.kind === 'shoot' && !st.pending && <ShootFlow initialScene={flow.sceneId} onApply={apply} onClose={() => setFlow(null)} />}
      {flow?.kind === 'practice' && (
        <Sheet title="Rehearse" kicker={`1 week · ${money(crewWeekCost(film))}`} onClose={() => setFlow(null)}>
          <div className="list">
            {film.scenes.map((s, i) => {
              const pr = st.practice[s.id];
              return (
                <button key={s.id} className="list-row" onClick={() => apply(doWeek(p, { kind: 'practice', sceneId: s.id })) && setFlow(null)}>
                  <span className="scene-num">{i + 1}</span>
                  <span className="list-main"><strong>{sceneName(film, s)}</strong><span className="small muted">{pr ? `Rehearsed: pace ${pr.pace} · lines ${pr.dialogue}` : 'Not rehearsed'}</span></span>
                  <span aria-hidden="true">›</span>
                </button>
              );
            })}
          </div>
        </Sheet>
      )}
      {(flow?.kind === 'club' || flow?.kind === 'relax') && (
        <Sheet
          title={flow.kind === 'club' ? 'Club night' : 'Day off'}
          kicker={`1 week · ${money(crewWeekCost(film))}`}
          onClose={() => setFlow(null)}
          footer={<>
            <button onClick={() => setFlow(null)}>Back</button>
            <button className="primary" onClick={() => apply(doWeek(p, { kind: flow.kind })) && setFlow(null)}>Spend the week</button>
          </>}
        >
          {flow.kind === 'club'
            ? <p className="effect-line"><span className="good">❤ Bond ▲</span> <span className="bad">😓 Fatigue ▲</span></p>
            : <p className="effect-line"><span className="good">😌 Fatigue ▼</span> <span className="good">⚡ Next shoot ▲</span> <span className="bad">💬 Rehearsals ▼</span></p>}
          <div className="stat-row">
            <Stat label="Bond" value={st.bond} />
            <Stat label="Avg. fatigue" value={`${avgFatigue(film)}%`} tone={avgFatigue(film) > 50 ? 'bad' : undefined} />
          </div>
        </Sheet>
      )}
      {st.pending && (
        <Sheet wide title={`Scene ${film.scenes.findIndex((s) => s.id === st.pending!.sceneId) + 1}`} kicker="On set">
          <ShootStage key={st.pending.versions[0].id} p={p} pending={st.pending} onPick={(id) => apply(chooseVersion(p, id))} onRetry={() => apply(tryAgain(p))} />
        </Sheet>
      )}
      {toast.node}

      <ActionBar>
        <span className="bar-stat"><span className="kicker">Takes kept</span><strong>{kept}/{film.scenes.length}</strong></span>
        <button className="primary grow" disabled={blockers.length > 0} onClick={() => confirm('Wrap shooting? The filler is shot in one week, then you move to the edit.') && apply(wrapShooting(p))}>
          {blockers.length ? blockers[0] : 'Wrap shooting ›'}
        </button>
      </ActionBar>
    </div>
  );
}

const avgFatigue = (film: Film) => {
  const v = Object.values(film.shooting!.fatigue);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
};

function WeekStatus({ film }: { film: Film }) {
  const st = film.shooting!;
  const kept = film.scenes.filter((s) => s.chosenTakeId).length;
  const fat = avgFatigue(film);
  return (
    <div className="card week-status">
      <Calendar film={film} />
      <div className="icon-stats">
        <span title="Takes kept" className={kept === film.scenes.length ? 'good' : ''}>🎞 {kept}/{film.scenes.length}</span>
        <span title="Cast fatigue" className={fat > 50 ? 'bad' : ''}>😓 {fat}%</span>
        <span title="Cast bond">❤ {st.bond}</span>
        {st.fresh > 0 && <span title="Rested" className="good">😌</span>}
      </div>
    </div>
  );
}

function ScenesStatus({ film, onShoot }: { film: Film; onShoot: (id: string) => void }) {
  const st = film.shooting!;
  return (
    <div className="list">
      {film.scenes.map((s, i) => {
        const take = chosenTake(s);
        return (
          <button key={s.id} className={`list-row scene-row t-border-${s.tone}`} onClick={() => onShoot(s.id)}>
            <span className="scene-num">{i + 1}</span>
            <span className="list-main">
              <strong>{sceneName(film, s)}</strong>
              <span className="small muted">{take ? `Kept: ${take.version} cut` : (st.shoots[s.id] ?? 0) > 0 ? 'Shot, no take kept' : 'Not shot'}{s.setId && ` · ${setById(s.setId).name}`}</span>
            </span>
            {take ? <span className="score-badge">{take.score}</span> : <span className="chip-cta">Shoot ›</span>}
          </button>
        );
      })}
    </div>
  );
}

function CastStatus({ film }: { film: Film }) {
  const st = film.shooting!;
  return (
    <>
      <div className="list">
        {film.roles.map((r) => (
          <div key={r.id} className="list-row static">
            {r.actor && <Face actor={r.actor} size={44} />}
            <span className="list-main">
              <strong>{r.actor?.name}</strong>
              <span className="small muted">{r.name}</span>
            </span>
            <span className="list-side fatigue-side">
              <span className="small muted">Fatigue {st.fatigue[r.id] ?? 0}%</span>
              <span className="bar fatigue"><span style={{ width: `${st.fatigue[r.id] ?? 0}%` }} /></span>
            </span>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="weight"><span>Bond</span><span className="bar m-chemistry"><span style={{ width: `${st.bond}%` }} /></span><span className="muted">{st.bond}</span></div>
        <Chemistry film={film} />
      </div>
    </>
  );
}

/** Shoot: pick a scene, then set + focus (with the forecast), then record. */
function ShootFlow({ initialScene, onApply, onClose }: { initialScene?: string; onApply: (r: ShootResult) => boolean; onClose: () => void }) {
  const p = useProfile();
  const film = p.activeFilm!;
  const level = p.directors[film.directorId]?.level ?? 1;
  const [sceneId, setSceneId] = useState<string | undefined>(initialScene);
  const scene = film.scenes.find((s) => s.id === sceneId);
  const unlockedSets = SETS.filter((s) => p.unlocks.sets.includes(s.id));
  const sortedSets = useMemo(() => (scene ? [...unlockedSets].sort((a, b) => setFit(b, scene) - setFit(a, scene)) : unlockedSets), [scene, unlockedSets]);
  const [setId, setSetId] = useState<string | undefined>(scene?.setId);
  const [focus, setFocus] = useState<Meter>('pace');
  useEffect(() => setSetId(scene?.setId ?? sortedSets[0]?.id), [sceneId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!scene) {
    return (
      <Sheet title="Shoot a scene" kicker="Step 1 of 2 · pick a scene" onClose={onClose}>
        <ScenesStatus film={film} onShoot={setSceneId} />
      </Sheet>
    );
  }
  const set = setById(setId ?? sortedSets[0].id);
  const prediction = predictMeters(film, scene, set, focus, level);
  return (
    <Sheet
      wide
      title={`Scene ${film.scenes.indexOf(scene) + 1}`}
      kicker="Step 2 of 2 · set & focus"
      onClose={initialScene ? onClose : () => setSceneId(undefined)}
      footer={<>
        <button onClick={initialScene ? onClose : () => setSceneId(undefined)}>Back</button>
        <button className="record grow" onClick={() => onApply(doWeek(p, { kind: 'shoot', sceneId: scene.id, setId: set.id, focus })) && onClose()}>
          <span className="rec-dot" /> Record · {money(shootWeekCost(film, scene, set))}
        </button>
      </>}
    >
      <div className="studio-stage compact" style={{ backgroundImage: `url(${art('stage-bg')})` }}>
        <IsoSet set={set} extras={Math.min(set.extrasCapacity, 10)} height={210} studio lights={false} actors={stageCast(film, scene)} />
        <div className="stage-caption">{scene.beats.map((b) => {
          const name = (id?: string) => film.roles.find((r) => r.id === id)?.name ?? '';
          return describeBeat(name(b.roleId), b.actionId, b.targetId ? name(b.targetId) : undefined);
        }).join(' · then ')}</div>
      </div>
      <div className="section-label">Set</div>
      <div className="set-picks scroll-x">
        {sortedSets.map((s) => (
          <button key={s.id} className={`set-pick ${s.id === set.id ? 'selected' : ''}`} onClick={() => setSetId(s.id)} aria-pressed={s.id === set.id}>
            <IsoSet set={s} height={60} />
            <strong className="small">{s.name}</strong>
            <span className={`small ${setFit(s, scene) >= 70 ? 'good' : 'muted'}`}>fit {setFit(s, scene)}</span>
          </button>
        ))}
      </div>
      <div className="section-label">Direct for · expected result</div>
      <div className="focus-list">
        {METERS.map((m) => (
          <button key={m} className={`focus-row ${focus === m ? 'on' : ''}`} aria-pressed={focus === m} onClick={() => setFocus(m)}>
            <span className={`m-icon m-${m}`}>{METER_ICON[m]}</span>
            <span className="focus-label">{METER_LABEL[m]}</span>
            <span className={`bar m-${m}`}><span style={{ width: `${prediction.meters[m]}%` }} /></span>
            <span className="focus-value">{prediction.meters[m]}</span>
          </button>
        ))}
      </div>
      <details className="fold">
        <summary className="small">Why these numbers?</summary>
        <div className="row wrap factor-chips">{prediction.factors.map((f) => <span key={f.label} className="tag">{f.label} {f.value}</span>)}</div>
      </details>
    </Sheet>
  );
}

export function Calendar({ film }: { film: Film }) {
  const used = weeksUsed(film);
  const total = Math.max(film.contract.deadlineWeeks, used);
  return (
    <div className="calendar">
      <div className="row between wrap">
        <strong className="cal-week">📅 Week {used}<span className="muted">/{film.contract.deadlineWeeks}</span>{weeksLeft(film) < 0 && <span className="bad"> · {-weeksLeft(film)} late</span>}</strong>
        <strong className={budgetLeftShooting(film) < 0 ? 'bad' : ''}>💰 {money(budgetLeftShooting(film))}</strong>
      </div>
      <span className="cal-bar" aria-hidden="true">
        <span className="cal-used" style={{ width: `${Math.min(100, (used / total) * 100)}%` }} />
        {total > film.contract.deadlineWeeks && <span className="cal-late" style={{ left: `${(film.contract.deadlineWeeks / total) * 100}%` }} />}
      </span>
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
      <IsoSet set={set} extras={Math.min(set.extrasCapacity, 14)} height={300} studio lights={false} actors={cast} acting={acting} bubbles={live} />
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
