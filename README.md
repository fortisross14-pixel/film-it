# Director's Cut

A film-making creation game: take a studio brief, write the script, cast it, shoot it,
finish it in post and premiere it. Graded A–F against what the studio wanted.

- Build plan and milestones: [`docs/PLAN.md`](docs/PLAN.md)
- Stack: Vite + React + TypeScript, deployed to GitHub Pages.
- Game logic: pure modules in `src/engine/` (tested with Vitest). All balance numbers in `src/engine/tuning.ts`.
- UI: `src/ui/`.

```
npm install
npm run dev     # local dev server
npm test        # engine tests
npm run build   # typecheck + production build
```
