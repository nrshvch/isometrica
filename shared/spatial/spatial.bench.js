import { test } from "vitest";
import Random from "../random/index.js";
import { GridIndex, Quadtree } from "./index.js";

var N = 100000,
  random = Random(1),
  xs = new Float64Array(N),
  zs = new Float64Array(N),
  out = new Uint32Array(N),
  keys = new Float64Array(N);

for (var i = 0; i < N; i++) {
  xs[i] = random.range(0, 10000);
  zs[i] = random.range(0, 10000);
}

test("GridIndex beside looking at everything", async function ({ bench }) {
  var index = GridIndex(64, N);

  for (var i = 0; i < N; i++) index.set(i, xs[i], zs[i]);

  await bench.compare(
    bench("GridIndex, 100 boxes of 300 over 100k points", function () {
      for (var q = 0; q < 100; q++) {
        var x = (q * 97) % 9700,
          z = (q * 61) % 9700;

        index.query(x, z, x + 300, z + 300, out);
      }
    }),
    bench("every point, 100 boxes of 300 over 100k points", function () {
      for (var q = 0; q < 100; q++) {
        var x = (q * 97) % 9700,
          z = (q * 61) % 9700,
          n = 0;

        for (var i = 0; i < N; i++)
          if (xs[i] >= x && xs[i] <= x + 300 && zs[i] >= z && zs[i] <= z + 300)
            out[n++] = i;
      }
    }),
  );
});

test("GridIndex, everything moving", async function ({ bench }) {
  var index = GridIndex(64, N);

  await bench("100k points moved a little", function () {
    for (var i = 0; i < N; i++) {
      xs[i] += 0.5;
      index.set(i, xs[i], zs[i]);
    }
  }).run();
});

test("Quadtree keys beside string keys", async function ({ bench }) {
  var tree = Quadtree(0, 0, 16384, 8),
    strings = new Array(N);

  await bench.compare(
    bench("Quadtree keyOf, 100k", function () {
      for (var i = 0; i < N; i++) keys[i] = tree.keyOf(xs[i], zs[i]);
    }),
    bench("a string key, 100k", function () {
      for (var i = 0; i < N; i++)
        strings[i] = Math.floor(xs[i] / 64) + ":" + Math.floor(zs[i] / 64);
    }),
  );
});
