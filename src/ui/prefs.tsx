// Per-viewer display preferences (not part of the game save): text size and motion.
// game-ui-ux: text scalable to 200%; game-feel: reduce-motion option. The OS
// "reduce motion" setting is respected by default.

import { useContext, useEffect, useState } from 'react';
import { Sheet } from './components/ui';
import { InstallButton } from './pwa';
import { GameCtx } from './store';

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
  const game = useContext(GameCtx);
  useEffect(() => {
    applyPrefs(prefs);
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch {
      /* private mode: settings just won't persist */
    }
  }, [prefs]);
  return (
    <>
      <button className="icon ghost-btn settings-btn" aria-label="Menu and settings" onClick={() => setOpen(true)}>⚙</button>
      {open && (
        <Sheet title="Menu" onClose={() => setOpen(false)}>
          <div className="stack">
            <InstallButton className="wide" />
            {game?.profile && <button className="wide" onClick={() => { setOpen(false); game.close(); }}>Save &amp; quit to title</button>}
            <div className="section-label">Text size</div>
            <div className="seg">
              {[1, 1.25, 1.5, 2].map((s) => (
                <button key={s} className={prefs.textScale === s ? 'on' : ''} onClick={() => setPrefs({ ...prefs, textScale: s })}>{Math.round(s * 100)}%</button>
              ))}
            </div>
            <div className="section-label">Motion</div>
            <div className="seg">
              {(['system', 'full', 'reduce'] as const).map((m) => (
                <button key={m} className={prefs.motion === m ? 'on' : ''} onClick={() => setPrefs({ ...prefs, motion: m })}>
                  {m === 'system' ? 'Device' : m === 'full' ? 'Full' : 'Reduced'}
                </button>
              ))}
            </div>
            <p className="small muted">Your game saves automatically after every action.</p>
          </div>
        </Sheet>
      )}
    </>
  );
}

// Apply stored prefs before first paint.
if (typeof document !== 'undefined') applyPrefs(read());
