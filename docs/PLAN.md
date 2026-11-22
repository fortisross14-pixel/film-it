# Film it! — Build Plan

Source of truth: the "Film it! — Game Requirements" doc.
Goal of this plan: get every mechanic in the requirements working end to end.
Balancing and polish come after; all balance numbers live in `src/engine/tuning.ts`
so they can be tuned in one place later.

Architecture (from the requirements): Vite + React + TypeScript, deployed to GitHub
Pages. Game logic lives in pure engine modules under `src/engine/` (no React imports,
unit-tested with Vitest). The UI under `src/ui/` only reads engine state and calls
engine functions. One permanent save in localStorage (no slots).

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

## Visual pass toward the concept art (done)

- Name: **Film it!**. Warm cinema theme: dark frame, cream paper with sprocket edges, maroon and
  gold, Cinzel display + Nunito body; side nav with icons; top HUD (director level, credits,
  reputation; in production: week, budget, title plate).
- Ratings: critics 🍅 as a %, audience 🍿 on a 1–10 scale with one decimal (`format.ts`).
- Contract board as in concept 2 (list with posters, detail with poster + facts + Start Production,
  director / set catalogue / topic packs). Briefs carry working titles (`titles.ts`).
- Script is one long film strip: scenes are frames dragged along it; one scene edited at a time.
- Sets: hand-placed low-poly furniture and props for the main sets, glowing lamps and windows,
  studio rig (lights with beams, camera on dolly track, director's chair), low-poly actors.
- Shooting as in concept 3: on-set scene list with thumbnails, studio stage, directing focus with
  meter icons and a big Record Take button, cast and set pickers; speech bubbles (⚡ pace,
  ❤ chemistry, 💬 dialogue) pop over the actor who earned them.
- Premiere as in concept 1: poster in a marquee on a red carpet with curtains and spotlights,
  rating cards, studio verdict with laurels and ribbon, awards row, box office by week chart.
- Procedural posters (`Poster.tsx`) and icons (`Icons.tsx`) stand in for commissioned art.

## Poster studio and marketing (done)

- `marketing.ts`: poster = generated background (style + seed; regenerate for a fee that doubles)
  plus title font/size, director credit, billing size per star, faces lineup, frame. Scored on
  style/genre fit, font fit and title size, billing (stars big, unknowns small), faces (superstars
  yes, unknowns no, at most 4), director credit (only once known: 3+ films). Score adds buzz and an
  opening multiplier (0.85–1.2×).
- Marketing: the studio funds a campaign (35% of budget). In post ask for more (opening ×1.4,
  nomination chance +6%, target ×1.3) or less (opening ×0.72, target ×0.75); each change takes a week.
- UI: Edit screen tab "Poster & marketing" with live poster preview, controls, score and tips;
  premiere shows the designed poster, poster score and marketing level.

### Art wanted (to replace the procedural placeholders)
See the end-of-turn message / issue list: actor portraits, posters per genre, set backdrops or
sprites, prop sprites, UI ornaments (laurels, reels, film strip, tickets), award statuettes.

## Milestone 8 — "Later" features (done)

- Chemistry: hidden per actor pair, revealed on the first shared shoot (built in Milestone 4).
- Actor careers (`franchise.ts`): after each film the cast's star power moves with the grade
  (A +8 … F −3, other billings ×0.6) and awards (+4 each); strong performances add acting;
  films, wins and recent credits are tracked. Actors cast while unknown (<35 star) remember the
  director who discovered them: 15% fee discount later. Actors carry a gender for portraits.
- Rival films: each award season has named rival films by rival directors; each category lists
  the nominees and the winner.
- Sequels and franchises: a hit (B or better, box office at least 1.2× target) puts a sequel brief
  first on the next board — same studio, genre and topic, budget ×1.4, rewards ×1.3, bonus goal
  to bring back the original lead (who appears in the first lead draw). Sequels get fanbase buzz
  (+8) and opening ×1.15, minus some critics fatigue.
- Final-cut playback: "Watch the whole film" in Edit and in the filmography plays every kept
  scene in order with title and end cards.

## Balance pass (done)

Tuned with a simulation harness: `tests/sim/bots.ts` plays whole careers with three bots
(careful, average, naive). Run it with `SIM=1 npx vitest run tests/balance.sim.test.ts --reporter=verbose`.
It prints grades, ratings, box office against target, spend, awards, sequels and the score
components by archetype (10 careers × 6 films per bot).

| Bot | A | B | C | D | F | Audience p10–p90 | Critics p10–p90 |
|---|---|---|---|---|---|---|---|
| careful (before) | 79% | 4% | 9% | 2% | 7% | — | — |
| careful | 38% | 30% | 28% | 2% | 2% | 6.8–8.8 | 69–86% |
| average | 0% | 2% | 48% | 45% | 5% | 4.7–6.1 | 53–70% |
| naive | 0% | 0% | 11% | 45% | 43% | 3.2–5.3 | 41–62% |

The careful bot plays well; a strong human player should get more A grades. The requirements doc's
example (a $400M hit with 45% critics and no nominations on an award brief) grades C; a test
anchors this. Everything unlockable costs 7,310 credits: about 6 careers for a careful player.

What changed (all in `tuning.ts`):
- Grade bands moved to tuning: A 90 / B 75 / C 48 / D 34.
- Ratings: a curve that spreads good films from bad ones (`ratingSpread`, `ratingLift`).
- Box office score: `(gross / target)^0.6`. Blockbuster and crowd targets are 2.5× budget.
- Awards: stronger rivals, a lower nomination base, and thresholds for every category in
  tuning. Best Sound and Visual Effects now need real craft. Festivals need critics of 75 or
  more and come with a 60% chance. Expected award points are set per archetype.
- Award briefs weigh box office, audience, critics and awards more evenly.
- Sequels need box office at least 1.2× target. Their fanbase is softer: buzz +8, opening ×1.15.
- Set rental scales with the budget. Lead star requirements by tier are always reachable.
- Casting draws know the budget: stars far beyond the film's means turn up a quarter as often,
  and every draw holds at least one affordable card. Before this, small briefs were often only
  playable over budget.

## Actor portraits (done)

The four face grids (young, adult, veteran, famous look-alikes) are cut into 6×6 WebP sheets
(about 95 KB each). `portraits.ts` gives each actor a cell: the sheet by age, the rows by gender,
and the column by strongest skill, which sets the expression (calm when no skill stands out).
Parody stars get their look-alike. Within a pool no two actors share a face. Older saves without
stored portraits get the best match on the fly.

## Navigation revamp (done)

Audit of every screen against the owner's feedback, and what changed:

| Problem | Change |
|---|---|
| Studio, unlocks and careers were mixed in one menu | **Studio** (credits, Unlocks shop, Hall of fame) holds up to **3 careers side by side** (`career.ts`: `runningCareers`, `parkCareer`, `enterCareer`; save v6). Each career has its own board and film; all share the unlocks. |
| Inside a career there was too much | **Career** screen: just Contracts (plus this career's films and Retire). The Studio button parks the career. |
| Contract board was list + detail + sidebar at once | A list. Tap a contract to open a detail sheet with **Back / Accept**. |
| The "★★" on contracts read like a rating | A labelled **difficulty meter** (Easy … Brutal) with pips. |
| Script was one very long page | Tabs: **Story** (characters, runtime, topic), **Scenes** (strip + list; each scene opens in its own sheet), **Check** (must-haves, quality, feel). A pinned bar shows quality, must-haves and Lock. |
| Casting: rarity borders didn't show; no money impact | Fixed CSS so the rarity borders show, and added a rarity ribbon. Every card shows **Budget after** hiring. Roles are a list; each opens a sheet with its cards (swipe carousel on phones). |
| Shooting: everything at once, endless scrolling | A weekly loop. **This week** shows status (week, budget, takes kept, fatigue, bond) and 4 activities: Shoot, Rehearse, Club night, Day off. Shoot is 2 steps (scene → set & focus with the forecast → Record); the take choice opens on its own. Tabs for Scenes, Cast and Log. |
| Edit: one long page | Tabs: Scenes (each opens a sheet), Music & FX, Poster, Marketing. Pinned bar: cut quality, budget after, finish week, Premiere. |
| Not built for phones | Bottom tab bar, compact top bar, full-screen sheets, pinned action bar, toasts instead of paragraphs. During production the phases show as dots in the top bar. |
| No install | PWA: manifest, icons, service worker (offline play), **Install app** button on the title screen and in the ⚙ menu (iOS gets Add to Home Screen steps), and persistent storage is requested for saves. |

Phone screenshots: `docs/screens/m-*.png`.

## Career ladder and collection (done)

Owner feedback: the game had no clear goal, and credits plus reputation were two confusing currencies.
Adapted from Built it!'s loop (start a career, climb, unlock, retry with more):

- **One permanent studio.** No save slots: one save holds everything (`save.ts`, save v7). Old slot
  saves are carried over once (the slot with most films wins); credits become money, reputation is dropped.
- **Money is the only currency** (`Profile.money`, $K). Every film pays the director's fee
  (`contracts.feeBase + feePerLevel × level`, × difficulty, × grade: A 1.5 … D 0.6, F 0) plus an award bonus.
- **The ladder replaces reputation.** A career makes up to 10 films and has a level 1–10 that picks the studio
  tier and budget tier of its board (`tuning.ladder`). A +2 levels, B +1, C holds, D −1, **one F ends the career**.
  Ten films wraps it into the Hall of fame with a title (`legacyTitle`). Retiring early is allowed (no bonus).
- **Board:** two briefs at your level, a safe one a level down (or a stretch a level up after an A), and a locked
  teaser two levels up showing what climbing opens. Sequels replace one of the at-level briefs.
- **Genres** open for good when any career reaches a level: start with Drama, Romance, Comedy, Action, Thriller;
  Horror at 3, Sci-Fi at 5, Fantasy at 7. Boards only offer open genres.
- **Actors are a roster** (`Profile.actorPool`). It starts with 16 commons and 10 uncommons. **Talent packs** add
  3 actors each: a B earns a Casting call (rare 85 / epic 13 / legendary 2%), an A a Star pack (rare 45 / epic 45 /
  legendary 10%, at least one epic). Both are also sold in the shop (Star packs once a career reaches level 5).
  Unnamed actors are common, uncommon or rare; **named stars are always epic or legendary** (12 legendary, 24 epic).
  A duplicate star gets +5 star power instead. Fresh faces at casting are common or uncommon.
- **Sets:** 3 to start (Apartment, Park, Warehouse); the other basics are bought, topic sets come with their pack.
- **Directors:** the 2 basics to start; the rest are bought.
- UI: title screen with Continue / Found your studio; Studio with a Goal card (best level, named stars, directors,
  sets, genres), Actors (packs, opening reveal, roster by rarity), Shop, Hall of fame; career board with level tags
  and the locked teaser; verdict shows money, pack and the level change.

First simulation run (6 films per career): the careful bot gets 28% A / 40% B and averages level 2.8;
the naive bot is fired early. Balance is still deferred.

## Pay and director rankings (done)

- **What a film pays** (`grade.ts` `filmPay`): nothing for an F; otherwise the fee × grade, plus a box office
  bonus (fee × how far the gross beats its target, capped at 1.5×), a ratings bonus (fee × points the average of
  audience and critics is above 60, / 100) and an awards bonus (per nomination and win, more at higher levels).
  The verdict shows the breakdown.
- **Directors you create:** each career gets a director name (typed when starting it, random if left empty) on top
  of its profile ("Greta Lumen · The Heartbreaker").
- **Leaderboard** (`rankings.ts`, Hall of fame → Directors): every director with a film, running or finished, ranked by
  average critics, average audience, awards (wins, then nominations), total box office or top level.

## Awards pass (done)

Goal from the owner: the first couple of careers don't really win awards; a nomination here and there toward
the end of a career, when the contracts get bigger. Measured with `playStudio` in `tests/economy.test.ts`
(3 careers in a row on one studio with shopping in between, plus a fully equipped "veteran" studio; 24 runs each).

- **Award prestige by level** (`premiere.awardPrestige`): the main ceremony's nomination chance × 0 at levels 1–3,
  0.1 at 4 … 1 at 10. The awards share of the studio's grade weights moves to critics by the same factor
  (`contracts.levelWeights`), so award and indie briefs stay fair before awards are reachable.
- **Tougher rivals** (86–99, was 78–98), less luck in the result (±5, was ±8).
- **Craft awards need more:** Script 95, Score 87, Visual Effects 90 and Sound 92, where effects and sound
  now also count the critics rating (35%) so money alone doesn't win them.
- **Festivals:** 30% chance for a well-reviewed small film (was 60%); a festival win needs critics 92 (was 88).

| Careful bot, per career | Before | After |
|---|---|---|
| Films 1–5: ceremony nominations per film | 0.21 | 0.00 |
| Films 6–10: ceremony nominations per film | 0.42 | 0.26 (about 1–2 per career) |
| First careers with a ceremony win | 3/12 | 3/24 |
| Festival nominations per early film | 0.48 | 0.24 |

Side effect: grades went up for award and indie briefs (careful A/B 80%, average now mostly C instead of half D).
Open: awards don't yet scale with what you've unlocked. In the sim, a fully equipped studio wins about as often as a
second career (4–9 of 24 careers), and the action profile's effects-heavy films win more than others.

## Unlocks that matter (done)

Owner goal: better directors, sets and legendary actors must make clearly better films. Career 5 beats career 1,
career 10 beats career 5, around career 20 some films reach universal acclaim (critics 90%+, audience 8.0+), and
around career 25 a career is a couple of good indies, then masterpieces. Skilled players unlock pretty much
everything in about 20 careers, average players in about 25.

- **Ceilings** (`ceilings.ts`): skill gets a film to the ceiling, equipment raises it. Script quality is scaled by the
  director's script ceiling; take meters by the average of the director's shooting ceiling and the set's tier.
  Directors: basic 72/72, advanced 80–96 (each strongest in its phase), genre masters 88 and 100 in their genre,
  and two new legends, **The Auteur** and **The Showman** (100/100). Sets: basic 72, advanced 86, premium 100.
- **Studio upgrades** (`data/upgrades.ts`, Shop → Studio): Talent agency (rare/epic unknowns, Star packs), Star agency
  (legendary actors, named stars), Post house (pro effects and sound), VFX studio (premium), Composer, Star composer,
  Marketing department (the push campaign). A new studio has basic effects, library music and no push.
  Films remember the gear they started with.
- **Actors:** wider rarity bands (acting common 22–52 … legendary 80–99). Pay is a share of the film's budget that
  rises with star power, so a star is never a trap on a small film. Lead draws strongly favour your rarest actors.
- **Ratings:** spread, then ease toward 100 above a knee (critics 88, audience earlier), so masterpieces stay rare.
- **Ladder:** a C now climbs one level and a D holds, so average players reach bigger contracts too.
- **Prices:** shop about $19M in all. Base fee $18K + $4K × level.
- **Records** (`records.ts`): best critics, audience, box office, awards per film; career box office, wins, critics
  average. Hall of fame → Records, and "New record!" on the verdict.

Measured with `playStudio` (one studio, 25 careers in a row, a bot that shops between careers; `tests/economy.test.ts`):

| Careful (skilled) bot | Shop owned | Critics typical / best | Audience | Acclaimed films per career |
|---|---|---|---|---|
| Career 1 | 2% | 66% / 76% | 6.3 | 0 |
| Career 5 | 16% | 75% / 89% | 7.9 | 0 |
| Career 10 | 45% | 82% / 93% | 8.2 | 0.5 |
| Career 20 | 100% | 90% / 100% | 8.5 | about 5–6 |
| Career 25 | 100% | 90% / 100% | 8.4 | about 5–6 |

The average bot owns about 83% by career 25 and makes 80% / 7.6 films with everything. Guards in `tests/economy.test.ts`
check the first-career money rules and the progression milestones on every `npm test`.

Open: the careful bot tops out at about 5–6 acclaimed films a career with everything; a skilled human should get closer to 8.

## Visual and premium pass (in progress)

Owner feedback: too much text, it felt generic and ugly in places; the mechanics are fun.

- Less reading: explanations behind a "?" (`Hint`), repeated labels dropped, one centred column on desktop, the
  disabled main action reads as the next step.
- Pictures first: contracts as poster cards, casting as cast cards with faces, characters as role tokens, topics as
  chips rated by genre fit, compact leaderboard.
- **Action bubbles** (`ActionBubbles`): one button ("Add a character", "Add a scene") pops the choices around it as
  medallion bubbles; what the brief needs pulses.
- **Icons**: drawn glyphs on gold medallions (`GameIcons.tsx`) instead of emoji.
- **Premium layer** (`premium.css`): gradient buttons and chrome, cards deal in, lift and catch a light sweep on hover,
  epic and legendary cards shimmer like foil. Premiere: sweeping spotlights, camera flashes (two a second at most,
  WCAG 2.3.1), and the studio verdict slammed onto a memo as an inked rubber stamp with a short shake.
  Everything animated respects the reduce-motion setting.
- **Brief first, details on tap** (`Details`): every card and sheet shows only the critical numbers; the full
  breakdown opens on tap. Actor cards: star, acting, the skill the role needs, fit, pay (skills and traits on tap).
  Contract sheet: facts, fee, must-haves (grading on tap). Must-haves list what's missing (done ones on tap). Script
  quality: the number and the top note (components and feel on tap). Shooting forecast: the meters (factors on tap).
  Edit: the scene score (the sum on tap). Shop and packs: names and prices (descriptions and odds behind "?").

## Still open

UI polish, plus the open questions from the requirements: timeline snapping, shoot order, actor
pool carry-over, pack unlock rules.
