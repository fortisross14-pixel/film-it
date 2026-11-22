import { useState } from 'react';
import { genreName } from '../../engine/data/genres';
import { useGame, useProfile } from '../store';
import { Shell, type NavItem } from '../components/Shell';
import { Clapper, Coins, Film, Home, Masks, People, Trophy } from '../components/Icons';
import { Sheet } from '../components/ui';
import { EditorFrame } from '../components/Nle';
import { ContractDetails } from '../components/ContractCard';
import { money } from '../../engine/format';
import { spent } from '../../engine/script';
import { weeksUsed } from '../../engine/shooting';
import { abandonFilm } from '../../engine/profile';
import { parkCareer } from '../../engine/career';
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
  const [brief, setBrief] = useState(false);
  const phaseIdx = PHASES.findIndex((x) => x.id === film.phase);
  const nav: NavItem[] = PHASES.map((ph, i) => ({ id: ph.id, label: ph.label, icon: ph.icon, done: i < phaseIdx }));
  const left = film.contract.budget - spent(film);
  const briefSheet = brief && (
    <Sheet title={film.title} kicker="The brief" onClose={() => setBrief(false)}
      footer={!film.results && (
        <button className="danger" onClick={() => {
          if (confirm('Abandon this film? The contract is lost.')) { setBrief(false); update(abandonFilm); }
        }}>Abandon film</button>
      )}>
      <ContractDetails c={film.contract} />
    </Sheet>
  );
  // The hands-on phases run in the editing-suite workspace.
  if (film.phase === 'script' || film.phase === 'shooting' || film.phase === 'post') {
    return (
      <EditorFrame
        workspaces={PHASES.map((ph, i) => ({ id: ph.id, label: ph.label, done: i < phaseIdx }))}
        active={film.phase}
        layout={film.phase === 'post' ? 'with-bin' : undefined}
        title={<>{film.title} <span className="dim">· {genreName(film.contract.genre)} for {film.contract.studio.name}</span></>}
        status={<span className={`hud-pill ${left < 0 ? 'bad' : ''}`} title="Budget left"><Coins size={16} /> {money(left)}</span>}
        actions={<button onClick={() => setBrief(true)}>Brief</button>}
        onHome={p.career && !film.results ? () => update(parkCareer) : undefined}
      >
        {film.phase === 'script' && <ScriptEditor />}
        {film.phase === 'shooting' && <ShootingScreen />}
        {film.phase === 'post' && <PostScreen />}
        {briefSheet}
      </EditorFrame>
    );
  }
  return (
    <Shell
      nav={nav} active={film.phase} progress
      title={film.title}
      sub={`${genreName(film.contract.genre)} for ${film.contract.studio.name} · ${PHASES[phaseIdx]?.label ?? ''} · week ${weeksUsed(film)}/${film.contract.deadlineWeeks}`}
      pills={<span className={`hud-pill ${left < 0 ? 'bad' : ''}`} title="Budget left"><Coins size={18} /> {money(left)}</span>}
      actions={<>
        <button className="ghost-btn" onClick={() => setBrief(true)}>Brief</button>
        {p.career && !film.results && <button className="icon ghost-btn" aria-label="Back home (the film waits)" title="Home" onClick={() => update(parkCareer)}><Home size={20} /></button>}
      </>}
    >
      {film.phase === 'casting' && <CastingScreen />}
      {film.phase === 'premiere' && <PremiereScreen />}
      {briefSheet}
    </Shell>
  );
}
