# A world as big as you like

How the engine keeps a world far bigger than the screen, full of things that
move: worked out in full only where somebody is looking, cheaply further
off, not at all where nobody is near - and with nothing ever lost, and
whatever is just out of sight there the moment it comes into it. For one
player, and for many at once, each somewhere else.

Its libraries are built in `shared/` (below, Libraries); the rest is not
built yet. It is the design: the mechanism is the engine's,
the same for every kind of thing (vehicles, smoke, machines, people,
whatever a game has), and a game only says how its world is cut up, how big
the pieces are, and what its kinds of things do.

Everything here is in the engine's world units, 3D with y up, as a
`Transform` has them. Nothing in the engine knows what a game builds its
world out of.

## The idea

Keep **what exists** apart from **what is drawn**, and decide for every part
of the world **how often it is worked out**, by who is looking and how close.

- Space is cut into **regions** with stable addresses.
- Everything that exists is a **record**, numbers in **typed arrays**; the
  engine iterates over typed arrays and nothing else. A **view** is made for a
  record only while it is in sight - a row in a typed draw list, and a game
  object only where one earns its keep - and the renderer is handed typed
  draw lists, never game objects.
- **Observers** have **rings** round what they see; a region's **tier** -
  how fully it is simulated - is the highest any observer gives it.
- What nobody is near is **not simulated at all**, and is brought up to date
  from the time it was left at when somebody comes.
- **Effects** are worked out from their source and the time, not kept.
- One **clock** and **seeded** chance, so the same world comes out the same
  everywhere.
- Saving, sending and who decides a region are keyed by its address; how and
  where is the game's.

## Space: addressing and indexing

Two jobs, often done by one structure, here kept apart.

**Addressing** - the partition - gives every region of space a key: from a
position, always the same key, on every machine, today and in a year. It is
what everything that has to agree is keyed by: what is loaded, what is
simulated and how often, what is saved, what is sent to whom, which server
decides it. A key is a number, kept in typed arrays, never a string.

```
keyOf(x, y, z)        -> key
bounds(key)           -> box
within(box, out)      -> how many keys overlap box, into out
neighbours(key, out)  -> how many, into out
parent(key), children(key, out), level(key)
```

**Indexing** answers "what is near here", "what is in this box". It may
reshape itself as things move (split where it is crowded, merge where it
empties), and is rebuilt whenever that is cheaper; it is never saved and
never sent.

The engine has a partition of each of these kinds, and a game picks one and
its sizes:

- **A uniform grid**: one level, key from `floor(x / size)`, `floor(z / size)`
  (and `floor(y / size)` for a world that is not flat).
- **An implicit quadtree or octree**: a fixed root box cut in two each way at
  every level, the same cuts always - never according to what is in it. A key
  is the level and the Morton code of the node's place at that level: stable,
  and its levels are coarser regions for free (below). A flat world uses the
  quadtree over x and z and leaves y uncut.

Any other partition that keeps the contract - stable keys, the same from the
same position everywhere - can be added.

The engine had an octree of the other kind, removed since as it was never
used: one that splits a node when too many items are in it. That makes a good
index, and no address at all - its nodes are not the same on two machines,
nor from one minute to the next. It also went because it was written by hand
and never tested. An index comes back either as a library used widely enough
to be trusted, or as one of the engine's own with tests - never otherwise
(below).

## Records, stores and views

Everything that exists is a **record** in the **store** of the system it
belongs to. A store is typed arrays, a field each - where it is, its region,
its kind, when it started, its seed - and a record is known by a handle: its
slot and a count of how often that slot has been used, so that a handle to
something gone is told from whatever is in its slot now. A record's region is
`keyOf` its position; when that changes, it is moved from the one region's
list to the other's.

A **view** is how a record is drawn, and exists only while the record is in a
region in sight. It keeps nothing that is not the record's: let go of,
nothing is lost; made again, it is drawn where its record is.

## Typed arrays, all the way down

With a world this big, speed is memory: how much the processor has to read,
and in what order. So:

- **All state is in typed arrays**, a field each. The stores of records, and
  everything of the engine's own as well: the regions with their tiers,
  versions and times; the rings; the set of regions awake and the heap of
  times running out; the scheduler's queues; the reach kept for every region;
  what changed since the last save; who is subscribed to what; the nodes of
  the index; the graphs for finding the way. A list is an array of numbers -
  handles, keys - and a count: taking one out moves the last one into its
  place, and slots free to use again are a list of numbers too. Arrays are
  made with room to spare and grown twice as big when they fill - never a
  slot at a time.
- **Iteration is over typed arrays only.** A loop that runs every frame or
  every step reads numbers, one array after another: it follows no reference
  from one item to the next, asks no object anything, and makes nothing to
  throw away. Objects are touched only at the edges - a command coming in, a
  view being made, the page.
- **Game objects are views, and only where they earn it.** Something on the
  screen with behaviour of its own - held and dragged, opened in a panel -
  can have a game object. The mass of a world - the ground, what grows on it,
  what drives on it, what drifts over it - has none: its view is a row in a
  draw list.
- **The renderer is handed typed draw lists.** For what is in sight, every
  system writes rows into a draw list of its own: where (x, y, z), which
  picture - a number, into a table of pictures that is typed arrays too
  (where each is on the atlas, its size, its pivot) - which frame, how
  see-through, how lit, and the key it is sorted by. The renderer culls, sorts
  (by the keys, a radix sort) and batches from those arrays straight into the
  GPU's buffers, and never asks an object anything. A list of what does not
  move can stay on the GPU, written again only when it changes.
- **Strings and objects** only where people and files are: names, the
  interface, the save as it is written out - and a save is typed arrays
  packed together before it is compressed.

## Systems

A kind of thing takes part by giving the engine a system, with the same few
functions for every kind:

- `step(region, dt, tier)` - its records in the region a step on, as fully as
  the tier says;
- `advance(region, from, to)` - the region brought up to date after being
  left;
- `save(region)`, `load(region, data)`;
- `reach(record, box)` - where what the record does can be seen (below);
- `spawnView`, `updateView`, `releaseView`.

## Three kinds of things

Every kind of thing is one of three, and that decides how it is kept:

- **State**: what was built or done. It changes because somebody did
  something - a command - never a frame at a time, and anything gradual about
  it is worked out from a time. Never lost, whoever is looking or not.
- **Agents**: things with somewhere to go. Records, simulated as fully as
  their region's tier says.
- **Effects**: smoke, dust, sparks. They change nothing, so they are not kept
  at all: each is worked out from its source, its seed and the time -
  `effect(source, seed, t)`. Anybody looking regenerates exactly the ones in
  sight, half way through their flight if they are; nothing is spent on the
  ones nobody sees; and every player sees the same ones without one of them
  being sent.

## Observers, rings and tiers

An **observer** is whatever looks at the world: the camera, and on a server
every player's. What it sees is a box in world units - the camera's footprint
(`engine/engine/components/cameracomponent.js`,
`frustumBox`). Round it, rings, each the box
grown by a distance:

- **view** - drawn, views made; simulated in full;
- **near** - simulated in full, not drawn, its pictures got ready: what comes
  into sight is already moving as it should;
- **coarse** - simulated cheaply, a few times a second at most;
- **keep-alive** - not simulated, kept in memory, for when the observer
  comes back;
- **unloaded** - the rest: saved, and what is procedural made again when
  wanted.

`within(ring)` gives a ring's regions. A region's tier is the highest any
observer gives it; it goes **up** at once and **down** only after a while,
and a ring is entered at one distance and left only further out - so going
to and fro over a line loads and lets go of nothing. The rings are worked out
once a frame from where the camera ended up, never from where it was half way
through moving.

**Reach.** What a record does can be seen further off than where it is:
smoke drifts with the wind for as long as a puff lasts; a vehicle will be
where its way ahead takes it. A system says where (`reach`), and a region
holding a record whose reach takes in a region of a higher tier is raised to
coarse at least. So a fire just out of sight upwind is simulated enough for
its smoke to be there when it drifts in.

## Levels as level of detail

With a quadtree or an octree, a region has a parent, and the parent's parent:
the same world in fewer, bigger regions. Far off, a coarse tier can simulate
and keep its sums at a parent's level - a few big regions, not many small
ones - and a server can be given a parent, with everything under it, as its
share of the world.

## Tiers and the scheduler

- **Full**: a fixed step, the same length every time, and what is drawn in
  between worked out from the two steps either side: the same results
  whatever the frame rate.
- **Coarse**: the same records, simpler rules, a few times a second, the
  regions taken in turn.
- **Dormant**: not stepped; the region remembers when it was left. When its
  tier goes up again - in the near ring, before it can be seen - its systems'
  `advance` brings it up to date: in one go where it can be (from when a thing
  started and how fast it goes), a few coarse steps over the time missed
  where it cannot, no more than so many.

The **scheduler** spends no more than so much of a frame: the full regions
first, then the coarse ones nearest first, each region's turn spread out so
that they do not all fall in one frame. What it takes is counted in `Stats`
by system and by tier.

Game objects tick for how they look and nothing else. What happens in the
world happens in the systems.

## Nothing goes over the whole world

No step of a frame or of a tick costs more the bigger the world is: only
what is awake, what changed, and who is subscribed. Wherever going over all
of it is tempting:

- **Regions going down a tier**: the engine keeps the set of regions above
  unloaded and goes through that; keep-alive running out is a heap of times,
  the soonest first, never a search.
- **Reach**: every region keeps the furthest reach of anything in it, kept up
  as records come and go; rings are asked for with that much more round them.
  Never every record against every region watched.
- **Totals over a wide area** - an economy, a population, how far a service
  reaches: every region keeps what it adds as sums and rates, and every
  parent the sums of its children. A total is read off the tree; a dormant
  region adds its rate times the time gone by.
- **Finding a way**: a graph for every region of where its ways cross its
  edges, kept up as the region changes; a search costs as many regions as the
  way crosses, not the size of the world.
- **Looking for something** (the nearest of a kind): the index, within a
  distance, or down the tree by the counts kept in every node.
- **Saving**: the regions changed since, kept as a set. **Sending**: the
  subscribers listed with each region.
- **Culling and ticking**: the renderer goes over every game object, and
  `World.tick` every ticker - but views exist only in sight, so both cost what
  is in sight.

What does have to go over everything - a save moved to a new format, an index
built again, figures about the whole world - is done offline or on a worker, a
batch at a time, never in a frame or a tick.

## Threads

**The simulation as a local server, on a worker.** The main thread keeps
input, views and drawing; a worker keeps the records and runs every system at
its fixed step. What the player does goes in as commands; what is in sight
comes back as snapshots and changes, typed arrays handed over without being
copied. Drawing is a step behind, between the last two snapshots, so the hop
is not seen. Then playing alone and playing with others are the same
protocol - `postMessage` to a worker, or the network to a server - and the
same code runs in both; games with a single player mode built on an integrated
server have done this for a long time.

**More workers, regions shared out.** Regions only meet at their edges, so a
worker can be given a set of regions, with its edges handled as a server's
are (below). Every region is stepped by one worker only, so what comes out is
the same as with one.

**Smaller jobs**, for before that: a region waking up brought up to date
(`advance`) while it is still in the near ring; what is procedural in a
region worked out before it is wanted; a graph for finding the way built
again; saves put together and compressed.

**Sharing the memory.** The stores and the draw lists are typed arrays, so
they can live in a `SharedArrayBuffer`: the worker writes them, the main
thread reads them, and nothing is copied or handed over. What is in sight is
kept two or three times over - the worker writing the next step into one
while the renderer reads the last, and which copy is whole published with
`Atomics` once it is written, so the renderer never reads half a step.
Commands go the other way in a ring of numbers, its two ends kept with
`Atomics`. Shared memory needs the page cross-origin isolated - served with
`Cross-Origin-Opener-Policy: same-origin` and
`Cross-Origin-Embedder-Policy: require-corp` (or `credentialless`), and
everything it loads from elsewhere allowed to be - so the engine works without
it too: the same arrays handed back and forth (transferred), never copied.

**What stays on the main thread**: game objects, WebGL, the page. Drawing from
a worker (`OffscreenCanvas`) can come later, the draw lists read there
instead.

## Libraries, tested and measured

Whatever in this is not about one game is written once, as a library in
`shared/`, and used as one - by the engine, by a game, by a worker, by a
server - imported as `shared/<lib>`, like `shared/random` and `shared/pixels`
already are. A library there imports from nothing else in the repository and
depends on nothing but the platform (`npm run lint` holds both); the engine
may import it, and puts the libraries together - it does not own them. How a
library is laid out, written, tested and measured is in `shared/CLAUDE.md`.

**The libraries.** Built: `typed`, `spatial` (the grid, the quadtree, a
hashed grid index and a packed tree), `schedule`, `interest`, `draw`,
`integral`, `replica` - how they work is shared's skill `world`. Still to come: the octree.

- `shared/typed` - the containers everything is kept in: a store of records
  as typed columns, with handles, the count each slot has been used and the
  slots free; a list that takes things out by moving the last one in; a heap;
  a ring of numbers, in a `SharedArrayBuffer` with `Atomics` or not; a set of
  bits; a map from numbers to numbers, open addressing, no objects; a radix
  sort.
- `shared/spatial` - the partitions (a grid, an implicit quadtree and octree,
  keys by level and Morton code) and the indexes.
- `shared/interest` - observers, rings, tiers, how long a region is kept once
  left.
- `shared/schedule` - the scheduler: tiers, a budget a frame, turns spread
  out.
- `shared/draw` - draw lists and the table of pictures, culled and sorted;
  how they get onto the GPU stays the renderer's.
- `shared/integral` - a function of time (a wind) integrated as it goes, its
  moments over any stretch of the last while in a few sums: what an effect
  worked out from its start and the time needs of what changed meanwhile.
- `shared/replica` - a region's version, its state and its changes packed
  and unpacked, copies published with `Atomics`.
- `shared/random` is there already: seeded streams, a stream of its own for
  anything (`fork`). What a region needs as well is a toss that does not
  depend on order - a hash of the region, the record and the step - added
  beside them.

**The index: ours, held to trusted ones.** A library in `shared/` takes no
dependencies, so the index is the engine's own, in `shared/spatial`: a grid
hashed into typed arrays for what moves every step, a tree packed into typed
arrays, rebuilt when it changes, for what stays put. Widely used libraries of
the same kind - `flatbush` (boxes), `kdbush` (points) - come in only to
develop with: its tests check its answers against theirs and against looking
at everything, and its benchmark puts it beside them. The partitions -
addresses - are a few lines of arithmetic that have to be exactly right, so
they are tested exhaustively.

**Every library is tested** (`<lib>.test.js`, Vitest):

- **What it does**: cases by hand, and many random ones checked against
  something plain and obviously right - every item looked at for a search of
  the index, `Array.prototype.sort` for the radix sort, a `Map` for the map of
  numbers - the random ones seeded, so a failure comes back the same.
- **A contract, for every partition**: the same position always gives the same
  key, and the same keys on any machine (checked against keys written down
  once, as `random.test.js` pins its numbers); a position is inside the
  bounds of its key; `within` gives what looking at every region would;
  parents and children agree.
- **The same out as in**: the same seed gives the same numbers; saved and
  loaded gives back what was saved.
- **Nothing made**: what runs every frame or every step allocates nothing -
  measured round many calls, the garbage collected before and after.

**Every library is measured** (`<lib>.bench.js`): the calls that matter, at
sizes from a thousand to a million, each beside the plain way in the same run
(`bench.compare`) - the radix sort beside `Array.prototype.sort`, a search of
the index beside looking at everything - since what holds from one machine to
the next is how many times quicker, not how many milliseconds. `npm test` and
`npm run bench` run on every push (`.github/workflows/checks.yml`), so a
change that makes a library slower shows in the run that made it.

A game's own checks stay as well - a whole world run through and compared -
and a change to what is drawn is checked by comparing what is handed to the
GPU, quad for quad, before and after, with the tools the game keeps for it.

**Once built**, how a part works is written in the skill of the package it is
in (`<package>/.claude/skills/`), as the repository does it, and this design
keeps only what is still to come.

## Time, chance and names

- **One clock** for the simulation, a fixed step at a time; the frame's time
  only for how things look. `Game` today steps once a drawn frame, by however
  long the frame took, at most 200 ms (`engine/engine/game.js`,
`engine/engine/time.js`).
- **Seeded chance**: a hash of the region, the record and the step
  (`shared/random`), never `Math.random`. The same world then comes out the same on every machine and
  every time it is worked out again - after catching up as without.
- **Names that last**: a record's id is its region's key and a count kept in
  the region - the same tomorrow, and on another machine.

## Saving, sending, deciding

The engine keys these by region and leaves how to the game:

- **Saving**: a region at a time, those changed, each with a version counted
  up on every change; what is procedural is not saved, only what was done to
  it; agents with the time they were simulated up to.
- **Sending**: a subscriber gets a region as it is, with its version, then
  every change to it in order; a version missed, and the whole region again.
  A player is subscribed to the regions in their near ring - wider than they
  can see - so what changes just out of sight is already theirs when it comes
  into it.
- **Deciding**: every region has one owner that checks the commands for it,
  applies them and sends on what changed. A group of regions - a parent node -
  is a natural share for one server. An agent leaving one owner's regions is
  handed over to the next; near the edge, each keeps a copy of what is just
  over it, for what is close to it on the other side.

## What the engine has, and what it gains

Now: no tests of its own. `World` keeps every game object in one list and the slots the renderer
culls by (`engine/engine/world.js`); every ticker is ticked every frame
(`engine/engine/world.js:381`); `Game` steps by the frame's time
(`engine/engine/game.js`); `Stats` counts what a frame takes. Half way to typed already: the renderer culls from
the slots, a `Float64Array`, and keeps what it draws a frame in typed arrays,
sorted by a radix sort (`engine/engine/canvas2drenderer.js`) - but every
picture drawn is still handed over as a renderer object and a picture object
(`SpriteRenderer.picture`), and asked about itself on the way.

To come, as tested libraries the engine puts together: the partitions (grid,
implicit quadtree and octree) and an index;
stores of records; draw lists and the table of pictures by number, and a
renderer that draws from nothing else; the registry of systems; observers,
rings and tiers; the scheduler; the fixed-step clock with drawing in between;
pools of views; the hooks for saving, sending and deciding; and the
simulation on a worker, sharing its memory where the page allows.
