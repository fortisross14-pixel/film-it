// The editing-suite workspace for the hands-on phases (script, shooting, edit), in the style of
// a non-linear editor: workspace tabs on top, a Properties inspector, a Program monitor, side
// panels and a multi-track timeline with a timecode ruler. Casting and the premiere keep the
// illustrated look.

import type { ReactNode } from 'react';
import { SettingsButton } from '../prefs';
import { art } from '../art';

/** Minutes of film → "01:23:00:00" (24 fps). */
export function timecode(minutes: number): string {
  const totalFrames = Math.max(0, Math.round(minutes * 60 * 24));
  const f = totalFrames % 24;
  const s = Math.floor(totalFrames / 24) % 60;
  const m = Math.floor(totalFrames / (24 * 60)) % 60;
  const h = Math.floor(totalFrames / (24 * 3600));
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}:${p(f)}`;
}

export interface Workspace { id: string; label: string; done?: boolean }

/** Top bar like an editor: home, workspace tabs (the film's phases), the project title, status. */
export function EditorFrame({ workspaces, active, title, status, actions, onHome, layout, children }: {
  workspaces: Workspace[]; active: string; title: ReactNode; status?: ReactNode; actions?: ReactNode; onHome?: () => void; layout?: string; children: ReactNode;
}) {
  return (
    <div className="nle">
      <header className="nle-top">
        <div className="nle-top-left">
          {onHome && <button className="nle-icon" aria-label="Home (the film waits)" title="Home" onClick={onHome}>⌂</button>}
          <img src={art('logo')} alt="Film it!" className="nle-logo" />
          <nav className="nle-workspaces" aria-label="Production phases">
            {workspaces.map((w) => (
              <span key={w.id} className={`nle-ws ${w.id === active ? 'on' : ''} ${w.done ? 'done' : ''}`} aria-current={w.id === active ? 'step' : undefined}>{w.label}</span>
            ))}
          </nav>
        </div>
        <div className="nle-title">{title}</div>
        <div className="nle-top-right">
          {status}
          {actions}
          <SettingsButton />
        </div>
      </header>
      <div className={`nle-body ${layout ?? ''}`}>{children}</div>
    </div>
  );
}

export interface PanelTab<T extends string> { id: T; label: ReactNode }

/** A docked panel: a header with its name (or tabs) and a scrolling body. */
export function Panel<T extends string>({ title, tabs, tab, onTab, actions, area, className, children }: {
  title?: ReactNode; tabs?: PanelTab<T>[]; tab?: T; onTab?: (t: T) => void; actions?: ReactNode; area: string; className?: string; children: ReactNode;
}) {
  return (
    <section className={`nle-panel ${className ?? ''}`} style={{ gridArea: area }}>
      <header className="nle-panel-head">
        {tabs ? (
          <div className="nle-tabs" role="tablist">
            {tabs.map((t) => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => onTab?.(t.id)}>{t.label}</button>
            ))}
          </div>
        ) : <span className="nle-panel-title">{title}</span>}
        <span className="nle-panel-menu" aria-hidden="true">≡</span>
        {actions && <span className="nle-panel-actions">{actions}</span>}
      </header>
      <div className="nle-panel-body">{children}</div>
    </section>
  );
}

/** The Program monitor: a picture, its timecodes and transport controls. */
export function Monitor({ title, current, duration, children, transport, area = 'monitor' }: {
  title: ReactNode; current?: string; duration?: string; children: ReactNode; transport?: ReactNode; area?: string;
}) {
  return (
    <section className="nle-panel nle-monitor" style={{ gridArea: area }}>
      <header className="nle-panel-head"><span className="nle-panel-title">{title}</span><span className="nle-panel-menu" aria-hidden="true">≡</span></header>
      <div className="nle-screen">{children}</div>
      <div className="nle-monitor-bar">
        <span className="nle-tc">{current ?? '00:00:00:00'}</span>
        <span className="nle-fit">Fit ▾</span>
        <span className="nle-transport">{transport}</span>
        <span className="nle-tc dim">{duration ?? ''}</span>
      </div>
    </section>
  );
}

export interface Clip {
  id: string;
  start: number; // minutes
  len: number; // minutes
  label: ReactNode;
  kind: 'video' | 'fx' | 'music' | 'sfx' | 'empty' | 'filler';
  tone?: string;
  badge?: ReactNode;
  selected?: boolean;
  title?: string;
  onClick?: () => void;
}
export interface Track { id: string; name: string; clips: Clip[]; lane?: ReactNode; tall?: boolean }

/** A multi-track timeline: ruler with timecodes, track headers, clips placed by minute, a playhead. */
export function NleTimeline({ runtime, tracks, playhead, sequence = 'Sequence 01', toolbar, area = 'timeline', markers }: {
  runtime: number; tracks: Track[]; playhead?: number; sequence?: string; toolbar?: ReactNode; area?: string;
  markers?: { at: number; label: string }[];
}) {
  const pct = (m: number) => `${(m / Math.max(1, runtime)) * 100}%`;
  const step = runtime > 120 ? 20 : runtime > 60 ? 15 : 10;
  const ticks = Array.from({ length: Math.floor(runtime / step) + 1 }, (_, i) => i * step);
  return (
    <section className="nle-panel nle-timeline" style={{ gridArea: area }}>
      <header className="nle-panel-head">
        <span className="nle-panel-title"><span className="nle-x" aria-hidden="true">×</span> {sequence}</span>
        <span className="nle-panel-menu" aria-hidden="true">≡</span>
        {toolbar && <span className="nle-panel-actions">{toolbar}</span>}
      </header>
      <div className="nle-tl">
        <div className="nle-tl-top">
          <span className="nle-tc">{timecode(playhead ?? 0)}</span>
          <div className="nle-ruler">
            {ticks.map((m) => <span key={m} className="nle-tick" style={{ left: pct(m) }}>{timecode(m).slice(0, 8)}</span>)}
            {markers?.map((mk) => <span key={mk.label} className="nle-marker" style={{ left: pct(mk.at) }} title={mk.label}>▾<em>{mk.label}</em></span>)}
            {playhead !== undefined && <span className="nle-playhead-head" style={{ left: pct(playhead) }} />}
          </div>
        </div>
        <div className="nle-tracks">
          {tracks.map((t) => (
            <div key={t.id} className={`nle-track ${t.id.startsWith('A') ? 'audio' : 'video'} ${t.tall ? 'tall' : ''}`}>
              <div className="nle-track-head">
                <span className="nle-track-id">{t.id}</span>
                <span className="nle-track-name">{t.name}</span>
                <span className="nle-track-icons" aria-hidden="true">{t.id.startsWith('A') ? 'M S' : '👁'}</span>
              </div>
              <div className="nle-lane">
                {t.lane ?? t.clips.map((c) => (
                  <button
                    key={c.id}
                    className={`nle-clip k-${c.kind} ${c.tone ? `t-${c.tone}` : ''} ${c.selected ? 'selected' : ''}`}
                    style={{ left: pct(c.start), width: pct(c.len) }}
                    title={c.title}
                    onClick={c.onClick}
                    disabled={!c.onClick}
                  >
                    <span className="nle-clip-label">{c.label}</span>
                    {c.badge !== undefined && <span className="nle-clip-badge">{c.badge}</span>}
                    {(c.kind === 'music' || c.kind === 'sfx') && <span className="nle-wave" aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {playhead !== undefined && <span className="nle-playhead" style={{ left: `calc(var(--nle-head) + (100% - var(--nle-head)) * ${playhead / Math.max(1, runtime)})` }} />}
        </div>
      </div>
    </section>
  );
}
