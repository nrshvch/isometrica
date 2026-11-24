# A world as big as you like, in isometrica

How isometrica's world - the ground, the trees, the roads and the buildings,
the traffic, the smoke - is to be kept and simulated when it is far bigger
than the screen: by one player today, two cities far apart, one huge city,
and later many players at once, each in a different part of it.

The mechanism is the engine's, and is in
[the engine's world](../../engine/docs/world.md): regions with stable
addresses, records and their views, observers and the rings round them,
tiers, the scheduler, effects worked out from their source and the time, one
clock, seeded chance, and saving, sending and deciding by region. This is
what isometrica puts into it. Steps 1 to 4 are built (The way there); the
rest is not yet.

## What there is now

**The camera decides what exists.** `tilesman` draws the chunks (24×24
tiles, 12 on a small screen) that come into the camera's view ring and lets
them go only once they have been beyond its near ring for a while - the
regions of a quadtree whose leaves are the chunks, worked out once a frame
(step 2; skill `rendering`, chunks.md). What is drawn is still all there is:
`chunkman` hands it on to `buildman` (building views made on a chunk coming
in, destroyed on it going, `client/buildman.js:299`, `:311`) and `envman`
(trees and stones), and a chunk let go of takes them with it.

**The cars are agents by region** (step 3; skill `traffic`, agents.md).
Each is a record kept by its chunk, stepped by one traffic system on the
core's roads (`client/coreroads.js`) - every frame in the view and near
rings, a few times a second within a budget in a coarse ring three to four
chunks further out, not at all beyond, where it sleeps and is brought up to
date as it wakes. Its game object is only its view, made in the view ring.
Panning away and back finds the same cars. How many there are still goes by
the city's roads in the chunks drawn, and new ones are put on there.

**The core keeps the whole world and ticks all of it.** `Logic`
(`core/logic.js`) has one world in memory: the terrain, every building and
road, the cities. A `setInterval` ticks all of it every second (`:119`),
watched or not; after time away `catchUp` (`:154`) plays the ticks missed,
a game day at most.

**The smoke is worked out, not kept** (step 4; skill `rendering`,
smoke.md): a puff is a function of its source, its seed and the time, its
drift the wind's integral; the chimneys round the view are found by region
with their reach, and every puff alive is a row of one draw list, drawn in
one batch after the buildings. Nothing of it ticks or is a game object.
Puffs let out once (a car, a fire, a blast, a bulldozer) are rows of where
and when; when they are let out is still their emitter's.

**Every ticker runs every frame**, far or near: the engine's `World.tick`
(`engine/engine/world.js:381`) goes through every game object with something
to tick (the cars are stepped by the traffic system, by region, since step
3, and chimneys and puffs tick no more since step 4). A few scripts tick
less often by keeping their own count of the time.

**What is already done right**, and is the pattern for the rest:

- The ground and the trees are a function of the noise (`core/terrain.js`
  `calcZ`, `core/ambient.js`), with only what was changed kept on top
  (`gridPoints`, `clearedTiles`, the trees taken away).
- Much is worked out from a time rather than ticked: a building going up
  (`core/construction.js:58`, `:221`), the grass growing back (`bareSince`,
  `bareFor`), ground being cleared, whether a chimney's fire is lit (a toss of
  the tile and the time, `client/smoke.js` burning), where the
  road crews stand (from the road's progress), the weather, the water, the
  lights blinking.

## How isometrica cuts up its world

**A quadtree over the ground.** The engine's implicit quadtree, over x and z
in world units; height is not cut, the ground being one layer with things
standing on it. A leaf is a chunk, 24 tiles across - `24 × tileSize` world
units, the root at the world's origin (`client/tilesman.js`) - so a few
leaves cover the screen. The server's share of the world, later, is a node a
few levels up: 16×16 leaves, 384 tiles across.

**Tiles are isometrica's.** A tile x, y is at `x × tileSize, height ×
tileZStep, y × tileSize` in the world (`client/terrain.js:762`), and its
region is the engine's `keyOf` that - never worked out from a tile's index.
The index, `(y << 16) ^ x`, stays what it is inside isometrica, with its edge
(below).

**The chunks the ground is drawn in** (24 tiles, `client/groundchunk.js`) are
the quadtree's leaves, so a region's ground is one chunk, drawn when the
region comes into the view ring. What is loaded, simulated and drawn follows
the regions and their tiers.

## What is what

The engine's three kinds, in isometrica:

- **State**: the ground and what was done to it (`gridPoints`,
  `clearedTiles`, `bareSince`), roads and buildings, what is going up and
  coming down. What is procedural - the heights from the noise, the trees and
  stones - is not kept at all but worked out for a region when it is wanted;
  only what was done to it is.
- **Agents**: the traffic first, then the bulldozers and the demolitions -
  today they go on out of sight with nothing to bound them, and the bulldozers
  are not saved.
- **Effects**: smoke from chimneys, from broken-down cars, the bulldozers'
  dust, a demolition's debris. A puff is a function of its source, its seed
  and the time, its drift the wind's (since step 4); a chimney is a source
  by region, its fire a toss of its tile and the time. A burning building's
  smoke is let out by the fire's view, so only in sight: its fire as a
  source with its reach is still to come.

## The cases

- **Another player builds a road a tile beyond what I see.** The road is its
  region's state, applied by that region's owner whether the region is being
  simulated or not. My near ring is wider than my screen, so I am subscribed
  to the region and the road is in my copy of it already; its view is made as
  the region comes into sight. Further off still, I subscribe as I come close,
  and the region I am sent has the road in it.
- **Smoke from a building burning out of sight.** "On fire since t" is the
  building's state. Its reach takes in my screen, so its region is kept
  coarse; the puffs are worked out from the fire, the time and the wind, and
  those that have drifted into sight are drawn where they have got to.
- **Cars coming my way.** Agents in the near and coarse regions, driving; one
  crossing into sight gets a view right where it is.
- **Panning a chunk away and back.** The regions left go down to near, coarse
  or keep-alive, not out of memory in seconds, and their records are kept:
  the same cars, where they had got to.
- **Two cities far apart, or one huge one.** Each is simulated as fully as
  somebody is looking at it; the rest sleeps and is brought up to date when
  wanted. The core's tick of the whole world every second becomes the tick of
  the regions awake.

## Going over the whole world, today

What goes over everything now, and what each becomes:

- Every building is subscribed to the core's tick on its own
  (`core/building.js:373`), and asks its city whether it is missing anything
  every tick (`city.missing`, `:391`, `:408`): the regions awake are ticked,
  and what a building adds is kept as a rate and summed up the tree.
- The road network is worked out again for the whole city whenever anything
  in it changed (`core/city/cityroads.js:518`): a graph a region, kept up as
  the region changes.
- The sound goes through every building in the world for every survey
  (`client/audio/soundman.js:542`): the regions in the near ring, through the
  index.
- The renderer culls every game object and `World.tick` ticks every ticker:
  bounded by what is in sight, once views exist only there.
- A city is saved whole: a region at a time, those changed.

## Workers

isometrica already paints its pictures on a worker (`client/generator.worker.js`,
on `OffscreenCanvas`) and makes its sounds on another (`client/audio/audio.worker.js`).
The first jobs to join them: the heights and the trees of the regions coming
into the near ring, from the noise; a waking region's traffic brought up to
date; saves put together. Then the whole simulation, as the engine's local
server.

## Typed arrays, in isometrica

The engine's rule - all state in typed arrays, iterated over as typed arrays
only, game objects views at most, the renderer handed typed draw lists - and
where isometrica stands with it:

- **Typed already**: the ground, a game object a chunk with its tiles in typed
  arrays, culled from numbers alone (`client/groundchunk.js:57`); the heights
  the noise gives, kept in two typed arrays (`core/terrain.js:125`,
  `noiseHeight` `:132`); the engine's slots and what it draws a frame; and
  the smoke, its chimneys a store by region and its puffs rows of one draw
  list (step 4) - though each still goes to the GPU through `Lighting`, a
  call a puff.
- **Still objects, a frame at a time**: every picture is a `CachedSprite`
  (`client/cachedsprite.js:27`), handed to `Lighting.collect`
  (`client/lighting.js:394`) and asked to write itself (`glQuad`,
  `client/cachedsprite.js:492`) - a call a picture, reading fields of several
  objects; every tree is a game object, and so is every car in
  view (only its view, since step 3: the traffic keeps a row a car - its
  region, when it was stepped - but its driver and its errand are objects
  still); a building is a game object with its pieces as game objects under
  it.
- **Still objects in the core**: buildings in dictionaries by id and by tile
  (`core/buildings.js:208`, `:209`), and the ground's edits too
  (`gridPoints`, `clearedTiles`, `bareSince`, `core/terrain.js:262`-`:267`).

What they become: pictures by number, the atlas a typed table; the ground
writing rows into a draw list instead of handing pictures over one by one;
trees and cars rows in draw lists and records in stores - the traffic as
structs of typed arrays, as the smoke is one draw list of particles already
(step 4); and in the core, every region's edits and
buildings as typed tables: heights by grid point, cleared ground as bits,
buildings as rows with a kind number.

## Measuring

Every step below is measured before and after, on the same world every run:
a fresh profile, `Math.random` seeded, looked at headless through Playwright
(`tools/world/`). The tools need a page running isometrica's client, served -
a game's build (the numbers here are city-sim's: `npm run build:city-sim`,
then `npx vite preview` in `city-sim`) - and know nothing of the game.

- `npm run world:fingerprint -- <url> <out.json>` - every quad the ground
  hands the GPU in a frame, the tile a pick finds at every 8th pixel, and the
  grid, from the side turned three ways and from above;
  `npm run world:compare -- <a.json> <b.json>` says IDENTICAL, or where the
  two first differ (and exits 1).
- `npm run world:bench -- <url> <out.json>` - a still frame's sections, the
  heap, a pass over the slots, a tile picked, the ground's own loop, chunks
  made and let go of on a pan, a quarter turn held and direct, what four turns
  allocate.
- `npm run world:streams -- <url>` - chunks made and let go of crossing a
  chunk's edge and back, on a quarter turn (direct and held) and on the view
  from above and back, counted until nothing more changes. Before step 2: 3
  and 3 on every crossing, 13 and 13 on a direct turn and on the view from
  above; now 3 and 0 the first time over the edge, nothing else.
- `npm run world:chunks -- <url>` - chunks kept straight through clearing and
  drawing again (exits 1 if not).
- `npm run world:traffic -- <url>` - on a city generated from a fixed seed
  (`--city=town|city|metropolis`; `none` for the town a new player starts
  on, which has few cars): the cars round where the camera starts, and how
  many of the same ones (by driver) are there after it has gone twelve
  chunks away and come back; and what the traffic's tickers take a frame,
  with the cars awake, stepped full and coarse, and seen, over the town, six
  chunks off, twelve, and sixty out in the country. It opens the game on
  that city through city-sim's own way of starting one (a session key), the
  only tool that knows a thing of the game.
- `npm run world:smoke -- <url>` - on a generated town (`--city=town` by
  default): the game objects and tickers there are for smoke, what it costs
  a frame (its tickers, or since step 4 its section), the chimneys in reach
  and the puffs alive and on the screen, over the town, twelve chunks off
  and sixty out in the country; and whether the same time gives the same
  puffs, asked twice and again after going twelve chunks away and back.

To compare two builds: build one, copy its `dist` aside, build the other,
and serve both - one with `npx vite preview --port 4173`, the copy beside it
with `--port 4174 --outDir <the copy>`. Then three runs of each, turn about,
and the middle of the three: a software GPU shares the processor, so one run
says little, and three alternating ones agree.

Playwright is not one of the repository's dependencies - its browsers are a
download of their own. Cloud sessions have it; elsewhere,
`npm install -g playwright` and `npx playwright install chromium`.

## The way there

Each step ships on its own, as a pull request of its own, measured before and
after (above), with the debug panel's `Stats` and the traffic test
(`npm run test:traffic`).

1. **The engine's parts, as libraries in `shared/`**, each with its tests and
   its benchmark ([the engine's world](../../engine/docs/world.md),
   libraries) - a pull request each:
   - 1a `shared/typed`: the store of records, the dense list, the heap, the
     ring, the bits, the map of numbers, the radix sort. Done when each is
     tested against the plain way (an array, `Map`, `Array.prototype.sort`)
     on seeded random cases and benchmarked beside it. _Done (skill `world` in `shared/`)._
   - 1b `shared/spatial`, the partitions: a grid and an implicit quadtree.
     Done when the contract tests hold (same position, same key; inside its
     bounds; `within` as looking at everything; parents and children) and
     keys are pinned. _Done._
   - 1c `shared/spatial`, the indexes: a hashed grid for what moves, a packed
     tree for what stays put. Done when their answers are those of looking at
     everything and of `flatbush`/`kdbush` (in development only), and the
     benchmark puts them side by side. _Done._
   - 1d `shared/random`: a toss that does not depend on order, from a region,
     a record and a step. Done when its numbers are pinned. _Done._
   - 1e `shared/interest` and `shared/schedule`: rings, tiers, letting go after
     a while; a budget a frame. Done when tested on made-up observers and
     regions, nothing of the game in them. _Done._
   - 1f `shared/draw`: draw lists and the table of pictures, and the ground
     drawn from them. Done when `world:compare` says IDENTICAL against the
     build before, and `world:bench`'s ground loop is no slower. _Done:
     IDENTICAL, the ground loop 0.0404 → 0.0394 ms (the middle of six runs
     each)._
2. **isometrica's quadtree and rings that hold**, in place of `tilesman`'s
   square: a ring more kept than drawn, let go of only after a while, worked
   out once a frame from where the camera ended up. Done when `world:streams`
   shows nothing made or let go of crossing an edge and back, nor on a
   quarter turn or the view from above, and `world:chunks` holds. _Done:
   only the 3 chunks ahead made the first time over (was 3/3 every way, 13/13
   on a turn and from above), `world:compare` IDENTICAL; skill `rendering`,
   chunks.md._
3. **The traffic, the first agents.** Drivers become records in regions,
   driven by the traffic system, not by their cars' game objects; the roads
   they drive on come from the core, not from what is drawn, as far as the
   coarse ring; a car's game object is only its view; coarse and dormant
   tiers, with `advance`. Done when panning away and back finds the same
   cars, the traffic test is the same to the byte in full, and what the
   traffic costs goes with the regions watched. _Done: 86 of 88 cars round
   the start found again twelve chunks away and back (was 0); the traffic
   3.8 ms a frame over the town (3.3 before), 0.7 six chunks off, 0.08
   twelve and sixty off with every car asleep (`world:traffic`, middles of
   three); `test:traffic` the same but its `[n ms]`; `world:compare`
   IDENTICAL; skill `traffic`, agents.md._
4. **Smoke worked out, not kept**, drawn as one buffer of particles
   (`docs/performance.md`, Later); sources brought in by their reach;
   chimneys no longer tick. _Done: over the town no game objects nor tickers
   for smoke (were 250 and 254), 0.27 ms a frame for all of it (its tickers
   0.48 before, its drawing besides), 0.01 away; the same puffs at the same
   time, asked again and after going twelve chunks away and back
   (`world:smoke`, middles of three); `world:compare` IDENTICAL; skill
   `rendering`, smoke.md._
5. **Bulldozers and demolitions as agents**, saved and brought up to date.
6. **One clock, seeded chance, names that last**: building timed by the
   game's clock, not `Date.now` (`core/construction.js:58`, `:60`); ids that
   are not counted from 0 every time the page opens
   (`core/construction.js:23`, `core/city.js:50`); the core with no browser in
   it; what the player does sent as commands; nothing in the core waiting on a
   browser to finish (`terrain.endClearing`, called by the bulldozers'
   animation, `client/clearworks.js:215`; `city.tileDown`, by a demolition's,
   `client/buildman.js:270`).
7. **The simulation on a worker**, as a local server: commands in, snapshots
   out. Before saving by region and the server, because it brings in the
   protocol they both use.
8. **Saving a region at a time**, and the cities' saves moved over.
9. **Regions on the server**: a Durable Object for each server share, as the
   saves have one each today; subscribing, regions and their changes, agents
   handed over, drawing a little behind.

**Left open, to settle when building**, not before: how long the fixed step
is (the traffic steps by the frame, as before); how long a region is kept
once left when there is something in it to keep (the ground's rings and hold
are tilesman's: chunks.md; the traffic's coarse ring reaches three to four
chunks beyond the view, and its cars are kept asleep for good).

**Once built**, how a part works is written in the skill of the package it is
in (`<package>/.claude/skills/`), as the repository does it, and this design
keeps only what is still to come.

## Found on the way

- Puffs were sorted in among the buildings by where they were; drawn as one
  batch after them they are hidden by the depth buffer instead, all of a
  puff as near as its middle and half its height more (`glview.js`
  billboard), so what is in front of it is told a pixel at a time.
- Smoke took numbers off `Math.random` every frame. With it gone, a world
  opened seeded (`tools/world/page.mjs`) goes on differently from before
  once it is running - the same town grows other buildings - so tools that
  run a while compare like with like only on the same build.
- A burning building's smoke is let out by its view (`client/fires.js`),
  the bulldozers' and demolitions' by theirs: none out of sight (steps 5 and
  after).

- A tile's neighbour worked out by adding to its index is wrong from y =
  32768 and at x = 65535 (`core/terrain.js:164`, `:684`, `core/buildings.js:67`
  and a few files more: `building.js`, `construction.js`, `ambient.js`,
  `city/cityroads.js`, `city/citybuildings.js`).
- A building's view is made when it is built even when its chunk is not
  loaded (`client/buildman.js:814`), and stays until that chunk has come in
  and gone again.
- Bulldozers and demolitions go on out of sight with nothing to bound them;
  the bulldozers are not saved.
- The traffic is saved whole every five seconds (`Carman#save`): every car
  of every region visited, asleep or not, so it grows with the world seen,
  until saving goes by region (step 8).
- A region woken has its cars where they were left: only what they were
  waiting out goes on (`CarAgent#advance`); their driving is not played
  over, and they did not drive while asleep.
- Headless, the game draws two frames a second, so every coarse region is
  due every frame: the coarse budget (1 ms) is what bounds them there. The
  regions round the camera cost the traffic about 0.08 ms a frame when no
  car is awake.
- The bus stops and the lorries' starts are still the loaded roads
  (`client/roadman.js` getStops, getRoadTiles), the same tiles as the
  chunks drawn.
- What carman found in the chunks drawn was kept two seconds whatever was
  drawn meanwhile: coming back to a town, its cars were counted against the
  roads of where the camera had been, and nearly all taken off
  (`reconcile`). Now found again whenever a chunk is drawn or let go of
  (`Tilesman#version`).
- A quarter turn and the view from above take the camera to the world's
  origin on the way (`client/components/camerascript.js:533`, `:345`): the chunks no longer follow it
  (worked out once a frame), but whatever else listens to the camera moving
  hears it there (`cityman` keepWhere).
