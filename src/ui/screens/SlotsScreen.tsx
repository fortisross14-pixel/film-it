import { useState } from 'react';
import { deleteSlot, listSlots, loadProfile } from '../../engine/save';
import { newProfile } from '../../engine/profile';
import { useGame } from '../store';

export function SlotsScreen() {
  const { open } = useGame();
  const [slots, setSlots] = useState(() => listSlots());
  const [naming, setNaming] = useState<number | null>(null);
  const [name, setName] = useState('');

  const create = (slot: number) => {
    open(slot, newProfile(name.trim() || `Director ${slot + 1}`));
  };

  return (
    <div className="screen center">
      <h1 className="logo">Director's Cut</h1>
      <p className="muted">Choose a save slot</p>
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
                <p className="bad">Unreadable save</p>
                <button onClick={() => (deleteSlot(s.slot), setSlots(listSlots()))}>Clear slot</button>
              </>
            ) : (
              <>
                <p><strong>{s.name}</strong></p>
                <p className="muted">Rep {s.reputation} · {s.credits} credits · {s.films} films</p>
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
