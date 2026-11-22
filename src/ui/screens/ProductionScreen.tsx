import { useState } from 'react';
import { genreName } from '../../engine/data/genres';
import { useGame, useProfile } from '../store';
import { Clapper, Coins, Film, Masks, People, Trophy } from '../components/Icons';
import { Sheet } from '../components/ui';
import { EditorFrame } from '../components/Nle';
import { ReviewCtx } from '../review';
import { ContractDetails } from '../components/ContractCard';
import { money } from '../../engine/format';
import { spent } from '../../engine/script';
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
  const [view, setView] = useState<FilmPhase | undefined>();
  const phaseIdx = PHASES.findIndex((x) => x.id === film.phase);
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
  // Every phase shares the editor's top menu. Earlier phases can be opened read-only.
  const shown = view && PHASES.findIndex((x) => x.id === view) < phaseIdx ? view : film.phase;
  const reviewing = shown !== film.phase;
  const shownLabel = PHASES.find((x) => x.id === shown)?.label;
  const back = () => setView(undefined);
  const nleLayout = shown === 'post' ? 'with-bin' : shown === 'casting' || shown === 'premiere' ? 'page' : undefined;
  const body = (
    <>
      {shown === 'script' && <ScriptEditor />}
      {shown === 'shooting' && <ShootingScreen />}
      {shown === 'post' && <PostScreen />}
      {(shown === 'casting' || shown === 'premiere') && (
        <main className="nle-page paper">
          {shown === 'casting' ? <CastingScreen /> : <PremiereScreen />}
        </main>
      )}
    </>
  );
  return (
    <ReviewCtx.Provider value={{ readOnly: reviewing, phaseLabel: PHASES[phaseIdx]?.label, back }}>
      <EditorFrame
        workspaces={PHASES.map((ph, i) => ({
          id: ph.id, label: ph.label, done: i < phaseIdx,
          onOpen: i <= phaseIdx && !(film.results && i < phaseIdx && ph.id === 'premiere') ? () => setView(i === phaseIdx ? undefined : ph.id) : undefined,
          viewing: reviewing && ph.id === shown,
        }))}
        active={shown}
        layout={nleLayout}
        title={<>{film.title} <span className="dim">· {genreName(film.contract.genre)} for {film.contract.studio.name}{reviewing ? ` · reviewing ${shownLabel}` : ''}</span></>}
        status={<span className={`hud-pill ${left < 0 ? 'bad' : ''}`} title="Budget left"><Coins size={16} /> {money(left)}</span>}
        actions={<button onClick={() => setBrief(true)}>Brief</button>}
        onHome={p.career && !film.results ? () => update(parkCareer) : undefined}
      >
        {body}
        {briefSheet}
      </EditorFrame>
    </ReviewCtx.Provider>
  );
}
