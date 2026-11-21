import { useMemo, useRef, useState } from 'react';
import type { Film, Intensity, RoleType } from '../../engine/types';
import { useGame, useProfile } from '../store';
import { directorById } from '../../engine/data/directors';
import { sceneTypeById } from '../../engine/data/sceneTypes';
import { TOPICS, topicById } from '../../engine/data/topics';
import { describeHardReq, money, ROLE_TYPE_NAMES } from '../../engine/format';
import { TUNING } from '../../engine/tuning';
import {
  ROLE_TYPES, actAt, addRole, addScene, availableSceneTypes, canAddRole, checkRequirements, fillerShare, findFreeSlot,
  finishScript, removeRole, removeScene, renameRole, sceneAct, sceneCost, sceneGenreFit, screenTime, scriptBlockers,
  scriptCost, scriptQuality, setRuntime, setTopic, updateScene, validateScene, type EditResult, type SceneDraft,
} from '../../engine/script';

const INTENSITIES: Intensity[] = ['low', 'medium', 'high'];

type Editing = { mode: 'new'; draft: SceneDraft } | { mode: 'edit'; sceneId: string; draft: SceneDraft } | null;

export function ScriptEditor() {
  const p = useProfile();
  const { update } = useGame();
  const film = p.activeFilm!;
  const director = directorById(film.directorId);
  const level = p.directors[film.directorId]?.level ?? 1;
  const [editing, setEditing] = useState<Editing>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const apply = (r: EditResult & { removedScenes?: string[] }) => {
    if (!r.ok) return setMsg(r.reason), false;
    update((q) => ({ ...q, activeFilm: r.film }));
    setMsg(r.removedScenes?.length ? `${r.removedScenes.length} scene(s) returned to filler.` : null);
    return true;
  };

  const quality = useMemo(() => scriptQuality(film, director, level), [film, director, level]);
  const cost = scriptCost(film, director, level);
  const reqs = checkRequirements(film);
  const blockers = scriptBlockers(film);

  const startNew = (atMinute = 0) => {
    const minutes = 3;
    const start = findFreeSlot(film, minutes, atMinute) ?? findFreeSlot(film, minutes, 0);
    if (start === undefined) return setMsg('No free filler left for a 3-minute scene');
    const main = film.roles.find((r) => r.type === 'main');
    setEditing({
      mode: 'new',
      draft: { typeId: 'dialogue', roleIds: main ? [main.id] : [], minutes, startMin: start, intensity: 'medium' },
    });
  };

  return (
    <div className="script-grid">
      <div className="script-main">
        <RuntimeTopicBar film={film} onApply={apply} unlocked={p.unlocks.topics} />
        <Timeline
          film={film}
          selectedId={editing?.mode === 'edit' ? editing.sceneId : undefined}
          draft={editing?.draft}
          onSelectScene={(id) => {
            const s = film.scenes.find((x) => x.id === id)!;
            setEditing({ mode: 'edit', sceneId: id, draft: { typeId: s.typeId, roleIds: s.roleIds, minutes: s.minutes, startMin: s.startMin, intensity: s.intensity } });
          }}
          onClickFiller={startNew}
        />
        {msg && <p className="bad">{msg}</p>}
        {editing ? (
          <SceneEditor
            film={film}
            editing={editing}
            level={level}
            onChange={(draft) => setEditing({ ...editing, draft })}
            onCancel={() => setEditing(null)}
            onSave={() => {
              const r = editing.mode === 'new' ? addScene(film, editing.draft) : updateScene(film, editing.sceneId, editing.draft);
              if (apply(r)) setEditing(null);
            }}
            onDelete={editing.mode === 'edit' ? () => apply(removeScene(film, editing.sceneId)) && setEditing(null) : undefined}
          />
        ) : (
          <button className="primary" onClick={() => startNew(0)} disabled={film.roles.length === 0}>
            + Add scene
          </button>
        )}
        {film.roles.length === 0 && <p className="muted small">Define your roles first: start with a main lead.</p>}
        <RolesPanel film={film} onApply={apply} />
      </div>

      <aside className="script-side">
        <div className="card">
          <div className="row between">
            <h3>Script quality</h3>
            <span className="big">{quality.total}</span>
          </div>
          {(['coverage', 'structure', 'variety', 'fit', 'roles'] as const).map((k) => (
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
            <ul className="reqs small muted">
              {quality.notes.slice(0, 6).map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}
        </div>

        <div className="card">
          <h3>Budget</h3>
          <p>Script cost <strong>{money(cost)}</strong> <span className="muted">of {money(film.contract.budget)}</span></p>
          <span className="bar"><span style={{ width: `${Math.min(100, (cost / film.contract.budget) * 100)}%`, background: cost > film.contract.budget ? 'var(--bad)' : undefined }} /></span>
          <p className="small muted">Casting, shooting and post come out of the rest.</p>
        </div>

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

        <button
          className="primary wide"
          disabled={blockers.length > 0}
          title={blockers[0]}
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

function RuntimeTopicBar({ film, unlocked, onApply }: { film: Film; unlocked: string[]; onApply: (r: EditResult) => boolean }) {
  const [rt, setRt] = useState(String(film.runtime));
  const commit = (v: number) => {
    if (!onApply(setRuntime(film, v))) setRt(String(film.runtime));
    else setRt(String(v));
  };
  return (
    <div className="card row wrap">
      <label className="row">
        Runtime
        <button onClick={() => commit(film.runtime - 5)}>−5</button>
        <input
          className="num"
          value={rt}
          onChange={(e) => setRt(e.target.value)}
          onBlur={() => commit(Number(rt))}
          onKeyDown={(e) => e.key === 'Enter' && commit(Number(rt))}
        />
        <button onClick={() => commit(film.runtime + 5)}>+5</button>
        <span className="muted small">target {film.contract.runtime} ±{film.contract.runtimeTolerance}</span>
      </label>
      <span className="spacer" />
      <label className="row">
        Topic
        <select
          value={film.topicId ?? ''}
          onChange={(e) => {
            const id = e.target.value || undefined;
            const t = setTopic(film, id, unlocked);
            if (t.ok && t.removedScenes?.length && !confirm(`${t.removedScenes.length} topic scene(s) will return to filler. Continue?`)) return;
            onApply(t);
          }}
        >
          <option value="">— none —</option>
          {TOPICS.filter((t) => unlocked.includes(t.id)).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} (fit {t.genreFit[film.contract.genre]})
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Timeline({
  film, selectedId, draft, onSelectScene, onClickFiller,
}: {
  film: Film;
  selectedId?: string;
  draft?: SceneDraft;
  onSelectScene: (id: string) => void;
  onClickFiller: (minute: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const pct = (m: number) => `${(m / film.runtime) * 100}%`;
  const [a, b] = TUNING.script.actSplits;
  const ticks = Array.from({ length: Math.floor(film.runtime / 10) + 1 }, (_, i) => i * 10);
  return (
    <div className="card">
      <div className="row between">
        <h3>Timeline</h3>
        <span className="muted small">Click filler to place a scene · scenes snap to 1-minute slots</span>
      </div>
      <div className="acts">
        <span style={{ width: pct(film.runtime * a) }}>Act 1</span>
        <span style={{ width: pct(film.runtime * (b - a)) }}>Act 2</span>
        <span style={{ width: pct(film.runtime * (1 - b)) }}>Act 3</span>
      </div>
      <div
        className="timeline"
        ref={ref}
        onClick={(e) => {
          if (e.target !== ref.current) return;
          const r = ref.current.getBoundingClientRect();
          onClickFiller(Math.floor(((e.clientX - r.left) / r.width) * film.runtime));
        }}
      >
        <div className="act-line" style={{ left: pct(film.runtime * a) }} />
        <div className="act-line" style={{ left: pct(film.runtime * b) }} />
        {film.scenes.map((s) => {
          const t = sceneTypeById(s.typeId);
          return (
            <button
              key={s.id}
              className={`tl-scene i-${s.intensity} ${selectedId === s.id ? 'selected' : ''}`}
              style={{ left: pct(s.startMin), width: pct(s.minutes) }}
              title={`${t.name} · ${s.minutes} min · minute ${s.startMin}`}
              onClick={() => onSelectScene(s.id)}
            >
              {t.name}
            </button>
          );
        })}
        {draft && !selectedId && (
          <div className="tl-ghost" style={{ left: pct(draft.startMin), width: pct(draft.minutes) }} />
        )}
      </div>
      <div className="ticks">
        {ticks.map((m) => (
          <span key={m} style={{ left: pct(m) }}>{m}</span>
        ))}
      </div>
    </div>
  );
}

function SceneEditor({
  film, editing, level, onChange, onSave, onCancel, onDelete,
}: {
  film: Film;
  editing: NonNullable<Editing>;
  level: number;
  onChange: (d: SceneDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const { draft } = editing;
  const types = availableSceneTypes(film);
  const type = sceneTypeById(draft.typeId);
  const errors = validateScene(film, draft, editing.mode === 'edit' ? editing.sceneId : undefined);
  const director = directorById(film.directorId);
  const set = (patch: Partial<SceneDraft>) => onChange({ ...draft, ...patch });
  const act = actAt(draft.startMin + draft.minutes / 2, film.runtime);
  return (
    <div className="card scene-editor">
      <div className="row between">
        <h3>{editing.mode === 'new' ? 'New scene' : 'Edit scene'}</h3>
        <span className="muted small">Act {act}</span>
      </div>
      <div className="form-grid">
        <label>
          Type
          <select value={draft.typeId} onChange={(e) => set({ typeId: e.target.value })}>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · fit {Math.round(sceneGenreFit(film, t))}{t.topicId ? ` · ${topicById(t.topicId).name}` : ''}{t.climax ? ' · climax' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Start minute
          <input className="num" type="number" min={0} max={film.runtime - 1} value={draft.startMin} onChange={(e) => set({ startMin: Number(e.target.value) })} />
        </label>
        <label>
          Length (min)
          <input
            className="num" type="number"
            min={TUNING.script.sceneMinMinutes} max={TUNING.script.sceneMaxMinutes}
            value={draft.minutes} onChange={(e) => set({ minutes: Number(e.target.value) })}
          />
        </label>
        <div>
          Intensity
          <div className="row">
            {INTENSITIES.map((i) => (
              <button key={i} className={draft.intensity === i ? 'primary' : ''} onClick={() => set({ intensity: i })}>{i}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="section-label">
        Participants ({type.minParticipants}–{type.maxParticipants})
        {type.requiredRoles.length > 0 && <> · needs {type.requiredRoles.map((r) => ROLE_TYPE_NAMES[r]).join(', ')}</>}
      </div>
      <div className="row wrap">
        {film.roles.map((r) => (
          <label key={r.id} className={`choice inline ${draft.roleIds.includes(r.id) ? 'selected' : ''}`}>
            <input
              type="checkbox"
              checked={draft.roleIds.includes(r.id)}
              onChange={(e) => set({ roleIds: e.target.checked ? [...draft.roleIds, r.id] : draft.roleIds.filter((x) => x !== r.id) })}
            />
            {r.name} <span className="muted small">{ROLE_TYPE_NAMES[r.type]}</span>
          </label>
        ))}
      </div>
      <p className="small">
        Cost {money(sceneCost(draft, director, level))} · shooting difficulty {'●'.repeat(type.difficulty)}
        <span className="dim">{'●'.repeat(5 - type.difficulty)}</span>
      </p>
      {errors.length > 0 && <ul className="reqs bad small">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <div className="row">
        <button className="primary" disabled={errors.length > 0} onClick={onSave}>{editing.mode === 'new' ? 'Place scene' : 'Save'}</button>
        <button onClick={onCancel}>Cancel</button>
        {onDelete && <button className="danger" onClick={onDelete}>Return to filler</button>}
      </div>
    </div>
  );
}

function RolesPanel({ film, onApply }: { film: Film; onApply: (r: EditResult & { removedScenes?: string[] }) => boolean }) {
  const st = screenTime(film);
  return (
    <div className="card">
      <h3>Roles</h3>
      <div className="row wrap">
        {ROLE_TYPES.map((t: RoleType) => (
          <button key={t} disabled={!canAddRole(film, t)} onClick={() => onApply(addRole(film, t))}>
            + {ROLE_TYPE_NAMES[t]}
          </button>
        ))}
      </div>
      {film.roles.length > 0 && (
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Type</th><th>Billing</th><th>Screen time</th><th>Scenes</th><th /></tr>
          </thead>
          <tbody>
            {film.roles.map((r) => {
              const scenes = film.scenes.filter((s) => s.roleIds.includes(r.id));
              return (
                <tr key={r.id}>
                  <td>
                    <input
                      defaultValue={r.name}
                      onBlur={(e) => e.target.value !== r.name && onApply(renameRole(film, r.id, e.target.value))}
                    />
                  </td>
                  <td>{ROLE_TYPE_NAMES[r.type]}</td>
                  <td>{r.billing}</td>
                  <td className={st[r.id] ? '' : 'bad'}>{st[r.id] ?? 0} min</td>
                  <td className="small muted">{scenes.map((s) => `A${sceneAct(s, film.runtime)} ${sceneTypeById(s.typeId).name}`).join(', ')}</td>
                  <td>
                    <button
                      className="danger"
                      onClick={() => {
                        if (scenes.length && !confirm(`Remove ${r.name}? Scenes that need this role return to filler.`)) return;
                        onApply(removeRole(film, r.id));
                      }}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
