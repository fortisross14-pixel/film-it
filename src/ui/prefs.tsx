// Per-viewer display preferences (not part of the game save): text size and motion.
// game-ui-ux: text scalable to 200%; game-feel: reduce-motion option. The OS
// "reduce motion" setting is respected by default.

import { useContext, useEffect, useRef, useState } from 'react';
import { Sheet } from './components/ui';
import { InstallButton } from './pwa';
import { GameCtx } from './store';
import { kvGet, kvSet, flushStorage } from '../platform/storage';
import { exportSave, importSave } from '../engine/save';

export interface Prefs {
  textScale: number; // 1, 1.25, 1.5, 2
  motion: 'system' | 'full' | 'reduce';
}

// Old key name kept so existing settings carry on (it is moved into IndexedDB with the save).
const KEY = 'directors-cut:prefs';
const DEFAULTS: Prefs = { textScale: 1, motion: 'system' };

function read(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(kvGet(KEY) ?? '{}') };
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
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const game = useContext(GameCtx);
  useEffect(() => {
    applyPrefs(prefs);
    try {
      kvSet(KEY, JSON.stringify(prefs));
    } catch {
      /* fallback storage refused: settings just won't persist (the save reports its own failures) */
    }
  }, [prefs]);

  const doExport = () => {
    const text = exportSave();
    if (!text) return setNote('There is no save to export yet.');
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `film-it-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNote('Save file downloaded.');
  };
  const doImport = async (file: File | undefined) => {
    if (!file) return;
    if (!confirm('Replace your current progress with this save file?')) return;
    const r = importSave(await file.text());
    if (!r.profile) return setNote(r.message ?? 'That file is not a Film it! save.');
    if (r.saved && !r.saved.ok) return setNote(r.saved.reason);
    await flushStorage();
    location.reload();
  };
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
            <div className="section-label">Save file</div>
            <div className="row">
              <button className="grow" onClick={doExport}>Export save</button>
              <button className="grow" onClick={() => fileRef.current?.click()}>Import save</button>
              <input ref={fileRef} type="file" accept="application/json,.json" hidden aria-label="Import save file" onChange={(e) => { void doImport(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
            {note && <p className="small" role="status">{note}</p>}
            <p className="small muted">Your game saves automatically after every action.</p>
          </div>
        </Sheet>
      )}
    </>
  );
}

/** Apply stored prefs before first paint (called once storage is ready). */
export function applyStoredPrefs() {
  applyPrefs(read());
}
