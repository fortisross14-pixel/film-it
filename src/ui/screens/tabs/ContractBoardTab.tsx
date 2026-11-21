import { useState } from 'react';
import { useGame, useProfile } from '../../store';
import { ContractCard } from '../../components/ContractCard';
import { directorById } from '../../../engine/data/directors';
import { genreCloseness } from '../../../engine/data/genres';
import { startFilm } from '../../../engine/profile';

export function ContractBoardTab() {
  const p = useProfile();
  const { update } = useGame();
  const [contractId, setContractId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const contract = p.contractBoard.find((c) => c.id === contractId);
  const d = directorById(p.career!.directorId);
  const fit = (genre: Parameters<typeof genreCloseness>[1]) =>
    d.masterGenre ? (d.masterGenre === genre ? 'Your genre!' : 'Small edge') :
    d.genreAffinity.length === 0 ? 'Any genre' :
    d.genreAffinity.some((g) => genreCloseness(g, genre) === 1) ? 'Genre match' :
    d.genreAffinity.some((g) => genreCloseness(g, genre) > 0) ? 'Close genre' : 'Far off genre';

  return (
    <div>
      <h2>Contract board</h2>
      <p className="muted">Studios offer briefs that match your reputation. Pick one and accept it as {d.name}.</p>
      <div className="grid">
        {p.contractBoard.map((c) => (
          <div key={c.id} className="contract-wrap">
            <ContractCard c={c} selected={c.id === contractId} onSelect={() => setContractId(c.id)} />
            <span className={`small fit-${fit(c.genre).replace(/\W/g, '')}`}>{fit(c.genre)}</span>
          </div>
        ))}
      </div>
      {contract && (
        <div className="card accept-panel">
          <p>
            Accept <strong>{contract.studio.name}</strong>'s brief? <span className="muted">You can't change it once production starts.</span>
          </p>
          <button className="primary" onClick={() => {
            const r = startFilm(p, contract.id);
            if (r.ok) update(() => r.profile);
            else setError(r.reason);
          }}>
            Accept contract
          </button>
          {error && <p className="bad">{error}</p>}
        </div>
      )}
    </div>
  );
}
