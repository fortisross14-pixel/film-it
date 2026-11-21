import { useEffect, useState } from 'react';
import { useProfile } from '../store';
import { Shell, type NavItem } from '../components/Shell';
import { Box, Film, Home, Masks, Reel, Trophy } from '../components/Icons';
import { ContractBoardTab } from './tabs/ContractBoardTab';
import { CareersTab } from './tabs/CareersTab';
import { TopicPacksTab } from './tabs/TopicPacksTab';
import { SetCatalogueTab } from './tabs/SetCatalogueTab';
import { FilmographyTab } from './tabs/FilmographyTab';
import { TrophyRoomTab } from './tabs/TrophyRoomTab';

const TABS = [
  { id: 'careers', label: 'Studio', icon: <Home size={22} />, C: CareersTab, needsCareer: false },
  { id: 'board', label: 'Projects', icon: <Reel size={22} />, C: ContractBoardTab, needsCareer: true },
  { id: 'sets', label: 'Sets', icon: <Box size={22} />, C: SetCatalogueTab, needsCareer: false },
  { id: 'topics', label: 'Topic packs', icon: <Masks size={22} />, C: TopicPacksTab, needsCareer: false },
  { id: 'films', label: 'Filmography', icon: <Film size={22} />, C: FilmographyTab, needsCareer: false },
  { id: 'trophies', label: 'Trophy room', icon: <Trophy size={22} />, C: TrophyRoomTab, needsCareer: false },
] as const;

export function BaseMenu() {
  const p = useProfile();
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>(p.career ? 'board' : 'careers');
  // Career ended (retired / fired) while on the board → go to the studio.
  useEffect(() => {
    if (!p.career && tab === 'board') setTab('careers');
  }, [p.career, tab]);
  const nav: NavItem[] = TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, disabled: t.needsCareer && !p.career }));
  const Active = TABS.find((t) => t.id === tab)!.C;
  return (
    <Shell nav={nav} active={tab} onNav={(id) => setTab(id as typeof tab)}>
      <Active onGoTo={(id: string) => setTab(id as typeof tab)} />
    </Shell>
  );
}
