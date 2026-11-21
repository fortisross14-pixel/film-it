// Inside a career: pick a contract (list → detail sheet → Accept), see this career's films.
// Everything else (unlocks, other careers) lives in the studio.

import { useState } from 'react';
import { useGame, useProfile } from '../store';
import { Shell, type NavItem } from '../components/Shell';
import { Film, Home, Reel, Star, Ticket } from '../components/Icons';
import { Poster } from '../components/Poster';
import { ContractDetails, ContractFacts, contractGenre } from '../components/ContractCard';
import { Difficulty, Sheet, Stat } from '../components/ui';
import { directorById } from '../../engine/data/directors';
import { genreCloseness } from '../../engine/data/genres';
import { startFilm } from '../../engine/profile';
import { parkCareer, retireCareer, retirementBonus } from '../../engine/career';
import { nextTierAt, reputationTier } from '../../engine/progression';
import { TUNING } from '../../engine/tuning';
import type { Contract, DirectorDef } from '../../engine/types';
import { FilmographyTab } from './tabs/FilmographyTab';

type Area = 'contracts' | 'career';

const genreFit = (d: DirectorDef, c: Contract): { text: string; tone?: 'good' | 'bad' } =>
  d.masterGenre ? (d.masterGenre === c.genre ? { text: 'Your genre', tone: 'good' } : { text: 'Small edge' }) :
  d.genreAffinity.length === 0 ? { text: 'Any genre' } :
  d.genreAffinity.some((g) => genreCloseness(g, c.genre) === 1) ? { text: 'Your genre', tone: 'good' } :
  d.genreAffinity.some((g) => genreCloseness(g, c.genre) > 0) ? { text: 'Close genre' } : { text: 'Off genre', tone: 'bad' };

export function CareerScreen() {
  const p = useProfile();
  const { update } = useGame();
  const [area, setArea] = useState<Area>('contracts');
  const c = p.career!;
  const d = directorById(c.directorId);
  const nav: NavItem[] = [
    { id: 'contracts', label: 'Contracts', icon: <Reel size={22} /> },
    { id: 'career', label: 'Career', icon: <Film size={22} /> },
    { id: 'studio', label: 'Studio', icon: <Home size={22} /> },
  ];
  return (
    <Shell
      nav={nav} active={area}
      onNav={(id) => (id === 'studio' ? update(parkCareer) : setArea(id as Area))}
      title={d.name}
      sub={`Lv. ${c.level} · ${c.films} films`}
      pills={<>
        <span className="hud-pill" title="Reputation: opens bigger studios"><Star size={18} /> {c.reputation}</span>
        <span className="hud-pill" title="Studio credits"><Ticket size={18} /> {p.credits.toLocaleString()}</span>
      </>}
    >
      {area === 'contracts' ? <ContractList d={d} /> : <CareerArea />}
    </Shell>
  );
}

function ContractList({ d }: { d: DirectorDef }) {
  const p = useProfile();
  const { update } = useGame();
  const [open, setOpen] = useState<Contract | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="stack">
      <h2>Pick a contract</h2>
      <div className="list">
        {p.contractBoard.map((c) => {
          const fit = genreFit(d, c);
          return (
            <button key={c.id} className="list-row contract-row2" onClick={() => setOpen(c)}>
              <Poster title={c.title ?? contractGenre(c)} genre={c.genre} seed={c.id} width={56} showTitle={false} />
              <span className="list-main">
                <span className="kicker">{c.sequelOf ? `Sequel #${c.sequelOf.number} · ` : ''}{contractGenre(c)}</span>
                <strong>{c.title}</strong>
                <ContractFacts c={c} />
              </span>
              <span className="list-side">
                <span className="price"><Ticket size={16} /> {c.rewards.credits}</span>
                <Difficulty n={c.difficulty} />
                <span className={`small ${fit.tone ?? 'muted'}`}>{fit.text}</span>
              </span>
            </button>
          );
        })}
      </div>
      {open && (
        <Sheet
          title={open.title} kicker={contractGenre(open)} onClose={() => { setOpen(null); setError(null); }}
          footer={<>
            <button onClick={() => setOpen(null)}>Back</button>
            <button className="primary" onClick={() => {
              const r = startFilm(p, open.id);
              if (r.ok) update(() => r.profile);
              else setError(r.reason);
            }}>Accept ▶</button>
          </>}
        >
          <div className="contract-hero">
            <Poster title={open.title ?? contractGenre(open)} genre={open.genre} seed={open.id} width={120} />
            <div className="stack">
              {open.sequelOf && <p className="sequel-badge">Sequel to “{open.sequelOf.franchise}”: built-in fans, tougher critics.</p>}
              <p className={`small ${genreFit(d, open).tone ?? ''}`}>{d.name}: {genreFit(d, open).text}</p>
            </div>
          </div>
          <ContractDetails c={open} />
          {error && <p className="bad">{error}</p>}
        </Sheet>
      )}
    </div>
  );
}

function CareerArea() {
  const p = useProfile();
  const { update } = useGame();
  const c = p.career!;
  const next = nextTierAt(c.reputation);
  return (
    <div className="stack">
      <h2>This career</h2>
      <div className="stat-row">
        <Stat label="Films" value={c.films} />
        <Stat label="Level" value={`${c.level}/${TUNING.directors.maxLevel}`} />
        <Stat label="Studio tier" value={`${reputationTier(c.reputation)}${next ? ` · next at ${next}` : ''}`} />
        <Stat label="Awards" value={`${c.wins} / ${c.nominations}`} />
        <Stat label="Earned" value={`${c.earnings} cr`} />
        {c.fStreak > 0 && <Stat label="F in a row" value={`${c.fStreak} of ${TUNING.career.firedAfterFs}`} tone="bad" />}
      </div>
      <FilmographyTab careerId={c.id} />
      <button className="danger" onClick={() => {
        if (!confirm(`Retire ${directorById(c.directorId).name}? You get ${retirementBonus(c)} credits.`)) return;
        const r = retireCareer(p);
        if (r.ok) update(() => r.profile);
      }}>Retire · +{retirementBonus(c)} credits</button>
    </div>
  );
}
