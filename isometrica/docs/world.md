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
what isometrica puts into it. None of it is built yet.

## What there is now

**The camera decides what exists.** `tilesman` keeps a square of chunks
(24×24 tiles, 12 on a small screen) around the chunk the camera is in, a ring
or more of them (`chunkRadius`, `client/tilesman.js:59`). Whatever falls out
of the square is let go of at once: `cleanChunks` (`:246`) drops it, and is
called after every chunk that comes in (`:191`). There is no margin and no
delay, so the camera crossing a chunk's edge by one tile lets a whole row of
chunks go, and crossing back makes it again from nothing. `chunkman` hands
that on to `buildman` (building views made on a chunk coming in, destroyed
on it going, `client/buildman.js:300`, `:312`) and `envman` (trees and
stones).

**The cars go with the chunks.** A car is taken off the roads the first
frame the road under it, or the next one on its way, is in a chunk let go of
(`client/carman.js:909`, `unloaded` `:962`), and nothing of it is kept.
Cars are put on every half a second (`reconcile`, `:1840`), as many as the
roads _loaded_ call for, wherever they like. So panning one chunk away and
back loses every car there and puts others on in their place. The traffic
itself (`client/traffic.js`, `Traffic` `:2691`, `Driver` `:950`) is plain
data and runs with no game objects at all in the traffic test
(`lab/trafficbed`, `tools/traffictest.mjs`); in the game, though, a driver
only drives while its car's game object ticks it. The roads it finds its way
on are the loaded ones only (`client/roadman.js`), though the core knows
every road (`core/city/cityroads.js`).

**The core keeps the whole world and ticks all of it.** `Logic`
(`core/logic.js`) has one world in memory: the terrain, every building and
road, the cities. A `setInterval` ticks all of it every second (`:119`),
watched or not; after time away `catchUp` (`:154`) plays the ticks missed,
a game day at most.

**Every ticker runs every frame**, far or near: the engine's `World.tick`
(`engine/engine/world.js:424`) goes through every game object with something
to tick. Cars, chimneys and smoke puffs are most of them. A few scripts tick
less often by keeping their own count of the time.

**What is already done right**, and is the pattern for the rest:

- The ground and the trees are a function of the noise (`core/terrain.js`
  `calcZ`, `core/ambient.js`), with only what was changed kept on top
  (`gridPoints`, `clearedTiles`, the trees taken away).
- Much is worked out from a time rather than ticked: a building going up
  (`core/construction.js:58`, `:221`), the grass growing back (`bareSince`,
  `bareFor`), ground being cleared, whether a chimney's fire is lit (a toss of
  the tile and the time, `client/components/smokesource.js:89`), where the
  road crews stand (from the road's progress), the weather, the water, the
  lights blinking.

## How isometrica cuts up its world

**A quadtree over the ground.** The engine's implicit quadtree, over x and z
in world units; height is not cut, the ground being one layer with things
standing on it. A leaf is 64 tiles across - `64 × tileSize` world units - so
a few leaves cover the screen. The server's share of the world, later, is a
node three levels up: 8×8 leaves, 512 tiles across.

**Tiles are isometrica's.** A tile x, y is at `x × tileSize, height ×
tileZStep, y × tileSize` in the world (`client/terrain.js:762`), and its
region is the engine's `keyOf` that - never worked out from a tile's index.
The index, `(y << 16) ^ x`, stays what it is inside isometrica, with its edge
(below).

**The chunks the ground is drawn in** (24 tiles, `client/groundchunk.js`) stay
a way of drawing and nothing more. What is loaded, simulated and drawn
follows the regions and their tiers; the ground of a region is drawn when the
region comes into the view ring.

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
  dust, a demolition's debris. A chimney's fire is already a toss of its tile
  and the time; a puff becomes a function of its chimney, its seed and the
  time, its drift the wind's.

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
  (`core/building.js:374`), and asks its city whether it is missing anything
  every tick (`city.missing`, `:392`, `:409`): the regions awake are ticked,
  and what a building adds is kept as a rate and summed up the tree.
- The road network is worked out again for the whole city whenever anything
  in it changed (`core/city/cityroads.js:566`): a graph a region, kept up as
  the region changes.
- The sound goes through every building in the world for every survey
  (`client/audio/soundman.js:579`): the regions in the near ring, through the
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
  arrays, culled from numbers alone (`client/groundchunk.js:74`); the heights
  the noise gives, kept in two typed arrays (`core/terrain.js:125`,
  `noiseHeight` `:132`); and the engine's slots and what it draws a frame.
- **Still objects, a frame at a time**: every picture is a `CachedSprite`
  (`client/cachedsprite.js:27`), handed to `Lighting.collect`
  (`client/lighting.js:425`) and asked to write itself (`glQuad`,
  `client/cachedsprite.js:492`) - a call a picture, reading fields of several
  objects; every tree, car and puff is a game object, and a car's driver
  another object besides; a building is a game object with its pieces as game
  objects under it.
- **Still objects in the core**: buildings in dictionaries by id and by tile
  (`core/buildings.js:210`, `:211`), and the ground's edits too
  (`gridPoints`, `clearedTiles`, `bareSince`, `core/terrain.js:262`-`:267`).

What they become: pictures by number, the atlas a typed table; the ground
writing rows into a draw list instead of handing pictures over one by one;
trees, cars and puffs rows in draw lists and records in stores - the traffic
as structs of typed arrays, the smoke as one buffer of particles
(`docs/performance.md`, Later); and in the core, every region's edits and
buildings as typed tables: heights by grid point, cleared ground as bits,
buildings as rows with a kind number.

## The way there

Each step ships on its own, and is measured before and after: the debug
panel's `Stats`, the traffic test (`npm run test:traffic`), and counting what
is made and let go of, as in `docs/performance.md`.

1. **The engine**: partitions (grid, implicit quadtree), stores, the registry
   of systems, the scheduler, with `Stats` for each system; draw lists and the
   table of pictures by number, the ground drawn from them first. Nothing
   looks or plays different: what the ground hands the GPU is compared quad
   for quad, as when it became chunks.
2. **isometrica's quadtree and rings that hold**, in place of `tilesman`'s
   square: a ring more kept than drawn, let go of only after a while, worked
   out once a frame from where the camera ended up. Done when going to and
   fro over an edge makes and lets go of nothing, and a quarter turn or the
   view from above makes nothing again (13 chunks now).
3. **The traffic, the first agents.** Drivers become records in regions,
   driven by the traffic system, not by their cars' game objects; the roads
   they drive on come from the core, not from what is drawn, as far as the
   coarse ring; a car's game object is only its view; coarse and dormant
   tiers, with `advance`. Done when panning away and back finds the same
   cars, the traffic test is the same to the byte in full, and what the
   traffic costs goes with the regions watched.
4. **Smoke worked out, not kept**, drawn as one buffer of particles
   (`docs/performance.md`, Later); sources brought in by their reach;
   chimneys no longer tick.
5. **Bulldozers and demolitions as agents**, saved and brought up to date.
6. **One clock, seeded chance, names that last**: building timed by the
   game's clock, not `Date.now` (`core/construction.js:58`, `:60`); ids that
   are not counted from 0 every time the page opens
   (`core/construction.js:23`, `core/city.js:50`); the core with no browser in
   it; what the player does sent as commands; nothing in the core waiting on a
   browser to finish (`terrain.endClearing`, called by the bulldozers'
   animation, `client/clearworks.js:250`; `city.tileDown`, by a demolition's,
   `client/buildman.js:271`).
7. **The simulation on a worker**, as a local server: commands in, snapshots
   out. Before saving by region and the server, because it brings in the
   protocol they both use.
8. **Saving a region at a time**, and the cities' saves moved over.
9. **Regions on the server**: a Durable Object for each server share, as the
   saves have one each today; subscribing, regions and their changes, agents
   handed over, drawing a little behind.

## Found on the way

- A tile's neighbour worked out by adding to its index is wrong from y =
  32768 and at x = 65535 (`core/terrain.js:164`, `:683`, `core/buildings.js:68`
  and a few files more: `building.js`, `construction.js`, `ambient.js`,
  `city/cityroads.js`, `city/citybuildings.js`).
- A building's view is made when it is built even when its chunk is not
  loaded (`client/buildman.js:815`), and stays until that chunk has come in
  and gone again.
- Bulldozers and demolitions go on out of sight with nothing to bound them;
  the bulldozers are not saved.
- A quarter turn and the view from above take the camera to the world's
  origin on the way (`client/components/camerascript.js:533`, `:345`), and
  every chunk round it is made again.
- `tilesman` keeps its chunks in arrays by chunk number, emptied but never
  shortened, and goes through every number up to the furthest it has ever
  loaded each time it lets any go (`client/tilesman.js:246`): it costs more
  the further the camera has been.
