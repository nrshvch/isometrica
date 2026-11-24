import { test } from "vitest";
import { Records, fromText, toText } from "./index.js";

//a world saved by region: 2000 regions of 2 KB, 40 marked a save of which
//10 changed - against making all of it again as JSON, as a save of the
//whole would
var REGIONS = 2000,
  SIZE = 2048,
  MARKED = 40,
  CHANGED = 10;

test("records", async function ({ bench }) {
  var data = [],
    plain = [],
    keep = Records(REGIONS),
    k,
    i;

  for (k = 0; k < REGIONS; k++) {
    var b = new Uint8Array(SIZE),
      row = [];

    for (i = 0; i < SIZE; i++) b[i] = (k * 31 + i * 7) & 255;
    for (i = 0; i < SIZE / 8; i++) row.push((k * 31 + i * 7) & 1023);
    data.push(b);
    plain.push(row);
    keep.known(k, 1, b);
  }

  var round = 0,
    sunk = 0,
    write = function (key, version, bytes) {
      sunk += bytes === null ? 0 : bytes.length;
    },
    make = function (key) {
      return data[key];
    };

  var big = new Uint8Array(65536),
    bigText;

  for (i = 0; i < big.length; i++) big[i] = (i * 13) & 255;
  bigText = toText(big);

  await bench.compare(
    bench("a save by region: 40 marked, 10 changed, of 2000", function () {
      for (i = 0; i < MARKED; i++) {
        k = (round * 97 + i * 53) % REGIONS;
        if (i < CHANGED) data[k][round % SIZE]++;
        keep.mark(k);
      }
      round++;
      keep.collect(make, write);
    }),
    bench("the whole of it as JSON", function () {
      plain[round % REGIONS][0]++;
      round++;
      sunk += JSON.stringify(plain).length;
    }),
  );
  await bench.compare(
    bench("toText 64 KB", function () {
      sunk += toText(big).length;
    }),
    bench("fromText 64 KB", function () {
      sunk += fromText(bigText).length;
    }),
    bench("Buffer base64 64 KB (node's own)", function () {
      sunk += Buffer.from(big).toString("base64").length;
    }),
    bench("toText 2 KB", function () {
      sunk += toText(data[1]).length;
    }),
  );
  //kept, so nothing above is taken out as unused
  if (sunk < 0) throw new Error("never");
});
