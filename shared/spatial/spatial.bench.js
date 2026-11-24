import Flatbush from "flatbush";
import KDBush from "kdbush";
import { test } from "vitest";
import Random from "../random/index.js";
import { GridIndex, PackedTree, Quadtree } from "./index.js";

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

//100 queries of 300 x 300 over the 10000 x 10000 the points are spread on
function queries(f) {
  for (var q = 0; q < 100; q++) {
    var x = (q * 97) % 9700,
      z = (q * 61) % 9700;

    f(x, z, x + 300, z + 300);
  }
}

test("PackedTree beside flatbush, 100k boxes", async function ({ bench }) {
  var boxes = new Float64Array(N * 4);

  for (var i = 0; i < N; i++) {
    boxes[i * 4] = xs[i];
    boxes[i * 4 + 1] = zs[i];
    boxes[i * 4 + 2] = xs[i] + 8;
    boxes[i * 4 + 3] = zs[i] + 8;
  }

  function packed() {
    var tree = PackedTree(N);

    for (var i = 0; i < N; i++)
      tree.add(
        boxes[i * 4],
        boxes[i * 4 + 1],
        boxes[i * 4 + 2],
        boxes[i * 4 + 3],
      );

    return tree.finish();
  }

  function flat() {
    var tree = new Flatbush(N);

    for (var i = 0; i < N; i++)
      tree.add(
        boxes[i * 4],
        boxes[i * 4 + 1],
        boxes[i * 4 + 2],
        boxes[i * 4 + 3],
      );
    tree.finish();

    return tree;
  }

  await bench.compare(
    bench("PackedTree, built", packed),
    bench("flatbush, built", flat),
  );

  var ours = packed(),
    theirs = flat();

  await bench.compare(
    bench("PackedTree, 100 searches", function () {
      queries(function (x0, z0, x1, z1) {
        ours.search(x0, z0, x1, z1, out);
      });
    }),
    bench("flatbush, 100 searches", function () {
      queries(function (x0, z0, x1, z1) {
        theirs.search(x0, z0, x1, z1);
      });
    }),
  );
});

test("the indexes beside kdbush, 100k points", async function ({ bench }) {
  var grid = GridIndex(64, N),
    tree = PackedTree(N),
    kd = new KDBush(N);

  for (var i = 0; i < N; i++) {
    grid.set(i, xs[i], zs[i]);
    tree.add(xs[i], zs[i], xs[i], zs[i]);
    kd.add(xs[i], zs[i]);
  }
  tree.finish();
  kd.finish();

  await bench.compare(
    bench("GridIndex, 100 ranges", function () {
      queries(function (x0, z0, x1, z1) {
        grid.query(x0, z0, x1, z1, out);
      });
    }),
    bench("PackedTree, 100 ranges", function () {
      queries(function (x0, z0, x1, z1) {
        tree.search(x0, z0, x1, z1, out);
      });
    }),
    bench("kdbush, 100 ranges", function () {
      queries(function (x0, z0, x1, z1) {
        kd.range(x0, z0, x1, z1);
      });
    }),
  );
});
