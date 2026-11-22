import { useMemo, useRef, useState } from 'react';
import type { Beat, Film, RoleType, Scene, Tone } from '../../engine/types';
import { useGame, useProfile } from '../store';
import { directorById } from '../../engine/data/directors';
import { actionById } from '../../engine/data/actions';
import { AXES, TONES, toneById } from '../../engine/data/tones';
import { TOPICS } from '../../engine/data/topics';
import { genreName } from '../../engine/data/genres';
import { describeBeat, describeHardReq, money, ROLE_TYPE_NAMES } from '../../engine/format';
import { ActionBar, Hint, Sheet, Tabs, useToast } from '../components/ui';
import { ActionBubbles } from '../components/ActionBubbles';
import { Glyph, Medallion, type GlyphName } from '../components/GameIcons';
import { TUNING } from '../../engine/tuning';
import {
  DURATIONS, ROLE_TYPES, addBeat, addRole, addScene, availableActions, canAddRole, checkRequirements, fillerShare,
  finishScript, genreTarget, layout, moveScene, placeScene, participants, removeBeat, removeRole, removeScene, renameRole, sceneCost,
  sceneMinutes, screenTime, scriptBlockers, scriptCost, scriptQuality, setRuntime, setTopic, updateBeat, updateScene,
  type EditResult,
} from '../../engine/script';

type Apply = (r: EditResult & { removedBeats?: number }) => boolean;

const DEPTH_LABEL = ['no actions', 'shallow', 'ideal', 'good', 'too complex'];

/** Make a beat satisfy its action's target rule (used when the user changes one field). */
function fixBeat(film: Film, beat: Beat): Beat {
  const a = actionById(beat.actionId);
  if (a.target === 'none') return { ...beat, targetId: undefined };
  if (beat.targetId === beat.roleId) beat = { ...beat, targetId: undefined };
  if (a.target === 'required' && !beat.targetId) beat = { ...beat, targetId: film.roles.find((r) => r.id !== beat.roleId)?.id };
  return beat;
}

type ScriptTab = 'story' | 'scenes' | 'check';

export function ScriptEditor() {
  const p = useProfile();
  const { update } = useGame();
  const film = p.activeFilm!;
  const director = directorById(film.directorId);
  const level = p.directors[film.directorId]?.level ?? 1;
  const [tab, setTab] = useState<ScriptTab>(film.roles.length ? 'scenes' : 'story');
  const [open, setOpen] = useState<string | null>(null);
  const toast = useToast();

  const apply: Apply = (r) => {
    if (!r.ok) return toast.show(r.reason), false;
    update((q) => ({ ...q, activeFilm: r.film }));
    if (r.removedBeats) toast.show(`${r.removedBeats} action(s) removed: their topic is gone.`);
    return true;
  };

  const quality = useMemo(() => scriptQuality(film, director, level), [film, director, level]);
  const reqs = checkRequirements(film);
  const blockers = scriptBlockers(film);
  const met = reqs.filter((r) => r.status === 'met').length;
  const scene = film.scenes.find((s) => s.id === open);

  return (
    <div className="stack phase-screen">
      <Tabs
        label="Script"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'story', label: 'Story', badge: film.roles.length || undefined },
          { id: 'scenes', label: 'Scenes', badge: film.scenes.length || undefined },
          { id: 'check', label: 'Check', badge: `${met}/${reqs.length}` },
        ]}
      />
      {tab === 'story' && (
        <>
          <CharactersPanel film={film} onApply={apply} />
          <RuntimeTopicBar film={film} onApply={apply} unlocked={p.unlocks.topics} />
          {film.roles.length > 0 && <button className="wide" onClick={() => setTab('scenes')}>Next: write scenes ›</button>}
        </>
      )}
      {tab === 'scenes' && (
        film.roles.length === 0 ? (
          <div className="card empty">
            <p>Add your characters first.</p>
            <button className="primary" onClick={() => setTab('story')}>Go to Story</button>
          </div>
        ) : (
          <>
            <Timeline film={film} selected={open} onSelect={setOpen} onApply={apply} />
            <SceneList film={film} onOpen={setOpen} />
            {film.scenes.length < TUNING.script.maxScenes && (
              <ActionBubbles
                label="Add a scene"
                primary
                closeOnPick
                actions={TONES.map((t) => ({
                  id: t.id, label: t.name, icon: TONE_GLYPH[t.id],
                  highlight: reqs.some((x) => x.req.kind === 'tone' && x.req.tone === t.id && x.status !== 'met'),
                  onPick: () => {
                    const r = addScene(film, { duration: 'medium', tone: t.id });
                    if (apply(r) && r.ok) setOpen(r.sceneId ?? null);
                  },
                }))}
              />
            )}
            <p className="small muted center">{film.scenes.length}/{TUNING.script.maxScenes} scenes<Hint>4–5 scenes is typical. Drag the frames along the strip to move them.</Hint></p>
          </>
        )
      )}
      {tab === 'check' && <CheckPanel film={film} quality={quality} reqs={reqs} cost={scriptCost(film, director, level)} />}

      {scene && (
        <SceneSheet
          key={scene.id}
          film={film}
          scene={scene}
          index={film.scenes.indexOf(scene)}
          level={level}
          onApply={apply}
          onClose={() => setOpen(null)}
        />
      )}
      {toast.node}

      <ActionBar>
        <button className="bar-stat" onClick={() => setTab('check')}>
          <span className="kicker">Quality</span><strong>{quality.total}</strong>
        </button>
        <button className="bar-stat" onClick={() => setTab('check')}>
          <span className="kicker">Must-haves</span><strong className={met < reqs.length ? 'bad' : 'good'}>{met}/{reqs.length}</strong>
        </button>
        <button
          className="primary grow"
          disabled={blockers.length > 0}
          title={blockers[0]}
          onClick={() => {
            const missing = reqs.filter((r) => r.status === 'missing').length;
            if (missing && !confirm(`${missing} must-have(s) missing. Lock anyway?`)) return;
            apply(finishScript(film, director, level));
          }}
        >
          {blockers.length ? blockers[0] : 'Lock script ›'}
        </button>
      </ActionBar>
    </div>
  );
}

function CheckPanel({ film, quality, reqs, cost }: { film: Film; quality: ReturnType<typeof scriptQuality>; reqs: ReturnType<typeof checkRequirements>; cost: number }) {
  const target = genreTarget(film).target;
  return (
    <>
      <Requirements reqs={reqs} />
      <div className="card">
        <div className="row between">
          <h3>Quality</h3>
          <span className="big">{quality.total}</span>
        </div>
        {(['fit', 'depth', 'structure', 'characters', 'coherence', 'pacing'] as const).map((k) => (
          <div key={k} className="weight">
            <span>{k[0].toUpperCase() + k.slice(1)}</span>
            <span className="bar"><span style={{ width: `${quality[k]}%` }} /></span>
            <span className="muted">{quality[k]}</span>
          </div>
        ))}
        {quality.directorBonus !== 0 && <p className="small">Director {quality.directorBonus > 0 ? '+' : ''}{quality.directorBonus}</p>}
        {quality.ceiling < 100 && <p className="small muted">Your director's best script in this genre: {quality.ceiling}. A better director raises it.</p>}
        {quality.notes.length > 0 && <ul className="reqs small muted">{quality.notes.slice(0, 4).map((n) => <li key={n}>{n}</li>)}</ul>}
      </div>
      <div className="card">
        <h3>Feel <span className="muted small">· ▮ = what {genreName(film.contract.genre)} fans expect</span></h3>
        {AXES.map((ax) => (
          <div key={ax.id} className="axis">
            <div className="row between small"><span className="muted">{ax.low}</span><strong>{ax.name}</strong><span className="muted">{ax.high}</span></div>
            <span className="bar axis-bar"><span style={{ width: `${quality.profile[ax.id]}%` }} /><i className="target" style={{ left: `${target[ax.id]}%` }} /></span>
          </div>
        ))}
        <p className="small muted">Filler {Math.round(fillerShare(film) * 100)}% · script cost {money(cost)}</p>
      </div>
    </>
  );
}

function SceneList({ film, onOpen }: { film: Film; onOpen: (id: string) => void }) {
  const slots = layout(film);
  const roleName = (id?: string) => film.roles.find((r) => r.id === id)?.name ?? '';
  return (
    <div className="list">
      {slots.map((sl, i) => {
        const s = film.scenes.find((x) => x.id === sl.sceneId)!;
        const clash = s.beats.some((b) => !actionById(b.actionId).tones.includes(s.tone));
        return (
          <button key={s.id} className={`list-row scene-row t-border-${s.tone}`} onClick={() => onOpen(s.id)}>
            <span className="scene-num">{i + 1}</span>
            <span className="list-main">
              <strong>{s.beats.length ? s.beats.map((b) => describeBeat(roleName(b.roleId), b.actionId)).join(' · ') : 'Empty scene: add actions'}</strong>
              <span className="small muted">
                <span className={`tone-dot t-${s.tone}`} /> {toneById(s.tone).name} · {sl.minutes} min · Act {sl.act}
                {clash && <span className="bad"> · tone clash</span>}
              </span>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        );
      })}
    </div>
  );
}

export function Requirements({ reqs }: { reqs: ReturnType<typeof checkRequirements> }) {
  return (
    <div className="card">
      <h3>Requirements</h3>
      <ul className="checklist">
        {reqs.map((c, i) => (
          <li key={i} className={c.status}>
            <span className="mark">{c.status === 'met' ? '✓' : c.status === 'missing' ? '✗' : '…'}</span>
            {describeHardReq(c.req)}
            {c.detail && <span className="muted small"> · {c.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

const ROLE_GLYPH: Record<RoleType, GlyphName> = { main: 'hero', villain: 'villain', coVillain: 'coVillain', romanticInterest: 'romance', comicRelief: 'comic', supporting: 'supporting' };
const TONE_GLYPH: Record<Tone, GlyphName> = { happy: 'happy', sad: 'sad', thrill: 'thrill', calm: 'calm', romantic: 'romantic', scary: 'scary' };

/** The cast as tokens; one "Add a character" button pops the roles you can add (the brief's needs pulse). */
function CharactersPanel({ film, onApply }: { film: Film; onApply: Apply }) {
  const st = screenTime(film);
  const needed = new Set<RoleType>(['main', ...film.contract.hardReqs.flatMap((r) => (r.kind === 'role' ? [r.roleType] : []))]);
  const have = new Set(film.roles.map((r) => r.type));
  return (
    <div className="card characters-card">
      {film.roles.length > 0 && (
        <div className="role-tokens">
          {film.roles.map((r, i) => (
            <div key={r.id} className="role-token on deal" style={{ ['--i' as string]: i }}>
              <Medallion name={ROLE_GLYPH[r.type]} size={52} tone={r.type === 'villain' || r.type === 'coVillain' ? 'dark' : 'gold'} />
              <input aria-label={`${ROLE_TYPE_NAMES[r.type]} name`} defaultValue={r.name} onBlur={(e) => e.target.value !== r.name && onApply(renameRole(film, r.id, e.target.value))} />
              <span className={`rt-sub ${st[r.id] ? '' : 'bad'}`}>{ROLE_TYPE_NAMES[r.type]} · {st[r.id] ?? 0}′</span>
              <button
                className="rt-x"
                aria-label={`Remove ${r.name}`}
                onClick={() => {
                  if (st[r.id] && !confirm(`Remove ${r.name}? Their actions are removed from every scene.`)) return;
                  onApply(removeRole(film, r.id));
                }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
      <ActionBubbles
        label={film.roles.length ? 'Add a character' : 'Add your hero'}
        primary={film.roles.length === 0}
        actions={ROLE_TYPES.map((t: RoleType) => ({
          id: t, label: ROLE_TYPE_NAMES[t], icon: ROLE_GLYPH[t], disabled: !canAddRole(film, t),
          highlight: needed.has(t) && !have.has(t), badge: needed.has(t) && !have.has(t) ? 'needed' : undefined,
          onPick: () => onApply(addRole(film, t)),
        }))}
      />
    </div>
  );
}

const fitStars = (fit: number) => (fit >= 85 ? '★★★' : fit >= 65 ? '★★' : fit >= 45 ? '★' : '');

function RuntimeTopicBar({ film, unlocked, onApply }: { film: Film; unlocked: string[]; onApply: Apply }) {
  const [rt, setRt] = useState(String(film.runtime));
  const commit = (v: number) => setRt(String(onApply(setRuntime(film, v)) ? v : film.runtime));
  const ok = Math.abs(film.runtime - film.contract.runtime) <= film.contract.runtimeTolerance;
  const pick = (id?: string) => {
    const r = setTopic(film, id, unlocked);
    if (r.ok && r.removedBeats && !confirm(`${r.removedBeats} topic action(s) will be removed. Continue?`)) return;
    onApply(r);
  };
  const topics = [...TOPICS.filter((t) => unlocked.includes(t.id))].sort((a, b) => b.genreFit[film.contract.genre] - a.genreFit[film.contract.genre]);
  return (
    <div className="card stack">
      <div className="runtime-row">
        <span className="field-label"><Glyph name="clock" size={18} /> Runtime</span>
        <button aria-label="5 minutes shorter" onClick={() => commit(film.runtime - 5)}>−</button>
        <input className="num" aria-label="Runtime in minutes" value={rt} onChange={(e) => setRt(e.target.value)} onBlur={() => commit(Number(rt))} onKeyDown={(e) => e.key === 'Enter' && commit(Number(rt))} />
        <button aria-label="5 minutes longer" onClick={() => commit(film.runtime + 5)}>+</button>
        <span className={`tag ${ok ? 'good' : 'bad'}`}><Glyph name="target" size={14} /> {film.contract.runtime}′</span>
      </div>
      <div>
        <span className="field-label">Topic<Hint>A topic that suits the genre lifts the script; ★ shows how well it fits {film.contract.genre}. Topic packs add new actions and sets.</Hint></span>
        <div className="topic-chips">
          <button className={`topic-chip ${!film.topicId ? 'on' : ''}`} onClick={() => pick(undefined)}>None</button>
          {topics.map((t) => (
            <button key={t.id} className={`topic-chip ${film.topicId === t.id ? 'on' : ''}`} onClick={() => pick(t.id)}>
              {t.name}<span className="tc-fit">{fitStars(t.genreFit[film.contract.genre])}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** The script as one long film strip: scenes are frames you drag along it; empty film is filler. */
function Timeline({ film, selected, onSelect, onApply }: {
  film: Film; selected: string | null; onSelect: (id: string) => void; onApply: Apply;
}) {
  const slots = layout(film);
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; grab: number; minute: number; moved: boolean } | null>(null);
  const pct = (m: number) => `${(m / film.runtime) * 100}%`;
  const minuteAt = (clientX: number) => {
    const r = ref.current!.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * film.runtime;
  };
  const roleName = (id?: string) => film.roles.find((r) => r.id === id)?.name ?? '';
  return (
    <div className="card strip-card">
      <div className="strip-acts">
        <span style={{ width: '25%' }}>Act I</span>
        <span style={{ width: '50%' }}>Act II</span>
        <span style={{ width: '25%' }}>Act III</span>
      </div>
      <div className="filmstrip" ref={ref}>
        <div className="act-line" style={{ left: '25%' }} />
        <div className="act-line" style={{ left: '75%' }} />
        {slots.map((sl, i) => {
          const s = film.scenes.find((x) => x.id === sl.sceneId)!;
          const dragging = drag?.id === s.id;
          const left = dragging ? Math.max(0, Math.min(film.runtime - sl.minutes, Math.round(drag.minute - drag.grab))) : sl.start;
          const first = s.beats[0];
          const who = participants(s).map((id) => film.roles.find((r) => r.id === id)).filter(Boolean);
          return (
            <button
              key={s.id}
              className={`frame t-${s.tone} ${selected === s.id ? 'selected' : ''} ${dragging ? 'dragging' : ''}`}
              style={{ left: pct(left), width: pct(sl.minutes) }}
              aria-label={`Scene ${i + 1}, ${toneById(s.tone).name}, starts at minute ${sl.start}, act ${sl.act}. Arrow keys move it.`}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                const m = minuteAt(e.clientX);
                setDrag({ id: s.id, grab: m - sl.start, minute: m, moved: false });
              }}
              onPointerMove={(e) => {
                if (drag?.id !== s.id) return;
                const m = minuteAt(e.clientX);
                setDrag({ ...drag, minute: m, moved: drag.moved || Math.abs(m - drag.minute) > 0.5 });
              }}
              onPointerUp={() => {
                if (drag?.id === s.id && drag.moved) onApply(placeScene(film, s.id, drag.minute - drag.grab));
                onSelect(s.id);
                setDrag(null);
              }}
              onPointerCancel={() => setDrag(null)}
              onKeyDown={(e) => {
                if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
                e.preventDefault();
                onApply(placeScene(film, s.id, sl.start + (e.shiftKey ? 5 : 1) * (e.key === 'ArrowLeft' ? -1 : 1)));
                onSelect(s.id);
              }}
            >
              <span className="frame-num">{i + 1}</span>
              <span className="frame-tone">{toneById(s.tone).name}</span>
              <span className="frame-name">{first ? describeBeat(roleName(first.roleId), first.actionId) : 'No action yet'}</span>
              <span className="frame-cast">{who.map((r) => <span key={r!.id} className="initial" title={r!.name}>{r!.name.replace(/^The /, '')[0]}</span>)}</span>
              <span className="frame-min">{dragging ? `@${left}′` : `${sl.minutes}′`}</span>
            </button>
          );
        })}
      </div>
      <div className="ticks">
        {Array.from({ length: Math.floor(film.runtime / 10) + 1 }, (_, i) => i * 10).map((m) => <span key={m} style={{ left: pct(m) }}>{m}</span>)}
      </div>
    </div>
  );
}

function SceneSheet({
  film, scene, index, level, onApply, onClose,
}: { film: Film; scene: Scene; index: number; level: number; onApply: Apply; onClose: () => void }) {
  const actions = availableActions(film);
  const inBeats = new Set(participants({ ...scene, others: [] }));
  const n = scene.beats.length;
  const act = layout(film).find((l) => l.sceneId === scene.id)?.act;
  const director = directorById(film.directorId);
  const setBeat = (i: number, patch: Partial<Beat>) => onApply(updateBeat(film, scene.id, i, fixBeat(film, { ...scene.beats[i], ...patch })));
  const others = film.roles.filter((r) => !inBeats.has(r.id));

  return (
    <Sheet
      title={`Scene ${index + 1}`}
      kicker={`Act ${act} · ${sceneMinutes(scene.duration, film.runtime)} min · ${money(sceneCost(scene, director, level, film.contract.budget))}`}
      onClose={onClose}
      footer={<>
        <button className="danger icon" aria-label="Delete scene" onClick={() => { onApply(removeScene(film, scene.id)); onClose(); }}>🗑</button>
        <button className="icon" aria-label="Move earlier" disabled={index === 0} onClick={() => onApply(moveScene(film, scene.id, -1))}>◀</button>
        <button className="icon" aria-label="Move later" disabled={index === film.scenes.length - 1} onClick={() => onApply(moveScene(film, scene.id, 1))}>▶</button>
        <button className="primary grow" onClick={onClose}>Done</button>
      </>}
    >
      <div className="section-label">Length</div>
      <div className="seg">
        {DURATIONS.map((d) => (
          <button key={d} className={scene.duration === d ? 'on' : ''} onClick={() => onApply(updateScene(film, scene.id, { duration: d }))}>{d}</button>
        ))}
      </div>
      <div className="section-label">Tone</div>
      <div className="chip-grid">
        {TONES.map((t) => (
          <button key={t.id} className={`tone-btn t-${t.id} ${scene.tone === t.id ? 'on' : ''}`} onClick={() => onApply(updateScene(film, scene.id, { tone: t.id }))}>{t.name}</button>
        ))}
      </div>

      <div className="section-label">Actions · {DEPTH_LABEL[Math.min(n, 4)]} <span className="muted">(2 is ideal)</span></div>
      {scene.beats.map((b, i) => {
        const a = actionById(b.actionId);
        const clash = !a.tones.includes(scene.tone);
        return (
          <div key={i} className={`beat2 ${clash ? 'clash' : ''}`}>
            <select value={b.roleId} onChange={(e) => setBeat(i, { roleId: e.target.value })} aria-label="Who">
              {film.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <select value={b.actionId} onChange={(e) => setBeat(i, { actionId: e.target.value })} aria-label="Does">
              {actions.map((x) => <option key={x.id} value={x.id}>{x.verb}{x.climax ? ' ★' : ''}</option>)}
            </select>
            {a.target !== 'none' && (
              <select value={b.targetId ?? ''} onChange={(e) => setBeat(i, { targetId: e.target.value || undefined })} aria-label={a.prep || 'Target'}>
                {a.target === 'optional' && <option value="">{a.prep || 'with'} nobody</option>}
                {film.roles.filter((r) => r.id !== b.roleId).map((r) => <option key={r.id} value={r.id}>{a.prep ? `${a.prep} ` : ''}{r.name}</option>)}
              </select>
            )}
            <button className="icon ghost-btn" aria-label="Remove action" onClick={() => onApply(removeBeat(film, scene.id, i))}>✕</button>
            {clash && <span className="small bad">Clashes with a {toneById(scene.tone).name.toLowerCase()} tone</span>}
          </div>
        );
      })}
      {n < 4 && (
        <button className="wide" onClick={() => {
          const roleId = film.roles.find((r) => r.type === 'main')?.id ?? film.roles[0].id;
          onApply(addBeat(film, scene.id, fixBeat(film, { roleId, actionId: 'plans' })));
        }}>+ Action</button>
      )}

      {others.length > 0 && (
        <>
          <div className="section-label">Also in the scene</div>
          <div className="chip-grid">
            {others.map((r) => {
              const on = scene.others.includes(r.id);
              return (
                <button key={r.id} className={`chip-btn ${on ? 'on' : ''}`} aria-pressed={on}
                  onClick={() => onApply(updateScene(film, scene.id, { others: on ? scene.others.filter((x) => x !== r.id) : [...scene.others, r.id] }))}>
                  {on ? '✓ ' : ''}{r.name}
                </button>
              );
            })}
          </div>
        </>
      )}
    </Sheet>
  );
}
