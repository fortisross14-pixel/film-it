# Director's Cut — working notes

- Follow `docs/PLAN.md` milestone by milestone. The requirements doc is the source of truth.
- Engine (`src/engine/`) is pure TypeScript: no React, no DOM, no Math.random — use the seeded RNG in `rng.ts`
  (profiles carry `seed`; use `withRng` in `profile.ts`). Engine functions return new objects (no mutation).
- Every balance number goes in `src/engine/tuning.ts`. Money is in $K.
- Add Vitest tests in `tests/` for every engine module. Run `npm test` and `npm run build` before committing.
- Balancing and visual polish are deferred until all milestones are done.
