import { GameProvider, useGame } from './store';
import { TitleScreen } from './screens/TitleScreen';
import { StudioScreen } from './screens/StudioScreen';
import { CareerScreen } from './screens/CareerScreen';
import { ProductionScreen } from './screens/ProductionScreen';

// Title (one permanent save) → studio (unlocks, up to 3 careers) → a career (contracts) → production (one film).
function Router() {
  const { profile } = useGame();
  if (!profile) return <TitleScreen />;
  if (profile.activeFilm) return <ProductionScreen />;
  if (profile.career) return <CareerScreen />;
  return <StudioScreen />;
}

export function App() {
  return (
    <GameProvider>
      <Router />
    </GameProvider>
  );
}
