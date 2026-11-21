// Shared navigation primitives for the mobile-first layout (game-ui-ux skill):
// - Sheet: a full-screen panel on phones, a centred dialog on wide screens. One task each.
// - Tabs: a segmented control that splits a long screen into short views.
// - ActionBar: the screen's main action, pinned above the bottom navigation.
// - Toast: a short message after an action (replaces inline paragraphs of feedback).

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function Sheet({ title, kicker, onClose, footer, children, wide }: {
  title: ReactNode; kicker?: ReactNode; onClose?: () => void; footer?: ReactNode; children: ReactNode; wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const prevFocus = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      prevFocus?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="sheet-backdrop" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className={`sheet ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" tabIndex={-1} ref={ref}>
        <header className="sheet-head">
          {onClose && <button className="icon ghost-btn" aria-label="Back" onClick={onClose}>‹</button>}
          <div className="sheet-title">
            {kicker && <span className="kicker">{kicker}</span>}
            <h2>{title}</h2>
          </div>
        </header>
        <div className="sheet-body">{children}</div>
        {footer && <footer className="sheet-foot">{footer}</footer>}
      </div>
    </div>
  );
}

export interface TabDef<T extends string> { id: T; label: ReactNode; badge?: ReactNode }

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: TabDef<T>[]; value: T; onChange: (t: T) => void; label?: string }) {
  return (
    <div className="tabs2" role="tablist" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} className={value === t.id ? 'on' : ''} onClick={() => { onChange(t.id); if (window.scrollY > 120) window.scrollTo({ top: 0 }); }}>
          {t.label}
          {t.badge !== undefined && <span className="tab-badge">{t.badge}</span>}
        </button>
      ))}
    </div>
  );
}

/** The screen's main action(s), pinned to the bottom of the viewport. */
export function ActionBar({ children }: { children: ReactNode }) {
  return <div className="action-bar">{children}</div>;
}

/** A label + value chip, for compact stats. */
export function Stat({ label, value, tone }: { label: ReactNode; value: ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <span className={`stat2 ${tone ?? ''}`}>
      <span className="stat2-label">{label}</span>
      <strong>{value}</strong>
    </span>
  );
}

export function Steps({ steps, at }: { steps: string[]; at: number }) {
  return (
    <ol className="steps2" aria-label={`Step ${at + 1} of ${steps.length}`}>
      {steps.map((s, i) => <li key={s} className={i === at ? 'on' : i < at ? 'done' : ''}>{s}</li>)}
    </ol>
  );
}

/** A transient message; call show(text). */
export function useToast() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    const t = setTimeout(() => setText(null), 3200);
    return () => clearTimeout(t);
  }, [text]);
  const node = text ? <div className="toast" role="status" onClick={() => setText(null)}>{text}</div> : null;
  return { show: setText, node };
}

/** A 1–5 difficulty meter that cannot be mistaken for a star rating. */
export function Difficulty({ n }: { n: number }) {
  const word = ['Easy', 'Easy', 'Medium', 'Tough', 'Hard', 'Brutal'][n] ?? 'Medium';
  return (
    <span className={`difficulty d-${n}`} title={`Difficulty ${n} of 5`} aria-label={`Difficulty ${n} of 5: ${word}`}>
      <span className="pips">{[1, 2, 3, 4, 5].map((i) => <i key={i} className={i <= n ? 'on' : ''} />)}</span>
      {word}
    </span>
  );
}
