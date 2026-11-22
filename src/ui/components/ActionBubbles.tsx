// Action bubbles: one button ("Add a character"); tap it and the choices pop out around it as
// bubbles. They stay open so you can pick several; tap outside (or the button again) to close.

import { useEffect, useState } from 'react';
import { Glyph, Medallion, type GlyphName } from './GameIcons';
import { useReview } from '../review';

export interface BubbleAction {
  id: string;
  label: string;
  icon: GlyphName;
  onPick: () => void;
  /** Pulses: the brief needs it. */
  highlight?: boolean;
  disabled?: boolean;
  /** A tiny badge on the bubble ("needed"). */
  badge?: string;
}

export function ActionBubbles({ label, icon = 'plus', actions, closeOnPick = false, primary = false }: {
  label: string; icon?: GlyphName; actions: BubbleAction[]; closeOnPick?: boolean; primary?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // Reviewing a locked phase: look only, no actions.
  if (useReview().readOnly) return null;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  const live = actions.filter((a) => !a.disabled);
  return (
    <div className={`bubbles ${open ? 'open' : ''}`}>
      {open && <div className="bubble-scrim" onClick={() => setOpen(false)} />}
      {open && (
        <div className="bubble-cloud" role="menu" aria-label={label}>
          {live.map((a, i) => (
            <button
              key={a.id}
              role="menuitem"
              className={`ab-item ${a.highlight ? 'hot' : ''}`}
              style={{ ['--i' as string]: i }}
              onClick={() => { a.onPick(); if (closeOnPick) setOpen(false); }}
            >
              <Medallion name={a.icon} size={48} tone={a.highlight ? 'ruby' : 'gold'} />
              <span className="bubble-label">{a.label}</span>
              {a.badge && <span className="bubble-badge">{a.badge}</span>}
            </button>
          ))}
          {live.length === 0 && <span className="bubble-empty">Nothing more to add</span>}
        </div>
      )}
      <button className={`bubble-trigger ${primary ? 'primary' : ''}`} aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen(!open)}>
        <span className="bt-icon"><Glyph name={icon} size={20} /></span>
        {label}
        {!open && actions.some((a) => a.highlight && !a.disabled) && <span className="bt-dot" aria-label="Something is needed" />}
      </button>
    </div>
  );
}
