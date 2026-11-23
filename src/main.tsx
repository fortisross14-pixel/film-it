import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './ui/styles.css';
import './ui/layout.css';
import './ui/premium.css';
import './ui/nle.css';
import { initPwa } from './ui/pwa';
import { initStorage, gameStore } from './platform/storage';
import { setSaveStore } from './engine/save';
import { applyStoredPrefs } from './ui/prefs';

initPwa();

// Saves live in IndexedDB (moved over from localStorage on first start): load them before
// anything reads the save or the settings.
void initStorage().then(() => {
  setSaveStore(gameStore);
  applyStoredPrefs();
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
