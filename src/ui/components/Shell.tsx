// App frame from the concept art: dark side nav with icons, dark top bar with the
// director, credits and reputation, and a cream "paper" content area with film-strip edges.
import type { ReactNode } from 'react';
import { useGame, useProfile } from '../store';
import { SettingsButton } from '../prefs';
import { Clapper, Star, Ticket } from './Icons';
import { directorById } from '../../engine/data/directors';
import { nextTierAt, reputationTier } from '../../engine/progression';
import { TUNING } from '../../engine/tuning';

export interface NavItem { id: string; label: string; icon: ReactNode; done?: boolean; disabled?: boolean }

export function Shell({ nav, active, onNav, extra, children }: {
  nav: NavItem[]; active: string; onNav?: (id: string) => void; extra?: ReactNode; children: ReactNode;
}) {
  const p = useProfile();
  const { close } = useGame();
  const c = p.career;
  const rep = c?.reputation ?? 0;
  const next = nextTierAt(rep);
  const prevTier = TUNING.reputationTiers[reputationTier(rep) - 1] ?? 0;
  const repPct = next ? ((rep - prevTier) / (next - prevTier)) * 100 : 100;
  const lvlPct = c ? (c.level / TUNING.directors.maxLevel) * 100 : 0;
  return (
    <div className="shell">
      <aside className="sidenav" aria-label="Main menu">
        <div className="brand">
          <Clapper size={34} className="brand-icon" />
          <span className="brand-name">Film it!</span>
        </div>
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
              <span>{n.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <div className="shell-main">
        <header className="topbar">
          <div className="hud-director">
            <span className="avatar"><Clapper size={26} /></span>
            <span>
              <strong>{c ? directorById(c.directorId).name : p.name}</strong>
              <span className="hud-sub">{c ? `Lv. ${c.level} · ${c.films} films` : 'No career running'}</span>
              {c && <span className="hud-bar"><span style={{ width: `${lvlPct}%` }} /></span>}
            </span>
          </div>
          <span className="hud-pill" title="The bank: credits earned across all careers"><Ticket size={22} /> {p.credits.toLocaleString()} Credits</span>
          {c && !extra && (
            <span className="hud-rep" title={next ? `Studio tier ${reputationTier(rep)} · next at ${next}` : 'Top studio tier'}>
              <span className="rep-star"><Star size={18} /></span>
              <span>
                Reputation {rep} <span className="hud-sub">tier {reputationTier(rep)}</span>
                <span className="hud-bar"><span style={{ width: `${repPct}%` }} /></span>
              </span>
            </span>
          )}
          {extra}
          <span className="spacer" />
          <SettingsButton />
          <button className="ghost" onClick={close}>Save &amp; quit</button>
        </header>
        <main className="content paper">{children}</main>
      </div>
    </div>
  );
}
