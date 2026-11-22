import { useEffect, useRef, useState } from 'react';
import { gear, upgradeById, UNLOCKED_BY } from '../../engine/data/upgrades';
import type { Film, MusicTier, PolishTier, Scene } from '../../engine/types';
import { useGame, useProfile } from '../store';
import { sceneName, stageCast } from './ShootingScreen';
import { ActionBar, Sheet, useToast } from '../components/ui';
import { Monitor, NleTimeline, Panel, timecode, type Track } from '../components/Nle';
import { Details } from '../components/ui';
import { Glyph } from '../components/GameIcons';
import { MarketingCard, PosterStudio } from '../components/PosterStudio';
import { IsoSet } from '../components/IsoSet';
import { setById } from '../../engine/data/sets';
import { toneById } from '../../engine/data/tones';
import { describeBeat, money } from '../../engine/format';
import { layout, spent } from '../../engine/script';
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
  const [sel, setSel] = useState<string | undefined>(film.scenes.find((x) => !x.cut)?.id);
  const [playing, setPlaying] = useState(false);
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

  const slots = layout(film);
  const live = film.scenes.filter((x) => !x.cut);
  const selScene = film.scenes.find((x) => x.id === sel) ?? live[0] ?? film.scenes[0];
  const selIdx = film.scenes.indexOf(selScene);
  const slotOf = (id: string) => slots.find((x) => x.sceneId === id);
  const pick = (id: string) => { setSel(id); setPlaying(false); };
  const step = (d: number) => { const n = film.scenes[(selIdx + d + film.scenes.length) % film.scenes.length]; if (n) pick(n.id); };
  const clipsOf = (kind: 'vfx' | 'sfx') => film.scenes.filter((x) => !x.cut && x[kind] !== 'none').map((x) => ({
    id: `${kind}-${x.id}`, start: slotOf(x.id)?.start ?? 0, len: slotOf(x.id)?.minutes ?? 0, kind: kind === 'vfx' ? 'fx' as const : 'sfx' as const,
    label: `${kind === 'vfx' ? 'VFX' : 'SFX'} · ${x[kind]}`, selected: x.id === selScene?.id, onClick: () => pick(x.id),
  }));
  const tracks: Track[] = [
    { id: 'V2', name: 'Effects', clips: clipsOf('vfx') },
    {
      id: 'V1', name: 'Video', tall: true, clips: film.scenes.map((x, i) => ({
        id: x.id, start: slotOf(x.id)?.start ?? 0, len: slotOf(x.id)?.minutes ?? 0, kind: x.cut ? 'empty' as const : 'video' as const, tone: x.tone,
        label: x.cut ? `${i + 1} · cut` : `${i + 1} · ${sceneName(film, x)}`, badge: x.cut ? undefined : scoreOf(x.id)?.total,
        selected: x.id === selScene?.id, onClick: () => pick(x.id), title: sceneName(film, x),
      })),
    },
    { id: 'A1', name: 'Music', clips: film.music === 'none' ? [] : [{ id: 'music', start: 0, len: film.runtime, kind: 'music', label: `♪ ${MUSIC_TEXT[film.music].split(':')[0]}` }] },
    { id: 'A2', name: 'Sound FX', clips: clipsOf('sfx') },
  ];
  const take = selScene && chosenTake(selScene);
  const set = take && setById(take.setId);
  const firstBeat = selScene?.beats[0];
  const roleName = (id?: string) => film.roles.find((r) => r.id === id)?.name ?? '';

  return (
    <>
      <Panel area="props" title={selScene ? `Properties · Scene ${selIdx + 1}` : 'Properties'}>
        {selScene && <SceneEdit film={film} scene={selScene} index={selIdx} score={scoreOf(selScene.id)} onApply={apply} />}
      </Panel>

      {playing && selScene && take ? (
        <section className="nle-panel nle-monitor" style={{ gridArea: 'monitor' }}>
          <Playback film={film} scene={selScene} score={scoreOf(selScene.id)} onClose={() => setPlaying(false)} />
        </section>
      ) : (
        <Monitor
          title={`Program: ${film.title}`}
          current={timecode(slotOf(selScene?.id ?? '')?.start ?? 0)}
          duration={timecode(film.runtime)}
          transport={<>
            <button aria-label="Previous scene" onClick={() => step(-1)}>⏮</button>
            <button className="play" aria-label="Play this scene" disabled={!take || selScene?.cut} onClick={() => setPlaying(true)}>▶</button>
            <button aria-label="Next scene" onClick={() => step(1)}>⏭</button>
            <button aria-label="Watch the whole film" title="Watch the whole film" onClick={() => setWatchAll(true)}>🎞</button>
          </>}
        >
          {set && selScene && !selScene.cut ? (
            <>
              <IsoSet set={set} extras={Math.min(set.extrasCapacity, 20)} height={300} studio={false} actors={stageCast(film, selScene)} />
              <span className="caption-overlay">{firstBeat ? describeBeat(roleName(firstBeat.roleId), firstBeat.actionId, firstBeat.targetId ? roleName(firstBeat.targetId) : undefined) : sceneName(film, selScene)}</span>
            </>
          ) : <div className="slate"><strong>{selScene?.cut ? 'Scene cut' : 'No take'}</strong><span>Its minutes are filler now</span></div>}
        </Monitor>
      )}

      <Panel area="side" tabs={[{ id: 'sound', label: 'Music & FX' }, { id: 'poster', label: 'Poster' }, { id: 'marketing', label: 'Marketing' }]} tab={tab === 'scenes' ? 'sound' : tab} onTab={(t) => setTab(t as PostTab)}>
        {(tab === 'sound' || tab === 'scenes') && (
          <>
            <div className="section-label">Music</div>
            <div className="list">
              {MUSIC_TIERS.map((m) => {
                const cost = postSummary({ ...film, music: m }, level).musicCost;
                const locked = !gear(film.upgrades).music.includes(m);
                return (
                  <button key={m} disabled={locked} className={`list-row pick ${film.music === m ? 'on' : ''} ${locked ? 'locked' : ''}`} onClick={() => apply(setMusic(film, m))}>
                    <span className="list-main"><strong>{locked ? '🔒 ' : ''}{MUSIC_TEXT[m].split(':')[0]}</strong><span className="small muted">{locked ? `Needs the ${upgradeById(UNLOCKED_BY[m]!)?.name}` : money(cost)}</span></span>
                    {film.music === m && <span className="check">✓</span>}
                  </button>
                );
              })}
            </div>
            <AutoPolish film={film} budgetLeft={budgetLeft} level={level} onApply={apply} />
            <div className="icon-stats">
              <span title="Best scene"><Glyph name="up" size={16} /> {summary.best}</span>
              <span title="Worst scene" className={summary.worst < 50 ? 'bad' : ''}><Glyph name="down" size={16} /> {summary.worst}</span>
              <span title="Filler minutes"><Glyph name="clock" size={16} /> {summary.fillerMinutes}′</span>
              {summary.overproduction > 0 && <span className="bad" title="Too much CGI for this genre"><Glyph name="sparkle" size={16} /> −{summary.overproduction}</span>}
            </div>
            <Details label="Costs">
              <p className="small">Music {money(summary.musicCost)} · VFX/SFX {money(summary.polishCost)} · crew {money(summary.crewCost)} = <strong>{money(summary.cost)}</strong> · {summary.weeks} wk</p>
            </Details>
          </>
        )}
        {tab === 'poster' && <PosterStudio film={film} history={p.filmography} onApply={apply} />}
        {tab === 'marketing' && <MarketingCard film={film} onApply={apply} />}
      </Panel>

      <Panel area="bin" title={`Project: takes of scene ${selIdx + 1}`}>
        <div className="bin-grid">
          {[...(selScene?.takes ?? [])].sort((a, b) => b.score - a.score).map((t) => (
            <button key={t.id} className={`bin-item ${selScene?.chosenTakeId === t.id ? 'on' : ''}`} onClick={() => apply(chooseTake(film, selScene!.id, t.id))}>
              <span className="bin-thumb"><IsoSet set={setById(t.setId)} extras={0} height={70} studio={false} actors={[]} /><span className="bin-score">{t.score}</span></span>
              <span className="bin-name">{t.version} cut</span>
              <span className="bin-sub">{setById(t.setId).name}</span>
            </button>
          ))}
        </div>
      </Panel>

      <NleTimeline runtime={film.runtime} tracks={tracks} playhead={slotOf(selScene?.id ?? '')?.start ?? 0} sequence={`${film.title} · final cut`} />

      {watchAll && (
        <Sheet wide title={film.title} kicker="Final cut" onClose={() => setWatchAll(false)}>
          <FilmPlayer film={film} onClose={() => setWatchAll(false)} />
        </Sheet>
      )}
      {toast.node}

      <div className="nle-status">
        <ActionBar>
          <span className="bar-stat"><span className="kicker">Final cut</span><strong>{summary.cutQuality}</strong></span>
          <span className="bar-stat"><span className="kicker">Budget after</span><strong className={after < 0 ? 'bad' : ''}>{money(after)}</strong></span>
          <span className="bar-stat"><span className="kicker">Done week</span><strong className={lateBy > 0 ? 'bad' : ''}>{finishWeek}/{film.contract.deadlineWeeks}</strong></span>
          <button className="primary grow" onClick={() => confirm('Lock the final cut and go to the premiere?') && apply(finishPost(film, level))}>Export to premiere ›</button>
        </ActionBar>
      </div>
    </>
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
      {!gear(film.upgrades).polish.includes('premium') && <p className="small muted">Bigger effects need the {upgradeById(gear(film.upgrades).polish.includes('pro') ? 'post2' : 'post1')?.name} (Shop → Team).</p>}
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
          {tierRow('vfx')}
          {tierRow('sfx')}
          {score && (
            <div className="score-brief">
              <strong className="big-inline">{score.total}</strong>
              <Details label="Breakdown">
                <p className="small">Take {score.take} + music {score.music} + VFX {score.vfx} + SFX {score.sfx}</p>
                {take && <p className="small muted">“{take.feedback}”</p>}
              </Details>
            </div>
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
