---
name: world
description: The libraries a world far bigger than the screen is built from - shared/typed (Store, List, Heap, BitSet, NumMap, RadixSort, Ring), shared/spatial (Grid, Quadtree, GridIndex), shared/schedule (Clock, Scheduler), shared/draw (Pictures, DrawList, Visible). Load before using or changing any of them.
---

# The world's libraries

The parts of the design in `engine/docs/world.md`, written once as libraries
that know nothing of a world, a game or each other's callers. Each is
`shared/<lib>/index.js` with its `.test.js` and `.bench.js`; run both after
any change (`npm test`, `npm run bench` in `shared/`).

## Rules they all keep

- **Numbers in typed arrays, never objects per item.** A library returns
  counts and writes into arrays the caller gives (`within(box, out) -> n`,
  `query(..., out) -> n`); a count bigger than `out` is still the true count.
- **Arrays grow by doubling** (`grow`), so a column is a new array after
  anything that may add: read `store.cols.x` again after `add()`.
- **Hot loops read into locals first**: `var n = store.count, x =
store.cols.x`. Re-reading `store.count` off the object every pass keeps V8
  from making the loop fast - 4x slower, measured in `typed.bench.js`.
- **Keys are whole numbers below 2^53**, compared as numbers, never joined
  into strings. -1 means none.
- **Tested against the plain way** on seeded random cases (`shared/random`):
  an array, `Map`, `Array.prototype.sort`, looking at everything. Keys that
  saves and servers will depend on are pinned.

## typed

- `Store(fields, capacity)`: `fields` is `{ name: TypedArrayType }`. A
  handle is 22 bits of slot and 10 of how often the slot was used, so a
  handle to a removed record is not alive even once its slot is reused
  (until 1024 reuses). `live[0..count)` lists the slots alive, densely:
  remove moves the last one into the hole, so order is not kept. `add()`
  zeroes every column of the slot.
- `List`: numbers and a count, `removeAt` moves the last in.
- `Heap`: min-heap of (key, value), both doubles - times running out.
- `BitSet`, `NumMap` (linear probing, deletion shifts back what follows -
  no tombstones; keys 0..2^53, values any number), `RadixSort(capacity)`
  (`sort(keys, values, n)`, Uint32 keys, stable, skips bytes all keys share;
  its scratch is its own, never a module global).
- `Ring(capacity, Type, shared)`: first in, first out, two Int32 counts at
  the front of the buffer, read and written with `Atomics`; one pushing
  thread and one shifting thread may share it (`Ring.on(buffer)` on the
  other side). The number is written before the count that says it is
  there. Move batches with `write`/`read`: one count a batch, 50x quicker
  than item by item.

## spatial

- `Grid(size)`: key `(ix + 2^25) * 2^26 + (iz + 2^25)`.
- `Quadtree(x, z, size, depth)`: implicit - the same cuts always, never by
  what is in it. Key = Morton code at its level * 32 + level; the root is 0;
  depth 23 at most. Morton codes are built 12 bits at a time to stay inside
  32-bit operations. Outside the root: -1.
- Boxes are `minX, minZ, maxX, maxZ` with the edges included; a cell is
  half-open, `[min, min + size)`.
- `GridIndex(cellSize)`: points that move, by id (a store's slot): a hashed
  grid, cells in a `NumMap`, each cell a doubly linked list in typed arrays.
  `set` moves a point between cells only when it changes cell.

## schedule

- `Clock(step, maxSteps)`: `advance(dt)` gives the fixed steps to take;
  `alpha` is how far to the next, for drawing in between. A hair of
  tolerance so sums of frames do not lose a step.
- `Scheduler({ period, budget, late, now })`: regions by key, each with a
  tier (`FULL`, `COARSE`; `DORMANT` takes it out) and a priority (smaller is
  nearer). `full(dt)` steps every full region with every system. `coarse(t)`
  runs the coarse regions due, the long overdue (`late` periods) first, then
  nearest first, until `budget` ms is spent - always at least one. A region
  coming in coarse gets its first turn spread over the period by a hash of
  its key. Runs go by handle, so a region removed mid-run is skipped.
  `stats.time` / `stats.runs` are `[system * TIERS + tier]`.

## draw

- `Pictures`: size, pivot, page and place by number; width 0 = not ready,
  never drawn.
- `DrawList`: rows of x, y, z, picture, layer, alpha, tag (the caller's).
- `Visible`: `clear()`, `cull(list, pictures, M, width, height, pad)` per
  list (255 lists a frame at most), `sort(D, layers)`. The cull is the
  engine's (`engine/engine/canvas2drenderer.js` `cull`): the same matrix
  terms, the same rounding (`floor(... + 0.5)`) and edges. The sort is the
  engine's too: depth `D · position`, made 16 bits over each layer's own
  range, the layer above it, one stable radix sort - ties keep cull order.
