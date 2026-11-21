import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Profile } from '../engine/types';
import { saveProfile } from '../engine/save';

interface GameStore {
  profile: Profile | null;
  open: (p: Profile) => void;
  close: () => void;
  /** Replace the profile with a new one (engine functions return new profiles). */
  update: (fn: (p: Profile) => Profile) => void;
}

/** Exported for optional use (e.g. the menu, which also renders on the title screen). */
export const GameCtx = createContext<GameStore | null>(null);
const Ctx = GameCtx;

export function GameProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);

  const [saveError, setSaveError] = useState<string | null>(null);
  // Autosave whenever the profile changes; surface failures instead of losing progress silently.
  useEffect(() => {
    if (!profile) return;
    const r = saveProfile(profile);
    setSaveError(r.ok ? null : r.reason);
  }, [profile]);

  const open = useCallback((p: Profile) => setProfile(p), []);
  const close = useCallback(() => setProfile(null), []);
  const update = useCallback((fn: (p: Profile) => Profile) => setProfile((p) => (p ? fn(p) : p)), []);

  return (
    <Ctx.Provider value={{ profile, open, close, update }}>
      {saveError && <div className="save-error" role="alert">⚠ {saveError} Your latest changes are not saved.</div>}
      {children}
    </Ctx.Provider>
  );
}

export function useGame(): GameStore {
  const c = useContext(Ctx);
  if (!c) throw new Error('useGame outside GameProvider');
  return c;
}

/** For screens that only render with a profile loaded. */
export function useProfile(): Profile {
  const { profile } = useGame();
  if (!profile) throw new Error('No profile loaded');
  return profile;
}
