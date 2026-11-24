import { describe, expect, it } from "vitest";
import Random from "../random/index.js";
import {
  BitSet,
  Heap,
  List,
  NumMap,
  RadixSort,
  Store,
  grow,
  slotOf,
} from "./index.js";

describe("grow", function () {
  it("keeps the type and what was in it, at least doubled", function () {
    var a = new Int16Array([1, -2, 3]),
      b = grow(a, 4);

    expect(b).toBeInstanceOf(Int16Array);
    expect(b.length).toBeGreaterThanOrEqual(6);
    expect(Array.from(b.subarray(0, 3))).toEqual([1, -2, 3]);
    expect(grow(a, 2)).toBe(a);
  });
});

describe("Store", function () {
  it("adds records with zeroed columns, and finds them by handle", function () {
    var store = Store({ x: Float64Array, kind: Uint8Array }, 2),
      a = store.add(),
      b = store.add();

    store.cols.x[store.slot(a)] = 1.5;
    store.cols.kind[store.slot(b)] = 7;

    expect(store.count).toBe(2);
    expect(store.cols.x[store.slot(a)]).toBe(1.5);
    expect(store.cols.kind[store.slot(b)]).toBe(7);
  });

  it("tells a handle to something removed from what is in its slot now", function () {
    var store = Store({ x: Float32Array }, 4),
      a = store.add();

    expect(store.remove(a)).toBe(true);
    expect(store.alive(a)).toBe(false);
    expect(store.slot(a)).toBe(-1);
    expect(store.remove(a)).toBe(false);

    var b = store.add();

    expect(slotOf(b)).toBe(slotOf(a));
    expect(b).not.toBe(a);
    expect(store.alive(b)).toBe(true);
    expect(store.alive(a)).toBe(false);
    expect(store.cols.x[store.slot(b)]).toBe(0);
  });

  it("keeps live[0..count) the slots alive, through growing and removing, as a Set would", function () {
    var store = Store({ v: Uint32Array }, 1),
      random = Random(11),
      handles = new Set();

    for (var step = 0; step < 5000; step++) {
      if (handles.size && random.chance(0.4)) {
        var all = Array.from(handles),
          h = all[random.int(0, all.length - 1)];

        expect(store.remove(h)).toBe(true);
        handles.delete(h);
      } else {
        h = store.add();
        store.cols.v[store.slot(h)] = h;
        handles.add(h);
      }
    }

    expect(store.count).toBe(handles.size);

    var seen = new Set();

    for (var i = 0; i < store.count; i++) {
      var slot = store.live[i];

      seen.add(store.handle(slot));
      expect(store.cols.v[slot]).toBe(store.handle(slot));
    }
    expect(seen).toEqual(handles);
  });

  it("clear lets every record go", function () {
    var store = Store({ v: Uint8Array }),
      a = store.add();

    store.add();
    store.clear();

    expect(store.count).toBe(0);
    expect(store.alive(a)).toBe(false);
    store.add();
    expect(store.count).toBe(1);
  });
});

describe("List", function () {
  it("pushes, grows, and takes out by moving the last one in", function () {
    var list = List(Uint16Array, 1);

    for (var i = 0; i < 10; i++) list.push(i);

    expect(list.count).toBe(10);
    expect(list.removeAt(2)).toBe(2);
    expect(list.items[2]).toBe(9);
    expect(list.remove(5)).toBe(true);
    expect(list.remove(5)).toBe(false);
    expect(list.indexOf(9)).toBe(2);
    expect(list.count).toBe(8);
  });
});

describe("Heap", function () {
  it("gives the values back in the order of their keys", function () {
    var heap = Heap(2),
      random = Random(3),
      keys = [];

    for (var i = 0; i < 1000; i++) {
      var k = random.int(0, 100);

      keys.push(k);
      heap.push(k, k * 10);
    }
    keys.sort(function (a, b) {
      return a - b;
    });

    for (i = 0; i < keys.length; i++) {
      expect(heap.peekKey()).toBe(keys[i]);
      expect(heap.pop()).toBe(keys[i] * 10);
    }
    expect(heap.size).toBe(0);
    expect(heap.peekKey()).toBe(Infinity);
    expect(heap.pop()).toBe(-1);
  });
});

describe("BitSet", function () {
  it("sets, unsets and counts, growing as it goes", function () {
    var bits = BitSet(8);

    bits.set(3);
    bits.set(31);
    bits.set(32);
    bits.set(1000);

    expect(bits.has(3)).toBe(true);
    expect(bits.has(4)).toBe(false);
    expect(bits.has(1000)).toBe(true);
    expect(bits.has(100000)).toBe(false);
    expect(bits.count()).toBe(4);

    bits.unset(31);
    expect(bits.has(31)).toBe(false);
    expect(bits.count()).toBe(3);

    bits.clear();
    expect(bits.count()).toBe(0);
  });
});

describe("NumMap", function () {
  it("does what a Map does, for keys up to 2^53, through growing and deleting", function () {
    var map = NumMap(4),
      plain = new Map(),
      random = Random(5);

    for (var step = 0; step < 20000; step++) {
      //few keys, so they collide, are deleted and come back
      var key = random.chance(0.5)
        ? random.int(0, 300)
        : random.int(0, 300) * 4294967296 + 7;

      if (random.chance(0.3)) {
        expect(map.delete(key)).toBe(plain.delete(key));
      } else {
        map.set(key, step);
        plain.set(key, step);
      }
    }

    expect(map.size).toBe(plain.size);
    plain.forEach(function (v, k) {
      expect(map.get(k)).toBe(v);
    });

    var count = 0;

    map.forEach(function (k, v) {
      expect(plain.get(k)).toBe(v);
      count++;
    });
    expect(count).toBe(plain.size);

    expect(map.get(Math.pow(2, 52), "none")).toBe("none");
    expect(map.has(Math.pow(2, 52))).toBe(false);
  });

  it("clear empties it", function () {
    var map = NumMap();

    map.set(1, 2);
    map.clear();
    expect(map.size).toBe(0);
    expect(map.has(1)).toBe(false);
  });
});

describe("RadixSort", function () {
  it("sorts as Array.prototype.sort does, and keeps equal keys in order", function () {
    var radix = RadixSort(4),
      random = Random(8);

    [0, 1, 2, 100, 5000].forEach(function (n) {
      [255, 65535, 4294967295].forEach(function (top) {
        var keys = new Uint32Array(n),
          values = new Uint32Array(n);

        for (var i = 0; i < n; i++) {
          keys[i] = random.int(0, top);
          values[i] = i;
        }

        var expected = Array.from(keys, function (k, i) {
          return [k, i];
        }).sort(function (a, b) {
          return a[0] - b[0] || a[1] - b[1];
        });

        radix.sort(keys, values, n);

        expect(Array.from(keys)).toEqual(
          expected.map(function (e) {
            return e[0];
          }),
        );
        expect(Array.from(values)).toEqual(
          expected.map(function (e) {
            return e[1];
          }),
        );
      });
    });
  });

  it("leaves what is past n alone", function () {
    var keys = new Uint32Array([3, 1, 2, 0]),
      values = new Uint32Array([0, 1, 2, 3]);

    RadixSort().sort(keys, values, 3);
    expect(Array.from(keys)).toEqual([1, 2, 3, 0]);
    expect(Array.from(values)).toEqual([1, 2, 0, 3]);
  });
});
