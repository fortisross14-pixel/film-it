// The studio: your permanent progress. Up to 3 careers run side by side; each makes up to
// 10 films and climbs from level 1 to 10 (an F ends it). Everything careers earn stays here:
// money for the shop (talent packs, directors, sets, topics), the actor roster, and genres
// that open as careers climb.

import { useState } from 'react';
import { useGame, useProfile } from '../store';
import { Shell, type NavItem } from '../components/Shell';
import { Box, Clapper, Coins, Home, People, Popcorn, Ticket, Tomato, Trophy } from '../components/Icons';
import { Sheet, Stat, Tabs } from '../components/ui';
import { ActorCard, RARITY_LABEL } from '../components/ActorCard';
import { DIRECTORS, directorById } from '../../engine/data/directors';
import { GENRES, genreName } from '../../engine/data/genres';
import {
  bestLevel, buyDirector, buyTalentPack, collection, directorCost, genreUnlockLevel, openTalentPack, packDef, packForSale, type PackCard,
} from '../../engine/progression';
import { careerName, enterCareer, legacyTitle, runningCareers, startCareer } from '../../engine/career';
import { RANK_LABEL, rankDirectors, type RankKey } from '../../engine/rankings';
import { audienceScore, criticsScore } from '../../engine/format';
import { money } from '../../engine/format';
import { TUNING } from '../../engine/tuning';
import type { DirectorDef, Profile, Rarity, TalentPackId } from '../../engine/types';
import { SetCatalogueTab } from './tabs/SetCatalogueTab';
import { TopicPacksTab } from './tabs/TopicPacksTab';
import { FilmographyTab } from './tabs/FilmographyTab';
import { TrophyRoomTab } from './tabs/TrophyRoomTab';

type Area = 'careers' | 'talent' | 'shop' | 'hall';
const PHASE_NAME: Record<string, string> = { script: 'Writing', casting: 'Casting', shooting: 'Shooting', post: 'Editing', premiere: 'Premiere' };
const SPECIALTY_TEXT: Record<string, string> = {
  script: 'Script', casting: 'Casting', shooting: 'Shooting', post: 'Post', genre: 'Genre master',
  budget: 'Budget', schedule: 'Schedule', festival: 'Festivals',
};
const PACK_IDS: TalentPackId[] = ['casting', 'star'];
const RARITIES: Rarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

export const MoneyPill = ({ p }: { p: Profile }) => (
  <span className="hud-pill" title="Studio money: every career's fees, spent in the shop"><Coins size={18} /> {money(p.money)}</span>
);

export function StudioScreen() {
  const p = useProfile();
  const [area, setArea] = useState<Area>('careers');
  const unopened = PACK_IDS.reduce((a, id) => a + (p.talentPacks[id] ?? 0), 0);
  const nav: NavItem[] = [
    { id: 'careers', label: 'Careers', icon: <Home size={22} /> },
    { id: 'talent', label: unopened ? `Actors (${unopened})` : 'Actors', icon: <People size={22} /> },
    { id: 'shop', label: 'Shop', icon: <Box size={22} /> },
    { id: 'hall', label: 'Hall of fame', icon: <Trophy size={22} /> },
  ];
  return (
    <Shell nav={nav} active={area} onNav={(id) => setArea(id as Area)} title={`${p.name}'s studio`} pills={<MoneyPill p={p} />}>
      {area === 'careers' && <CareersArea onShop={() => setArea('shop')} />}
      {area === 'talent' && <TalentArea />}
      {area === 'shop' && <ShopArea />}
      {area === 'hall' && <HallArea />}
    </Shell>
  );
}

// ---------------- Careers ----------------

function CareersArea({ onShop }: { onShop: () => void }) {
  const p = useProfile();
  const { update } = useGame();
  const [picking, setPicking] = useState(false);
  const running = runningCareers(p);
  const free = TUNING.career.maxCareers - running.length;
  const L = TUNING.ladder;
  return (
    <div className="stack">
      <GoalCard />
      <h2>Careers</h2>
      <div className="slot-grid">
        {running.map(({ career: c, activeFilm }) => (
          <button key={c.id} className="card career-slot" onClick={() => {
            const r = enterCareer(p, c.id);
            if (r.ok) update(() => r.profile);
          }}>
            <span className="kicker">Level {c.level}/{L.maxLevel} · Film {Math.min(L.maxFilms, c.films + 1)}/{L.maxFilms}</span>
            <strong className="slot-name">{careerName(c)}</strong>
            <span className="small muted">{directorById(c.directorId).name}</span>
            <LevelBar level={c.level} />
            <span className="small">{activeFilm ? <>🎬 {activeFilm.title} · {PHASE_NAME[activeFilm.phase]}</> : 'Picking a contract'}</span>
            {c.grades.length > 0 && <span className="row small muted">Grades {c.grades.join(' ')}</span>}
            <span className="slot-cta">Play ▶</span>
          </button>
        ))}
        {Array.from({ length: free }, (_, i) => (
          <button key={`free${i}`} className="card career-slot empty" onClick={() => setPicking(true)}>
            <span className="plus">＋</span>
            <strong>New career</strong>
            <span className="small muted">Slot {running.length + i + 1} of {TUNING.career.maxCareers}</span>
          </button>
        ))}
      </div>
      {picking && <NewCareerSheet onClose={() => setPicking(false)} onShop={() => { setPicking(false); onShop(); }} />}
    </div>
  );
}

/** The point of the game, in one card: climb a career to the top, collect everything. */
function GoalCard() {
  const p = useProfile();
  const col = collection(p);
  const L = TUNING.ladder;
  const best = bestLevel(p);
  return (
    <div className="card goal-card">
      <div className="section-label">The goal</div>
      <p>
        Take a director from a micro-budget indie at <strong>level 1</strong> to the big studios' blockbusters at <strong>level {L.maxLevel}</strong> within {L.maxFilms} films.
        An A climbs two levels, a B one, a C holds, a D drops one, and <strong>one F ends the career</strong>.
        Each film pays the studio; a B earns a {TUNING.talentPacks.casting.name}, an A a {TUNING.talentPacks.star.name}. Then try again with better actors, sets and directors.
      </p>
      <div className="stat-row">
        <Stat label="Best level" value={`${best}/${L.maxLevel}`} tone={best >= L.maxLevel ? 'good' : undefined} />
        <Stat label="Named stars" value={`${col.stars[0]}/${col.stars[1]}`} />
        <Stat label="Directors" value={`${col.directors[0]}/${col.directors[1]}`} />
        <Stat label="Sets" value={`${col.sets[0]}/${col.sets[1]}`} />
        <Stat label="Genres" value={`${col.genres[0]}/${col.genres[1]}`} />
      </div>
      <div className="genre-track">
        {GENRES.map((g) => {
          const open = p.unlocks.genres.includes(g.id);
          const at = genreUnlockLevel(g.id);
          return <span key={g.id} className={`tag ${open ? 'good' : 'locked'}`}>{open ? g.name : `🔒 ${g.name} · level ${at}`}</span>;
        })}
      </div>
    </div>
  );
}

export function LevelBar({ level }: { level: number }) {
  return (
    <span className="level-bar" aria-label={`Level ${level} of ${TUNING.ladder.maxLevel}`}>
      {Array.from({ length: TUNING.ladder.maxLevel }, (_, i) => <span key={i} className={i < level ? 'on' : ''} />)}
    </span>
  );
}

function NewCareerSheet({ onClose, onShop }: { onClose: () => void; onShop: () => void }) {
  const p = useProfile();
  const { update } = useGame();
  const busy = new Set(runningCareers(p).map((x) => x.career.directorId));
  const owned = DIRECTORS.filter((d) => p.unlocks.directors.includes(d.id));
  const [pick, setPick] = useState<string | null>(owned.find((d) => !busy.has(d.id))?.id ?? null);
  const [msg, setMsg] = useState<string | null>(null);
  const [name, setName] = useState('');
  return (
    <Sheet
      title="New career" kicker="Create a director" onClose={onClose}
      footer={
        <>
          <button onClick={onShop}>More directors</button>
          <button className="primary" disabled={!pick} onClick={() => {
            const r = startCareer(p, pick!, Date.now(), name);
            if (r.ok) update(() => r.profile);
            else setMsg(r.reason);
          }}>Start career ▶</button>
        </>
      }
    >
      <label className="stack small">
        Director's name
        <input placeholder="Leave empty for a random name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
      </label>
      <div className="section-label">Profile</div>
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

// ---------------- Actors: talent packs and the roster ----------------

function TalentArea() {
  const p = useProfile();
  const { update } = useGame();
  const [opened, setOpened] = useState<PackCard[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState<Rarity | 'all'>('all');
  const roster = [...p.actorPool].sort((a, b) => RARITIES.indexOf(a.rarity) - RARITIES.indexOf(b.rarity) || b.starPower - a.starPower);
  const count = (r: Rarity) => p.actorPool.filter((a) => a.rarity === r).length;
  return (
    <div className="stack">
      <h2>Talent packs</h2>
      <p className="small muted">Every pack adds 3 actors to your roster for every career: rare unknowns, or named stars (always epic or legendary) if you are lucky. A star you already have gets more famous instead.</p>
      <div className="slot-grid">
        {PACK_IDS.map((id) => {
          const def = packDef(id);
          const have = p.talentPacks[id] ?? 0;
          const forSale = packForSale(p, id);
          const at = (def as { unlockAtLevel?: number }).unlockAtLevel;
          return (
            <div key={id} className={`card talent-pack tp-${id}`}>
              <div className="row between">
                <h3>{def.name}</h3>
                {have > 0 && <span className="tag good">{have} to open</span>}
              </div>
              <p className="small">
                {def.cards} actors · {Object.entries(def.odds).map(([r, o]) => `${RARITY_LABEL[r as Rarity]} ${Math.round((o as number) * 100)}%`).join(' · ')}
                {(def as { guaranteed?: Rarity }).guaranteed && <> · at least one {RARITY_LABEL[(def as { guaranteed: Rarity }).guaranteed].toLowerCase()}</>}
              </p>
              <p className="small muted">Earned with {id === 'star' ? 'an A' : 'a B'}.{!forSale && at ? ` For sale once a career reaches level ${at}.` : ''}</p>
              <div className="row">
                {have > 0 && <button className="primary" onClick={() => {
                  const r = openTalentPack(p, id);
                  if (!r.ok) return setMsg(r.reason);
                  update(() => r.profile);
                  setOpened(r.cards);
                }}>Open ▶</button>}
                {forSale && <button disabled={p.money < def.price} onClick={() => {
                  const r = buyTalentPack(p, id);
                  if (r.ok) { update(() => r.profile); setMsg(null); } else setMsg(r.reason);
                }}>Buy · {money(def.price)}</button>}
              </div>
            </div>
          );
        })}
      </div>
      {msg && <p className="bad">{msg}</p>}
      <div className="row between">
        <h2>Your roster</h2>
        <span className="small muted">{p.actorPool.length} actors</span>
      </div>
      <Tabs
        tabs={[{ id: 'all' as const, label: 'All' }, ...RARITIES.map((r) => ({ id: r, label: RARITY_LABEL[r], badge: count(r) || undefined }))]}
        value={filter} onChange={setFilter} label="Rarity"
      />
      <div className="cards">
        {roster.filter((a) => filter === 'all' || a.rarity === filter).map((a) => <ActorCard key={a.id} actor={a} compact />)}
      </div>
      {opened && (
        <Sheet title="New talent" kicker="Pack opened" onClose={() => setOpened(null)} footer={<button className="primary" onClick={() => setOpened(null)}>Great</button>}>
          <div className="cards pack-reveal">
            {opened.map((c, i) => (
              <div key={i} className="reveal-card" style={{ animationDelay: `${i * 180}ms` }}>
                <span className={`tag ${c.duplicate ? '' : 'good'}`}>{c.duplicate ? `Already yours: +${TUNING.actors.duplicateStar} star power` : 'New'}</span>
                <ActorCard actor={c.actor} />
              </div>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

// ---------------- Shop ----------------

function ShopArea() {
  const [tab, setTab] = useState<'directors' | 'sets' | 'topics'>('directors');
  return (
    <div className="stack">
      <h2>Shop</h2>
      <p className="small muted">Bought once, yours for every career. Talent packs are under Actors.</p>
      <Tabs tabs={[{ id: 'directors', label: 'Directors' }, { id: 'sets', label: 'Sets' }, { id: 'topics', label: 'Topics' }]} value={tab} onChange={setTab} />
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
              {owned ? <span className="tag">Owned</span> : <span className="price"><Coins size={16} /> {money(directorCost(d))}</span>}
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
  const lockedGenre = d.masterGenre && !p.unlocks.genres.includes(d.masterGenre) ? d.masterGenre : undefined;
  return (
    <Sheet
      title={d.name} kicker="Director" onClose={onClose}
      footer={owned ? <button onClick={onClose}>Close</button> : (
        <button className="primary" disabled={p.money < cost} onClick={onBuy}>Buy · {money(cost)}</button>
      )}
    >
      <p>{d.blurb}</p>
      <div className="stat-row">
        <Stat label="Genres" value={d.genreAffinity.length ? d.genreAffinity.map(genreName).join(', ') : 'Any'} />
        {d.specialties.length > 0 && <Stat label="Strengths" value={d.specialties.map((s) => SPECIALTY_TEXT[s]).join(', ')} />}
        {(stats?.films ?? 0) > 0 && <Stat label="Films" value={stats!.films} />}
      </div>
      {lockedGenre && <p className="small muted">{genreName(lockedGenre)} briefs appear once a career reaches level {genreUnlockLevel(lockedGenre)}.</p>}
      {!owned && p.money < cost && <p className="small bad">You need {money(cost - p.money)} more.</p>}
    </Sheet>
  );
}

// ---------------- Hall of fame ----------------

function HallArea() {
  const p = useProfile();
  const [tab, setTab] = useState<'directors' | 'films' | 'trophies'>('directors');
  return (
    <div className="stack">
      <h2>Hall of fame</h2>
      <Tabs tabs={[{ id: 'directors', label: 'Directors' }, { id: 'films', label: 'Films', badge: p.filmography.length || undefined }, { id: 'trophies', label: 'Trophies' }]} value={tab} onChange={setTab} />
      {tab === 'directors' && <Leaderboard />}
      {tab === 'films' && <FilmographyTab />}
      {tab === 'trophies' && <TrophyRoomTab />}
    </div>
  );
}

const RANK_KEYS: RankKey[] = ['critics', 'audience', 'awards', 'boxOffice', 'level'];

/** Every director you created, ranked. */
function Leaderboard() {
  const p = useProfile();
  const [key, setKey] = useState<RankKey>('critics');
  const rows = rankDirectors(p, key);
  if (!rows.length) return <p className="muted empty">Your directors show up here after their first film.</p>;
  return (
    <div className="stack">
      <Tabs tabs={RANK_KEYS.map((k) => ({ id: k, label: RANK_LABEL[k] }))} value={key} onChange={setKey} label="Rank by" />
      <div className="list leaderboard">
        {rows.map((s, i) => {
          const c = s.career;
          const status = s.running ? 'Running' : c.status === 'fired' ? 'Fired' : c.status === 'wrapped' ? 'Complete' : 'Retired';
          return (
            <div key={c.id} className="list-row static">
              <span className={`rank rank-${i + 1}`}>{i + 1}</span>
              <span className="list-main">
                <span className="kicker">{directorById(c.directorId).name} · {s.running ? `level ${c.level}` : legacyTitle(c)}</span>
                <strong>{careerName(c)}</strong>
                <span className="lb-stats small">
                  <span className={key === 'critics' ? 'on' : ''}><Tomato size={14} /> {criticsScore(s.critics)}</span>
                  <span className={key === 'audience' ? 'on' : ''}><Popcorn size={14} /> {audienceScore(s.audience)}</span>
                  <span className={key === 'awards' ? 'on' : ''}><Trophy size={14} /> {s.wins} won · {s.nominations} nom.</span>
                  <span className={key === 'boxOffice' ? 'on' : ''}><Ticket size={14} /> {money(s.boxOffice)}</span>
                  <span className={key === 'level' ? 'on' : ''}>Top level {s.topLevel}</span>
                </span>
                <span className="small muted">{s.films} film{s.films === 1 ? '' : 's'}{c.grades.length ? ` · ${c.grades.join(' ')}` : ''} · earned {money(s.earnings)}{s.best ? ` · best: ${s.best.title}` : ''}</span>
              </span>
              <span className={`tag ${c.status === 'fired' ? 'bad' : c.status === 'wrapped' ? 'good' : ''}`}>{status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
