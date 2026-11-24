# shared - generic libraries

Libraries any package can use: `engine`, `isometrica` and the games import
them as `shared/<lib>`. Nothing here imports from any of them (`npm run lint`
fails otherwise), nor knows about a world, a city or a game.

## A library

```
shared/<lib>/
  index.js          the library - shared/<lib> resolves here (package.json exports)
  <lib>.test.js     its unit tests
  <lib>.bench.js    its benchmark
```

- Plain ES modules, no dependencies but the platform (a library known to be
  right may be a development dependency, to test and measure against). Pure where it can be:
  data in, data out; no globals, no singletons.
- Data-oriented: take and give typed arrays where the data is many of a kind,
  loop over them, allocate nothing in the hot loop.
- The header says what it is in a line or two, and how it is called.
- Tests (Vitest: `import { describe, expect, it } from "vitest"`) cover what it
  promises, the edges, and any output something depends on staying the same
  (`random.test.js` pins the numbers generated cities are made from).
- Benchmarks measure the calls that matter at realistic sizes. In Vitest 5
  `bench` comes from the test's context, not from an import:

  ```js
  test("<lib>", async ({ bench }) => {
    await bench.compare(bench("a call", fn), bench("another", fn2));
  });
  ```

## Libraries

- `random` - a seeded random stream (mulberry32): next, int, range, chance,
  pick, weighted, shuffle, fork(salt) for a stream of its own; and
  toss(seed, region, record, step) - a chance that does not depend on order.
- `pixels` - pictures as RGBA pixels ({width, height, data}), put together
  the way a 2D canvas would, without one: over, silhouette, lighten,
  fromImage.
- `typed` - the containers: Store (records as typed columns, handles that
  tell a removed record from its slot's next one), List, Heap, BitSet,
  NumMap (numbers to numbers, no objects), RadixSort, Ring (two threads),
  grow.
- `spatial` - space cut up: Grid and Quadtree (implicit, Morton keys that
  never change: keyOf, bounds, within, neighbours, parent, children), and
  indexes: GridIndex (a hashed grid of points that move), PackedTree (a
  static R-tree of boxes that stay put).
- `schedule` - Clock (fixed steps, alpha between) and Scheduler (systems
  over regions by tier: full every step, coarse nearest first within a
  budget, counted by system and tier).
- `interest` - observers and their rings: a level a region (view, near,
  coarse, keep, unloaded), up at once, down after a while, what changed.
- `draw` - Pictures (a table by number), DrawList (rows a system writes),
  Visible (culled by a world-to-screen matrix, sorted by layer then depth).
- `integral` - Integral: a function of time held a step at a time and
  summed as it goes, its integral and first two moments over any stretch of
  the last while in a few sums (a puff of smoke and the wind).
- `replica` - a copy kept equal from another thread or a server: Writer and
  Reader (frames of records, numbers and bytes, in one ArrayBuffer),
  Replica (versions: a frame on top of the one a copy has, or a snapshot),
  Table (rows whose changes go into frames), Published (the last whole copy,
  through a SharedArrayBuffer and Atomics).
- `records` - Records: versioned records kept somewhere slow by key, the
  set of keys marked changed, written only when they came out different;
  toText / fromText (base64, for a Storage of strings).

How `typed`, `spatial`, `schedule`, `interest`, `draw`, `integral`, `replica` and `records` work, and the rules they keep:
skill `world` (`.claude/skills/world/`).

## Commands (here, or at the root)

- `npm test` - the unit tests.
- `npm run bench` - the benchmarks, with their table.
