import { useState } from 'react';
import { deleteSlot, listSlots, loadProfile } from '../../engine/save';
import { newProfile } from '../../engine/profile';
import { useGame } from '../store';
import { SettingsButton } from '../prefs';
import { InstallButton } from '../pwa';
import { art } from '../art';

export function SlotsScreen() {
  const { open } = useGame();
  const [slots, setSlots] = useState(() => listSlots());
  const [naming, setNaming] = useState<number | null>(null);
  const [name, setName] = useState('');

  const create = (slot: number) => {
    open(slot, newProfile(name.trim() || `Director ${slot + 1}`));
  };

  return (
    <div className="screen center title-screen" style={{ backgroundImage: `url(${art('home-bg')})` }}>
      <h1 className="title-logo"><img src={art('logo')} alt="Film it!" /></h1>
      <img className="title-hero" src={art('home-hero')} alt="" />
      <p className="title-sub">Choose a save slot</p>
      <div className="row">
        <InstallButton />
        <SettingsButton />
      </div>
      <div className="slots">
        {slots.map((s) => (
          <div key={s.slot} className="card slot">
            <div className="slot-title">Slot {s.slot + 1}</div>
            {s.empty ? (
              naming === s.slot ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    create(s.slot);
                  }}
                >
                  <input autoFocus placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
                  <button className="primary" type="submit">Start</button>
                </form>
              ) : (
                <>
                  <p className="muted">Empty</p>
                  <button className="primary" onClick={() => setNaming(s.slot)}>New game</button>
                </>
              )
            ) : s.corrupt ? (
              <>
                <p className="bad">{s.message ?? 'Unreadable save'}</p>
                <button onClick={() => (deleteSlot(s.slot), setSlots(listSlots()))}>Clear slot</button>
              </>
            ) : (
              <>
                <p><strong>{s.name}</strong></p>
                {s.status === 'fromBackup' && <p className="small bad">{s.message}</p>}
                <p className="muted">{s.credits} credits · {s.careers} career{s.careers === 1 ? '' : 's'} · {s.films} films</p>
                <div className="row">
                  <button className="primary" onClick={() => open(s.slot, loadProfile(s.slot)!)}>Continue</button>
                  <button
                    className="danger"
                    onClick={() => {
                      if (confirm(`Delete slot ${s.slot + 1}? This cannot be undone.`)) {
                        deleteSlot(s.slot);
                        setSlots(listSlots());
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
