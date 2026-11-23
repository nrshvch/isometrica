# A world as big as you like

How a world far bigger than the screen, full of things that move, is to be
kept and simulated: by one player today, two cities far apart, one huge city,
and later many players at once, each in a different part of it. Only what
somebody is watching is worked out in full; what is far away costs little;
nothing is ever lost, and what is just out of sight is there the moment it
comes into it.

None of this is built yet. It is the design, and the order to build it in.
Nothing in it is about one kind of thing: cars, smoke, bulldozers and
whatever comes next all go through the same few parts, in the engine and in
isometrica. The game (city-sim) only adds its own kinds.

## What there is now

**The camera decides what exists.** `tilesman` keeps a square of chunks
(24×24 tiles, 12 on a small screen) around the chunk the camera is in, a ring
or more of them (`chunkRadius`, `client/tilesman.js:59`). Whatever falls out
of the square is let go of at once: `cleanChunks` (`:246`) drops it, and is
called after every chunk that comes in (`:191`). There is no margin and no
delay, so the camera crossing a chunk's edge by one tile lets a whole row of
chunks go, and crossing back makes it again from nothing. `chunkman` hands
that on to `buildman` (building views made on a chunk coming in, destroyed
on it going, `client/buildman.js:269`, `:281`) and `envman` (trees and
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
  (`core/construction.js:53`, `:157`), the grass growing back (`bareSince`,
  `bareFor`), ground being cleared, whether a chimney's fire is lit (a toss of
  the tile and the time, `client/components/smokesource.js:89`), where the
  road crews stand (from the road's progress), the weather, the water, the
  lights blinking.

## The idea

Keep **what exists** apart from **what is drawn**, and decide for every part
of the world **how often it is worked out**, by who is looking at it and how
close.

The parts, each one common in games with big or shared worlds:

- the world cut into **cells** - one grid for loading, simulating, saving,
  sending and owning;
- **records** for everything that exists, and **views** (game objects) only
  for what is in sight;
- **observers** and the **rings** round them, deciding each cell's **tier**:
  how fully it is simulated, from every frame to not at all;
- what is not simulated **brought up to date when it is next wanted**, from
  the time it was left at;
- **effects worked out from their source and the time** - not kept at all;
- one **clock** and **seeded** chance, so that the same world comes out the
  same everywhere;
- later, **regions** of cells on a server, each the one place its cells are
  decided.

## Cells

The world is cut into cells of 64×64 tiles. A cell is the unit of everything
below: what is loaded, what is simulated and how often, what is saved, what
is sent to a player, and, with many players, which server decides it.

- A cell is found from a tile's x and y: `x >> 6`, `y >> 6`. Never by adding
  to a tile's index: `(y << 16) ^ x` goes negative from y = 32768, and x =
  65535 plus one runs over into y (`core/terrain.js:164`, `:671`), so the
  neighbour of a tile can come out as another tile's key.
- Every cell keeps, in typed arrays across all the cells: its version
  (counted up on every change), its tier, the time it is simulated up to
  (`simulatedUntil`), whether it has changed since it was saved, and, for
  each system, the records in it.
- The chunks the ground is drawn in (24 tiles) stay as they are: a way of
  drawing, nothing more.

## Records, views and systems

Everything that exists is a **record**, in the store of the **system** it
belongs to: a car in the traffic's, a bulldozer in the clearing's. A store is
typed arrays, a field each (position, cell, kind, when it set off, seed...),
and a record is known by a handle: its slot and a count of how often the slot
has been used, so that a handle to something gone is told apart from the
thing in its slot now.

A **view** is the game object a record is drawn with. Views exist only for
records in the cells in sight, come from a pool, and keep nothing that is not
the record's: let go of, nothing is lost; made again, it is drawn where its
record is. A record moving from one cell to another is moved from the one
cell's list to the other's - and later, from one server's region to the
next.

A system takes part by giving the engine a few functions, the same for every
kind of thing:

- `step(cell, dt, tier)` - its records in the cell, a step on, as fully as
  the tier says;
- `advance(cell, from, to)` - the cell brought up to date after being left;
- `save(cell)`, `load(cell, data)`;
- `reach(record)` - the cells what the record does can be seen in (below);
- `spawnView`, `updateView`, `releaseView`.

The cells, the stores' bookkeeping, the rings, the scheduler and the pools of
views are the engine's; the systems (the traffic, the smoke, the clearing)
are isometrica's; a game adds kinds of its own.

## Three kinds of things

Every kind of thing is one of three, and that decides how it is kept:

- **State**: roads, buildings, the ground and what was done to it, what is
  being built. It changes because somebody did something (a command), never a
  frame at a time, and anything gradual about it is worked out from a time.
  It is never lost, whoever is or is not looking.
- **Agents**: cars, bulldozers, people one day. They have a will of their
  own and go places; they are records, simulated as fully as their cell's
  tier says.
- **Effects**: smoke, dust, sparks, rubble flying. They change nothing, so
  they are not kept at all: each is worked out from its source, its seed and
  the time, `puff(source, seed, t, wind(t))`. Anybody looking regenerates
  exactly the puffs that are in sight, half way through their drift if they
  are; nothing is spent on those nobody sees; and every player sees the same
  ones without a single puff being sent. The chimneys' fires, the weather and
  the water already work this way.

## Observers and rings

An **observer** is whatever looks at the world: the camera, today; every
player's camera, later, on the server. Around what an observer sees, rings of
cells, measured from the edges of the screen rather than its middle:

- **view** - drawn: views made; simulated in full;
- **near** - a cell or so out: simulated in full, not drawn, its pictures got
  ready (`client/preloader.js`); what comes into sight is already moving as it
  should;
- **coarse** - further: simulated cheaply, a few times a second at most;
- **keep-alive** - further still, or left a little while ago: not simulated,
  but kept in memory, for when the camera comes back;
- **unloaded** - the rest: saved, and what is procedural made again when
  wanted.

A cell's tier is the highest any observer gives it. It goes **up** at once,
and **down** only after a while (a few seconds), and a ring is entered at one
distance and left only a cell further out: so going to and fro over a line
loads and lets go of nothing.

The rings are worked out once a frame, from where the camera ended up - never
from where it was half way through moving. (Today a quarter turn of the
camera, and going over to the view from above and back, puts the camera at
the world's origin for a moment, `client/components/camerascript.js` `turn`
`:533`, `setTop` `:345`: `tilesman` loads the ground there and lets every
chunk round the camera go, then makes them all again - 13 chunks in and 13
out, and their trees.)

**Reach.** A record's effects can be seen further off than where it is: a
fire's smoke drifts downwind as far as the wind takes a puff in its lifetime;
a car will be where its way ahead takes it; a bulldozer works the tiles it was
given. A system says how far (`reach`), and a cell holding a record whose
reach takes in a cell of a higher tier is raised to coarse at least. So the
fire three cells upwind of the screen is simulated enough for its smoke to be
there when it drifts in.

## Tiers and the scheduler

- **Full**: a fixed step, the same length every time, and what is drawn
  in between them worked out from the two (interpolated): the same results
  whatever the frame rate.
- **Coarse**: the same records, simpler rules, a few times a second, the
  cells taken in turn. A car keeps to its way at the speed of the road,
  without the queues and the junctions; a bulldozer gets on with its tiles.
- **Dormant**: not stepped at all; the cell remembers when it was left. When
  its tier goes up again - in the near ring, before it can be seen - the
  systems' `advance` brings it up to date: where it can be, in one go (a
  building's progress from when it started, the grass from when it was
  cleared, a car's place along its way from when it set off and how fast it
  goes); where it cannot, a few coarse steps over the time missed, no more
  than so many.

The **scheduler** spends no more than so much of every frame on the
simulation: the full cells first, then the coarse ones nearest first, each
cell's turn spread out so that they do not all come at once. What it takes is
counted in `Stats` by system and by tier, for the debug panel.

Game objects tick for how they look, and nothing else: a puff's sprite, a
light blinking. What happens in the world happens in the systems.

## Time, chance and names

- **One clock** for the simulation, going a fixed step at a time, and the
  frame's time only for what things look like. There are four now:
  `Date.now` (building, clearing), `performance.now` (pictures that move),
  the engine's time (capped, stopped when the page is hidden) and the core's
  (`core/vtime.js`). A building going up, say, is timed by `Date.now` and a
  `setTimeout` (`core/construction.js:53`, `:55`) where it should be timed by
  the game's clock.
- **Seeded chance**: wherever the simulation tosses a coin, the toss comes
  from the cell, the record and the step (a hash, as the chimneys' fires
  already do), not from `Math.random`. Then the same world comes out the same
  on every machine and every time it is worked out again - on the server and
  in the browser, after a catch-up as without one - and the traffic test
  stays the same to the byte.
- **Names that last**: a building's and a city's ids are counted from 0 every
  time the page opens (`core/construction.js:18`, `core/city.js:50`). A
  record needs an id that is the same tomorrow and on another machine: its
  cell and a count kept in the cell, say.

## Saving

Saved a cell at a time, and only the cells that changed, each with its
version: the procedural world is not saved at all, only what was done to it
(as now), and the agents with the time they were simulated up to. A city
saved whole (`core/persistence/*`, `city-sim/worker/saves.js`) grows with the
city, is sent whole every time, and two changes anywhere in it are a
conflict; cells are none of these. A city becomes a list of what is its own,
across cells - not the thing that is saved.

## Many players

What `city-sim/docs/multiplayer.md` asks for - one world, ticked on a server
whether anybody is watching, players sending what they do - in the terms
above:

- **Regions** of cells (8×8 cells, 512 tiles across), each kept by one
  server actor - a Durable Object, as the saves are now - running the same
  core. For that the core must not need a browser (`window`, `document` in
  its saving today), everything a player does must come to it as a command,
  not as a call into it, and nothing in it may wait on a browser to finish
  something: `terrain.endClearing` is called by the bulldozers' animation
  (`client/clearworks.js:228`) and `city.tileDown` by a demolition's
  (`client/buildman.js:240`).
- **Tiers on the server**: the rings of every player subscribed. What nobody
  is near sleeps, costing nothing, and is brought up to date when somebody
  comes. What a world costs goes with how much of it is being watched, not
  with how big it is.
- **Subscribing**: a player is subscribed to the cells in their near ring,
  further out than they can see. On subscribing they get the cell as it is,
  with its version, and from then on every change to it, in order; a version
  missed, and they get the whole cell again.
- **Commands** go to the region that keeps the cell; it checks them, applies
  them and sends the change to everybody subscribed. Two at once to the same
  tile: the first to arrive wins.
- **Across a region's edge**: an agent leaving is handed over to the next
  region; near the edge, each region keeps a copy of what is just over it,
  for what is near it on the other side to see.
- **In the browser**: the agents in full are drawn a little behind the
  server, between the last two states it sent (a tenth to a fifth of a
  second); what the player does is shown at once and put right if the server
  says otherwise. Effects are worked out in the browser, as anywhere.

## The cases

- **Another player builds a road a tile beyond what I see.** The road is
  that cell's state, applied by its region whether the cell is being
  simulated or not. My near ring is wider than my screen, so I am subscribed
  to the cell and the road is already in my copy of it; its view is made as
  the cell comes into sight. Further off still, I subscribe as I come close,
  and the cell I am sent has the road in it.
- **Smoke from a building burning out of sight.** "On fire since t" is the
  building's state. Its reach takes in my screen, so its cell is kept coarse;
  the puffs are worked out from the fire, the time and the wind, and those
  that have drifted into sight are drawn where they have got to.
- **Cars coming my way.** They are agents in the near and coarse cells,
  driving; one crossing into sight gets a view right where it is.
- **Panning a chunk away and back.** The cells left only go down to near,
  coarse or keep-alive, never out of memory in a few seconds, and their
  records are kept: the same cars, where they had got to.
- **Two cities far apart, or one huge one.** Each is simulated as fully as
  somebody is looking at it; the rest sleeps and is brought up to date when
  wanted. The core's every-second tick of the whole world becomes the tick of
  the cells that are awake.

## The way there

Each step can ship on its own, and is measured before and after: the debug
panel's `Stats`, the traffic test (`npm run test:traffic`), and counting the
chunks made and let go of, as in `docs/performance.md`.

1. **Rings that hold.** `tilesman` keeps a ring more than it loads, lets go
   of a chunk only once it has been out for a few seconds, and works out what
   it wants once a frame from where the camera ended up. Done when going to
   and fro over a chunk's edge makes and lets go of no chunk, and a quarter
   turn or the view from above makes none instead of 13.
2. **Cells, systems and the scheduler in the engine**, with `Stats` for each
   system. Nothing looks or plays different. The grass growing back and the
   road crews' scan are moved onto it first.
3. **The traffic, the first agents.** Drivers become records in cells,
   driven by the traffic system, not by their cars' game objects; the roads
   they drive on come from the core, not from what is drawn, as far as the
   coarse ring; a car's game object is only its view; coarse and dormant
   tiers, with `advance`. Done when panning away and back finds the same
   cars, the traffic test is the same to the byte in full, and what the
   traffic costs goes with the cells being watched.
4. **Smoke worked out, not kept**: the puffs from their source and the time,
   drawn as one buffer of particles (`docs/performance.md`, Later); sources
   brought in by their reach; chimneys no longer tick.
5. **Bulldozers and demolitions as agents**, saved and brought up to date.
   Today they go on out of sight for as long as they like, and the
   bulldozers are lost when the page is closed.
6. **One clock, seeded chance, names that last**; building timed by the
   game's clock; the core with no browser in it; commands.
7. **Saving a cell at a time**, and the cities' saves moved over.
8. **Regions on the server**: subscribing, cells and their changes, agents
   handed over, drawing a little behind.

## Found on the way

- A tile's neighbour worked out by adding to its index is wrong from y =
  32768 and at x = 65535 (`core/terrain.js:164`, `:671`, `core/buildings.js:65`
  and a few files more: `building.js`, `construction.js`, `ambient.js`,
  `city/cityroads.js`, `city/citybuildings.js`).
- A building's view is made when it is built even when its chunk is not
  loaded (`client/buildman.js:739`), and stays until that chunk has come in
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
