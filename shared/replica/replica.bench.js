import { test } from "vitest";
import { Reader, Table, Writer } from "./index.js";

//a region's rows: 10k of 6 numbers, a hundred of them changed a step
var ROWS = 10000,
  FIELDS = 6,
  CHANGED = 100;

test("replica", async function ({ bench }) {
  var owner = Table(FIELDS, ROWS),
    mirror = Table(FIELDS, ROWS),
    plain = [],
    w = Writer(1 << 16),
    r = Reader(),
    k = 0,
    r0,
    f;

  for (r0 = 0; r0 < ROWS; r0++) {
    plain.push([0, 0, 0, 0, 0, 0]);
    for (f = 0; f < FIELDS; f++) owner.set(r0, f, r0 * FIELDS + f);
  }
  w.begin(-1);
  owner.snapshot(w, 1);

  function change() {
    for (var i = 0; i < CHANGED; i++) {
      var row = (k * 7919 + i * 104729) % ROWS;

      owner.set(row, i % FIELDS, k + i);
      plain[row][i % FIELDS] = k + i;
    }
    k++;
  }

  function applied(bytes) {
    r.open(bytes);
    while (r.next() >= 0) mirror.apply(r);
  }

  await bench.compare(
    bench("Table: 100 of 10k rows changed, packed and applied", function () {
      change();
      w.begin(k);
      owner.changes(w, 1);
      applied(w.end(k + 1));
    }),
    bench("JSON: the same 100 rows stringified and parsed", function () {
      change();
      var out = [];

      for (var i = 0; i < CHANGED; i++) {
        var row = (k * 7919 + i * 104729) % ROWS;

        out.push([row, plain[row]]);
      }
      JSON.parse(JSON.stringify(out));
    }),
    bench("structuredClone: the same 100 rows", function () {
      change();
      var out = [];

      for (var i = 0; i < CHANGED; i++) {
        var row = (k * 7919 + i * 104729) % ROWS;

        out.push([row, plain[row]]);
      }
      structuredClone(out);
    }),
  );

  await bench.compare(
    bench("Table: a snapshot of 10k rows, packed and applied", function () {
      w.begin(-1);
      owner.snapshot(w, 1);
      applied(w.end(k));
    }),
    bench("JSON: 10k rows stringified and parsed", function () {
      JSON.parse(JSON.stringify(plain));
    }),
    bench("structuredClone: 10k rows", function () {
      structuredClone(plain);
    }),
  );

  var text = JSON.stringify({
    type: "build",
    code: 12,
    tile: 1782349123,
    rotation: 1,
  });

  await bench.compare(
    bench("Writer: 60 steps and a command, written and read", function () {
      w.begin(k);
      for (var i = 0; i < 60; i++) w.record(2, [50, i], 2);
      w.text(3, [k], 1, text);
      r.open(w.end(k + 1));
      while (r.next() >= 0) if (r.kind === 3) r.text();
    }),
    bench(
      "postMessage-like: the same as objects, structuredClone",
      function () {
        var out = [];

        for (var i = 0; i < 60; i++) out.push({ kind: 2, ms: 50, i: i });
        out.push({ kind: 3, id: k, command: text });
        structuredClone(out);
      },
    ),
  );
});
