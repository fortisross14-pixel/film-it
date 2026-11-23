# Film it! — working notes

- Follow `docs/PLAN.md` milestone by milestone. The requirements doc is the source of truth.
- Engine (`src/engine/`) is pure TypeScript: no React, no DOM, no Math.random — use the seeded RNG in `rng.ts`
  (profiles carry `seed`; use `withRng` in `profile.ts`). Engine functions return new objects (no mutation).
- Every balance number goes in `src/engine/tuning.ts`. Money is in $K.
- Add Vitest tests in `tests/` for every engine module. Run `npm test` and `npm run build` before committing.
- Balancing and visual polish are deferred until all milestones are done.
- Game-dev skills live in `.claude/skills/` (see `THIRD_PARTY.md`): `game-feel`, `game-ui-ux`,
  `card-game`, `save-systems`, `procedural-gen`. Use them when touching those areas; their code is
  engine-flavoured, translate it to React/DOM.
- Saves and all persistent data go through `src/platform/storage.ts` (IndexedDB, localStorage only as fallback;
  injected into the engine with `setSaveStore`). Never call localStorage directly: all the owner's games share the
  fortisross14-pixel.github.io origin and its ~5 MB localStorage is usually full. This is the preferred solution for storage.
