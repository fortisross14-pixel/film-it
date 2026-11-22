// The studio: your permanent progress. Up to 3 careers run side by side; each makes up to
// 10 films and climbs from level 1 to 10 (an F ends it). Everything careers earn stays here:
// money for the shop (talent packs, directors, sets, topics), the actor roster, and genres
// that open as careers climb.

import { useState } from 'react';
import { useGame, useProfile } from '../store';
import { Shell, type NavItem } from '../components/Shell';
import { Box, Clapper, Coins, Home, People, Popcorn, Ticket, Tomato, Trophy } from '../components/Icons';
import { Hint, Sheet, Stat, Tabs } from '../components/ui';
import { Glyph, Medallion, type GlyphName } from '../components/GameIcons';
import { ActorCard, RARITY_LABEL } from '../components/ActorCard';
import { DIRECTORS, directorById } from '../../engine/data/directors';
import { GENRES, genreName } from '../../engine/data/genres';
import {
  bestLevel, buyDirector, buyTalentPack, buyUpgrade, collection, directorCost, genreUnlockLevel, openTalentPack, packDef, packForSale, packOdds,
  upgradeForSale, type PackCard,
} from '../../engine/progression';
import { careerName, enterCareer, legacyTitle, runningCareers, startCareer } from '../../engine/career';
import { RANK_LABEL, rankDirectors, type RankKey } from '../../engine/rankings';
import { records } from '../../engine/records';
import { UPGRADES, upgradeById } from '../../engine/data/upgrades';
import { audienceScore, criticsScore } from '../../engine/format';
import { money } from '../../engine/format';
import { TUNING } from '../../engine/tuning';
import type { DirectorDef, Profile, Rarity, TalentPackId } from '../../engine/types';
import { SetCatalogueTab } from './tabs/SetCatalogueTab';
import { TopicPacksTab } from './tabs/TopicPacksTab';
import { FilmographyTab } from './tabs/FilmographyTab';
import { TrophyRoomTab } from './tabs/TrophyRoomTab';

type Area = 'careers' | 'talent' | 'shop' | 'hall';
const AREA_TITLE: Record<Area, string> = { careers: 'Your directors', talent: 'Actors', shop: 'Shop', hall: 'Hall of fame' };
const PHASE_NAME: Record<string, string> = { script: 'Writing', casting: 'Casting', shooting: 'Shooting', post: 'Editing', premiere: 'Premiere' };
const SPECIALTY_TEXT: Record<string, string> = {
  script: 'Script', casting: 'Casting', shooting: 'Shooting', post: 'Post', genre: 'Genre master',
  budget: 'Budget', schedule: 'Schedule', festival: 'Festivals',
};
const PACK_IDS: TalentPackId[] = ['casting', 'star'];
const RARITIES: Rarity[] = ['legendary', 'epic', 'rare', 'uncommon', 'common'];

export const MoneyPill = ({ p }: { p: Profile }) => (
  <span className="hud-pill" title="Your earnings: every film pays you; spend it in the shop"><Coins size={18} /> {money(p.money)}</span>
);

export function StudioScreen() {
  const p = useProfile();
  const [area, setArea] = useState<Area>('careers');
  const unopened = PACK_IDS.reduce((a, id) => a + (p.talentPacks[id] ?? 0), 0);
  const nav: NavItem[] = [
    { id: 'careers', label: 'Directors', icon: <Home size={22} /> },
    { id: 'talent', label: unopened ? `Actors (${unopened})` : 'Actors', icon: <People size={22} /> },
    { id: 'shop', label: 'Shop', icon: <Box size={22} /> },
    { id: 'hall', label: 'Hall of fame', icon: <Trophy size={22} /> },
  ];
  return (
    <Shell nav={nav} active={area} onNav={(id) => setArea(id as Area)} title={AREA_TITLE[area]} pills={<MoneyPill p={p} />}>
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
      <h2>Your directors</h2>
      <div className="slot-grid">
        {running.map(({ career: c, activeFilm }) => (
          <button key={c.id} className="card career-slot" onClick={() => {
            const r = enterCareer(p, c.id);
            if (r.ok) update(() => r.profile);
          }}>
            <span className="slot-head">
              <Medallion name="clapper" size={46} tone={directorById(c.directorId).tier === 'premium' ? 'ruby' : directorById(c.directorId).tier === 'advanced' ? 'gold' : 'dark'} />
              <span>
                <strong className="slot-name">{careerName(c)}</strong>
                <span className="small muted">{directorById(c.directorId).name}</span>
              </span>
            </span>
            <LevelBar level={c.level} />
            <span className="small">{activeFilm ? <><Glyph name="clapper" size={16} /> {activeFilm.title} · {PHASE_NAME[activeFilm.phase]}</> : `Film ${Math.min(L.maxFilms, c.films + 1)} of ${L.maxFilms}`}</span>
            {c.grades.length > 0 && <span className="slot-grades">{c.grades.map((g, i) => <span key={i} className={`mini-grade grade-${g}`}>{g}</span>)}</span>}
            <span className="slot-cta">Play</span>
          </button>
        ))}
        {Array.from({ length: free }, (_, i) => (
          <button key={`free${i}`} className="card career-slot empty" onClick={() => setPicking(true)}>
            <Medallion name="plus" size={46} tone="muted" />
            <strong>New director</strong>
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
  const locked = GENRES.filter((g) => !p.unlocks.genres.includes(g.id));
  const tiles: [GlyphName, string, number, number][] = [
    ['star', 'Stars', col.stars[0], col.stars[1]],
    ['clapper', 'Directors', col.directors[0], col.directors[1]],
    ['building', 'Sets', col.sets[0], col.sets[1]],
    ['sliders', 'Team', col.upgrades[0], col.upgrades[1]],
  ];
  return (
    <div className="card goal-card">
      <div className="goal-top">
        <div>
          <div className="section-label">
            Goal: level {L.maxLevel} in {L.maxFilms} films
            <Hint>
              A +2 levels · B +1 · C +1 · D holds · <strong>F ends the career</strong>. A B earns a {TUNING.talentPacks.casting.name}, an A a {TUNING.talentPacks.star.name}.
              What you own sets how good a film can be: buy better directors, sets, actors and upgrades, then aim higher.
            </Hint>
          </div>
          <LevelBar level={best} />
          <span className="small muted"> best level {best}</span>
        </div>
      </div>
      <div className="goal-tiles">
        {tiles.map(([icon, label, have, all]) => (
          <span key={label} className="goal-tile" title={label}>
            <Medallion name={icon} size={40} />
            <strong>{have}<span className="muted">/{all}</span></strong>
            <span className="gt-label">{label}</span>
          </span>
        ))}
      </div>
      {locked.length > 0 && (
        <div className="genre-track">
          {locked.map((g) => <span key={g.id} className="tag locked">🔒 {g.name} · lv {genreUnlockLevel(g.id)}</span>)}
        </div>
      )}
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
      title="New director" kicker="Studios will call" onClose={onClose}
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

export const TIER_TEXT = { basic: 'Basic', advanced: 'Advanced', premium: 'Master' } as const;

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
      <h2>Talent packs<Hint>3 actors per pack, yours for every career. Rarer actors act better and sell tickets. Agencies (Shop → Team) open rarer cards: Talent agency for rare and epic, Star agency for legendary and named stars.</Hint></h2>
      <div className="slot-grid">
        {PACK_IDS.map((id) => {
          const def = packDef(id);
          const have = p.talentPacks[id] ?? 0;
          const forSale = packForSale(p, id);
          // A pack you can't get yet shows what it holds once its agency is in place.
          const odds = forSale ? packOdds(p, id) : def.odds[1];
          return (
            <div key={id} className={`card talent-pack tp-${id}`}>
              <div className="row between">
                <h3>{def.name}</h3>
                {have > 0 && <span className="tag good">{have} to open</span>}
              </div>
              <p className="small">
                <Hint label="Odds">{def.cards} actors · {!forSale && 'once unlocked: '}{Object.entries(odds).map(([r, o]) => `${RARITY_LABEL[r as Rarity]} ${Math.round((o as number) * 100)}%`).join(' · ')}
                {def.guaranteed && <> · at least one {RARITY_LABEL[def.guaranteed].toLowerCase()}</>}</Hint>
                {' '}{def.cards} actors{!forSale && ' · 🔒'}
              </p>
              <p className="small muted">{id === 'star' ? 'Grade A' : 'Grade B'} earns one{!forSale && def.requires ? ` · 🔒 ${upgradeById(def.requires)?.name}` : ''}</p>
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
  const [tab, setTab] = useState<'studio' | 'directors' | 'sets' | 'topics'>('studio');
  return (
    <div className="stack">
      <h2>Shop</h2>
      <Tabs tabs={[{ id: 'studio', label: 'Team' }, { id: 'directors', label: 'Directors' }, { id: 'sets', label: 'Sets' }, { id: 'topics', label: 'Topics' }]} value={tab} onChange={setTab} />
      {tab === 'studio' && <UpgradeShop />}
      {tab === 'directors' && <DirectorShop />}
      {tab === 'topics' && <TopicPacksTab />}
      {tab === 'sets' && <SetCatalogueTab />}
    </div>
  );
}

function UpgradeShop() {
  const p = useProfile();
  const { update } = useGame();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="list">
      {UPGRADES.map((u) => {
        const owned = p.unlocks.upgrades.includes(u.id);
        const sale = upgradeForSale(p, u.id);
        return (
          <div key={u.id} className={`list-row static ${owned ? '' : 'locked'}`}>
            <span className="list-main">
              <span className="kicker">{u.kind}</span>
              <strong>{u.name}<Hint>{u.text}</Hint></strong>
              {!owned && u.requires && !p.unlocks.upgrades.includes(u.requires) && <span className="small muted">Needs {upgradeById(u.requires)!.name} first</span>}
            </span>
            {owned ? <span className="tag good">Owned</span> : (
              <button className="primary" disabled={!sale.ok || p.money < u.cost} onClick={() => {
                const r = buyUpgrade(p, u.id);
                if (r.ok) { update(() => r.profile); setMsg(null); } else setMsg(r.reason);
              }}>{money(u.cost)}</button>
            )}
          </div>
        );
      })}
      {msg && <p className="bad">{msg}</p>}
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
                <span className="small muted">{TIER_TEXT[d.tier]} · {directorLine(d)}</span>
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
        <Stat label="Tier" value={TIER_TEXT[d.tier]} />
        <Stat label="Best script" value={d.masterGenre ? `${d.ceiling.script} (100 in ${genreName(d.masterGenre)})` : d.ceiling.script} />
        <Stat label="Best takes" value={d.masterGenre ? `${d.ceiling.shooting} (100 in ${genreName(d.masterGenre)})` : d.ceiling.shooting} />
      </div>
      {lockedGenre && <p className="small muted">{genreName(lockedGenre)} briefs appear once a career reaches level {genreUnlockLevel(lockedGenre)}.</p>}
      {!owned && p.money < cost && <p className="small bad">You need {money(cost - p.money)} more.</p>}
    </Sheet>
  );
}

// ---------------- Hall of fame ----------------

function HallArea() {
  const p = useProfile();
  const [tab, setTab] = useState<'directors' | 'records' | 'films' | 'trophies'>('directors');
  return (
    <div className="stack">
      <h2>Hall of fame</h2>
      <Tabs tabs={[{ id: 'directors', label: 'Directors' }, { id: 'records', label: 'Records' }, { id: 'films', label: 'Films', badge: p.filmography.length || undefined }, { id: 'trophies', label: 'Trophies' }]} value={tab} onChange={setTab} />
      {tab === 'directors' && <Leaderboard />}
      {tab === 'records' && <Records />}
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
            <div key={c.id} className="list-row static lb-row" title={`${legacyTitle(c)} · ${status}`}>
              <span className={`rank rank-${i + 1}`}>{i + 1}</span>
              <span className="list-main">
                <strong>{careerName(c)}{s.running && <span className="tag lb-live">live</span>}</strong>
                <span className="small muted">{directorById(c.directorId).name} · {s.films} films · {c.grades.join('')}</span>
              </span>
              <span className="lb-value">
                {key === 'critics' && <><Tomato size={18} /> {criticsScore(s.critics)}</>}
                {key === 'audience' && <><Popcorn size={18} /> {audienceScore(s.audience)}</>}
                {key === 'awards' && <><Trophy size={18} /> {s.wins}<span className="muted small"> / {s.nominations}</span></>}
                {key === 'boxOffice' && <><Ticket size={18} /> {money(s.boxOffice)}</>}
                {key === 'level' && <>Lv {s.topLevel}</>}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Records() {
  const p = useProfile();
  const list = records(p);
  if (!list.length) return <p className="muted empty">Your records show up here after your first film.</p>;
  const show = (k: string, v: number) => (k === 'critics' || k === 'careerCritics' ? criticsScore(v) : k === 'audience' ? audienceScore(v) : k === 'boxOffice' || k === 'careerBoxOffice' ? money(v) : k === 'awards' ? '' : String(v));
  return (
    <div className="list">
      {list.map((r) => (
        <div key={r.key} className="list-row static">
          <span className="list-main">
            <span className="kicker">{r.label}</span>
            <strong>{r.holder}</strong>
            {r.detail && <span className="small muted">{r.detail}</span>}
          </span>
          <span className="record-value">{show(r.key, r.value)}</span>
        </div>
      ))}
    </div>
  );
}
