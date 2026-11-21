import { useGame, useProfile } from '../store';
import { ProfileHeader } from './BaseMenu';
import { ContractCard } from '../components/ContractCard';
import { directorById } from '../../engine/data/directors';
import { abandonFilm } from '../../engine/profile';
import type { FilmPhase } from '../../engine/types';
import { ScriptEditor } from './ScriptEditor';
import { CastingScreen } from './CastingScreen';
import { ShootingScreen } from './ShootingScreen';

const PHASES: { id: FilmPhase; label: string }[] = [
  { id: 'script', label: 'Script' },
  { id: 'casting', label: 'Casting' },
  { id: 'shooting', label: 'Shooting' },
  { id: 'post', label: 'Post' },
  { id: 'premiere', label: 'Premiere' },
];

export function ProductionScreen() {
  const p = useProfile();
  const { update } = useGame();
  const film = p.activeFilm!;
  const phaseIdx = PHASES.findIndex((x) => x.id === film.phase);
  return (
    <div className="screen">
      <ProfileHeader />
      <div className="content">
        <div className="row between">
          <div>
            <h2>“{film.title}”</h2>
            <p className="muted">Directed by {directorById(film.directorId).name}</p>
          </div>
          <button
            className="danger"
            onClick={() => {
              if (confirm('Abandon this film? The contract is lost.')) update(abandonFilm);
            }}
          >
            Abandon film
          </button>
        </div>
        <ol className="stepper">
          {PHASES.map((ph, i) => (
            <li key={ph.id} className={i === phaseIdx ? 'active' : i < phaseIdx ? 'done' : ''}>
              {ph.label}
            </li>
          ))}
        </ol>
        {film.phase === 'script' ? (
          <ScriptEditor />
        ) : film.phase === 'casting' ? (
          <CastingScreen />
        ) : film.phase === 'shooting' ? (
          <ShootingScreen />
        ) : (
        <div className="production-body">
          <div className="card placeholder">
            <h3>{PHASES[phaseIdx]?.label} phase</h3>
            <p className="muted">
              Script {film.scriptQuality} · Casting {film.castingScore ?? '—'}. The {PHASES[phaseIdx]?.label.toLowerCase()} phase arrives in the next milestone.
            </p>
          </div>
          <div className="brief-side">
            <div className="section-label">The brief</div>
            <ContractCard c={film.contract} />
          </div>
        </div>
        )}
      </div>
    </div>
  );
}
