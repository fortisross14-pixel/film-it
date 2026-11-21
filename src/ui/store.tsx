import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Profile } from '../engine/types';
import { saveProfile } from '../engine/save';

interface GameStore {
  slot: number | null;
  profile: Profile | null;
  open: (slot: number, p: Profile) => void;
  close: () => void;
  /** Replace the profile with a new one (engine functions return new profiles). */
  update: (fn: (p: Profile) => Profile) => void;
}

const Ctx = createContext<GameStore | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<number | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [saveError, setSaveError] = useState<string | null>(null);
  // Autosave whenever the profile changes; surface failures instead of losing progress silently.
  useEffect(() => {
    if (slot === null || !profile) return;
    const r = saveProfile(slot, profile);
    setSaveError(r.ok ? null : r.reason);
  }, [slot, profile]);

  const open = useCallback((s: number, p: Profile) => {
    setSlot(s);
    setProfile(p);
  }, []);
  const close = useCallback(() => {
    setSlot(null);
    setProfile(null);
  }, []);
  const update = useCallback((fn: (p: Profile) => Profile) => setProfile((p) => (p ? fn(p) : p)), []);

  return (
    <Ctx.Provider value={{ slot, profile, open, close, update }}>
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
