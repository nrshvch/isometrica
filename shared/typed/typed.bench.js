import { test } from "vitest";
import Random from "../random/index.js";
import { NumMap, RadixSort, Store } from "./index.js";

var N = 100000,
  random = Random(1),
  keys = new Uint32Array(N),
  workKeys = new Uint32Array(N),
  workValues = new Uint32Array(N),
  radix = RadixSort(N),
  mapKeys = new Float64Array(N);

for (var i = 0; i < N; i++) {
  keys[i] = random.int(0, 4294967295);
  mapKeys[i] = random.int(0, 1 << 20) * 4096 + random.int(0, 4095);
}

test("RadixSort beside Array.prototype.sort", async function ({ bench }) {
  await bench.compare(
    bench("radix sort, 100k keys with values", function () {
      workKeys.set(keys);
      for (var i = 0; i < N; i++) workValues[i] = i;
      radix.sort(workKeys, workValues, N);
    }),
    bench("typed array sort, 100k keys alone", function () {
      workKeys.set(keys);
      workKeys.sort();
    }),
  );
});

test("NumMap beside Map", async function ({ bench }) {
  var map = NumMap(N),
    plain = new Map();

  await bench.compare(
    bench("NumMap, 100k set then get", function () {
      map.clear();
      for (var i = 0; i < N; i++) map.set(mapKeys[i], i);
      for (i = 0; i < N; i++) map.get(mapKeys[i], -1);
    }),
    bench("Map, 100k set then get", function () {
      plain.clear();
      for (var i = 0; i < N; i++) plain.set(mapKeys[i], i);
      for (i = 0; i < N; i++) plain.get(mapKeys[i]);
    }),
  );
});

test("Store beside objects", async function ({ bench }) {
  var store = Store({ x: Float64Array, z: Float64Array }, N),
    handles = new Uint32Array(N),
    objects = [];

  for (var i = 0; i < N; i++) {
    handles[i] = store.add();
    store.cols.x[store.slot(handles[i])] = i;
    objects.push({ x: i, z: 0, at: i });
  }

  await bench.compare(
    bench("Store, 100k records walked", function () {
      var x = store.cols.x,
        z = store.cols.z,
        live = store.live,
        n = store.count;

      for (var i = 0; i < n; i++) {
        var slot = live[i];

        z[slot] += x[slot];
      }
    }),
    bench("objects in an array, 100k walked", function () {
      for (var i = 0, n = objects.length; i < n; i++) {
        var o = objects[i];

        o.z += o.x;
      }
    }),
  );

  var churn = [];

  await bench.compare(
    bench("Store, 10k removed and added again", function () {
      for (var i = 0; i < 10000; i++) {
        store.remove(handles[i]);
        handles[i] = store.add();
      }
    }),
    bench(
      "objects, 10k taken out (last moved in) and added again",
      function () {
        for (var i = 0; i < 10000; i++) {
          var o = objects[i],
            last = objects.pop();

          if (last !== o) {
            objects[o.at] = last;
            last.at = o.at;
          }
          churn[0] = { x: i, z: 0, at: objects.length };
          objects.push(churn[0]);
        }
      },
    ),
  );
});
