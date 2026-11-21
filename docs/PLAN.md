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

## Milestone 1 — Foundation, content and the base menu (done)

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

## Design updates (after Milestone 1 review)

- Sets are low-poly isometric cube dioramas with a grid footprint (2×2 house interior
  with walls, 4×10 War Field full of extras, green-screen chroma stage, …), a style
  (interior / exterior / chroma) and an extras capacity. Rendered in SVG (`IsoSet`).
- Actors are cartoon faces. Commissioned art will plug into `Actor.portrait`; until then a
  procedural cartoon face (Milestone 3). Names mix common ("John Smith"), random and
  parody-famous ("Leonardo DiBario", "Jennifer Balliston").
- On time and on budget are effects, not weighted grade components: studio satisfaction is
  weighted from box office / public / critics / awards, then late and over-budget penalties
  are subtracted on a curve (90 → 88 slightly late, → 85 a bit late, → 8 very late).
  Each archetype has a strictness multiplier (Tight ship is strictest). See `grade.ts`.

## Design updates (after Milestone 2 review)

- **Script is scene-and-action based, not minute-based.** Characters first (Main, Villain,
  Co-villain, Romantic interest, Comic relief, up to 2 Supporting). Then 3–7 scenes
  (usually 4–5). Each scene: duration (short / medium / long = 12 / 18 / 25% of runtime),
  a tone (happy, sad, thrill, calm, romantic, scary), action beats
  ("Villain · fights and wins · To: Main"), and others involved. 2 beats per scene is
  ideal, 1 is shallow, 3 good, 4 too complex. Scenes are ordered on the timeline; filler is
  spread evenly between them.
- **Script profile axes:** Action (calm↔thrill), Humor (sad↔happy), Romance, Fear. Each genre
  has an ideal profile; fit is the weighted distance from it.
- **Script quality:** fit, depth, structure (open with the main, climax ending, escalation,
  tone variety), characters (everyone used, each type does its job), coherence (actions suit
  the tone), pacing (scene count + filler).
- **Brief hard requirements** now ask for a tone ("at least 1 sad scene") or an action
  ("someone declares love") instead of scene types. Topics add actions (Medieval → duels).
- **Actors have skills** (action, comedy, drama, romance, menace). A role's fit comes from the
  skills its beats use.
- **Shooting (M4)** becomes a Game-Dev-Tycoon-style minigame: the cast walks onto the set and,
  for a few seconds, bubbles add to three meters (pace, chemistry, dialogue). The shoot yields
  3 versions: one best in pace, one best in chemistry, one bad. Pick one or shoot again
  (costs days).
- **Post (M5):** go through each scene, watch it play back with its score, add music and FX.

## Milestone 2 — Script phase (done, then reworked to the scene/action model)

- `script.ts`: characters, scenes with duration/tone/beats/others, ordering, layout with
  filler, topic actions, rating filter, screen time, cost, profile axes, quality breakdown,
  live hard-requirement checklist, lock → casting.
- Script editor UI: characters, runtime/topic, timeline, scene cards with beat rows,
  profile and quality sidebar.

## Milestone 3 — Casting phase (done)

- `casting.ts`: 3-card draws per role (first free, redraws 1×, 2×, 4× a budget-scaled fee),
  rarity odds by billing, Talent Scout gem odds and cheaper redraws, rejected cards gone for
  the film, fresh faces when the pool runs low, release and recast.
- Pay = base fee (star power⁴·², billing, diva) + screen minutes × per-minute rate.
- Fit from the skills each role's beats need, plus acting and age; casting score = fit +
  star power against the budget tier.
- Casting UI: role list, actor cards with procedural cartoon faces (`Face`; commissioned art
  plugs into `actor.portrait`), budget, requirements, sign the cast → shooting.

## Milestone 4 — Shooting phase (done)

- Weekly loop (`shooting.ts`): each production week is one activity, costs crew money and
  counts toward the deadline:
  - **Practice scene X**: +pace and +dialogue prep for that scene (diminishing), light fatigue.
  - **Club meetup**: +cast bond (chemistry).
  - **Relax**: −fatigue, fresh boost to the next shoot's pace & chemistry, practiced lines fade.
  - **Shoot scene X**: pick set + focus (pace / chemistry / dialogue). Adds set rental and stunts.
- Bubble inputs: focus; actors (star power → more bubbles, skills for their actions, acting,
  traits: one-take, method, charming, diva); fatigue; hidden pair chemistry (revealed the
  first time a pair shoots together); cast bond; practice; director (affinity, Cinematographer);
  scene↔genre alignment; set alignment; retake learning; ±8% "inspired that day" noise.
  Meters ease towards 100 above 70 so stacked bonuses still separate.
- Each shoot yields 3 versions (pace cut, chemistry cut, rough cut); take score weights the
  meters by the scene's tone. Use one, or try again another week. All takes are stored.
- Wrap shoots the filler in one block (1 week) and moves to post.
- UI: calendar, scene list, set picker with iso preview and fit, focus, expected meters with
  factor chips, cast fatigue/bond/discovered chemistry, animated stage with bubbles over the
  actors, version picker, log.

## Milestone 5 — Post-production (done)

- `post.ts`: choose the take per scene from every stored take (defaults to the one picked on
  set); cut a weak scene back to filler (keep at least 2); film-wide music (library: small
  flat bonus; composer: + emotional scenes; star composer: large bonus, Best Score eligible);
  per-scene VFX and SFX (none/basic/pro/premium) weighted by genre, boosted in stunt scenes,
  with diminishing returns across the film and an overproduction critics penalty for heavy
  CGI in low-VFX genres. The Editor makes post cheaper and stronger.
- Edits are free until the cut is locked; then music, polish and post crew are charged and
  post days become post weeks against the same deadline.
- Auto-polish: greedy best value per $K for a chosen budget.
- Final cut quality = minutes-weighted scene scores + filler; best/worst scene feed the
  premiere (critics like peaks, the public punishes bad scenes).
- UI: per-scene edit cards (take picker, VFX/SFX, score breakdown, cut/restore), scene
  playback on its set with the cast and beats as captions, music, auto-polish, cost/time
  summary, lock → premiere.

## Design updates (after Milestone 5 review)

- Scenes have a start minute: drag them anywhere on the timeline (snapped to 1 minute,
  no overlaps; a drop on another scene lands in the nearest free spot). Two scenes may share
  an act or straddle an act change; order follows time. New scenes append after the last one.
- A script can be locked with 2 scenes. Brief tone requirements ask for 1 scene, so two
  well-built scenes can meet a brief.

## Milestone 6 — Premiere, results and grade (done)

- `premiere.ts`: rating factors (script, star power, weakest scene, best scene, acting,
  chemistry, VFX/SFX, originality, final cut) weighted per the requirements table for the
  public and the critics; boredom from filler above a free 20%; overproduction hits critics;
  ±3 noise. Buzz from stars, topic hype and charm. Box office: opening from market (genre,
  rating, budget) × buzz × a small critics effect, then an 8-week run whose legs come from
  the public rating (sleeper hits for small films with great word of mouth).
- Festivals for small, well-reviewed films (big films rarely); academy-style categories
  (Picture, Director, Lead/Supporting Performance, Original Script, Score with a star
  composer, Visual Effects, Sound) with thresholds on their driver, a nomination roll and a
  competition roll against the year's rivals.
- `grade.ts` `gradeFilm`: weighted satisfaction (box office vs target, public, critics, awards
  vs what the archetype expects) + bonus goals, then late / over-budget penalties, then one
  letter lower per missed hard requirement. Rewards scale with grade; awards add reputation;
  unspent budget adds credits.
- `deliverFilm`: rewards, director level-up, genre award tally, filmography, fresh contract
  board, auto-unlocks (new directors announced).
- Premiere UI: staged reveal (red carpet → public → critics → box office → awards → verdict).

## Milestone 7 — Careers and the meta loop (done)

Design (after Milestone 6 review): you play **careers**. A director is a profile, not a
person ("The Heartbreaker", "The Adrenaline Junkie", "The Sci-Fi Genius", "The Budget
Master"…). Two are free; every other profile, topic pack and set is bought with **credits**
earned in careers — money is the only unlock currency.

- `career.ts`: start a career with an owned profile (level and reputation from zero); the
  board scales with career reputation (higher-tier studios open up); each delivered film
  adds reputation, a level (cap 10) and credits to the bank; retire any time between films
  for a bonus of credits per reputation point; fired after 2 F grades in a row (no bonus).
  Finished careers go to the hall of fame.
- `progression.ts`: buy profiles, topic packs and sets with credits; unlock-everything
  progress.
- 13 profiles: 2 starters, 4 phase specialists (Wordsmith, Star Whisperer, Visionary Lens,
  Cutting Room Wizard), 3 production styles (Budget Master: cheaper crew/sets/writing;
  Clockwork Director: less fatigue, faster post; Festival Darling: critics + easier festivals),
  4 genre masters (Sci-Fi Genius, Scream King, Laugh Factory, Myth Maker).
- UI: Careers tab (current career, retire, profiles to start or buy, hall of fame), career
  header (profile, level, reputation & studio tier, bank), board without a director picker,
  filmography with each film's final cut and stored takes, fired notice.
- End-to-end engine test plays a full contract with no UI.

## Audit (after Milestone 7)

See `docs/AUDIT.md`: dependency upgrade, and fixes against the game-dev skills (saves, generation checks,
casting invariants, accessibility and layout at 200% text, reduce motion, tiered feedback).

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
