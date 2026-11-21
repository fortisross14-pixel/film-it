import { GameProvider, useGame } from './store';
import { SlotsScreen } from './screens/SlotsScreen';
import { StudioScreen } from './screens/StudioScreen';
import { CareerScreen } from './screens/CareerScreen';
import { ProductionScreen } from './screens/ProductionScreen';

// Title → studio (unlocks, up to 3 careers) → a career (contracts) → production (one film).
function Router() {
  const { profile } = useGame();
  if (!profile) return <SlotsScreen />;
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
