// Title screen: one permanent studio. Continue it, or found it the first time.

import { useState } from 'react';
import { eraseSave, load } from '../../engine/save';
import { newProfile } from '../../engine/profile';
import { runningCareers } from '../../engine/career';
import { money } from '../../engine/format';
import { useGame } from '../store';
import { SettingsButton } from '../prefs';
import { InstallButton } from '../pwa';
import { art } from '../art';

export function TitleScreen() {
  const { open } = useGame();
  const [save, setSave] = useState(() => load());
  const [name, setName] = useState('');
  const p = save.profile;
  const unreadable = !p && save.status !== 'empty';

  return (
    <div className="screen center title-screen" style={{ backgroundImage: `url(${art('home-bg')})` }}>
      <h1 className="title-logo"><img src={art('logo')} alt="Film it!" /></h1>
      <img className="title-hero" src={art('home-hero')} alt="" />
      <div className="row">
        <InstallButton />
        <SettingsButton />
      </div>
      <div className="slots">
        <div className="card slot">
          {p ? (
            <>
              <div className="slot-title">{p.name}'s studio</div>
              {save.message && <p className="small muted">{save.message}</p>}
              <p className="muted">
                {money(p.money)} · {runningCareers(p).length} running career{runningCareers(p).length === 1 ? '' : 's'} · {p.filmography.length} film{p.filmography.length === 1 ? '' : 's'}
              </p>
              <button className="primary" onClick={() => open(p)}>Continue ▶</button>
            </>
          ) : unreadable ? (
            <>
              <p className="bad">{save.message ?? 'The save could not be read.'}</p>
              <button className="danger" onClick={() => {
                if (!confirm('Start over? The unreadable save is deleted.')) return;
                eraseSave();
                setSave(load());
              }}>Start over</button>
            </>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); open(newProfile(name.trim() || 'My')); }}>
              <div className="slot-title">Found your studio</div>
              <p className="small muted">Direct up to three careers at a time. Each one has ten films to climb from a micro-budget indie to the big blockbusters, and one flop ends it. What you earn and unlock stays for good.</p>
              <input autoFocus placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
              <button className="primary" type="submit">Start ▶</button>
            </form>
          )}
        </div>
      </div>
      {p && (
        <button className="link small erase" onClick={() => {
          if (!confirm('Erase all progress? Every career, film and unlock is lost. This cannot be undone.')) return;
          eraseSave();
          setSave(load());
        }}>Erase progress</button>
      )}
    </div>
  );
}
