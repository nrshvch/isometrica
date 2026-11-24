import { test } from "vitest";
import Random from "./index.js";

var N = 100000,
  out = new Float64Array(N),
  weights = { a: 1, b: 2, c: 3, d: 4 };

test("Random", async function ({ bench }) {
  await bench.compare(
    bench("next, 100k into a typed array", function () {
      var random = Random(1);

      for (var i = 0; i < N; i++) out[i] = random.next();
    }),
    bench("int, 100k", function () {
      var random = Random(2);

      for (var i = 0; i < N; i++) out[i] = random.int(0, 255);
    }),
    bench("weighted of 4, 10k", function () {
      var random = Random(3);

      for (var i = 0; i < 10000; i++) random.weighted(weights);
    }),
    bench("fork, 10k", function () {
      var random = Random(4);

      for (var i = 0; i < 10000; i++) random.fork(i);
    }),
  );
});
