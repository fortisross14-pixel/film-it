// Inside a career: pick a contract (list → detail sheet → Accept), see this career's ladder
// and films. Everything else (shop, actors, other careers) lives in the studio.

import { useState } from 'react';
import { useGame, useProfile } from '../store';
import { Shell, type NavItem } from '../components/Shell';
import { Coins, Film, Home, Reel } from '../components/Icons';
import { Poster } from '../components/Poster';
import { ContractDetails, ContractFacts, contractGenre } from '../components/ContractCard';
import { Difficulty, Sheet, Stat } from '../components/ui';
import { directorById } from '../../engine/data/directors';
import { genreCloseness } from '../../engine/data/genres';
import { startFilm } from '../../engine/profile';
import { careerName, parkCareer, retireCareer } from '../../engine/career';
import { money } from '../../engine/format';
import { TUNING } from '../../engine/tuning';
import type { Contract, DirectorDef } from '../../engine/types';
import { FilmographyTab } from './tabs/FilmographyTab';
import { LevelBar, MoneyPill } from './StudioScreen';

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
  const L = TUNING.ladder;
  const nav: NavItem[] = [
    { id: 'contracts', label: 'Contracts', icon: <Reel size={22} /> },
    { id: 'career', label: 'Career', icon: <Film size={22} /> },
    { id: 'studio', label: 'Studio', icon: <Home size={22} /> },
  ];
  return (
    <Shell
      nav={nav} active={area}
      onNav={(id) => (id === 'studio' ? update(parkCareer) : setArea(id as Area))}
      title={careerName(c)}
      sub={`${d.name} · Level ${c.level}/${L.maxLevel} · Film ${Math.min(L.maxFilms, c.films + 1)}/${L.maxFilms}`}
      pills={<MoneyPill p={p} />}
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
  const c = p.career!;
  return (
    <div className="stack">
      <div className="row between">
        <h2>Pick a contract</h2>
        <LevelBar level={c.level} />
      </div>
      <div className="contract-grid">
        {p.contractBoard.map((x) => {
          const fit = genreFit(d, x);
          const badge = x.sequelOf ? `Sequel #${x.sequelOf.number}` : x.tag === 'stretch' ? '▲ Stretch' : x.tag === 'safe' ? '▼ Safer' : undefined;
          return (
            <button key={x.id} className={`contract-card ${x.locked ? 'locked' : ''}`} onClick={() => setOpen(x)}>
              <span className="cc-poster">
                <Poster title={x.title ?? contractGenre(x)} genre={x.genre} seed={x.id} width={200} showTitle={!x.locked} />
                {badge && <span className="cc-badge">{badge}</span>}
                {x.locked && <span className="cc-lock">🔒 Level {x.level}</span>}
                {!x.locked && fit.tone === 'good' && <span className="cc-fit" title={fit.text}>★</span>}
              </span>
              <span className="cc-body">
                <span className="cc-genre">{contractGenre(x)}</span>
                {x.locked ? <span className="small muted">{x.studio.name} · {money(x.budget)}</span> : <ContractFacts c={x} />}
                {!x.locked && (
                  <span className="cc-foot">
                    <span className="price"><Coins size={16} /> {money(x.rewards.fee)}</span>
                    <Difficulty n={x.difficulty} />
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      {open && (
        <Sheet
          title={open.locked ? `Level ${open.level} preview` : open.title} kicker={contractGenre(open)} onClose={() => { setOpen(null); setError(null); }}
          footer={open.locked ? <button onClick={() => setOpen(null)}>Back</button> : <>
            <button onClick={() => setOpen(null)}>Back</button>
            <button className="primary" onClick={() => {
              const r = startFilm(p, open.id);
              if (r.ok) update(() => r.profile);
              else setError(r.reason);
            }}>Accept ▶</button>
          </>}
        >
          {open.locked && <p className="small">🔒 Reach level {open.level} to take briefs like this.</p>}
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
  const L = TUNING.ladder;
  return (
    <div className="stack">
      <h2>This career</h2>
      <div className="card">
        <LevelBar level={c.level} />
        <p className="small">
          Level {c.level} of {L.maxLevel}, film {Math.min(L.maxFilms, c.films + 1)} of {L.maxFilms}. A climbs {L.climb.A}, B climbs {L.climb.B}, C holds, D drops {-L.climb.D}. One F ends the career.
        </p>
      </div>
      <div className="stat-row">
        <Stat label="Films" value={`${c.films}/${L.maxFilms}`} />
        <Stat label="Best level" value={c.topLevel} />
        <Stat label="Grades" value={c.grades.join(' ') || '—'} />
        <Stat label="Awards" value={`${c.wins} / ${c.nominations}`} />
        <Stat label="Earned" value={money(c.earnings)} />
        <Stat label="Packs earned" value={c.packsEarned} />
      </div>
      <FilmographyTab careerId={c.id} />
      <button className="danger" onClick={() => {
        if (!confirm(`Retire ${careerName(c)} now? The career ends and frees its slot. Everything earned stays.`)) return;
        const r = retireCareer(p);
        if (r.ok) update(() => r.profile);
      }}>Retire early</button>
    </div>
  );
}
