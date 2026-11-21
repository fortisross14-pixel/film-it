// Commissioned art in public/art (WebP). Paths respect Vite's base for GitHub Pages.
export type ArtName =
  | 'logo' | 'home-bg' | 'home-hero' | 'stage-bg' | 'premiere-bg' | 'trophy'
  | 'pack-epic' | 'pack-future' | 'pack-fight' | 'pack-prestige';
export const art = (name: ArtName) => `${import.meta.env.BASE_URL}art/${name}.webp`;
export const packArt = (packId: string) =>
  (['epic', 'future', 'fight', 'prestige'].includes(packId) ? art(`pack-${packId}` as ArtName) : undefined);
/** Actor face sheets (6×6 portraits each). */
export const faceSheet = (sheet: 'young' | 'adult' | 'veteran' | 'famous') => `${import.meta.env.BASE_URL}art/faces-${sheet}.webp`;
