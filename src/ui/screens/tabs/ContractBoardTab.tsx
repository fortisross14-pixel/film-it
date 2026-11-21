import { useState } from 'react';
import { useGame, useProfile } from '../../store';
import { ContractCard } from '../../components/ContractCard';
import { directorById } from '../../../engine/data/directors';
import { genreCloseness, genreName } from '../../../engine/data/genres';
import { refreshBoard, startFilm } from '../../../engine/profile';

export function ContractBoardTab() {
  const p = useProfile();
  const { update } = useGame();
  const [contractId, setContractId] = useState<string | null>(null);
  const [directorId, setDirectorId] = useState<string>(p.unlocks.directors[0]);
  const [error, setError] = useState<string | null>(null);
  const contract = p.contractBoard.find((c) => c.id === contractId);

  const accept = () => {
    if (!contractId) return;
    const r = startFilm(p, contractId, directorId);
    if (r.ok) update(() => r.profile);
    else setError(r.reason);
  };

  return (
    <div>
      <div className="row between">
        <h2>Contract board</h2>
        {/* Dev convenience until delivery refreshes the board (Milestone 7). */}
        <button onClick={() => (update(refreshBoard), setContractId(null))}>Refresh board (dev)</button>
      </div>
      <p className="muted">Pick a brief, choose a director, and accept the contract.</p>
      <div className="grid">
        {p.contractBoard.map((c) => (
          <ContractCard key={c.id} c={c} selected={c.id === contractId} onSelect={() => setContractId(c.id)} />
        ))}
      </div>

      {contract && (
        <div className="card accept-panel">
          <h3>Who directs it?</h3>
          <div className="row wrap">
            {p.unlocks.directors.map((id) => {
              const d = directorById(id);
              const match = d.genreAffinity.length === 0
                ? 'Any genre'
                : d.genreAffinity.some((g) => genreCloseness(g, contract.genre) === 1)
                  ? 'Genre match'
                  : d.genreAffinity.some((g) => genreCloseness(g, contract.genre) > 0)
                    ? 'Close genre'
                    : 'Far off genre';
              return (
                <label key={id} className={`choice ${directorId === id ? 'selected' : ''}`}>
                  <input type="radio" name="director" checked={directorId === id} onChange={() => setDirectorId(id)} />
                  <strong>{d.name}</strong> <span className="muted">lvl {p.directors[id]?.level ?? 1}</span>
                  <div className="small muted">
                    {d.genreAffinity.length ? d.genreAffinity.map(genreName).join(', ') : 'Any'} · {match}
                  </div>
                </label>
              );
            })}
          </div>
          {error && <p className="bad">{error}</p>}
          <button className="primary" onClick={accept}>Accept contract</button>
        </div>
      )}
    </div>
  );
}
