import { useEffect, useRef, useState } from 'react';
import type { Film, MusicTier, PolishTier, Scene } from '../../engine/types';
import { useGame, useProfile } from '../store';
import { Calendar } from './ShootingScreen';
import { Face } from '../components/Face';
import { IsoSet } from '../components/IsoSet';
import { setById } from '../../engine/data/sets';
import { toneById } from '../../engine/data/tones';
import { actionById } from '../../engine/data/actions';
import { describeBeat, money } from '../../engine/format';
import { TUNING } from '../../engine/tuning';
import { participants, spent } from '../../engine/script';
import { METERS, chosenTake, weeksUsed } from '../../engine/shooting';
import {
  MUSIC_TIERS, POLISH_TIERS, autoPolish, chooseTake, finishPost, isEmotional, postSummary, setCut, setMusic, setPolish,
  type PolishKind, type PostResult, type SceneScore,
} from '../../engine/post';

const MUSIC_TEXT: Record<MusicTier, string> = {
  none: 'No score',
  library: 'Library music: small flat bonus',
  composer: 'Composer: bonus on emotional scenes',
  star: 'Star composer: large bonus, Best Score eligible',
};
const BEAT_MS = 1400;

export function PostScreen() {
  const p = useProfile();
  const { update } = useGame();
  const film = p.activeFilm!;
  const level = p.directors[film.directorId]?.level ?? 1;
  const [msg, setMsg] = useState<string | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const summary = postSummary(film, level);
  const budgetLeft = film.contract.budget - spent(film);
  const [autoBudget, setAutoBudget] = useState(Math.max(0, Math.round(budgetLeft * 0.3)));
  const scoreOf = (id: string) => summary.scores.find((s) => s.sceneId === id);

  const apply = (r: PostResult) => {
    if (!r.ok) return setMsg(r.reason), false;
    update((q) => ({ ...q, activeFilm: r.film }));
    setMsg(null);
    return true;
  };
  const finishWeek = weeksUsed(film) + summary.weeks;
  const lateBy = finishWeek - film.contract.deadlineWeeks;

  return (
    <div className="shoot">
      <Calendar film={film} />
      {msg && <p className="bad">{msg}</p>}
      {playing && <Playback key={playing} film={film} scene={film.scenes.find((s) => s.id === playing)!} score={scoreOf(playing)} onClose={() => setPlaying(null)} />}
      <div className="script-grid">
        <div className="script-main">
          {film.scenes.map((s, i) => (
            <SceneEdit
              key={s.id}
              film={film}
              scene={s}
              index={i}
              score={scoreOf(s.id)}
              onPlay={() => setPlaying(s.id)}
              onApply={apply}
            />
          ))}
        </div>

        <aside className="script-side">
          <div className="card">
            <h3>Music</h3>
            {MUSIC_TIERS.map((m) => {
              const cost = postSummary({ ...film, music: m }, level).musicCost;
              return (
                <label key={m} className={`choice ${film.music === m ? 'selected' : ''}`}>
                  <input type="radio" name="music" checked={film.music === m} onChange={() => apply(setMusic(film, m))} />
                  <strong>{MUSIC_TEXT[m]}</strong>
                  <div className="small muted">{money(cost)} · {TUNING.post.music[m].days} post days</div>
                </label>
              );
            })}
          </div>

          <div className="card">
            <h3>Auto-polish</h3>
            <p className="small muted">Replaces music and VFX/SFX with the best value for this budget.</p>
            <input type="range" min={0} max={Math.max(0, budgetLeft)} step={50} value={Math.min(autoBudget, Math.max(0, budgetLeft))} onChange={(e) => setAutoBudget(Number(e.target.value))} className="wide" />
            <button className="wide" disabled={autoBudget <= 0} onClick={() => apply({ ok: true, film: autoPolish(film, autoBudget, level) })}>Auto-polish with {money(autoBudget)}</button>
          </div>

          <div className="card">
            <div className="row between">
              <h3>Final cut</h3>
              <span className="big">{summary.cutQuality}</span>
            </div>
            <p className="small">Best scene {summary.best} · worst scene <span className={summary.worst < 50 ? 'bad' : ''}>{summary.worst}</span> · filler {summary.fillerMinutes} min</p>
            <p className="small muted">Critics love peak scenes; the public punishes bad ones.</p>
            {summary.overproduction > 0 && <p className="small bad">Overproduction: too much CGI for this genre (−{summary.overproduction} critics)</p>}
            <div className="section-label">Post costs</div>
            <p className="small">Music {money(summary.musicCost)} · VFX/SFX {money(summary.polishCost)} · crew {money(summary.crewCost)}</p>
            <p>Total <strong>{money(summary.cost)}</strong> · {summary.days} days → {summary.weeks} week{summary.weeks > 1 ? 's' : ''}</p>
            <p className="small">
              Budget after post <strong className={budgetLeft - summary.cost < 0 ? 'bad' : ''}>{money(budgetLeft - summary.cost)}</strong>
              {' · '}finishes week {finishWeek} of {film.contract.deadlineWeeks}
              {lateBy > 0 && <span className="bad"> ({lateBy} late)</span>}
            </p>
          </div>

          <button
            className="primary wide"
            onClick={() => {
              if (!confirm('Lock the final cut and go to the premiere?')) return;
              apply(finishPost(film, level));
            }}
          >
            Lock final cut → Premiere
          </button>
        </aside>
      </div>
    </div>
  );
}

function SceneEdit({
  film, scene, index, score, onPlay, onApply,
}: { film: Film; scene: Scene; index: number; score?: SceneScore; onPlay: () => void; onApply: (r: PostResult) => boolean }) {
  const take = chosenTake(scene);
  const tierRow = (kind: PolishKind) => (
    <div className="row wrap">
      <span className="field-label">{kind.toUpperCase()}</span>
      {POLISH_TIERS.map((t: PolishTier) => (
        <button key={t} disabled={scene.cut} className={scene[kind] === t ? 'primary' : ''} onClick={() => onApply(setPolish(film, scene.id, kind, t))}>{t}</button>
      ))}
    </div>
  );
  return (
    <div className={`card scene-card t-border-${scene.tone} ${scene.cut ? 'cut' : ''}`}>
      <div className="row between wrap">
        <h3>
          Scene {index + 1} <span className="muted small">{toneById(scene.tone).name}{isEmotional(scene) ? ' · emotional' : ''} · {scene.beats.map((b) => actionById(b.actionId).verb).join(', ')}</span>
        </h3>
        <div className="row">
          {!scene.cut && <button onClick={onPlay}>▶ Watch</button>}
          <button className={scene.cut ? '' : 'danger'} onClick={() => onApply(setCut(film, scene.id, !scene.cut))}>{scene.cut ? 'Restore' : 'Cut scene'}</button>
        </div>
      </div>
      {scene.cut ? (
        <p className="muted small">Cut: its minutes are filler now.</p>
      ) : (
        <>
          <label className="row wrap">
            <span className="field-label">Take</span>
            <select value={scene.chosenTakeId} onChange={(e) => onApply(chooseTake(film, scene.id, e.target.value))}>
              {[...scene.takes].sort((a, b) => b.score - a.score).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.score} · {t.version} cut · week {t.week} · {setById(t.setId).name} (P{t.meters.pace} C{t.meters.chemistry} D{t.meters.dialogue})
                </option>
              ))}
            </select>
          </label>
          {take && <p className="small muted">“{take.feedback}”</p>}
          {tierRow('vfx')}
          {tierRow('sfx')}
          {score && (
            <p className="small score-line">
              Take {score.take} + music {score.music} + VFX {score.vfx} + SFX {score.sfx} = <strong className="big-inline">{score.total}</strong>
            </p>
          )}
        </>
      )}
    </div>
  );
}

/** Plays a scene back: the set, the cast, the beats as captions, then the score. */
function Playback({ film, scene, score, onClose }: { film: Film; scene: Scene; score?: SceneScore; onClose: () => void }) {
  const take = chosenTake(scene)!;
  const set = setById(take.setId);
  const ids = participants(scene);
  const [step, setStep] = useState(0);
  const timer = useRef<number>();
  const total = scene.beats.length + 1; // beats, then the score
  useEffect(() => {
    timer.current = window.setInterval(() => setStep((s) => Math.min(total, s + 1)), BEAT_MS);
    return () => window.clearInterval(timer.current);
  }, [total]);
  const roleName = (id?: string) => film.roles.find((r) => r.id === id)?.name ?? '';
  const beat = scene.beats[Math.min(step, scene.beats.length - 1)];
  const done = step >= scene.beats.length;
  const active = new Set(done ? [] : [beat.roleId, beat.targetId].filter(Boolean));
  return (
    <div className="card stage-card">
      <div className="row between">
        <h3>▶ Scene {film.scenes.indexOf(scene) + 1} · {toneById(scene.tone).name} · {set.name}{film.music !== 'none' ? ` · ♪ ${film.music}` : ''}</h3>
        <button onClick={onClose}>Close</button>
      </div>
      <div className={`stage tone-${scene.tone}`}>
        <IsoSet set={set} extras={Math.min(set.extrasCapacity, 30)} height={260} />
        <div className="stage-actors">
          {ids.map((id, i) => {
            const r = film.roles.find((x) => x.id === id);
            return r?.actor ? (
              <div key={id} className={`stage-actor ${active.has(id) ? 'acting' : ''}`} style={{ left: `${((i + 1) / (ids.length + 1)) * 100}%` }}>
                <Face actor={r.actor} size={56} />
                <span className="small">{r.name}</span>
              </div>
            ) : null;
          })}
          {scene.vfx !== 'none' && !done && <span className="fx-flash">✦</span>}
        </div>
        <div className="caption">
          {done ? (
            <>Scene score <strong className="big">{score?.total ?? take.score}</strong></>
          ) : (
            <>{describeBeat(roleName(beat.roleId), beat.actionId, beat.targetId ? roleName(beat.targetId) : undefined)}</>
          )}
        </div>
      </div>
      <div className="stage-meters">
        {METERS.map((m) => (
          <div key={m} className="weight">
            <span>{m}</span>
            <span className={`bar m-${m}`}><span style={{ width: `${take.meters[m]}%` }} /></span>
            <span>{take.meters[m]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
