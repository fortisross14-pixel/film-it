import { useMemo, useState } from 'react';
import type { Beat, Film, RoleType, Scene } from '../../engine/types';
import { useGame, useProfile } from '../store';
import { directorById } from '../../engine/data/directors';
import { actionById } from '../../engine/data/actions';
import { AXES, TONES, toneById } from '../../engine/data/tones';
import { TOPICS } from '../../engine/data/topics';
import { genreName } from '../../engine/data/genres';
import { describeBeat, describeHardReq, money, ROLE_TYPE_NAMES } from '../../engine/format';
import { TUNING } from '../../engine/tuning';
import {
  DURATIONS, ROLE_TYPES, addBeat, addRole, addScene, availableActions, canAddRole, checkRequirements, fillerShare,
  finishScript, genreTarget, layout, moveScene, participants, removeBeat, removeRole, removeScene, renameRole, sceneCost,
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

export function ScriptEditor() {
  const p = useProfile();
  const { update } = useGame();
  const film = p.activeFilm!;
  const director = directorById(film.directorId);
  const level = p.directors[film.directorId]?.level ?? 1;
  const [msg, setMsg] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const apply: Apply = (r) => {
    if (!r.ok) return setMsg(r.reason), false;
    update((q) => ({ ...q, activeFilm: r.film }));
    setMsg(r.removedBeats ? `${r.removedBeats} action(s) removed: their topic is gone.` : null);
    return true;
  };

  const quality = useMemo(() => scriptQuality(film, director, level), [film, director, level]);
  const cost = scriptCost(film, director, level);
  const reqs = checkRequirements(film);
  const blockers = scriptBlockers(film);
  const target = genreTarget(film).target;

  return (
    <div className="script-grid">
      <div className="script-main">
        <CharactersPanel film={film} onApply={apply} />
        <RuntimeTopicBar film={film} onApply={apply} unlocked={p.unlocks.topics} />
        <Timeline film={film} selected={selected} onSelect={setSelected} onApply={apply} />
        {msg && <p className="bad">{msg}</p>}
        <div className="scene-cards">
          {film.scenes.map((s, i) => (
            <SceneCard
              key={s.id}
              film={film}
              scene={s}
              index={i}
              level={level}
              selected={selected === s.id}
              onFocus={() => setSelected(s.id)}
              onApply={apply}
            />
          ))}
          {film.scenes.length < TUNING.script.maxScenes && (
            <button
              className="card add-scene"
              disabled={film.roles.length === 0}
              onClick={() => {
                const r = addScene(film, { duration: 'medium', tone: 'calm' });
                if (apply(r) && r.ok) setSelected(r.sceneId ?? null);
              }}
            >
              + Add scene
              <span className="small muted">
                {film.roles.length === 0 ? 'Define characters first' : `${film.scenes.length}/${TUNING.script.maxScenes} · usually 4–5`}
              </span>
            </button>
          )}
        </div>
      </div>

      <aside className="script-side">
        <div className="card">
          <h3>Script profile</h3>
          <p className="small muted">Marker = what {genreName(film.contract.genre)} audiences expect</p>
          {AXES.map((ax) => (
            <div key={ax.id} className="axis">
              <div className="row between small">
                <span className="muted">{ax.low}</span>
                <strong>{ax.name}</strong>
                <span className="muted">{ax.high}</span>
              </div>
              <span className="bar axis-bar">
                <span style={{ width: `${quality.profile[ax.id]}%` }} />
                <i className="target" style={{ left: `${target[ax.id]}%` }} />
              </span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="row between">
            <h3>Script quality</h3>
            <span className="big">{quality.total}</span>
          </div>
          {(['fit', 'depth', 'structure', 'characters', 'coherence', 'pacing'] as const).map((k) => (
            <div key={k} className="weight">
              <span>{k[0].toUpperCase() + k.slice(1)}</span>
              <span className="bar"><span style={{ width: `${quality[k]}%` }} /></span>
              <span className="muted">{quality[k]}</span>
            </div>
          ))}
          {quality.directorBonus !== 0 && (
            <p className="small">Director bonus: <span className={quality.directorBonus > 0 ? 'good' : 'bad'}>{quality.directorBonus > 0 ? '+' : ''}{quality.directorBonus}</span></p>
          )}
          <p className="small">Filler {Math.round(fillerShare(film) * 100)}% <span className="muted">(boredom)</span></p>
          {quality.notes.length > 0 && (
            <ul className="reqs small muted">{quality.notes.slice(0, 6).map((n) => <li key={n}>{n}</li>)}</ul>
          )}
        </div>

        <div className="card">
          <h3>Budget</h3>
          <p>Script cost <strong>{money(cost)}</strong> <span className="muted">of {money(film.contract.budget)}</span></p>
          <span className="bar"><span style={{ width: `${Math.min(100, (cost / film.contract.budget) * 100)}%` }} /></span>
        </div>

        <Requirements reqs={reqs} />

        <button
          className="primary wide"
          disabled={blockers.length > 0}
          onClick={() => {
            const missing = reqs.filter((r) => r.status === 'missing').length;
            if (missing && !confirm(`${missing} hard requirement(s) are missing. Lock the script anyway?`)) return;
            apply(finishScript(film, director, level));
          }}
        >
          Lock script → Casting
        </button>
        {blockers.length > 0 && <p className="small bad">{blockers[0]}</p>}
      </aside>
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
      <p className="small muted">Each missed requirement caps the grade one letter.</p>
    </div>
  );
}

function CharactersPanel({ film, onApply }: { film: Film; onApply: Apply }) {
  const st = screenTime(film);
  return (
    <div className="card">
      <h3>Characters</h3>
      <div className="chars">
        {film.roles.map((r) => (
          <div key={r.id} className="char">
            <span className="tag">{ROLE_TYPE_NAMES[r.type]}</span>
            <input defaultValue={r.name} onBlur={(e) => e.target.value !== r.name && onApply(renameRole(film, r.id, e.target.value))} />
            <span className={`small ${st[r.id] ? 'muted' : 'bad'}`}>{st[r.id] ?? 0} min</span>
            <button
              className="danger icon"
              aria-label={`Remove ${r.name}`}
              onClick={() => {
                if (st[r.id] && !confirm(`Remove ${r.name}? Their actions are removed from every scene.`)) return;
                onApply(removeRole(film, r.id));
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="row wrap">
        {ROLE_TYPES.map((t: RoleType) => (
          <button key={t} disabled={!canAddRole(film, t)} onClick={() => onApply(addRole(film, t))}>+ {ROLE_TYPE_NAMES[t]}</button>
        ))}
      </div>
    </div>
  );
}

function RuntimeTopicBar({ film, unlocked, onApply }: { film: Film; unlocked: string[]; onApply: Apply }) {
  const [rt, setRt] = useState(String(film.runtime));
  const commit = (v: number) => setRt(String(onApply(setRuntime(film, v)) ? v : film.runtime));
  return (
    <div className="card row wrap">
      <label className="row">
        Runtime
        <button onClick={() => commit(film.runtime - 5)}>−5</button>
        <input className="num" value={rt} onChange={(e) => setRt(e.target.value)} onBlur={() => commit(Number(rt))} onKeyDown={(e) => e.key === 'Enter' && commit(Number(rt))} />
        <button onClick={() => commit(film.runtime + 5)}>+5</button>
        <span className="muted small">target {film.contract.runtime} ±{film.contract.runtimeTolerance}</span>
      </label>
      <span className="spacer" />
      <label className="row">
        Topic
        <select
          value={film.topicId ?? ''}
          onChange={(e) => {
            const r = setTopic(film, e.target.value || undefined, unlocked);
            if (r.ok && r.removedBeats && !confirm(`${r.removedBeats} topic action(s) will be removed. Continue?`)) return;
            onApply(r);
          }}
        >
          <option value="">— none —</option>
          {TOPICS.filter((t) => unlocked.includes(t.id)).map((t) => (
            <option key={t.id} value={t.id}>{t.name} (fit {t.genreFit[film.contract.genre]})</option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Timeline({ film, selected, onSelect, onApply }: { film: Film; selected: string | null; onSelect: (id: string) => void; onApply: Apply }) {
  const slots = layout(film);
  const pct = (m: number) => `${(m / film.runtime) * 100}%`;
  return (
    <div className="card">
      <div className="row between">
        <h3>Timeline</h3>
        <span className="muted small">Order the scenes · filler fills the gaps</span>
      </div>
      <div className="acts">
        <span style={{ width: '25%' }}>Act 1</span>
        <span style={{ width: '50%' }}>Act 2</span>
        <span style={{ width: '25%' }}>Act 3</span>
      </div>
      <div className="timeline">
        <div className="act-line" style={{ left: '25%' }} />
        <div className="act-line" style={{ left: '75%' }} />
        {slots.map((sl, i) => {
          const s = film.scenes[i];
          return (
            <button
              key={s.id}
              className={`tl-scene t-${s.tone} ${selected === s.id ? 'selected' : ''}`}
              style={{ left: pct(sl.start), width: pct(sl.minutes) }}
              onClick={() => onSelect(s.id)}
              title={`Scene ${i + 1} · ${toneById(s.tone).name} · ${sl.minutes} min · Act ${sl.act}`}
            >
              {i + 1}. {toneById(s.tone).name}
            </button>
          );
        })}
      </div>
      {selected && film.scenes.some((s) => s.id === selected) && (
        <div className="row">
          <button onClick={() => onApply(moveScene(film, selected, -1))}>◀ Earlier</button>
          <button onClick={() => onApply(moveScene(film, selected, 1))}>Later ▶</button>
        </div>
      )}
    </div>
  );
}

function SceneCard({
  film, scene, index, level, selected, onFocus, onApply,
}: { film: Film; scene: Scene; index: number; level: number; selected: boolean; onFocus: () => void; onApply: Apply }) {
  const actions = availableActions(film);
  const roleName = (id?: string) => film.roles.find((r) => r.id === id)?.name ?? '—';
  const inBeats = new Set(participants({ ...scene, others: [] }));
  const n = scene.beats.length;
  const act = layout(film)[index]?.act;
  const director = directorById(film.directorId);

  const setBeat = (i: number, patch: Partial<Beat>) => onApply(updateBeat(film, scene.id, i, fixBeat(film, { ...scene.beats[i], ...patch })));

  return (
    <div className={`card scene-card t-border-${scene.tone} ${selected ? 'selected' : ''}`} onFocusCapture={onFocus} onClick={onFocus}>
      <div className="row between">
        <h3>Scene {index + 1} <span className="muted small">Act {act} · {sceneMinutes(scene.duration, film.runtime)} min</span></h3>
        <div className="row">
          <button className="icon" aria-label="Move earlier" disabled={index === 0} onClick={() => onApply(moveScene(film, scene.id, -1))}>◀</button>
          <button className="icon" aria-label="Move later" disabled={index === film.scenes.length - 1} onClick={() => onApply(moveScene(film, scene.id, 1))}>▶</button>
          <button className="danger icon" aria-label="Delete scene" onClick={() => onApply(removeScene(film, scene.id))}>✕</button>
        </div>
      </div>

      <div className="row wrap">
        <span className="field-label">Duration</span>
        {DURATIONS.map((d) => (
          <button key={d} className={scene.duration === d ? 'primary' : ''} onClick={() => onApply(updateScene(film, scene.id, { duration: d }))}>{d}</button>
        ))}
      </div>
      <div className="row wrap">
        <span className="field-label">Tone</span>
        {TONES.map((t) => (
          <button key={t.id} className={`tone-btn t-${t.id} ${scene.tone === t.id ? 'on' : ''}`} onClick={() => onApply(updateScene(film, scene.id, { tone: t.id }))}>{t.name}</button>
        ))}
      </div>

      <div className="section-label">Actions · {n} {DEPTH_LABEL[Math.min(n, 4)]}</div>
      {scene.beats.map((b, i) => {
        const a = actionById(b.actionId);
        return (
          <div key={i} className={`beat ${a.tones.includes(scene.tone) ? '' : 'clash'}`}>
            <select value={b.roleId} onChange={(e) => setBeat(i, { roleId: e.target.value })} aria-label="Who">
              {film.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <span className="muted small">does</span>
            <select value={b.actionId} onChange={(e) => setBeat(i, { actionId: e.target.value })} aria-label="Action">
              {actions.map((x) => <option key={x.id} value={x.id}>{x.verb}{x.climax ? ' ★' : ''}</option>)}
            </select>
            {a.target !== 'none' && (
              <>
                <span className="muted small">{a.prep || 'Target'}</span>
                <select value={b.targetId ?? ''} onChange={(e) => setBeat(i, { targetId: e.target.value || undefined })} aria-label="Target">
                  {a.target === 'optional' && <option value="">(optional)</option>}
                  {film.roles.filter((r) => r.id !== b.roleId).map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </>
            )}
            <button className="danger icon" aria-label="Remove action" onClick={() => onApply(removeBeat(film, scene.id, i))}>✕</button>
          </div>
        );
      })}
      {n < 4 && (
        <button
          onClick={() => {
            const roleId = film.roles.find((r) => r.type === 'main')?.id ?? film.roles[0].id;
            onApply(addBeat(film, scene.id, fixBeat(film, { roleId, actionId: 'plans' })));
          }}
        >
          + Action
        </button>
      )}

      <div className="section-label">Others involved</div>
      <div className="row wrap">
        {film.roles.filter((r) => !inBeats.has(r.id)).map((r) => (
          <label key={r.id} className={`choice inline ${scene.others.includes(r.id) ? 'selected' : ''}`}>
            <input
              type="checkbox"
              checked={scene.others.includes(r.id)}
              onChange={(e) => onApply(updateScene(film, scene.id, { others: e.target.checked ? [...scene.others, r.id] : scene.others.filter((x) => x !== r.id) }))}
            />
            {r.name}
          </label>
        ))}
        {film.roles.every((r) => inBeats.has(r.id)) && <span className="muted small">Everyone already has an action</span>}
      </div>
      <p className="small muted">
        Cost {money(sceneCost(scene, director, level, film.contract.budget))}
        {scene.beats.some((b) => actionById(b.actionId).stunt) && ' · stunts'}
        {scene.beats.length > 0 && ` · ${scene.beats.map((b) => describeBeat(roleName(b.roleId), b.actionId, b.targetId ? roleName(b.targetId) : undefined)).join(', then ')}`}
      </p>
    </div>
  );
}
