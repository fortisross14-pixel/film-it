# Director's Cut — Build Plan

Source of truth: the "Director's Cut — Game Requirements" doc.
Goal of this plan: get every mechanic in the requirements working end to end.
Balancing and polish come after; all balance numbers live in `src/engine/tuning.ts`
so they can be tuned in one place later.

Architecture (from the requirements): Vite + React + TypeScript, deployed to GitHub
Pages. Game logic lives in pure engine modules under `src/engine/` (no React imports,
unit-tested with Vitest). The UI under `src/ui/` only reads engine state and calls
engine functions. Saves go to localStorage with 3 slots.

Each milestone ends with: engine tests passing, a typecheck/build passing, and the
new phase playable in the browser.

---

## Milestone 1 — Foundation, content and the base menu

- Project scaffold: Vite + React + TS, Vitest, GitHub Pages deploy workflow.
- Core types for every entity in the data model (Contract, Director, Topic,
  SceneType, Role, Scene, Actor, Set, Take, Film, Profile).
- `tuning.ts` with all balance constants.
- Content data: 8 genres, 4 age ratings, ~12 scene types, 4 starter topics + the
  4 example packs, 8 starter sets + topic sets, directors (2 starters, 4 specialists,
  genre masters), studios by tier, ~60 generated actors.
- Seeded RNG so generation is reproducible and testable.
- `contracts.ts`: contract generator (genre × runtime × budget tier × archetype,
  scaled by reputation), hard requirements, bonus goals, expectation weights,
  difficulty stars and rewards.
- `profile.ts` / `save.ts`: new profile, 3 localStorage save slots.
- `progression.ts` (first part): reputation tiers, director unlock checks.
- UI: save-slot screen and the base menu with all six tabs (Contract board,
  Directors, Topic packs, Set catalogue, Filmography, Trophy room). Choosing a
  brief + director starts a Film and moves it to the Script phase (placeholder).

## Milestone 2 — Script phase

- `script.ts`: runtime, filler timeline, roles (types, billing, limits),
  scene placement (type, participants, length, intensity, act derived from
  position), topic choice, required-role checks per scene type.
- Script quality score (coverage, structure, variety, fit, role balance),
  script cost, derived screen time, live hard-requirement checklist.
- Script editor UI: timeline with filler, role list, scene editor, topic picker,
  quality breakdown, running cost vs budget, requirements checklist.

## Milestone 3 — Casting phase

- `casting.ts`: card draws (3 cards, first free, escalating redraw fee),
  odds by billing tier and rarity, hidden gems, director (Talent Scout) bonuses.
- Compensation: base fee + screen-time minutes × per-minute rate.
- Casting score (genre range, age fit, star power vs brief).
- Casting UI: role-by-role card draws, pick or redraw, cast summary and payroll.

## Milestone 4 — Shooting phase

- `shooting.ts`: set choice with fit per scene type/topic, parameters
  (coverage, rehearsal, tone, special), take score formula with variance and
  learning curve, feedback lines, filler auto-shoot.
- Schedule: shooting days per take, weeks calendar, daily crew cost, set rental,
  projected finish, lateness.
- Shooting UI: scene list, set picker, tableau, parameter controls, Shoot /
  Retake, take history, calendar bar, ledger.

## Milestone 5 — Post-production

- `post.ts`: take selection (default best), cutting scenes back to filler,
  film-wide music tier, per-scene VFX/SFX slots with genre weights,
  diminishing returns, overproduction, post days, Auto-polish.
- Post UI: take picker per scene, music choice, polish grid, budget + schedule.

## Milestone 6 — Premiere, results and grade

- `premiere.ts`: buzz, public rating, critics rating, box office (opening +
  run), festivals and academy-style awards with a rival-film competition roll.
- `grade.ts`: component scores, weighting by expectation profile, hard
  requirement letter caps, bonus goals, final A–F.
- Premiere UI: staged reveal (red carpet → public → critics → box office →
  awards → verdict) and the results breakdown.

## Milestone 7 — Progression and meta loop

- Rewards (reputation, credits, unspent budget bonus), director levels (cap 10)
  and specialty scaling, director unlocks (rep tiers, genre awards),
  topic pack purchases, set unlocks, higher-tier studios.
- Filmography (films with takes and final cut stored) and Trophy room.
- Contract board refresh after delivery; full save/load of everything.
- End-to-end test: play a whole contract through the engine with no UI.

## Milestone 8 — "Later" features from the requirements

- Chemistry between actor pairs (hidden, revealed after first shared scene).
- Actor careers across films (star power growth, "remembers you" discount).
- Rival directors' films in award season.
- Sequels and franchises.
- Storyboard playback of the final cut.

## After the milestones

Balancing pass on `tuning.ts`, UI polish, and the open questions from the
requirements (timeline snapping, shoot order, actor pool carry-over, pack
unlock rules, final title).
