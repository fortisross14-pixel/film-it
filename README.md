# Film it!

A film-making creation game: take a studio brief, write the script, cast it, shoot it,
finish it in post and premiere it. Graded A–F against what the studio wanted.

**The goal:** run up to three director careers at once. Each makes up to 10 films and climbs from
level 1 (micro-budget indies) to level 10 (the biggest studios' blockbusters): A +2 levels, B +1,
C holds, D −1, and one F ends the career. Films pay the studio money and good grades earn talent packs
(new actors: rare, epic or legendary named stars). Money buys directors, sets and topics; climbing opens
new genres. Everything you earn is permanent, in one save.

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
