import Flatbush from "flatbush";
import KDBush from "kdbush";
import { describe, expect, it } from "vitest";
import Random from "../random/index.js";
import {
  Grid,
  GridIndex,
  PackedTree,
  Quadtree,
  hilbert,
  morton,
  mortonX,
  mortonZ,
} from "./index.js";

var box = new Float64Array(4),
  out = new Float64Array(4096);

function inside(b, x, z) {
  return x >= b[0] && x < b[2] && z >= b[1] && z < b[3];
}

function overlaps(b, minX, minZ, maxX, maxZ) {
  return b[0] <= maxX && b[2] > minX && b[1] <= maxZ && b[3] > minZ;
}

function sorted(a, n) {
  return Array.from(a.subarray(0, n)).sort(function (p, q) {
    return p - q;
  });
}

describe("morton", function () {
  it("round-trips every coordinate up to 2^24", function () {
    var random = Random(1);

    for (var i = 0; i < 20000; i++) {
      var x = random.int(0, 16777215),
        z = random.int(0, 16777215),
        m = morton(x, z);

      expect(mortonX(m)).toBe(x);
      expect(mortonZ(m)).toBe(z);
      expect(m).toBeLessThan(Math.pow(2, 48));
    }
  });

  it("takes the bits in turn, x's lowest first", function () {
    expect(morton(1, 0)).toBe(1);
    expect(morton(0, 1)).toBe(2);
    expect(morton(3, 3)).toBe(15);
    expect(morton(4096, 0)).toBe(16777216);
  });
});

describe("Grid", function () {
  var grid = Grid(10);

  it("keeps its keys (saves and servers are keyed by them)", function () {
    expect(grid.keyOf(0, 0)).toBe(2251799847239680);
    expect(grid.keyOf(-0.5, 25)).toBe(2251799780130818);
    expect(grid.keyOf(1e6, -1e6)).toBe(2258510733539680);
  });

  it("puts a position inside the bounds of its key, and decodes the cell", function () {
    var random = Random(2);

    for (var i = 0; i < 5000; i++) {
      var x = random.range(-1e7, 1e7),
        z = random.range(-1e7, 1e7),
        k = grid.keyOf(x, z);

      expect(inside(grid.bounds(k, box), x, z)).toBe(true);
      expect(grid.key(grid.cellX(k), grid.cellZ(k))).toBe(k);
    }
  });

  it("within gives what looking at every cell would", function () {
    var random = Random(3);

    for (var t = 0; t < 200; t++) {
      var minX = random.range(-60, 60),
        minZ = random.range(-60, 60),
        maxX = minX + random.range(0, 40),
        maxZ = minZ + random.range(0, 40),
        expected = [];

      for (var ix = -12; ix <= 12; ix++)
        for (var iz = -12; iz <= 12; iz++) {
          var k = grid.key(ix, iz);

          if (overlaps(grid.bounds(k, box), minX, minZ, maxX, maxZ))
            expected.push(k);
        }

      var n = grid.within(minX, minZ, maxX, maxZ, out);

      expect(sorted(out, n)).toEqual(expected.sort((p, q) => p - q));
    }
  });

  it("gives eight neighbours, each one cell away", function () {
    var k = grid.keyOf(5, 5),
      n = grid.neighbours(k, out);

    expect(n).toBe(8);
    for (var i = 0; i < n; i++) {
      expect(
        Math.max(
          Math.abs(grid.cellX(out[i]) - grid.cellX(k)),
          Math.abs(grid.cellZ(out[i]) - grid.cellZ(k)),
        ),
      ).toBe(1);
    }
  });
});

describe("Quadtree", function () {
  var tree = Quadtree(-512, -512, 1024, 5);

  it("keeps its keys (saves and servers are keyed by them)", function () {
    expect(tree.keyOf(-512, -512, 0)).toBe(0);
    expect(tree.keyOf(0, 0)).toBe(24581);
    expect(tree.keyOf(100.5, -300)).toBe(9637);
    expect(tree.keyOf(511.9, 511.9)).toBe(32741);
  });

  it("has no key outside its root", function () {
    expect(tree.keyOf(512, 0)).toBe(-1);
    expect(tree.keyOf(0, -512.01)).toBe(-1);
    expect(tree.key(32, 0, 5)).toBe(-1);
  });

  it("every node at every level: a unique key, its cell back, its parent's children, inside its parent", function () {
    var seen = new Set(),
      kids = new Float64Array(4),
      parentBox = new Float64Array(4);

    for (var l = 0; l <= 5; l++) {
      var across = Math.pow(2, l);

      for (var ix = 0; ix < across; ix++)
        for (var iz = 0; iz < across; iz++) {
          var k = tree.key(ix, iz, l);

          expect(seen.has(k)).toBe(false);
          seen.add(k);
          expect(k).toBeLessThan(Math.pow(2, 53));
          expect(tree.level(k)).toBe(l);
          expect(tree.cellX(k)).toBe(ix);
          expect(tree.cellZ(k)).toBe(iz);

          tree.bounds(k, box);
          expect(tree.keyOf(box[0], box[1], l)).toBe(k);
          expect(
            tree.keyOf((box[0] + box[2]) / 2, (box[1] + box[3]) / 2, l),
          ).toBe(k);

          if (l > 0) {
            var p = tree.parent(k);

            expect(tree.children(p, kids)).toBe(4);
            expect(Array.from(kids)).toContain(k);
            tree.bounds(p, parentBox);
            expect(box[0]).toBeGreaterThanOrEqual(parentBox[0]);
            expect(box[2]).toBeLessThanOrEqual(parentBox[2]);
          } else expect(tree.parent(k)).toBe(-1);
        }
    }

    expect(tree.children(tree.key(0, 0, 5), kids)).toBe(0);
  });

  it("puts a position inside the bounds of its key at every level", function () {
    var random = Random(4);

    for (var i = 0; i < 2000; i++) {
      var x = random.range(-512, 512),
        z = random.range(-512, 512);

      for (var l = 0; l <= 5; l++)
        expect(inside(tree.bounds(tree.keyOf(x, z, l), box), x, z)).toBe(true);
    }
  });

  it("within gives what looking at every node of the level would", function () {
    var random = Random(5);

    for (var t = 0; t < 300; t++) {
      var l = random.int(0, 5),
        minX = random.range(-700, 600),
        minZ = random.range(-700, 600),
        maxX = minX + random.range(0, 300),
        maxZ = minZ + random.range(0, 300),
        across = Math.pow(2, l),
        expected = [];

      for (var ix = 0; ix < across; ix++)
        for (var iz = 0; iz < across; iz++) {
          var k = tree.key(ix, iz, l);

          if (overlaps(tree.bounds(k, box), minX, minZ, maxX, maxZ))
            expected.push(k);
        }

      var n = tree.within(minX, minZ, maxX, maxZ, l, out);

      expect(sorted(out, n)).toEqual(expected.sort((p, q) => p - q));
    }
  });

  it("gives the neighbours inside the root only", function () {
    expect(tree.neighbours(tree.key(0, 0, 5), out)).toBe(3);
    expect(tree.neighbours(tree.key(3, 3, 5), out)).toBe(8);
    expect(tree.neighbours(0, out)).toBe(0);
  });

  it("goes as deep as 23 levels with keys still whole numbers", function () {
    var deep = Quadtree(0, 0, Math.pow(2, 23), 23),
      k = deep.keyOf(Math.pow(2, 23) - 0.5, Math.pow(2, 23) - 0.5);

    expect(Number.isSafeInteger(k)).toBe(true);
    expect(deep.cellX(k)).toBe(Math.pow(2, 23) - 1);
    expect(deep.parent(k)).toBe(
      deep.keyOf(Math.pow(2, 23) - 1, Math.pow(2, 23) - 1, 22),
    );
    expect(function () {
      Quadtree(0, 0, 1, 24);
    }).toThrow();
  });
});

describe("GridIndex", function () {
  it("finds what looking at every point would, as points come, move and go", function () {
    var index = GridIndex(16, 4),
      random = Random(6),
      xs = new Float64Array(500),
      zs = new Float64Array(500),
      present = new Uint8Array(500),
      ids = new Float64Array(500);

    for (var step = 0; step < 4000; step++) {
      var id = random.int(0, 499);

      if (random.chance(0.2)) {
        expect(index.remove(id)).toBe(present[id] === 1);
        present[id] = 0;
      } else {
        xs[id] = random.range(-200, 200);
        zs[id] = random.range(-200, 200);
        present[id] = 1;
        index.set(id, xs[id], zs[id]);
      }

      if (step % 50) continue;

      var minX = random.range(-220, 200),
        minZ = random.range(-220, 200),
        maxX = minX + random.range(0, 120),
        maxZ = minZ + random.range(0, 120),
        expected = [];

      for (var i = 0; i < 500; i++)
        if (
          present[i] &&
          xs[i] >= minX &&
          xs[i] <= maxX &&
          zs[i] >= minZ &&
          zs[i] <= maxZ
        )
          expected.push(i);

      var n = index.query(minX, minZ, maxX, maxZ, ids);

      expect(sorted(ids, n)).toEqual(expected);
    }

    var total = 0;

    for (i = 0; i < 500; i++) total += present[i];
    expect(index.size).toBe(total);
  });

  it("counts past what out has room for", function () {
    var index = GridIndex(1);

    for (var i = 0; i < 10; i++) index.set(i, 0.5, 0.5);
    expect(index.query(0, 0, 1, 1, new Float64Array(3))).toBe(10);
  });
});

describe("hilbert", function () {
  it("keeps its numbers, and visits every cell of a small grid once", function () {
    expect([hilbert(0, 0), hilbert(1, 0), hilbert(65535, 65535)]).toEqual([
      0, 1, 2863311530,
    ]);

    var seen = new Set();

    for (var x = 0; x < 64; x++)
      for (var y = 0; y < 64; y++) seen.add(hilbert(x * 1024, y * 1024));
    expect(seen.size).toBe(4096);
  });
});

describe("PackedTree", function () {
  function boxesOf(random, n, spread, big) {
    var b = new Float64Array(n * 4);

    for (var i = 0; i < n; i++) {
      var x = random.range(-spread, spread),
        z = random.range(-spread, spread);

      b[i * 4] = x;
      b[i * 4 + 1] = z;
      b[i * 4 + 2] = x + random.range(0, big);
      b[i * 4 + 3] = z + random.range(0, big);
    }

    return b;
  }

  function build(b, n, nodeSize) {
    var tree = PackedTree(n, nodeSize);

    for (var i = 0; i < n; i++)
      tree.add(b[i * 4], b[i * 4 + 1], b[i * 4 + 2], b[i * 4 + 3]);

    return tree.finish();
  }

  it("finds what looking at every box, and flatbush, would", function () {
    var random = Random(7),
      ids = new Uint32Array(20000);

    [0, 1, 5, 16, 17, 300, 5000].forEach(function (n) {
      [4, 16].forEach(function (nodeSize) {
        var b = boxesOf(random, n, 500, 30),
          tree = build(b, n, nodeSize),
          flat = n ? new Flatbush(n, nodeSize) : null;

        for (var i = 0; i < n; i++)
          flat.add(b[i * 4], b[i * 4 + 1], b[i * 4 + 2], b[i * 4 + 3]);
        if (flat) flat.finish();

        for (var q = 0; q < 50; q++) {
          var x0 = random.range(-600, 500),
            z0 = random.range(-600, 500),
            x1 = x0 + random.range(0, 200),
            z1 = z0 + random.range(0, 200),
            expected = [];

          for (i = 0; i < n; i++)
            if (
              b[i * 4] <= x1 &&
              b[i * 4 + 1] <= z1 &&
              b[i * 4 + 2] >= x0 &&
              b[i * 4 + 3] >= z0
            )
              expected.push(i);

          var got = sorted(ids, tree.search(x0, z0, x1, z1, ids));

          expect(got).toEqual(expected);
          if (flat)
            expect(got).toEqual(
              flat.search(x0, z0, x1, z1).sort(function (p, r) {
                return p - r;
              }),
            );
        }
      });
    });
  });

  it("around finds the boxes within a distance, as looking at every one would", function () {
    var random = Random(8),
      n = 3000,
      b = boxesOf(random, n, 1000, 20),
      tree = build(b, n),
      ids = new Uint32Array(n);

    for (var q = 0; q < 100; q++) {
      var x = random.range(-1000, 1000),
        z = random.range(-1000, 1000),
        r = random.range(0, 150),
        expected = [];

      for (var i = 0; i < n; i++) {
        var dx = Math.max(b[i * 4] - x, 0, x - b[i * 4 + 2]),
          dz = Math.max(b[i * 4 + 1] - z, 0, z - b[i * 4 + 3]);

        if (dx * dx + dz * dz <= r * r) expected.push(i);
      }

      expect(sorted(ids, tree.around(x, z, r, ids))).toEqual(expected);
    }
  });

  it("holds points, and finds what kdbush finds", function () {
    var random = Random(9),
      n = 4000,
      tree = PackedTree(n),
      kd = new KDBush(n),
      index = GridIndex(32),
      ids = new Uint32Array(n);

    for (var i = 0; i < n; i++) {
      var x = random.range(0, 1000),
        z = random.range(0, 1000);

      tree.add(x, z, x, z);
      kd.add(x, z);
      index.set(i, x, z);
    }
    tree.finish();
    kd.finish();

    for (var q = 0; q < 100; q++) {
      var x0 = random.range(-50, 1000),
        z0 = random.range(-50, 1000),
        x1 = x0 + random.range(0, 120),
        z1 = z0 + random.range(0, 120),
        expected = kd.range(x0, z0, x1, z1).sort(function (p, r) {
          return p - r;
        });

      expect(sorted(ids, tree.search(x0, z0, x1, z1, ids))).toEqual(expected);
      expect(sorted(ids, index.query(x0, z0, x1, z1, ids))).toEqual(expected);
    }
  });

  it("says so when used before it is finished, or filled wrong", function () {
    var tree = PackedTree(2);

    tree.add(0, 0, 1, 1);
    expect(function () {
      tree.search(0, 0, 1, 1, ids4());
    }).toThrow();
    expect(function () {
      tree.finish();
    }).toThrow();
    tree.add(0, 0, 1, 1);
    expect(function () {
      tree.add(0, 0, 1, 1);
    }).toThrow();
  });

  function ids4() {
    return new Uint32Array(4);
  }
});
