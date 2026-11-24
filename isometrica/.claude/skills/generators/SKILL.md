---
name: generators
description: How isometrica paints every picture itself - shared/gen generators, the painting worker, build-time manifests, sprite cache and canvas pages, painting ahead; buildings out of boxes (isobox, blocks), houses, shops, flats, civic, old town, parks; ground, climate zones, woods, trees, stones, roads, vehicles, smoke. Load before changing shared/gen, data/, the sprite cache or tools/gen*.
---

# Generators

Nothing is drawn by hand. Every picture - ground, roads, buildings, cars,
trees, stones, smoke - is painted by a generator in `src/shared/gen`, one
picture at a time, the first time something draws it, in a web worker.
Painting takes milliseconds, so nothing painted is kept between visits.

## Pipeline

- Build time: `tools/packsprites.js` (isometrica's `npm run build`, run
  before every game's dev and build) asks each generator's `describe()`
  (`shared/gen/catalog.js`) what it will paint - every picture's name and
  size, and what else painting works out (a car's pivot, where its smoke
  comes out, which slopes have a shore) - without painting, and writes
  `dist/gfx/generated/<generator>.json` plus `manifest.json` with every
  file's hash (asked for as `?v=<hash>`). Not committed; stale files are
  removed. `vite.mjs` serves `dist/gfx` at `/gfx` and copies it into a
  game's build. Run the build again after changing a generator.
- Run time: `client/generator.js` hands requests to the worker
  (`generator.worker.js` → `generatorcore.js`, `createPainter()`), which
  loads a generator's hand-drawn inputs the first time it paints anything.
- `client/spritecache.js`, `cachedsprite.js`, `canvascache.js`: a sprite is
  copied onto a few big canvas pages the first time it is drawn; what has
  gone undrawn longest makes room. Several pictures in one (a shore tile) are
  put together there once (`getComposite([...])`); what changes every frame
  (a police lamp) is drawn over as a sprite of its own.
  `client/generated.js` says what a tile is drawn with: its tileset (the
  climate zone's ground, "earth", "earth_regrowing", "water_shallow",
  "water_deep", "ice"), its slope and variant, what spills over its edges,
  its shore.
- `client/preloader.js` paints ahead what the other sides of the world
  would show (the two next to the camera's, then the far one) and the cars'
  other headings, a frame's spare time at a time (SURVEY_EVERY, SURVEY_MS),
  kept apart from what is drawn (`Generator#ahead`, up to STASH) and never
  displacing it. Not while looking from above or turning. Surveyed again
  only when the camera, the light or a look changes (`client/looks.js`), or
  after REST. Which side a picture is for is in its name (`r0`-`r3`, turned
  corner and road codes, a car's heading).
- Painted unlit: a picture comes with its colours, which way each pixel faces
  and how high it stands ("deferred"), and what shines at night ("night")
  (`shared/gen/looks.js` DEFERRED, NIGHT; `isobox` setMode). The renderer
  lights it (rendering skill).

## Where

- Boxes: `isobox.js` (the core), `blocks.js`, `stacking.js`, `compose.js`,
  `foundations.js`, `sites.js` - see [boxes.md](boxes.md).
- Buildings: `houses.js`, `shops.js`, `flats.js`, `offices.js`, `civic.js`,
  `oldtown.js`, `parks.js`, `utilities.js`, `brands.js`, with their
  catalogue rows in `src/data/` - see [buildings.md](buildings.md).
- Ground: `terrain.js`, `trees.js`, `stones.js`, `names.js`; where things
  grow and lie in `core/climate.js`, `core/woods.js`, `core/ambient.js`,
  `data/trees.js`, `data/rocks.js` - see [ground.md](ground.md).
- `roads.js`, `vehicles.js`, `smoke.js` - see
  [roads-vehicles-smoke.md](roads-vehicles-smoke.md).
- Sound generators (`sounds.js`, `music.js`, `dsp.js`...) are the sound
  skill's.

## Must hold

- Same seed, same picture. Everything a picture depends on is in its name.
- Keep to the pixels: boxes snapped to whole units (`isobox` snap), what is
  thinner than half a unit laid flat, poles a unit thick, roofs pitched half
  a unit up for one across.
- Units: a tile is 32 along the ground (about 10 m); heights in pixels, 12 a
  storey, 8 a step of the ground; a car 13 by 6, a road 20 across, a lane 10.
- `describe()` lists every picture with its size without painting it.
- Codes stay stable: a new rock goes on the end; a block's code comes from
  its layout and storeys; what is no longer offered stays, hidden, marked
  `deprecated` (and `replacedBy`), till saves are rid of it.
- Nothing has letters on it - at a pixel or two they read as noise.

## Testing

- Lab (`npm run dev -w isometrica`): `/sprites.html` (every picture, lit or
  at night; terrain the game lacks marked "not in the game"),
  `/buildings.html`, `/woods.html`, `/climate.html`.
- Previews to look at (not committed, `isometrica/assets/`):
  - `npm run generate:buildings` - `tools/genbuildings.js [outDir] [sheet...]`
    (sheets: buildings, sites, shops, houses, utilities, parks, civic,
    oldtown).
  - `npm run generate:terrain` - `tools/genterrain.js [outDir] [--preview]`
    (also `--seed s`, `--variants n`, `--diffuse-variants n`), then
    `tools/genterrain-preview.js`.
  - `npm run generate:vehicles`, `npm run generate:stones` (stones and smoke).
- `npm run map:climate` - `tools/climatemap.mjs` (`--png file`,
  `--temperature t`, `--at x,y`, `--size n`, `--px n`): the zones as a
  picture, and each zone's share of the land.
