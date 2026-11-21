// Per-viewer display preferences (not part of the game save): text size and motion.
// game-ui-ux: text scalable to 200%; game-feel: reduce-motion option. The OS
// "reduce motion" setting is respected by default.

import { useEffect, useState } from 'react';

export interface Prefs {
  textScale: number; // 1, 1.25, 1.5, 2
  motion: 'system' | 'full' | 'reduce';
}

const KEY = 'directors-cut:prefs';
const DEFAULTS: Prefs = { textScale: 1, motion: 'system' };

function read(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') };
  } catch {
    return DEFAULTS;
  }
}

export function applyPrefs(p: Prefs) {
  const root = document.documentElement;
  root.style.fontSize = `${p.textScale * 100}%`;
  const systemReduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.dataset.motion = p.motion === 'reduce' || (p.motion === 'system' && systemReduce) ? 'reduce' : 'full';
}

/** True when animations should be cut (setting or OS preference). */
export const reducedMotion = () => document.documentElement.dataset.motion === 'reduce';

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(read);
  useEffect(() => {
    applyPrefs(prefs);
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* private mode: settings just won't persist */
    }
  }, [prefs]);
  return (
    <span className="settings">
      <button aria-expanded={open} aria-label="Settings" onClick={() => setOpen(!open)}>⚙ Settings</button>
      {open && (
        <div className="card settings-panel" role="dialog" aria-label="Settings">
          <div className="section-label">Text size</div>
          <div className="row wrap">
            {[1, 1.25, 1.5, 2].map((s) => (
              <button key={s} className={prefs.textScale === s ? 'primary' : ''} onClick={() => setPrefs({ ...prefs, textScale: s })}>
                {Math.round(s * 100)}%
              </button>
            ))}
          </div>
          <div className="section-label">Motion</div>
          <div className="row wrap">
            {(['system', 'full', 'reduce'] as const).map((m) => (
              <button key={m} className={prefs.motion === m ? 'primary' : ''} onClick={() => setPrefs({ ...prefs, motion: m })}>
                {m === 'system' ? 'Follow device' : m === 'full' ? 'Full' : 'Reduce'}
              </button>
            ))}
          </div>
          <button onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </span>
  );
}

// Apply stored prefs before first paint.
if (typeof document !== 'undefined') applyPrefs(read());
