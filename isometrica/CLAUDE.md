# isometrica - the world

Terrain and climate, buildings and roads, cities, traffic, the WebGL
renderer and its lighting, sound and music, and the generators that paint
every picture. No game and no screens: a game starts it and hands it a `ui`
to talk to. Nothing here may know about a particular game. Games import it as
`isometrica/<path under src>`, e.g. `isometrica/core/terrain`.

## Where things are (`src/`)

`core/` - the world's state and rules, headless (node tools run it too):

- `city.js` + `city/` (buildings, roads, population, jobs, water, stats):
  a city and every change made to it - build, clear, explode, replace. Hub,
  read in ranges.
- A building's life: `building.js`, `buildings.js`, `construction.js`,
  `burning.js`, `replacement.js`, `buildingstate.js`.
- Ground: `terrain.js` (tile index, heights), `surface.js`, `climate.js`,
  `woods.js`, `ambient.js`. Also `rotation.js`, `roadrules.js`.
- `logic.js` (the tick, catching up), `vtime.js` (the clock),
  `persistence/` (saves: localStorage, server sync).

`client/` - the world on screen:

- Buildings: `buildman.js` (hub, 68 KB), `buildingview.js`,
  `compoundbuilding.js`, `siterenderer.js`, `worklights.js`, `yards.js`,
  `worth.js`, `serviceman.js`.
- Clearing and coming down: `clearworks.js` (bulldozers), `demolition.js`,
  `explosion.js`, `collapse.js`, `fires.js`, `rubble.js`, `ruin.js`,
  `burnt.js`, `felling.js`. Smoke: `components/smokeScript.js`,
  `components/smokesource.js`, `wind.js`.
- Roads: `roadman.js`, `road.js`, `roadview.js`, `roadworks.js`.
- Traffic: `traffic.js` (driving, 91 KB), `carman.js` (vehicles, 80 KB),
  `pathfinding/`.
- Drawing: `glview.js` (WebGL), `lighting.js` (sun, shadows, night),
  `weather.js`, `spritecache.js`, `cachedsprite.js`, `canvascache.js`,
  `generator.js` + `generatorcore.js` (the painting worker), `preloader.js`,
  `groundchunk.js`, `terrain.js`, `chunkman.js`, `tilesman.js`.
- Camera and input: `view.js`, `turner.js` (turning),
  `components/camerascript.js`, `cameracontrol.js`, `areaselector.js`,
  `glcanvas.js` (lines and words over the city).
- Sound: `audio/` (`soundman.js`, `music.js`, `maker.js`).

`shared/gen/` - the generators, run in the worker and in node tools:

- Painting out of boxes: `isobox.js` (the core), `blocks.js`,
  `stacking.js`, `compose.js`, `foundations.js`.
- Buildings: `houses.js`, `flats.js`, `offices.js`, `shops.js`, `civic.js`,
  `oldtown.js`, `parks.js`, `utilities.js`, `sites.js`, `brands.js`.
- The rest: `roads.js`, `terrain.js`, `trees.js`, `stones.js`,
  `vehicles.js`, `smoke.js`, `looks.js`.
- `catalog.js` - every painted picture and how to paint it; `pack.js`.
- Sound: `sounds.js`, `music.js`, `dsp.js`, `skyline.js`, `country.js`,
  `bells.js`, `blast.js`.

`data/` - what can stand in the world (`buildings.js`, `houses.js`,
`shops.js`, ...). `initialcity.js` is Peepstown's save (179 KB, denied).

`citygen/` - cities generated from a seed: skill `citygen`.

## lab/

React + Tailwind pages, one bench each: sprites, sounds, music, woods,
traffic, buildings, demolition, replace, explosion, fire, climate, cities,
lighting. Shared: `lab/ui` (`lab.css`, `kit.jsx`, `pages.js` lists the
pages), and `lab/bench/world.js` (the world a bench runs the game's own way).
A new page is an HTML file, its folder, and an entry in `lab/ui/pages.js`.

## Commands (here, or `-w isometrica` at the root)

- `npm run build` - the engine, then `dist/gfx` (`tools/packsprites.js`).
  Run it again after changing a generator while a dev server runs.
- `npm run dev` - the lab. `npm run build:lab` - into `lab/dist`.
- `npm run test:traffic`, `npm run test:cities` - headless tests.
- `npm run generate:*` - `tools/gen*.js`.

## Skills (`.claude/skills/`)

- `buildings` - buildings and roads going up and coming down (sites,
  clearing, roadworks, demolition, blasts, fire, ruins), and the city: area,
  road network, people, jobs, water, saves.
- `citygen` - city generation: `src/citygen`, the cities bench,
  `test:cities`.
- `generators` - how every picture is painted: the worker, manifests and
  sprite cache, buildings out of boxes, ground and climate, trees, stones,
  roads, vehicles, smoke; `src/data` catalogue rows.

## Docs

`README.md` is the overview plus per-area write-ups, 100 KB: grep it.
`docs/performance.md` - where a frame and a tick go, the debug panel.
