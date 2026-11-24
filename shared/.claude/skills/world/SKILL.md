---
name: world
description: The libraries a world far bigger than the screen is built from - shared/typed (Store, List, Heap, BitSet, NumMap, RadixSort, Ring), shared/spatial (Grid, Quadtree, GridIndex, PackedTree), shared/schedule (Clock, Scheduler), shared/interest (observers, rings, levels), shared/draw (Pictures, DrawList, Visible), shared/integral (Integral), shared/replica (Writer, Reader, Replica, Table, Published), shared/records (Records, toText, fromText), and shared/random's toss. Load before using or changing any of them.
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
- `PackedTree(n, nodeSize = 16)`: boxes that stay put (points are boxes of
  no size). `add` n times, `finish`, then `search(box, out)` and
  `around(x, z, r, out)`. A static R-tree, flatbush's layout: items sorted
  by the `hilbert` place of their middles (our radix sort), the levels one
  after another in one `Float64Array`, a node's index where its first child
  is. Never changed: built again when what is in it changes.
- Both are tested against looking at everything and against `flatbush` /
  `kdbush` - development dependencies, for the tests and the benchmark only;
  nothing in a library imports them. They make a new array per search, ours
  write into `out`.

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

## interest

- `Interest(partition, { rings, hold, keepAlive })`: `partition` is anything
  with `within(box, out)` and `bounds(key, out)` - a Grid as it is, a
  Quadtree with its level bound in. Observers are boxes (`observer()`,
  `look`, `forget`); `update(t)` once a frame, after they have looked, then
  `changes.key/from/to[0..count)`.
- Levels `UNLOADED < KEEP < COARSE < NEAR < VIEW`. Distance is the gap
  between a region's box and the observer's, the larger of x and z (a box
  grown by d). A ring is entered at `enter` and left only beyond `leave`.
  Up at once; down after `hold`, never below KEEP; KEEP is let go of after
  `keepAlive`. One step down an update at most.
- Cost: what is within the widest ring of an observer is looked at every
  update; what has left it is never looked at again, only timed (a heap of
  when each falls due, checked against the region's own `due` so old
  entries are skipped). Asked a hair wider than the reach, as cells are
  half-open.
- Tested against looking at every region of a bounded world every update,
  observers wandering and jumping, with three sets of times.
- Not yet: raising a region for a record whose reach takes it in (the
  design's Reach) - for when the first system has records.

## random's toss

- `toss(seed, region, record, step, salt)` -> [0, 1): murmur3's mixing over
  each number's low and high 32 bits. A pure function, so the same in any
  order, thread or machine - what a simulated world tosses with, where a
  stream (`Random`) would give other numbers whenever the order of work
  changes. The numbers are pinned in `random.test.js`.

## draw

- `Pictures`: size, pivot, page and place by number. One with no size yet
  (not painted) is culled by its spot alone and handed on all the same: the
  renderer may want it, to have it painted.
- `DrawList`: rows of x, y, z, picture, layer, alpha, tag (the caller's).
- `Visible`: `clear()`, `cull(list, pictures, M, width, height, pad)` per
  list (255 lists a frame at most), `sort(D, layers)`. The cull is the
  engine's (`engine/engine/canvas2drenderer.js` `cull`): the same matrix
  terms, the same rounding (`floor(... + 0.5)`) and edges. The sort is the
  engine's too: depth `D · position`, made 16 bits over each layer's own
  range, the layer above it, one stable radix sort - ties keep cull order.
- Used by isometrica's ground (`client/groundchunk.js`): a draw list and a
  table of pictures a chunk, `Visible.cull` without the sort.

## integral

- `Integral(channels, step, window, sample, rebase)`: `sample(t, out)` is f
  at t, held over its step (sampled in the middle of `[k step, (k + 1)
step)`), so a step is the same whenever it is filled in. `over(a, b, out)`
  -> `out[c * 3 + n]` = the integral of `(τ - a)^n f_c` over `[a, b]`; `at(t,
out)` the value held.
- Running sums at every step boundary in a ring as far back as `window`; a
  stretch starting further back starts where the ring does. A jump longer
  than the ring, a time before it, or `rebase` steps since the sums started
  (by default the larger of 16 rings and 4096 steps) start them again from
  there, so that `τ³` sums stay exact: the same stretch then gives the same
  numbers to the last few bits, not to the bit.
- Tested against adding up each step on its own, in any order asked, over
  jumps and restarts. Used by isometrica's smoke for the wind (rendering
  skill, smoke.md).

## replica

- A frame: a header (its length, how many records, the version it goes on
  top of - -1 for a snapshot - and the one it makes), then records, each
  a kind (16 bits), how many numbers (Float64, 65535 at most) and bytes,
  padded to 8 with zeros: the same records are the same bytes, whatever the
  writer held before. Little-endian through a DataView, so a frame reads the same
  anywhere it is posted or sent.
- `Writer(capacity)`: `begin(from)`, `record(kind, nums, n, bytes)`,
  `text(kind, nums, n, string)` (UTF-8, `encodeInto`), `end(to)` -> a view
  of its own buffer, good till the next `begin`; `copy()` -> an ArrayBuffer
  to transfer. Its buffer grows by doubling and is kept: numbers-only
  records make nothing.
- `Reader()`: `open(bytes)` -> to; `next()` -> kind or -1, then `nums` (its
  own Float64Array, kept), `n`, `length`, `bytes()`, `text()`.
- `Replica()`: `accept(reader)` - a snapshot always, else only a frame from
  the version it has; one missed leaves it `stale` (it wants a snapshot).
- `Table(fields, rows)`: Float64 columns; `set` marks a row changed once
  however often it is set (NaN no change from NaN); `snapshot` / `changes`
  write rows [row, fields...] as records, `apply` takes one onto a copy.
- `Published(bytes, shared)` / `Published.on(buffer)`: three copies traded
  with `Atomics.exchange` (the one between, and a bit for "published
  since"): the writer writes the copy it holds and publishes it, the reader
  takes the last one published whole; neither waits, nor sees one half
  written. Each copy keeps its length and version.
- Tested: records given back as written, the same from a copy as from the
  view, nothing made a frame once grown; a snapshot and the changes after
  it the same table, frames lost on the way and a snapshot again;
  Published read by the main thread while a worker_thread publishes
  200,000 copies. Benchmarked beside JSON and structuredClone.
- Used by isometrica's local server (its skill `buildings`, server.md): the
  frames, their versions and a Table of the digest a copy is checked by.

## records

- `Records(capacity)`: by key (a number, a region's), each record's last
  written bytes (a copy) and its version, counted up on every write.
  `mark(key)` - changed (a NumMap and a list: marked twice, made once).
  `collect(make, write)` - each key marked, in the order marked: `make(key)`
  gives its bytes now (null: none), and `write(key, version, bytes|null)`
  is called only when they differ from the last written (compared four
  bytes at a time where aligned); a key marked while it runs is left for
  the next. `known(key, version, bytes)` - what the storage holds already,
  on opening: made again and found the same, it is not written.
  `keysChanged` - a key came or went (for a list of them, written only
  then). `has`, `version`, `bytes`, `keys()`, `size`, `pending`.
- `toText(bytes)` / `fromText(text)` - base64, padded, as `Buffer` has it
  (tested against it); `fromText` gives an aligned array of its own, null
  for what is not base64.
- Tested against a Map on seeded random changes: what reaches the storage
  is the world, versions counted by writes. Benchmarked: a save of 40
  marked, 10 changed, of 2000 records of 2 KB, against the whole as JSON.
- Used by isometrica's saves by region and the cars' (its skill
  `buildings`, saves.md).
