// Installable web app: service worker registration, persistent storage, and an
// "Install app" button. Chrome/Edge/Android fire beforeinstallprompt; iOS Safari has no
// prompt, so we show the Share → Add to Home Screen steps instead.

import { useEffect, useState } from 'react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

export function initPwa() {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* offline support is optional */ });
  }
  // Ask the browser not to evict saves under storage pressure.
  navigator.storage?.persist?.().catch(() => undefined);
}

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);

const isIos = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);

export function InstallButton({ className = '' }: { className?: string }) {
  const [, force] = useState(0);
  const [help, setHelp] = useState(false);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    listeners.add(f);
    return () => void listeners.delete(f);
  }, []);
  if (isStandalone()) return null;
  const canPrompt = !!deferred;
  return (
    <>
      <button
        className={`install-btn ${className}`}
        onClick={async () => {
          if (deferred) {
            await deferred.prompt();
            await deferred.userChoice.catch(() => undefined);
            deferred = null;
            notify();
          } else setHelp(!help);
        }}
      >
        ⤓ Install app
      </button>
      {help && !canPrompt && (
        <div className="install-help small" role="note">
          {isIos()
            ? <>In Safari tap <strong>Share</strong> (□↑), then <strong>Add to Home Screen</strong>.</>
            : <>Open the browser menu (⋮) and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</>}
        </div>
      )}
    </>
  );
}
