// The studio: the meta layer. Your bank of credits, the unlocks it buys (directors,
// topic packs, sets) and up to 3 careers running side by side. Every career uses
// everything unlocked here; inside a career you only pick contracts and make films.

import { useState } from 'react';
import { useGame, useProfile } from '../store';
import { Shell, type NavItem } from '../components/Shell';
import { Box, Clapper, Home, Ticket, Trophy } from '../components/Icons';
import { Sheet, Stat, Tabs } from '../components/ui';
import { DIRECTORS, directorById } from '../../engine/data/directors';
import { genreName } from '../../engine/data/genres';
import { buyDirector, directorCost, unlockProgress } from '../../engine/progression';
import { bestGrade, enterCareer, runningCareers, startCareer } from '../../engine/career';
import { money } from '../../engine/format';
import { TUNING } from '../../engine/tuning';
import type { DirectorDef, Profile } from '../../engine/types';
import { SetCatalogueTab } from './tabs/SetCatalogueTab';
import { TopicPacksTab } from './tabs/TopicPacksTab';
import { FilmographyTab } from './tabs/FilmographyTab';
import { TrophyRoomTab } from './tabs/TrophyRoomTab';

type Area = 'careers' | 'unlocks' | 'hall';
const PHASE_NAME: Record<string, string> = { script: 'Writing', casting: 'Casting', shooting: 'Shooting', post: 'Editing', premiere: 'Premiere' };
const SPECIALTY_TEXT: Record<string, string> = {
  script: 'Script', casting: 'Casting', shooting: 'Shooting', post: 'Post', genre: 'Genre master',
  budget: 'Budget', schedule: 'Schedule', festival: 'Festivals',
};

export function StudioScreen() {
  const p = useProfile();
  const [area, setArea] = useState<Area>('careers');
  const nav: NavItem[] = [
    { id: 'careers', label: 'Careers', icon: <Home size={22} /> },
    { id: 'unlocks', label: 'Unlocks', icon: <Box size={22} /> },
    { id: 'hall', label: 'Hall of fame', icon: <Trophy size={22} /> },
  ];
  return (
    <Shell
      nav={nav} active={area} onNav={(id) => setArea(id as Area)}
      title={`${p.name}'s studio`}
      pills={<span className="hud-pill" title="Credits: earned by every career, spent on unlocks"><Ticket size={18} /> {p.credits.toLocaleString()}</span>}
    >
      {area === 'careers' && <CareersArea onShop={() => setArea('unlocks')} />}
      {area === 'unlocks' && <UnlocksArea />}
      {area === 'hall' && <HallArea />}
    </Shell>
  );
}

function CareersArea({ onShop }: { onShop: () => void }) {
  const p = useProfile();
  const { update } = useGame();
  const [picking, setPicking] = useState(false);
  const running = runningCareers(p);
  const free = TUNING.career.maxCareers - running.length;
  return (
    <div className="stack">
      <h2>Careers</h2>
      <div className="slot-grid">
        {running.map(({ career: c, activeFilm }) => {
          const d = directorById(c.directorId);
          return (
            <button key={c.id} className="card career-slot" onClick={() => {
              const r = enterCareer(p, c.id);
              if (r.ok) update(() => r.profile);
            }}>
              <span className="kicker">Lv. {c.level} · {c.films} film{c.films === 1 ? '' : 's'}</span>
              <strong className="slot-name">{d.name}</strong>
              <span className="small">{activeFilm ? <>🎬 {activeFilm.title} · {PHASE_NAME[activeFilm.phase]}</> : 'Picking a contract'}</span>
              <span className="row small muted">★ {c.reputation} rep{c.grades.length > 0 && <> · {c.grades.slice(-5).join(' ')}</>}{c.fStreak > 0 && <span className="bad"> · {c.fStreak} F</span>}</span>
              <span className="slot-cta">Play ▶</span>
            </button>
          );
        })}
        {Array.from({ length: free }, (_, i) => (
          <button key={`free${i}`} className="card career-slot empty" onClick={() => setPicking(true)}>
            <span className="plus">＋</span>
            <strong>New career</strong>
            <span className="small muted">Slot {running.length + i + 1} of {TUNING.career.maxCareers}</span>
          </button>
        ))}
      </div>
      <p className="small muted">Careers share your unlocks and pay credits into the studio bank.</p>
      {picking && <NewCareerSheet onClose={() => setPicking(false)} onShop={() => { setPicking(false); onShop(); }} />}
    </div>
  );
}

function NewCareerSheet({ onClose, onShop }: { onClose: () => void; onShop: () => void }) {
  const p = useProfile();
  const { update } = useGame();
  const busy = new Set(runningCareers(p).map((x) => x.career.directorId));
  const owned = DIRECTORS.filter((d) => p.unlocks.directors.includes(d.id));
  const [pick, setPick] = useState<string | null>(owned.find((d) => !busy.has(d.id))?.id ?? null);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Sheet
      title="New career" kicker="Pick a director" onClose={onClose}
      footer={
        <>
          <button onClick={onShop}>More directors</button>
          <button className="primary" disabled={!pick} onClick={() => {
            const r = startCareer(p, pick!);
            if (r.ok) update(() => r.profile);
            else setMsg(r.reason);
          }}>Start career ▶</button>
        </>
      }
    >
      <div className="list">
        {owned.map((d) => (
          <button key={d.id} className={`list-row pick ${pick === d.id ? 'on' : ''}`} disabled={busy.has(d.id)} onClick={() => setPick(d.id)}>
            <span className="list-main">
              <strong>{d.name}</strong>
              <span className="small muted">{busy.has(d.id) ? 'Already in a career' : directorLine(d)}</span>
            </span>
            {pick === d.id && <span className="check">✓</span>}
          </button>
        ))}
      </div>
      {msg && <p className="bad">{msg}</p>}
    </Sheet>
  );
}

const directorLine = (d: DirectorDef) =>
  [d.genreAffinity.length ? d.genreAffinity.map(genreName).join(', ') : 'Any genre', ...d.specialties.map((s) => SPECIALTY_TEXT[s])].join(' · ');

function UnlocksArea() {
  const p = useProfile();
  const [tab, setTab] = useState<'directors' | 'topics' | 'sets'>('directors');
  const prog = unlockProgress(p);
  return (
    <div className="stack">
      <div className="row between">
        <h2>Unlocks</h2>
        <span className="small muted">{prog.owned}/{prog.total} owned</span>
      </div>
      <Tabs tabs={[{ id: 'directors', label: 'Directors' }, { id: 'topics', label: 'Topics' }, { id: 'sets', label: 'Sets' }]} value={tab} onChange={setTab} />
      {tab === 'directors' && <DirectorShop />}
      {tab === 'topics' && <TopicPacksTab />}
      {tab === 'sets' && <SetCatalogueTab />}
    </div>
  );
}

function DirectorShop() {
  const p = useProfile();
  const { update } = useGame();
  const [open, setOpen] = useState<DirectorDef | null>(null);
  return (
    <>
      <div className="list">
        {DIRECTORS.map((d) => {
          const owned = p.unlocks.directors.includes(d.id);
          return (
            <button key={d.id} className={`list-row ${owned ? '' : 'locked'}`} onClick={() => setOpen(d)}>
              <span className="avatar"><Clapper size={22} /></span>
              <span className="list-main">
                <strong>{d.name}</strong>
                <span className="small muted">{directorLine(d)}</span>
              </span>
              {owned ? <span className="tag">Owned</span> : <span className="price"><Ticket size={16} /> {directorCost(d)}</span>}
            </button>
          );
        })}
      </div>
      {open && <DirectorSheet d={open} p={p} onClose={() => setOpen(null)} onBuy={() => {
        const r = buyDirector(p, open.id);
        if (r.ok) update(() => r.profile);
      }} />}
    </>
  );
}

function DirectorSheet({ d, p, onClose, onBuy }: { d: DirectorDef; p: Profile; onClose: () => void; onBuy: () => void }) {
  const owned = p.unlocks.directors.includes(d.id);
  const cost = directorCost(d);
  const stats = p.directors[d.id];
  return (
    <Sheet
      title={d.name} kicker="Director" onClose={onClose}
      footer={owned ? <button onClick={onClose}>Close</button> : (
        <button className="primary" disabled={p.credits < cost} onClick={onBuy}>Unlock · {cost} credits</button>
      )}
    >
      <p>{d.blurb}</p>
      <div className="stat-row">
        <Stat label="Genres" value={d.genreAffinity.length ? d.genreAffinity.map(genreName).join(', ') : 'Any'} />
        {d.specialties.length > 0 && <Stat label="Strengths" value={d.specialties.map((s) => SPECIALTY_TEXT[s]).join(', ')} />}
        {(stats?.films ?? 0) > 0 && <Stat label="Films" value={stats!.films} />}
      </div>
      {!owned && p.credits < cost && <p className="small bad">You need {cost - p.credits} more credits.</p>}
    </Sheet>
  );
}

function HallArea() {
  const p = useProfile();
  const [tab, setTab] = useState<'films' | 'trophies' | 'careers'>('films');
  return (
    <div className="stack">
      <h2>Hall of fame</h2>
      <Tabs tabs={[{ id: 'films', label: 'Films', badge: p.filmography.length || undefined }, { id: 'trophies', label: 'Trophies' }, { id: 'careers', label: 'Past careers' }]} value={tab} onChange={setTab} />
      {tab === 'films' && <FilmographyTab />}
      {tab === 'trophies' && <TrophyRoomTab />}
      {tab === 'careers' && (p.careers.length === 0 ? <p className="muted empty">No finished careers yet.</p> : (
        <div className="list">
          {[...p.careers].reverse().map((x) => (
            <div key={x.id} className="list-row static">
              <span className="list-main">
                <strong>{directorById(x.directorId).name}</strong>
                <span className="small muted">{x.films} films · {x.wins} 🏆 · {money(x.boxOffice)} · {x.earnings} credits</span>
              </span>
              <span className={`tag ${x.status === 'fired' ? 'bad' : ''}`}>{x.status === 'fired' ? 'Fired' : `Best ${bestGrade(x) ?? '—'}`}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
