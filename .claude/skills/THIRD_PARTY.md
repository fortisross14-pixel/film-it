# Third-party skills

Copied unchanged from [gamedev-skills/awesome-gamedev-agent-skills](https://github.com/gamedev-skills/awesome-gamedev-agent-skills)
(site: https://gamedev-skills.github.io/awesome-gamedev-agent-skills/), commit `c6ca6c4` (2026-11-12),
Apache-2.0. Licence and NOTICE are in this folder (`LICENSE-awesome-gamedev-agent-skills.txt`,
`NOTICE-awesome-gamedev-agent-skills.txt`). Every file was read before adding: Markdown only, no
scripts or install steps.

| Skill | Source path | Why it applies to Film it! |
|---|---|---|
| `game-feel` | `skills/disciplines/game-feel` | Shoot bubbles, premiere reveal, feedback on actions |
| `game-ui-ux` | `skills/disciplines/game-ui-ux` | Every screen is UI: layout, focus, accessibility, screen flow |
| `card-game` | `skills/genres/card-game` | Casting is a card-draw system (zones, seeded draws, odds) |
| `save-systems` | `skills/disciplines/save-systems` | 3 localStorage slots, versioning, migration, corruption |
| `procedural-gen` | `skills/disciplines/procedural-gen` | Seeded generation of contracts, actors, dioramas |

The examples are written for engines (Godot, Unity, Phaser). This game is React + TypeScript in
the DOM: apply the rules, translate the code (e.g. hit-stop/time scale does not apply; screen shake
= a CSS transform on a wrapper; localStorage stands in for files).

Left out: the engine skills (Godot, Unity, Unreal, Roblox, Phaser, PixiJS, three.js, Bevy…) and
the router (no engine here); `performance-optimization` (built around engine profilers);
`audio-design` (no audio yet; revisit when sound is added); `game-docs` (ships a Python script).
