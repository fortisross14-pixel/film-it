// App frame: side nav on wide screens, bottom tab bar on phones; a compact top bar with the
// screen's title, a few stat pills and a ⚙ menu (settings, install, save & quit).
import type { ReactNode } from 'react';
import { SettingsButton } from '../prefs';
import { art } from '../art';

export interface NavItem { id: string; label: string; icon: ReactNode; done?: boolean; disabled?: boolean }

export function Shell({ nav, active, onNav, title, sub, pills, actions, children, progress }: {
  nav: NavItem[]; active: string; onNav?: (id: string) => void;
  /** The nav shows progress (film phases) rather than places: on phones it shrinks into the top bar. */
  progress?: boolean;
  title: ReactNode; sub?: ReactNode; pills?: ReactNode; actions?: ReactNode; children: ReactNode;
}) {
  return (
    <div className={`shell ${progress ? 'nav-progress' : ''}`}>
      <aside className="sidenav" aria-label="Main menu">
        <div className="brand"><img src={art('logo')} alt="Film it!" className="brand-logo" /></div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${active === n.id ? 'active' : ''} ${n.done ? 'done' : ''}`}
              aria-current={active === n.id ? 'page' : undefined}
              disabled={n.disabled || !onNav}
              onClick={() => onNav?.(n.id)}
            >
              <span className="nav-icon">{n.icon}</span>
              <span className="nav-label">{n.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="shell-main">
        <header className="topbar">
          <div className="top-title">
            <strong>{title}</strong>
            {sub && <span className="hud-sub">{sub}</span>}
            {progress && (
              <span className="phase-dots" aria-hidden="true">
                {nav.map((n) => <i key={n.id} className={active === n.id ? 'on' : n.done ? 'done' : ''} />)}
              </span>
            )}
          </div>
          {pills && <div className="top-pills">{pills}</div>}
          <div className="top-actions">
            {actions}
            <SettingsButton />
          </div>
        </header>
        <main className="content paper">{children}</main>
      </div>
    </div>
  );
}
