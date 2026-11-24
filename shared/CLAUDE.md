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

- Plain ES modules, no dependencies but the platform. Pure where it can be:
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
  pick, weighted, shuffle, fork(salt) for a stream of its own.
- `pixels` - pictures as RGBA pixels ({width, height, data}), put together
  the way a 2D canvas would, without one: over, silhouette, lighten,
  fromImage.

## Commands (here, or at the root)

- `npm test` - the unit tests.
- `npm run bench` - the benchmarks, with their table.
