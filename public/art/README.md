# Art

Commissioned art for Film it! (provided by the game's owner). WebP, sized to ~2× display size.

| File | Used in | Size |
|---|---|---|
| logo.webp | title screen, side nav | 578×200 |
| home-bg.webp | title screen background | 1279×720 |
| home-hero.webp | title screen | 598×640 |
| stage-bg.webp | shooting stage backdrop | 959×540 |
| premiere-bg.webp | premiere (title on the marquee, poster on the steps) | 640×960 |
| trophy.webp | awards row, trophy room | 71×192 |
| pack-*.webp | topic pack cards (board, topic packs tab) | ~155×224 |
| faces-young / adult / veteran / famous.webp | actor portraits: 6×6 sheets of 128 px cells | 768×768 |

Face sheets: rows 1–3 women, rows 4–6 men; columns are expressions (romance, comedy, drama,
action, menace, calm). The famous sheet follows the order of `FAMOUS` in
`src/engine/data/actors.ts`. `src/engine/portraits.ts` picks the cell for each actor.

To replace one, keep the file name and roughly the size; `src/ui/art.ts` lists the names.
