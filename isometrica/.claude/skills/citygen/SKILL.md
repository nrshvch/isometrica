---
name: citygen
description: Generated cities - isometrica/src/citygen (small town, Peepstown-size city, Peepsopolis), the city-sim menu rows that start them, the lab's city bench (isometrica/lab/cities) and npm run test:cities. Load before changing or debugging city generation, its layouts, placement, water, jobs balance or save output.
---

# City generation

A seed + a spot in the world -> a save (`core/persistence` snapshot format) a
game opens a new city on. Pure core/data code: no client, runs headless.

## Where

All in `isometrica/src/citygen/` unless a path says otherwise:

- `index.js` - entry, `SIZES`, pipeline; `random.js` - seeded RNG, `fork(n)`
  per stage
- `ground.js` - world terrain + earthworks, `Ground(flat)`; `plan.js` - the
  planning grid (window round the site); `site.js` - site search
- `streets.js` - city/Peepsopolis streets, boulevards, roundabouts, square;
  `village.js` - small-town layouts and build-up
- `grade.js` - road surfaces that meet, levelling
- `lots.js` - zones, palettes, strips of lots, civic, farms; `catalogue.js` -
  kinds of building off `data/buildings`
- `water.js` - pumps, towers; `balance.js` - jobs vs beds swaps; `names.js`;
  `save.js` - plan to save
- `city-sim/src/ui/world/Hud.jsx` menu rows; `city-sim/src/ui/session.js`
  `startGenerated` (seed + spot in sessionStorage over the reload, generated
  in `fromInitial`)
- `isometrica/lab/cities.html`, `lab/cities/{Cities.jsx,scene.js}` - bench;
  `isometrica/tools/citytest.mjs` + `lab/cities/check.js` - headless test
- Player-facing write-up: `city-sim/docs/cities.md#generated-cities`

## Pipeline (`generate`)

Site (skipped with `flat`), streets (`layStreets` + boulevards + roundabouts +
square, or `layVillage`), `grade`, `buildUp` / `buildVillage`, `water`,
`balance`, name, `saveOf`.

Each stage takes its own `random.fork(n)`, so a change in one stage does not
reshuffle the others. Same seed + spot = same city; keep it that way (no
`Math.random`, iterate in deterministic order).

## Must hold (test:cities fails otherwise)

- Every road pair side by side meets level (`grade.js`), and the road graph is
  strongly connected for traffic, one-ways included (`check.js drivable`).
- Opened in the real core, no building is `cutOff`, `road` or `water`
  (`client/worth wantOf`). Aim for no `noWorkers`/`noJobs` either.
- Only offered buildings (`catalogue.js` skips hidden/deprecated).
- Nothing crosses the y 32767/32768 seam (see engine.md).

## Testing

- `npm run test:cities` (root or isometrica): 12 seeds x every size, real core.
  Flags: `--size=town,city,metropolis --seed=N --seeds=N --at=x,y --map`.
  `--map` letters: `#` asphalt `%` cobble `:` gravel, arrows one-way, `~`
  water, `+` kept; buildings by kind (`check.js LETTERS`), anchor in caps.
- Lab bench: `npm run dev -w isometrica` -> `/cities.html#size=city&seed=7`;
  flat grass, no mechanics; `window.bench.scene`.
- In-game: city-sim menu "New random town/city", "New Peepsopolis".

## More

- [engine.md](engine.md) - engine facts the generator relies on (tiles, seam,
  facing, surfaces, one-way rules, water reach, jobs, save format, bench perf).
- [layouts.md](layouts.md) - what each size lays out and builds, zones,
  palettes, and how to add or tune a size.
