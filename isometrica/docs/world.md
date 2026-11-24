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
what isometrica puts into it. Steps 1 to 8 are built (The way there); the
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

**The bulldozers are agents too** (step 5; skill `buildings`, going-up.md):
records of the world's (`core/works.js`), each with the tiles it has still
to get to, stepped by region as the cars are - every frame near the camera,
a few times a second in the coarse ring, beyond it brought up to date once a
second - and in one go however long it has been. What one does, a tile
cleared or a tile of a building down, is done by its record, seen or not;
they are saved with the city and brought on by the time since. A
bulldozer's game object, and a demolition's, is only its view, in sight.

**The core keeps the whole world and ticks all of it**, on one clock, with
no browser in it (step 6; skill `buildings`, core.md). `Logic`
(`core/logic.js`) has one world in memory: the terrain, every building and
road, the cities. Its clock goes on only by `advance` - by real time in
fixed steps of 50 ms, or as fast as a node tool likes (`npm run test:core`)

- and the whole world ticks every second of it, watched or not; after time
  away `catchUp` plays the ticks missed, a game day at most. Building,
  clearing, research and the bulldozers go by that clock, chance by a toss of
  the world's seed, every building and bulldozer has a name that lasts, and
  what the player does goes in as a command (`core/commands.js`).

**The world is a local server** (step 7; skill `buildings`, server.md).
Only `core/server.js` moves the world on and does commands; what it did -
the steps, the commands as JSON, pauses, a digest after every tick - goes
out as frames (`shared/replica`), which a copy plays (`core/mirror.js`).
The client sends commands through a host (`client/host.js`) and reads the
copy, a world of the same shape as before. In the page (the default) the
copy is the server's own world; with city-sim's `?worker=on` the server runs
on a Web Worker (`core/serve.js`), the page's world a copy playing its frames
(a few hundred bytes to a kilobyte a second), the saves made there and
written here. The copy plays every step, so the main thread still does the
world's work; only the saving leaves it.

**A city is saved a region at a time** (step 8; skill `buildings`,
saves.md): a small header (the time, the seed, the last name, the city's
own totals) and a record a region of 24 tiles - its ground's edits, what
stands there, who lives in it, the bulldozers - packed with
`shared/replica`, written only when it changed (`shared/records`: whatever
changes it marks its region, `Logic#touch`). The cars are kept by the same
regions, only those whose cars drove. Opening reads all of it at once, as
the city's sums are of the whole city; the server is still sent the whole
save, put together from the regions.

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
3, chimneys and puffs tick no more since step 4, and the bulldozers are
stepped by region since step 5). A few scripts tick
less often by keeping their own count of the time.

**What is already done right**, and is the pattern for the rest:

- The ground and the trees are a function of the noise (`core/terrain.js`
  `calcZ`, `core/ambient.js`), with only what was changed kept on top
  (`gridPoints`, `clearedTiles`, the trees taken away).
- Much is worked out from a time rather than ticked: a building going up
  (`core/construction.js` start, getProgress, on the world's clock), the grass growing back (`bareSince`,
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
- **Agents**: the traffic (step 3), and the bulldozers bringing ground and
  buildings down (step 5) - records by region, saved, brought up to date.
  A demolition is no agent of its own: the building keeps how far down it
  is, the bulldozers bring it the rest of the way, its view only shows it.
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
- A city was saved whole every five seconds: now a region at a time,
  those changed (step 8) - but put together whole to go to the server, and
  opened whole.

## Workers

isometrica paints its pictures on a worker (`client/generator.worker.js`,
on `OffscreenCanvas`), makes its sounds on another (`client/audio/audio.worker.js`),
and can run the whole simulation on a third, as a local server
(`client/server.worker.js`, `?worker=on`; step 7): the world there, the
page's a copy playing its frames - commands in, frames out, the protocol
the saves by region and the server will use. What is still to come there:
a copy that takes state by region (typed tables, `Published` through shared
memory) instead of playing every step, so that the simulation's work leaves
the main thread; the bulldozers in sight stepped there with the camera's
rings; the heights and trees of regions coming into the near ring, from the
noise; a waking region's traffic brought up to date.

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
- `npm run world:works -- <url>` - on the town a new player starts on: a
  building of two to six tiles demolished and the trees of a patch by it
  cleared, the game's own way, three times - watched, for how long it takes;
  with the camera twelve chunks away for a minute, when it got done and the
  game objects and tickers the works kept from eight seconds on; and saved
  and opened again (a reload) six seconds in, whether it goes on where it
  was and gets done.
- `npm run world:worker -- <url>` - the world in the page against the
  world on a worker (`?worker=on`): the main thread's ms on the world a
  frame and a second (moving it on, or playing the worker's frames), the
  bytes a second the frames come to, how long a command takes from sent to
  seen in the page's copy (twenty, and a clearing), and after a while with
  the bulldozers out whether the copy is the worker's world - both saved,
  the same to the byte, no digest off (exits 1 if not).
- `npm run world:saves -- <url>` - on a generated town: what saving writes
  to localStorage (the city's saves and the traffic's), bytes and rows a
  save and a minute, with the camera still for a minute and panning twenty
  chunks away and back over another; how long a save holds up the main
  thread; reading the save back whole, and the ground drawn after a
  reload; and whether what storage holds is the world, to the byte, before
  and after a reload (exits 1 if not). `--dump=<file>` saves the town
  mid-demolition with its cars, `--migrate=<file>` opens that save (made
  by another build) five seconds on: the same city, buildings and names,
  the demolition going on and done, the cars, and over a reload again.
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
   _Done: with the camera twelve chunks away a demolition and the trees by
   it are done in 26 and 15 s as before (28.7 and 16), the works keeping no
   game object nor ticker from 8 s on (were 10 and 3); saved 6 s in and
   opened again, the bulldozers go on and are done in 15 and 20 s (before,
   the building stood half down for good) (`world:works`); idle, the works
   take 0.008 ms a frame; `world:compare` IDENTICAL; a still frame 8.64 →
   8.43 ms, update 0.63 → 0.50, 1548 game objects and 33.5 MB both
   (`world:bench`, middles of three); skill `buildings`, going-up.md._
6. **One clock, seeded chance, names that last**: building timed by the
   game's clock, not `Date.now` (`core/construction.js:58`, `:60`); ids that
   are not counted from 0 every time the page opens
   (`core/construction.js:23`, `core/city.js:50`); the core with no browser in
   it; what the player does sent as commands; nothing in the core waiting on a
   browser - the bulldozers' clock moved on by the client's frames
   (`client/clearworks.js`, `core/works.js` tick) among them. _Done: a town
   played 36 game hours in node with a clearing, a demolition, a building
   and a replace sent as commands comes out the same save twice, to the
   byte, and opened again two minutes on catches up 120 ticks with all 217
   names kept (`npm run test:core`); a save of the build before opens,
   catches up and keeps its new names over a reload; `world:compare`
   IDENTICAL, `test:cities` and `test:traffic` the same; a still frame 8.00
   → 7.96 ms, update 0.48 → 0.50 (`world:bench`, middles of three); skill
   `buildings`, core.md. Headless the world now goes at 0.4 of real time
   (Found on the way), so fewer of the cars round the start are there after
   twelve chunks away (71-77 of 88-96, was 75-90 of 80-96; 84 of 88 with the
   clock moved by real time)._
7. **The simulation on a worker**, as a local server: commands in, snapshots
   out. Before saving by region and the server, because it brings in the
   protocol they both use. _Done, the worker behind a flag (`?worker=on`):
   the client sends commands and reads a copy through a host, in the page by
   default; on a worker the copy is the worker's world after 40 s with the
   bulldozers out, to the byte, at 1.1 KB a second (230 B in the page), a
   command seen a page's frame later (478 ms headless), the main thread
   0.49 ms a second on the world against 0.54 in the page (`world:worker`);
   `test:core` the same over the protocol in a thread and on a worker
   thread; the clock by real time in steps of 50 ms, so 92 of 96 cars round
   the start found again (71 of 88 before); `world:compare` IDENTICAL; a
   still frame 7.80 → 8.11 ms, update 0.51 → 0.62, the world ticking 2.5
   times as often headless (`world:bench`, middles of three); a save of the
   build before opens and plays in either; skill `buildings`, server.md. Not
   on by default: the copy plays every step, so the work stays on the main
   thread, and on a worker the bulldozers in sight go a second at a time._
8. **Saving a region at a time**, and the cities' saves moved over.
   _Done: a header and a record a region of 24 tiles (`shared/replica`,
   `shared/records`), only the regions changed written, the cars kept by
   the same regions; a town's save 32 KB every 5 s → 0.5 KB with nothing
   changed, all saving 474 → 56 KB a minute with the camera still and
   491 → 35 panning twenty chunks and back, the cars 24.6 → 12.7 KB a save
   still and 26.6 → 5.7 panning, the city's save 0.8 → 0.3 ms on the main
   thread (the cars' 0.5 → 1.1), read back whole 0.1 → 0.5 ms, what
   storage holds the world to the byte (`world:saves`); in node 36 game
   hours write 253 KB where whole saves were 2261, opened again from its
   regions the same and saved again writing only the header
   (`test:core`); a save of the build before opens moved over by region,
   148 of 148 names, the demolition going on and done in 14 s, 11 of 11
   cars, as before; the server still sent the whole save, put together;
   `world:compare` IDENTICAL, a still frame 8.35 → 8.20 ms, update 0.75
   → 0.81 (`world:bench`, middles of three); skill `buildings`, saves.md.
   Opened whole, not lazily: the city's sums are of all of it._
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
  a demolition's by its own: none out of sight. The bulldozers' dust is let
  out in view only, by design.

- A tile's neighbour worked out by adding to its index is wrong from y =
  32768 and at x = 65535 (`core/terrain.js:164`, `:684`, `core/buildings.js:67`
  and a few files more: `building.js`, `construction.js`, `ambient.js`,
  `city/cityroads.js`, `city/citybuildings.js`).
- A building's view is made when it is built even when its chunk is not
  loaded (`client/buildman.js:814`), and stays until that chunk has come in
  and gone again.
- Before step 5 a demolition opened again stood half down for good, the
  bulldozers gone with the page, till it was demolished again; and out of
  sight a tile of it came down in no time, with no view to say how long its
  fall took (now `KNOCK_MS`, 2.4 s, in sight the fall's own). A
  demolition's view was never let go of once made; now it goes with its
  chunk.
- A building site waiting for its ground is not kept waiting over a reload
  (`Construction#clearing` is not saved), so the bulldozers brought back
  let its tiles go at once.
- `world:fingerprint`'s second side (a quarter turn from the start) is not
  steady: run to run, on the same build, its quads come out one of three
  ways (1402, 1406 or 1409, the shore drawn from tiles a little apart), so
  a compare is IDENTICAL only against a run that came out the same way.
  The other three views always are.
- Bulldozers brought up to date in one go each do all they did in that
  stretch before the next does any: what two of them did within the same
  stretch is done in the order of their rows, not of when.
- The traffic was saved whole every five seconds (`Carman#save`): every
  car of every region visited, asleep or not, so it grew with the world
  seen. Since step 8 only the regions whose cars drove are written.
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
- Before step 6 a building went up on the real clock (`setTimeout`,
  `Date.now`) while the world's ticks went by a timer of their own and the
  bulldozers by the frames: hidden, the buildings went on going up, the
  bulldozers stood still and the ticks were made up for after. Step 6 put
  all of it on one clock, moved by the frames - so under 5 frames a second
  (the engine's 200 ms cap; headless, 2 a second) the world went slower
  than real time. Since step 7 the clock goes by real time in fixed steps,
  however few frames there are.
- The client wrote to the world outside commands: a block's look picked as
  it was first drawn (`compoundbuilding`) and the bus stops (`carman`) on
  the building itself, a site's bulldozers sent by `buildman` on hearing it
  was built (so in node nobody sent them), a fire's view burning its
  building down, `clearworks` stepping the bulldozers near the camera, and
  a demolition's view saying how long a tile takes to fall. A copy of the
  world on a worker would come out different: now the first two are a
  command (`look`), the sweep is the core's, and a copy (`Logic#follows`)
  takes none of the rest - its bulldozers go a second at a time, as the
  worker's frames have them.
- Opening a save asked the real clock twice (the bulldozers brought on,
  then the ticks caught up), a few ms apart; now once (`CityPersistence`
  `opened.now`), so a copy opened from the same save at the same time is the
  same world.
- On a worker, a command is seen in the page's copy a frame of the page
  later: headless, where the page draws two frames a second, about 460 ms;
  the worker answers within a millisecond, the page is busy drawing.
- The client asked for the city as `getCity(0)`: right only because the
  first city a page made was numbered 0, counted per page. A city keeps its
  number in the save now, counted per world (`CityService#nameCity`).
- `namespace` hung everything on `window`, and `data/buildings` took its
  layers from `client/renderlayer`: the core could not load in node without
  a `window` made for it, nor without the client. Now `globalThis`, and the
  layers are `data/renderlayer`.
- `City#timeEstablished` is `world.time.milliseconds`, which is no field of
  VTime: every city's founding time is saved as nothing.
- A city's names and seed are kept with its save, in its header, not by
  region: two players' cities would count from the same 0 (step 9).
- `shared/replica`'s Writer padded a record with whatever an earlier frame
  had left in its buffer: the same records were not the same bytes, so a
  region made again always looked changed. It pads with zeros now.
- `Terrain#save` and the people by house went in the order of a JS object's
  keys: ascending for tiles below y 32768, the order they came in beyond
  (their index is negative there), so a save put together from regions
  could not be told to be the same. Both are sorted by the tile, as
  unsigned, now - as before for every tile but those.
- Every five seconds the city wrote its whole save, 32 KB for a town, with
  nothing in it changed; now a header of 500 bytes and the regions
  changed.
- A quarter turn and the view from above take the camera to the world's
  origin on the way (`client/components/camerascript.js:533`, `:345`): the chunks no longer follow it
  (worked out once a frame), but whatever else listens to the camera moving
  hears it there (`cityman` keepWhere).
