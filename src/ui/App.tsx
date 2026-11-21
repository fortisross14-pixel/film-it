import { GameProvider, useGame } from './store';
import { SlotsScreen } from './screens/SlotsScreen';
import { BaseMenu } from './screens/BaseMenu';
import { ProductionScreen } from './screens/ProductionScreen';

function Router() {
  const { profile } = useGame();
  if (!profile) return <SlotsScreen />;
  if (profile.activeFilm) return <ProductionScreen />;
  return <BaseMenu />;
}

export function App() {
  return (
    <GameProvider>
      <Router />
    </GameProvider>
  );
}
