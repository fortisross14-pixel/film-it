import { useEffect, useRef, useState } from 'react';
import { gear, upgradeById, UNLOCKED_BY } from '../../engine/data/upgrades';
import type { Film, MusicTier, PolishTier, Scene } from '../../engine/types';
import { useGame, useProfile } from '../store';
import { sceneName, stageCast } from './ShootingScreen';
import { ActionBar, Sheet, Tabs, useToast } from '../components/ui';
import { Glyph } from '../components/GameIcons';
import { MarketingCard, PosterStudio } from '../components/PosterStudio';
import { IsoSet } from '../components/IsoSet';
import { setById } from '../../engine/data/sets';
import { toneById } from '../../engine/data/tones';
import { describeBeat, money } from '../../engine/format';
import { TUNING } from '../../engine/tuning';
import { spent } from '../../engine/script';
import { METERS, chosenTake, weeksUsed } from '../../engine/shooting';
import {
  MUSIC_TIERS, POLISH_TIERS, autoPolish, chooseTake, finishPost, isEmotional, postSummary, sceneScores, setCut, setMusic, setPolish,
  type PolishKind, type PostResult, type SceneScore,
} from '../../engine/post';

const MUSIC_TEXT: Record<MusicTier, string> = {
  none: 'No score',
  library: 'Library music: small flat bonus',
  composer: 'Composer: bonus on emotional scenes',
  star: 'Star composer: large bonus, Best Score eligible',
};
const BEAT_MS = 1400;

type PostTab = 'scenes' | 'sound' | 'poster' | 'marketing';

export function PostScreen() {
  const p = useProfile();
  const { update } = useGame();
  const film = p.activeFilm!;
  const level = p.directors[film.directorId]?.level ?? 1;
  const [tab, setTab] = useState<PostTab>('scenes');
  const [open, setOpen] = useState<string | null>(null);
  const [watchAll, setWatchAll] = useState(false);
  const toast = useToast();
  const summary = postSummary(film, level);
  const budgetLeft = film.contract.budget - spent(film);
  const scoreOf = (id: string) => summary.scores.find((s) => s.sceneId === id);
  const apply = (r: PostResult) => {
    if (!r.ok) return toast.show(r.reason), false;
    update((q) => ({ ...q, activeFilm: r.film }));
    return true;
  };
  const finishWeek = weeksUsed(film) + summary.weeks;
  const lateBy = finishWeek - film.contract.deadlineWeeks;
  const after = budgetLeft - summary.cost;
  const scene = film.scenes.find((s) => s.id === open);

  return (
    <div className="stack phase-screen">
      <Tabs label="Edit" value={tab} onChange={setTab} tabs={[
        { id: 'scenes', label: 'Scenes' },
        { id: 'sound', label: 'Music & FX' },
        { id: 'poster', label: 'Poster' },
        { id: 'marketing', label: 'Marketing' },
      ]} />

      {tab === 'scenes' && (
        <>
          <button className="wide" onClick={() => setWatchAll(true)}>▶ Watch the whole film</button>
          <div className="list">
            {film.scenes.map((s, i) => (
              <button key={s.id} className={`list-row scene-row t-border-${s.tone} ${s.cut ? 'is-cut' : ''}`} onClick={() => setOpen(s.id)}>
                <span className="scene-num">{i + 1}</span>
                <span className="list-main">
                  <strong>{sceneName(film, s)}</strong>
                  {(s.cut || s.vfx !== 'none' || s.sfx !== 'none') && <span className="small muted">{s.cut ? 'Cut' : <>{s.vfx !== 'none' && <><Glyph name="sparkle" size={14} /> {s.vfx} </>}{s.sfx !== 'none' && <><Glyph name="speaker" size={14} /> {s.sfx}</>}</>}</span>}
                </span>
                {!s.cut && <span className="score-badge">{scoreOf(s.id)?.total ?? '—'}</span>}
              </button>
            ))}
          </div>
          <div className="icon-stats">
            <span title="Best scene"><Glyph name="up" size={18} /> {summary.best}</span>
            <span title="Worst scene" className={summary.worst < 50 ? 'bad' : ''}><Glyph name="down" size={18} /> {summary.worst}</span>
            <span title="Filler minutes"><Glyph name="clock" size={18} /> {summary.fillerMinutes}′ filler</span>
            {summary.overproduction > 0 && <span className="bad" title="Too much CGI for this genre"><Glyph name="sparkle" size={18} /> −{summary.overproduction} critics</span>}
          </div>
        </>
      )}

      {tab === 'sound' && (
        <>
          <div className="card">
            <h3>Music</h3>
            <div className="list">
              {MUSIC_TIERS.map((m) => {
                const cost = postSummary({ ...film, music: m }, level).musicCost;
                const locked = !gear(film.upgrades).music.includes(m);
                return (
                  <button key={m} disabled={locked} className={`list-row pick ${film.music === m ? 'on' : ''} ${locked ? 'locked' : ''}`} onClick={() => apply(setMusic(film, m))}>
                    <span className="list-main"><strong>{locked ? '🔒 ' : ''}{MUSIC_TEXT[m]}</strong><span className="small muted">{locked ? `Needs the ${upgradeById(UNLOCKED_BY[m]!)?.name} (Shop → Studio)` : `${money(cost)} · ${TUNING.post.music[m].days} days`}</span></span>
                    {film.music === m && <span className="check">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <AutoPolish film={film} budgetLeft={budgetLeft} level={level} onApply={apply} />
          <div className="card small">
            Music {money(summary.musicCost)} · VFX/SFX {money(summary.polishCost)} · crew {money(summary.crewCost)} = <strong>{money(summary.cost)}</strong> · {summary.weeks} wk
          </div>
        </>
      )}

      {tab === 'poster' && <PosterStudio film={film} history={p.filmography} onApply={apply} />}
      {tab === 'marketing' && <MarketingCard film={film} onApply={apply} />}

      {scene && (
        <Sheet wide title={`Scene ${film.scenes.indexOf(scene) + 1}`} kicker={sceneName(film, scene)} onClose={() => setOpen(null)}
          footer={<button className="primary grow" onClick={() => setOpen(null)}>Done</button>}>
          <SceneEdit film={film} scene={scene} index={film.scenes.indexOf(scene)} score={scoreOf(scene.id)} onApply={apply} />
        </Sheet>
      )}
      {watchAll && (
        <Sheet wide title={film.title} kicker="Final cut" onClose={() => setWatchAll(false)}>
          <FilmPlayer film={film} onClose={() => setWatchAll(false)} />
        </Sheet>
      )}
      {toast.node}

      <ActionBar>
        <span className="bar-stat"><span className="kicker">Final cut</span><strong>{summary.cutQuality}</strong></span>
        <span className="bar-stat"><span className="kicker">Budget after</span><strong className={after < 0 ? 'bad' : ''}>{money(after)}</strong></span>
        <span className="bar-stat"><span className="kicker">Done week</span><strong className={lateBy > 0 ? 'bad' : ''}>{finishWeek}/{film.contract.deadlineWeeks}</strong></span>
        <button className="primary grow" onClick={() => confirm('Lock the final cut and go to the premiere?') && apply(finishPost(film, level))}>Premiere ›</button>
      </ActionBar>
    </div>
  );
}

function AutoPolish({ film, budgetLeft, level, onApply }: { film: Film; budgetLeft: number; level: number; onApply: (r: PostResult) => boolean }) {
  const [amount, setAmount] = useState(Math.max(0, Math.round(budgetLeft * 0.3)));
  const max = Math.max(0, budgetLeft);
  return (
    <div className="card">
      <h3>Auto-polish</h3>
      <input type="range" min={0} max={max} step={50} value={Math.min(amount, max)} onChange={(e) => setAmount(Number(e.target.value))} className="wide" aria-label="Auto-polish budget" />
      <button className="wide" disabled={amount <= 0} onClick={() => onApply({ ok: true, film: autoPolish(film, amount, level) })}>Spend up to {money(amount)}</button>
    </div>
  );
}

function SceneEdit({
  film, scene, index, score, onApply,
}: { film: Film; scene: Scene; index: number; score?: SceneScore; onApply: (r: PostResult) => boolean }) {
  const take = chosenTake(scene);
  const [playing, setPlaying] = useState(false);
  const tierRow = (kind: PolishKind) => (
    <>
      <div className="section-label">{kind === 'vfx' ? 'Visual effects' : 'Sound effects'}</div>
      <div className="seg">
        {POLISH_TIERS.map((t: PolishTier) => {
          const locked = !gear(film.upgrades).polish.includes(t);
          return (
            <button key={t} disabled={scene.cut || locked} title={locked ? `Needs the ${upgradeById(UNLOCKED_BY[t]!)?.name}` : undefined} className={scene[kind] === t ? 'on' : ''} onClick={() => onApply(setPolish(film, scene.id, kind, t))}>{locked ? `🔒 ${t}` : t}</button>
          );
        })}
      </div>
      {!gear(film.upgrades).polish.includes('premium') && <p className="small muted">Bigger effects need the {upgradeById(gear(film.upgrades).polish.includes('pro') ? 'post2' : 'post1')?.name} (Shop → Studio).</p>}
    </>
  );
  return (
    <div className={`stack ${scene.cut ? 'cut' : ''}`} data-scene={index}>
      <div className="row between wrap">
        <span className="small muted"><span className={`tone-dot t-${scene.tone}`} /> {toneById(scene.tone).name}{isEmotional(scene) ? ' · emotional' : ''}</span>
        <div className="row">
          {!scene.cut && <button onClick={() => setPlaying(true)}>▶ Watch</button>}
          <button className={scene.cut ? '' : 'danger'} onClick={() => onApply(setCut(film, scene.id, !scene.cut))}>{scene.cut ? 'Restore' : 'Cut scene'}</button>
        </div>
      </div>
      {playing && <Playback film={film} scene={scene} score={score} onClose={() => setPlaying(false)} />}
      {scene.cut ? (
        <p className="muted small">Cut: its minutes are filler now.</p>
      ) : (
        <>
          <label className="stack">
            <span className="section-label">Take</span>
            <select value={scene.chosenTakeId} onChange={(e) => onApply(chooseTake(film, scene.id, e.target.value))}>
              {[...scene.takes].sort((a, b) => b.score - a.score).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.score} · {t.version} cut · {setById(t.setId).name}
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
export function Playback({ film, scene, score, onClose, onEnded, heading }: { film: Film; scene: Scene; score?: SceneScore; onClose: () => void; onEnded?: () => void; heading?: string }) {
  const take = chosenTake(scene)!;
  const set = setById(take.setId);
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
  // When used by the whole-film player, move on shortly after the score shows.
  useEffect(() => {
    if (!done || !onEnded) return;
    const t = window.setTimeout(onEnded, BEAT_MS);
    return () => window.clearTimeout(t);
  }, [done, onEnded]);
  const active = new Set(done ? [] : [beat.roleId, beat.targetId].filter(Boolean));
  return (
    <div className="card stage-card">
      <div className="row between">
        <h3>▶ {heading ?? `Scene ${film.scenes.indexOf(scene) + 1}`} · {toneById(scene.tone).name} · {set.name}{film.music !== 'none' ? ` · ♪ ${film.music}` : ''}</h3>
        <button onClick={onClose}>Close</button>
      </div>
      <div className={`stage tone-${scene.tone}`}>
        <IsoSet set={set} extras={Math.min(set.extrasCapacity, 20)} height={340} studio={false} actors={stageCast(film, scene)} acting={[...active] as string[]} />
        {scene.vfx !== 'none' && !done && <span className="fx-flash">✦</span>}
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

/** Plays the whole final cut: a title card, every kept scene in order, then the end card. */
export function FilmPlayer({ film, onClose }: { film: Film; onClose: () => void }) {
  const scenes = film.scenes.filter((s) => !s.cut && chosenTake(s));
  const [i, setI] = useState(-1); // -1 = title card, scenes.length = end card
  const scores = sceneScores(film);
  useEffect(() => {
    if (i !== -1) return;
    const t = window.setTimeout(() => setI(0), 1800);
    return () => window.clearTimeout(t);
  }, [i]);
  if (i === -1 || i >= scenes.length) {
    return (
      <div className="card film-card-player">
        <div className="row between"><span className="kicker light">{i === -1 ? 'Now showing' : 'The end'}</span><button className="ghost-dark" onClick={onClose}>Close</button></div>
        <div className="film-card-title">{i === -1 ? film.title : 'The End'}</div>
        <div className="kicker light">{i === -1 ? `A film by ${film.directorName ?? ''}` : `Final cut ${postSummary(film).cutQuality}`}</div>
        {i >= scenes.length && <button className="primary" onClick={() => setI(-1)}>Watch again</button>}
      </div>
    );
  }
  const s = scenes[i];
  return (
    <Playback key={s.id + i} film={film} scene={s} score={scores.find((x) => x.sceneId === s.id)} onClose={onClose} onEnded={() => setI(i + 1)}
      heading={`Scene ${i + 1} of ${scenes.length}`} />
  );
}
