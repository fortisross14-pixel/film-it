import { useGame, useProfile } from '../store';
import { Shell, type NavItem } from '../components/Shell';
import { Calendar as CalIcon, Clapper, Coins, Film, Masks, People, Trophy } from '../components/Icons';
import { money } from '../../engine/format';
import { spent } from '../../engine/script';
import { weeksUsed } from '../../engine/shooting';
import { ContractCard } from '../components/ContractCard';
import { directorById } from '../../engine/data/directors';
import { abandonFilm } from '../../engine/profile';
import type { FilmPhase } from '../../engine/types';
import { ScriptEditor } from './ScriptEditor';
import { CastingScreen } from './CastingScreen';
import { ShootingScreen } from './ShootingScreen';
import { PostScreen } from './PostScreen';
import { PremiereScreen } from './PremiereScreen';

const PHASES: { id: FilmPhase; label: string; icon: JSX.Element }[] = [
  { id: 'script', label: 'Script', icon: <Masks size={22} /> },
  { id: 'casting', label: 'Casting', icon: <People size={22} /> },
  { id: 'shooting', label: 'Shooting', icon: <Clapper size={22} /> },
  { id: 'post', label: 'Edit', icon: <Film size={22} /> },
  { id: 'premiere', label: 'Premiere', icon: <Trophy size={22} /> },
];

export function ProductionScreen() {
  const p = useProfile();
  const { update } = useGame();
  const film = p.activeFilm!;
  const phaseIdx = PHASES.findIndex((x) => x.id === film.phase);
  const nav: NavItem[] = PHASES.map((ph, i) => ({ id: ph.id, label: ph.label, icon: ph.icon, done: i < phaseIdx }));
  const extra = (
    <>
      <span className="hud-pill"><CalIcon size={18} /> Week {String(weeksUsed(film)).padStart(2, '0')} / {film.contract.deadlineWeeks}</span>
      <span className="hud-pill"><Coins size={18} /> Budget {money(film.contract.budget - spent(film))}</span>
      <span className="title-plate">{film.title}</span>
    </>
  );
  return (
    <Shell nav={nav} active={film.phase} extra={extra}>
        <div className="row between">
          <div>
            <h2>“{film.title}”</h2>
            <p className="muted">Directed by {directorById(film.directorId).name}</p>
          </div>
          {!film.results && (
          <button
            className="danger"
            onClick={() => {
              if (confirm('Abandon this film? The contract is lost.')) update(abandonFilm);
            }}
          >
            Abandon film
          </button>
          )}
        </div>
        {film.phase === 'script' ? (
          <ScriptEditor />
        ) : film.phase === 'casting' ? (
          <CastingScreen />
        ) : film.phase === 'shooting' ? (
          <ShootingScreen />
        ) : film.phase === 'post' ? (
          <PostScreen />
        ) : film.phase === 'premiere' ? (
          <PremiereScreen />
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
    </Shell>
  );
}
