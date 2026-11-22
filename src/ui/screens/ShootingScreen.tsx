import { useEffect, useMemo, useRef, useState } from 'react';
import { LOCKED_MSG, useReview } from '../review';
import type { Film, Meter, PendingShoot, Profile, Scene } from '../../engine/types';
import { useGame, useProfile } from '../store';
import { Face } from '../components/Face';
import { reducedMotion } from '../prefs';
import { art } from '../art';
import { IsoSet, stageActorFor, type StageActor, type StageBubble } from '../components/IsoSet';
import { Bolt, Heart, Speech } from '../components/Icons';
import { ActionBar, Sheet, Stat, useToast } from '../components/ui';
import { Monitor, NleTimeline, Panel, timecode, type Track } from '../components/Nle';
import { Glyph, Medallion, type GlyphName } from '../components/GameIcons';
import { SETS, setById } from '../../engine/data/sets';
import { toneById } from '../../engine/data/tones';
import { actionById } from '../../engine/data/actions';
import { describeBeat, money } from '../../engine/format';
import { layout, participants } from '../../engine/script';
import {
  METERS, chooseVersion, chosenTake, crewWeekCost, doWeek, setFit, shootWeekCost, shootingBlockers,
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
interface WeekResult { week: number; text: string; fatigue: number; bond: number; spent: number; kept: number }

/** What last week did, in one card that stays put until the next week. */
function WeekResultCard({ r, onClose }: { r: WeekResult; onClose: () => void }) {
  const chip = (cond: boolean, icon: GlyphName, label: string, good: boolean) =>
    cond && <span className={`delta ${good ? 'good' : 'bad'}`}><Glyph name={icon} size={16} /> {label}</span>;
  return (
    <div className="card week-result" role="status">
      <div className="row between">
        <span className="kicker">Week {r.week} done</span>
        <button className="icon ghost-btn small" aria-label="Dismiss" onClick={onClose}>✕</button>
      </div>
      <strong className="wr-text">{r.text}</strong>
      <div className="wr-deltas">
        {chip(r.kept > 0, 'film', `+${r.kept} take kept`, true)}
        {chip(Math.round(r.bond) !== 0, 'heart', `Bond ${r.bond > 0 ? '+' : ''}${Math.round(r.bond)}`, r.bond > 0)}
        {chip(Math.round(r.fatigue) !== 0, 'sweat', `Fatigue ${r.fatigue > 0 ? '+' : ''}${Math.round(r.fatigue)}%`, r.fatigue < 0)}
        {chip(r.spent > 0, 'coins', `−${money(r.spent)}`, false)}
      </div>
    </div>
  );
}
type Flow = null | { kind: 'shoot'; sceneId?: string } | { kind: 'practice' } | { kind: 'club' } | { kind: 'relax' };

/** Shooting is a week-by-week loop: see where you stand, pick this week's activity, play it. */
export function ShootingScreen() {
  const p = useProfile();
  const { update } = useGame();
  const film = p.activeFilm!;
  const st = film.shooting!;
  const [tab, setTab] = useState<ShootTab>('week');
  const [flow, setFlow] = useState<Flow>(null);
  const [sel, setSel] = useState<string | undefined>();
  const toast = useToast();
  const blockers = shootingBlockers(film);
  const kept = film.scenes.filter((s) => s.chosenTakeId).length;

  const [result, setResult] = useState<WeekResult | null>(null);
  const review = useReview();
  const apply = (r: ShootResult) => {
    if (review.readOnly) return toast.show(LOCKED_MSG), false;
    if (!r.ok) return toast.show(r.reason), false;
    update(() => r.profile);
    const next = r.profile.activeFilm;
    const log = next?.shooting?.log;
    const last = log?.[log.length - 1];
    if (next?.shooting && last && last !== st.log[st.log.length - 1]) {
      setResult({
        week: last.week, text: last.text,
        fatigue: avgFatigue(next) - avgFatigue(film), bond: next.shooting.bond - st.bond,
        spent: budgetLeftShooting(film) - budgetLeftShooting(next),
        kept: next.scenes.filter((s) => s.chosenTakeId).length - kept,
      });
      setTab('week');
    }
    return true;
  };

  // The monitor shows the next scene to shoot (or the selected one) on the best set you own for it.
  const slots = layout(film);
  const slotOf = (id: string) => slots.find((x) => x.sceneId === id);
  const nextScene = film.scenes.find((x) => x.id === sel) ?? film.scenes.find((x) => !x.chosenTakeId) ?? film.scenes[0];
  const nextIdx = film.scenes.indexOf(nextScene);
  const nextTake = nextScene && chosenTake(nextScene);
  const sets = SETS.filter((x) => p.unlocks.sets.includes(x.id));
  const stageSet = nextTake ? setById(nextTake.setId) : [...sets].sort((a, b) => setFit(b, nextScene) - setFit(a, nextScene))[0];
  const tracks: Track[] = [{
    id: 'V1', name: 'Footage', tall: true, clips: film.scenes.map((x, i) => {
      const t = chosenTake(x);
      const sl = slotOf(x.id);
      return {
        id: x.id, start: sl?.start ?? 0, len: sl?.minutes ?? 0, kind: t ? 'video' as const : 'empty' as const, tone: x.tone,
        label: t ? `${i + 1} · ${sceneName(film, x)}` : `${i + 1} · not shot`, badge: t?.score,
        selected: x.id === nextScene?.id, onClick: () => setSel(x.id), title: sceneName(film, x),
      };
    }),
  }, {
    id: 'A1', name: 'Takes', clips: film.scenes.filter((x) => (st.shoots[x.id] ?? 0) > 0).map((x) => ({
      id: `n-${x.id}`, start: slotOf(x.id)?.start ?? 0, len: slotOf(x.id)?.minutes ?? 0, kind: 'sfx' as const,
      label: `${st.shoots[x.id]} take${st.shoots[x.id] === 1 ? '' : 's'}`,
    })),
  }];

  return (
    <>
      <Panel area="props" tabs={[{ id: 'week', label: 'This week' }, { id: 'log', label: 'Log' }]} tab={tab === 'log' ? 'log' : 'week'} onTab={(t) => setTab(t as ShootTab)}>
        {tab !== 'log' ? (
          <>
            {result && <WeekResultCard r={result} onClose={() => setResult(null)} />}
            <WeekStatus film={film} />
            {!review.readOnly && <div className="activity-grid">
              <button className="activity a-shoot" onClick={() => setFlow({ kind: 'shoot', sceneId: nextScene?.id })}>
                <Medallion name="clapper" size={40} tone="ruby" /><strong>Shoot</strong>
              </button>
              <button className="activity a-practice" onClick={() => setFlow({ kind: 'practice' })}>
                <Medallion name="book" size={40} tone="gold" /><strong>Rehearse</strong>
              </button>
              <button className="activity a-club" onClick={() => setFlow({ kind: 'club' })}>
                <Medallion name="glass" size={40} tone="gold" /><strong>Club night</strong>
              </button>
              <button className="activity a-relax" onClick={() => setFlow({ kind: 'relax' })}>
                <Medallion name="rest" size={40} tone="gold" /><strong>Day off</strong>
              </button>
            </div>}
          </>
        ) : (
          <div className="stack">
            {st.log.length === 0 ? <p className="muted">Nothing yet.</p> : [...st.log].reverse().map((l, i) => <p key={i} className="small"><span className="nle-tc">W{l.week}</span> {l.text}</p>)}
          </div>
        )}
      </Panel>

      <Monitor
        title={`Camera A: Scene ${nextIdx + 1}${stageSet ? ` · ${stageSet.name}` : ''}`}
        current={timecode(slotOf(nextScene?.id ?? '')?.start ?? 0)}
        duration={`${kept}/${film.scenes.length} kept`}
        transport={<>
          <button aria-label="Previous scene" onClick={() => setSel(film.scenes[(nextIdx - 1 + film.scenes.length) % film.scenes.length].id)}>⏮</button>
          {!review.readOnly && <button className="play rec" aria-label={`Shoot scene ${nextIdx + 1}`} title="Shoot this scene" onClick={() => setFlow({ kind: 'shoot', sceneId: nextScene?.id })}>●</button>}
          <button aria-label="Next scene" onClick={() => setSel(film.scenes[(nextIdx + 1) % film.scenes.length].id)}>⏭</button>
        </>}
      >
        {stageSet && nextScene && <IsoSet set={stageSet} extras={Math.min(stageSet.extrasCapacity, 10)} height={300} studio lights={false} actors={stageCast(film, nextScene)} />}
        <span className="caption-overlay">{nextTake ? `Kept: ${nextTake.version} cut · ${nextTake.score}` : `${sceneName(film, nextScene)} · not shot yet`}</span>
      </Monitor>

      <Panel area="side" title="Cast">
        <CastStatus film={film} />
      </Panel>

      <NleTimeline runtime={film.runtime} tracks={tracks} playhead={slotOf(nextScene?.id ?? '')?.start ?? 0} sequence={`${film.title} · dailies`} />

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
            ? <p className="effect-line"><span className="good"><Glyph name="heart" /> Bond ▲</span> <span className="bad"><Glyph name="sweat" /> Fatigue ▲</span></p>
            : <p className="effect-line"><span className="good"><Glyph name="sweat" /> Fatigue ▼</span> <span className="good"><Glyph name="bolt" /> Next shoot ▲</span> <span className="bad"><Glyph name="speech" /> Rehearsals ▼</span></p>}
          <div className="stat-row">
            <Stat label="Bond" value={st.bond} />
            <Stat label="Avg. fatigue" value={`${avgFatigue(film)}%`} tone={avgFatigue(film) > 50 ? 'bad' : undefined} />
          </div>
        </Sheet>
      )}
      {st.pending && (
        <Sheet wide title={`Scene ${film.scenes.findIndex((s) => s.id === st.pending!.sceneId) + 1}`} kicker="On set">
          <ShootStage key={st.pending.versions[0].id} p={p} pending={st.pending} onPick={(id) => apply(chooseVersion(p, id))} onRetry={() => { const sid = st.pending!.sceneId; if (apply(tryAgain(p))) setFlow({ kind: 'shoot', sceneId: sid }); }} />
        </Sheet>
      )}
      {toast.node}

      <div className="nle-status">
        <ActionBar>
          <span className="bar-stat"><span className="kicker">Takes kept</span><strong>{kept}/{film.scenes.length}</strong></span>
          <button className="primary grow" disabled={blockers.length > 0} onClick={() => confirm('Wrap shooting? The filler is shot in one week, then you move to the edit.') && apply(wrapShooting(p))}>
            {blockers.length ? blockers[0] : "That's a wrap ›"}
          </button>
        </ActionBar>
      </div>
    </>
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
        <span title="Takes kept" className={kept === film.scenes.length ? 'good' : ''}><Glyph name="film" size={18} /> {kept}/{film.scenes.length}</span>
        <span title="Cast fatigue" className={fat > 50 ? 'bad' : ''}><Glyph name="sweat" size={18} /> {fat}%</span>
        <span title="Cast bond"><Glyph name="heart" size={18} /> {st.bond}</span>
        {st.fresh > 0 && <span title="Rested" className="good"><Glyph name="rest" size={18} /> rested</span>}
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
      <div className="cast-mini">
        {film.roles.map((r) => (
          <div key={r.id} className="cast-mini-row" title={`${r.actor?.name} as ${r.name}`}>
            {r.actor && <Face actor={r.actor} size={36} />}
            <span>
              <strong className="small">{r.actor?.name}</strong>
              <span className="bar fatigue" title={`Fatigue ${st.fatigue[r.id] ?? 0}%`}><span style={{ width: `${st.fatigue[r.id] ?? 0}%` }} /></span>
            </span>
            <span className="small muted">{st.fatigue[r.id] ?? 0}%</span>
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
  void level;
  const st = film.shooting!;
  const ids = participants(scene);
  const castHere = ids.map((id) => film.roles.find((r) => r.id === id)).filter(Boolean) as Film['roles'];
  const fatigues = castHere.map((r) => st.fatigue[r.id] ?? 0);
  const avgFat = fatigues.length ? Math.round(fatigues.reduce((a, b) => a + b, 0) / fatigues.length) : 0;
  const maxFat = Math.max(0, ...fatigues);
  const practice = st.practice[scene.id];
  const pairs: { names: string; v?: number }[] = [];
  for (let i = 0; i < castHere.length; i++)
    for (let j = i + 1; j < castHere.length; j++) {
      const a = castHere[i].actor!, b = castHere[j].actor!;
      pairs.push({ names: `${a.name.split(' ')[0]} × ${b.name.split(' ')[0]}`, v: st.revealedPairs[[a.id, b.id].sort().join('|')] });
    }
  const fit = setFit(set, scene);
  const num = (v: number, good: number, bad: number, invert = false) => (invert ? (v <= good ? 'good' : v >= bad ? 'bad' : '') : (v >= good ? 'good' : v <= bad ? 'bad' : ''));
  const week = money(crewWeekCost(film));
  return (
    <Sheet
      wide
      title={`Scene ${film.scenes.indexOf(scene) + 1}`}
      kicker={sceneName(film, scene)}
      onClose={initialScene ? onClose : () => setSceneId(undefined)}
      footer={<>
        <button onClick={initialScene ? onClose : () => setSceneId(undefined)}>Back</button>
        <button title={`Rehearse this scene · 1 week · ${week}`} onClick={() => onApply(doWeek(p, { kind: 'practice', sceneId: scene.id })) && onClose()}>Rehearse</button>
        <button title={`Rest the cast · 1 week · ${week}`} onClick={() => onApply(doWeek(p, { kind: 'relax' })) && onClose()}>Day off</button>
        <button className="record grow" onClick={() => onApply(doWeek(p, { kind: 'shoot', sceneId: scene.id, setId: set.id, focus })) && onClose()}>
          <span className="rec-dot" /> Record · {money(shootWeekCost(film, scene, set))}
        </button>
      </>}
    >
      <div className="studio-stage compact" style={{ backgroundImage: `url(${art('stage-bg')})` }}>
        <IsoSet set={set} extras={Math.min(set.extrasCapacity, 10)} height={190} studio lights={false} actors={stageCast(film, scene)} />
        <div className="stage-caption">{scene.beats.map((b) => {
          const name = (id?: string) => film.roles.find((r) => r.id === id)?.name ?? '';
          return describeBeat(name(b.roleId), b.actionId, b.targetId ? name(b.targetId) : undefined);
        }).join(' · then ')}</div>
      </div>
      <div className="section-label">Set</div>
      <div className="set-picks scroll-x">
        {sortedSets.map((x) => (
          <button key={x.id} className={`set-pick ${x.id === set.id ? 'selected' : ''}`} onClick={() => setSetId(x.id)} aria-pressed={x.id === set.id}>
            <IsoSet set={x} height={60} />
            <strong className="small">{x.name}</strong>
            <span className={`small ${setFit(x, scene) >= 70 ? 'good' : 'muted'}`}>fit {setFit(x, scene)}</span>
          </button>
        ))}
      </div>
      <div className="section-label">On set today</div>
      <div className="cond-grid">
        <span className="cond"><span className="cond-k">Set fit</span><strong className={num(fit, 75, 50)}>{fit}</strong></span>
        <span className="cond"><span className="cond-k">Bond</span><strong className={num(st.bond, 50, 15)}>{st.bond}</strong></span>
        <span className="cond"><span className="cond-k">Rehearsal</span><strong className={practice ? num(Math.max(practice.pace, practice.dialogue), 50, 15) : 'bad'}>{practice ? `${practice.pace} / ${practice.dialogue}` : '0'}</strong><span className="cond-sub">pace / lines</span></span>
        <span className="cond"><span className="cond-k">Fatigue</span><strong className={num(avgFat, 25, 55, true)}>{avgFat}%</strong><span className="cond-sub">max {maxFat}%{st.fresh > 0 ? ' · rested' : ''}</span></span>
        {pairs.map((x) => (
          <span key={x.names} className="cond"><span className="cond-k">{x.names}</span><strong className={x.v === undefined ? 'muted' : num(x.v, 15, -10)}>{x.v === undefined ? '?' : `${x.v > 0 ? '+' : ''}${x.v}`}</strong><span className="cond-sub">chemistry</span></span>
        ))}
      </div>
      <div className="section-label">Direct for</div>
      <div className="seg">
        {METERS.map((m) => <button key={m} className={focus === m ? 'on' : ''} aria-pressed={focus === m} onClick={() => setFocus(m)}>{METER_ICON[m]} {METER_LABEL[m]}</button>)}
      </div>
      {scene.takes.length > 0 && (
        <>
          <div className="section-label">Takes so far</div>
          <TakeTable scene={scene} />
        </>
      )}
    </Sheet>
  );
}

/** Earlier takes of a scene, as numbers. */
export function TakeTable({ scene }: { scene: Scene }) {
  return (
    <table className="take-table">
      <thead><tr><th>Take</th><th>Set</th><th>Pace</th><th>Chem.</th><th>Lines</th><th>Score</th></tr></thead>
      <tbody>
        {scene.takes.map((t, i) => (
          <tr key={t.id} className={scene.chosenTakeId === t.id ? 'kept' : ''}>
            <td>{i + 1}{scene.chosenTakeId === t.id ? ' ★' : ''}</td>
            <td>{setById(t.setId).name}</td>
            <td>{t.meters.pace}</td><td>{t.meters.chemistry}</td><td>{t.meters.dialogue}</td>
            <td><strong>{t.score}</strong></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Calendar({ film }: { film: Film }) {
  const used = weeksUsed(film);
  const total = Math.max(film.contract.deadlineWeeks, used);
  return (
    <div className="calendar">
      <div className="row between wrap">
        <strong className="cal-week"><Glyph name="calendar" size={20} /> Week {used}<span className="muted">/{film.contract.deadlineWeeks}</span>{weeksLeft(film) < 0 && <span className="bad"> · {-weeksLeft(film)} late</span>}</strong>
        <strong className={budgetLeftShooting(film) < 0 ? 'bad' : ''}><Glyph name="coins" size={20} /> {money(budgetLeftShooting(film))}</strong>
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
      <div className="live-numbers">
        {METERS.map((m) => (
          <span key={m} className={`live-num m-${m}`}><span className={`m-icon m-${m}`}>{METER_ICON[m]}</span><strong>{done ? pending.versions[0].meters[m] : meters[m]}</strong><em>{METER_LABEL[m]}</em></span>
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
          {pending.versions.map((v) => {
            const prev = chosenTake(scene);
            return (
              <div key={v.id} className="card take-result">
                <div className="take-score"><span className="kicker">Take {scene.takes.length + 1}</span><strong>{v.score}</strong>{prev && <span className={`small ${v.score >= prev.score ? 'good' : 'bad'}`}>kept take {prev.score}</span>}</div>
                <p className="small muted">“{v.feedback}”</p>
                <div className="row take-actions">
                  <button className="primary" onClick={() => onPick(v.id)}>Keep take</button>
                  <button onClick={onRetry}>Shoot again</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Re-exported for the edit (post) screen.
export { actionById };
