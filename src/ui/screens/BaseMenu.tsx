import { useEffect, useState } from 'react';
import { useGame, useProfile } from '../store';
import { nextTierAt, reputationTier } from '../../engine/progression';
import { directorById } from '../../engine/data/directors';
import { TUNING } from '../../engine/tuning';
import { ContractBoardTab } from './tabs/ContractBoardTab';
import { CareersTab } from './tabs/CareersTab';
import { TopicPacksTab } from './tabs/TopicPacksTab';
import { SetCatalogueTab } from './tabs/SetCatalogueTab';
import { FilmographyTab } from './tabs/FilmographyTab';
import { TrophyRoomTab } from './tabs/TrophyRoomTab';

const TABS = [
  { id: 'board', label: 'Contracts', C: ContractBoardTab, needsCareer: true },
  { id: 'careers', label: 'Careers', C: CareersTab, needsCareer: false },
  { id: 'topics', label: 'Topic packs', C: TopicPacksTab, needsCareer: false },
  { id: 'sets', label: 'Sets', C: SetCatalogueTab, needsCareer: false },
  { id: 'films', label: 'Filmography', C: FilmographyTab, needsCareer: false },
  { id: 'trophies', label: 'Trophy room', C: TrophyRoomTab, needsCareer: false },
] as const;

export function ProfileHeader() {
  const p = useProfile();
  const { close } = useGame();
  const c = p.career;
  const tier = reputationTier(c?.reputation ?? 0);
  const next = nextTierAt(c?.reputation ?? 0);
  return (
    <header className="topbar">
      <span className="logo small">Director's Cut</span>
      <span className="pill">{p.name}</span>
      {c ? (
        <>
          <span className="pill career-pill">🎬 {directorById(c.directorId).name} · lvl {c.level}/{TUNING.directors.maxLevel} · {c.films} films</span>
          <span className="pill" title={next ? `Next studio tier at ${next}` : 'Top tier'}>
            Reputation {c.reputation} · studio tier {tier}
            {next !== undefined && <span className="muted"> / {next}</span>}
          </span>
        </>
      ) : (
        <span className="pill muted">No career running</span>
      )}
      <span className="pill" title="The bank: earned across all careers">🏦 {p.credits} credits</span>
      <span className="spacer" />
      <button onClick={close}>Save &amp; quit</button>
    </header>
  );
}

export function BaseMenu() {
  const p = useProfile();
  const tabs = TABS.filter((t) => !t.needsCareer || p.career);
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>(p.career ? 'board' : 'careers');
  // Career ended (retired / fired) while on the board → go to careers.
  useEffect(() => {
    if (!p.career && tab === 'board') setTab('careers');
  }, [p.career, tab]);
  const Active = (tabs.find((t) => t.id === tab) ?? tabs[0]).C;
  return (
    <div className="screen">
      <ProfileHeader />
      <nav className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>
      <main className="content">
        <Active onGoTo={(id: string) => setTab(id as typeof tab)} />
      </main>
    </div>
  );
}
