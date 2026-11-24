import { describe, expect, it } from "vitest";
import Random, { toss } from "./index.js";

function draws(random, n) {
  var out = new Float64Array(n);

  for (var i = 0; i < n; i++) out[i] = random.next();

  return out;
}

describe("Random", function () {
  it("gives the same numbers for the same seed", function () {
    expect(draws(Random(123), 1000)).toEqual(draws(Random(123), 1000));
  });

  it("keeps the numbers it always gave (generated cities depend on them)", function () {
    expect(Array.from(draws(Random(1), 3))).toEqual([
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522,
    ]);
    expect(Array.from(draws(Random(42).fork(7), 2))).toEqual([
      0.7362900443840772, 0.23150724521838129,
    ]);
  });

  it("gives other numbers for another seed", function () {
    expect(draws(Random(1), 10)).not.toEqual(draws(Random(2), 10));
  });

  it("stays in [0, 1)", function () {
    var all = draws(Random(7), 100000);

    for (var i = 0; i < all.length; i++) {
      expect(all[i]).toBeGreaterThanOrEqual(0);
      expect(all[i]).toBeLessThan(1);
    }
  });

  it("int covers lo..hi, both ends included", function () {
    var random = Random(9),
      seen = new Uint32Array(7);

    for (var i = 0; i < 10000; i++) {
      var v = random.int(1, 6);

      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
      seen[v]++;
    }

    for (var k = 1; k <= 6; k++) expect(seen[k]).toBeGreaterThan(0);
  });

  it("range stays in [lo, hi)", function () {
    var random = Random(3);

    for (var i = 0; i < 10000; i++) {
      var v = random.range(-2, 5);

      expect(v).toBeGreaterThanOrEqual(-2);
      expect(v).toBeLessThan(5);
    }
  });

  it("chance never for 0, always for 1", function () {
    var random = Random(4);

    for (var i = 0; i < 1000; i++) {
      expect(random.chance(0)).toBe(false);
      expect(random.chance(1)).toBe(true);
    }
  });

  it("pick takes one of the list", function () {
    var random = Random(5),
      list = ["a", "b", "c"];

    for (var i = 0; i < 100; i++) expect(list).toContain(random.pick(list));
  });

  it("weighted never picks a weight of nothing, and goes by the weights", function () {
    var random = Random(6),
      counts = { a: 0, b: 0, c: 0 };

    for (var i = 0; i < 30000; i++)
      counts[random.weighted({ a: 1, b: 2, c: 0 })]++;

    expect(counts.c).toBe(0);
    expect(counts.b / counts.a).toBeGreaterThan(1.8);
    expect(counts.b / counts.a).toBeLessThan(2.2);
  });

  it("shuffle keeps every element, the same way for the same seed", function () {
    var a = Random(8).shuffle([1, 2, 3, 4, 5, 6, 7, 8]),
      b = Random(8).shuffle([1, 2, 3, 4, 5, 6, 7, 8]);

    expect(a).toEqual(b);
    expect(a.slice().sort()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("fork does not move the stream it is forked from", function () {
    var forked = Random(10),
      plain = Random(10);

    forked.fork(1);
    forked.fork(2);

    expect(draws(forked, 100)).toEqual(draws(plain, 100));
  });

  it("forks by the same salt agree, by another salt do not", function () {
    var random = Random(11);

    expect(draws(random.fork(1), 100)).toEqual(draws(random.fork(1), 100));
    expect(draws(random.fork(1), 100)).not.toEqual(draws(random.fork(2), 100));
  });
});

describe("toss", function () {
  it("keeps the numbers it always gave (worlds will depend on them)", function () {
    expect([
      toss(1, 0, 0, 0),
      toss(1, 2251799847239680, 7, 30),
      toss(42, 9637, 4194305, 123456789, 3),
    ]).toEqual([0.5978251753840595, 0.1048732795752585, 0.33094798028469086]);
  });

  it("gives the same toss whatever was tossed before, in any order", function () {
    var forward = [],
      backward = [];

    for (var i = 0; i < 100; i++) forward.push(toss(5, i, i * 3, 1000));
    for (i = 99; i >= 0; i--) backward[i] = toss(5, i, i * 3, 1000);

    expect(backward).toEqual(forward);
  });

  it("changes with every number put in, the high bits of each too", function () {
    var base = toss(1, 2, 3, 4, 5),
      big = Math.pow(2, 40);

    [
      toss(2, 2, 3, 4, 5),
      toss(1, 3, 3, 4, 5),
      toss(1, 2, 4, 4, 5),
      toss(1, 2, 3, 5, 5),
      toss(1, 2, 3, 4, 6),
      toss(1, 2 + big, 3, 4, 5),
      toss(1, 2, 3 + big, 4, 5),
      toss(1, 2, 3, 4 + big, 5),
    ].forEach(function (t) {
      expect(t).not.toBe(base);
    });

    //and does not mistake one argument for its neighbour
    expect(toss(1, 1, 0, 0)).not.toBe(toss(1, 0, 1, 0));
    expect(toss(1, 0, 1, 0)).not.toBe(toss(1, 0, 0, 1));
  });

  it("stays in [0, 1), spread evenly over neighbouring records and steps", function () {
    var buckets = new Uint32Array(10),
      n = 0;

    for (var record = 0; record < 200; record++)
      for (var step = 0; step < 200; step++) {
        var t = toss(9, 77, record, step);

        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThan(1);
        buckets[Math.floor(t * 10)]++;
        n++;
      }

    for (var b = 0; b < 10; b++) {
      expect(buckets[b]).toBeGreaterThan(n / 10 - 300);
      expect(buckets[b]).toBeLessThan(n / 10 + 300);
    }
  });
});
