# Audit against the game-dev skills (2026-11-21)

Skills: `.claude/skills/` from [awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
(`game-feel`, `game-ui-ux`, `card-game`, `save-systems`, `procedural-gen`), plus `npm audit`.
Each skill's "Check it" steps were run as automated tests (`tests/generation.test.ts`, the save and
premiere tests) or Playwright sweeps (1280×720, 2560×1080, Pixel 7 phone; at 100% and 200% text).

## Dependencies — fixed
- 5 advisories (2 critical in tinypool, esbuild dev server, vitest mocker) in dev tooling.
  Upgraded Vite 7.3.7, Vitest 4.1.12, @vitejs/plugin-react 5.2.0 → 0 vulnerabilities.

## save-systems
| Finding | Fix |
|---|---|
| Older saves showed only "Unreadable save"; no migration path | Migration chain (`MIGRATIONS[v]` → v+1) with explicit statuses; pre-release saves (v<5) explained as "early test build" |
| Newer saves not refused with a message | `newer` status and message |
| No backup: one bad write loses the slot | Previous good save kept as `:bak`; loads fall back to it and say so |
| No validation on load | Structural/type checks; unknown director/set/topic/pack ids dropped |
| Storage-full write threw inside a React effect | `saveProfile` returns a result; a banner warns that changes are not saved |
| Save size never measured | Test: a real finished film × 40 + profile stays under 2 MB |

## procedural-gen
| Finding | Fix |
|---|---|
| PRNG outputs not pinned (a refactor could silently change every seed) | First outputs of `createRng(0)` pinned in a test |
| Generated briefs never validated | 600-seed sweep: deterministic, every hard requirement achievable, >400 distinct briefs — passed, no generator change needed |
| One RNG stream for the whole profile | Accepted for now (determinism holds); split into per-system child streams if replays/daily seeds are added |

## card-game (casting)
| Finding | Fix |
|---|---|
| Zone invariant untested | Random bot, 1,500 draw/cast/release steps: no actor ever in two places, rejected cards never return — passed |
| Draw odds untested | 300-seed check: lead draws get >2× the epic/legendary share of minor roles — passed |
| Validate-then-commit | Already correct (redraw fee checked before anything changes) |

## game-ui-ux
| Finding | Fix |
|---|---|
| Locked cards faded to 3.69:1 contrast (cost/unlock text) | No fade; dashed border + muted title (text stays ≥5:1) |
| Text below 12 px (labels 11.5, timeline 11.2, ticks 10.9) | 16 px base, nothing under ~12.5 px |
| Touch targets 34–40 px | 44 px minimum for buttons, selects, inputs, icon and tone buttons |
| No text-size option | Settings: 100/125/150/200%, per device |
| Layout broke at 200% text: page scrolled sideways, sticky sidebar covered "Lock script", accept panel unclickable on phones | Layouts in rem, grids/cards allow shrinking, rows wrap, sidebar no longer sticky, accept panel stacked. Sweep at 200%: no overflow on any screen |
| Timeline drag was pointer-only | Arrow keys move a focused scene (Shift = 5 min), with an aria-label describing its position |
| No visible keyboard focus | `:focus-visible` outline |
| Tone clash shown by colour/outline only | Text label "Doesn't suit a … scene" |
| Disabled buttons too faint for gameplay info | Opacity 0.6 |

## game-feel
| Finding | Fix |
|---|---|
| No reduce-motion option; OS setting ignored; one looping effect | Settings: Follow device / Full / Reduce; reduce cuts animations, bubbles and the FX loop; the shoot jumps to its result |
| Feedback not tiered: draws, picks and the grade had none | Small: button press; medium: cards dealt with overshoot, bubbles pop; large: grade stamps in and the verdict card shakes once (decaying) |
| Juice that never returns to rest | All effects are one-shot CSS animations ending at rest |

## Not changed (noted)
- Strings are hard-coded English (localization is out of scope for now).
- Two short timeline blocks are narrower than 44 px on desktop by design (width = scene length);
  on touch screens they get a 44 px height.
- Tab strip scrolls horizontally on phones (intentional).
