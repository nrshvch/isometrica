import { test } from "vitest";
import { COARSE, FULL, Scheduler } from "./index.js";

var N = 10000;

function work() {}

test("Scheduler", async function ({ bench }) {
  var full = Scheduler({ budget: Infinity }),
    coarse = Scheduler({ period: 250, budget: Infinity }),
    t = 0;

  full.system("a", work);
  full.system("b", work);
  coarse.system("a", work);
  coarse.system("b", work);

  for (var k = 0; k < N; k++) {
    full.set(k, FULL, 0);
    coarse.set(k * 7919, COARSE, k % 64, 0);
  }

  await bench.compare(
    bench("full, 10k regions x 2 systems a step", function () {
      full.full(33);
    }),
    bench(
      "coarse, 10k regions, a frame's turns due, sorted by distance",
      function () {
        t += 33;
        coarse.coarse(t);
      },
    ),
    bench("set, 10k regions changing tier", function () {
      for (var k = 0; k < N; k++) full.set(k, k & 1 ? COARSE : FULL, k & 63, t);
    }),
  );
});
