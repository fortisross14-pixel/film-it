import { useState } from 'react';
import { useGame, useProfile } from '../store';
import { nextTierAt, reputationTier } from '../../engine/progression';
import { ContractBoardTab } from './tabs/ContractBoardTab';
import { DirectorsTab } from './tabs/DirectorsTab';
import { TopicPacksTab } from './tabs/TopicPacksTab';
import { SetCatalogueTab } from './tabs/SetCatalogueTab';
import { FilmographyTab } from './tabs/FilmographyTab';
import { TrophyRoomTab } from './tabs/TrophyRoomTab';

const TABS = [
  { id: 'board', label: 'Contracts', C: ContractBoardTab },
  { id: 'directors', label: 'Directors', C: DirectorsTab },
  { id: 'topics', label: 'Topic packs', C: TopicPacksTab },
  { id: 'sets', label: 'Sets', C: SetCatalogueTab },
  { id: 'films', label: 'Filmography', C: FilmographyTab },
  { id: 'trophies', label: 'Trophy room', C: TrophyRoomTab },
] as const;

export function ProfileHeader() {
  const p = useProfile();
  const { close } = useGame();
  const tier = reputationTier(p.reputation);
  const next = nextTierAt(p.reputation);
  return (
    <header className="topbar">
      <span className="logo small">Director's Cut</span>
      <span className="pill">{p.name}</span>
      <span className="pill" title={next ? `Next tier at ${next}` : 'Max tier'}>
        Reputation {p.reputation} · tier {tier}
        {next !== undefined && <span className="muted"> / {next}</span>}
      </span>
      <span className="pill">{p.credits} credits</span>
      <span className="spacer" />
      <button onClick={close}>Save &amp; quit</button>
    </header>
  );
}

export function BaseMenu() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('board');
  const Active = TABS.find((t) => t.id === tab)!.C;
  return (
    <div className="screen">
      <ProfileHeader />
      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <main className="content">
        <Active />
      </main>
    </div>
  );
}
