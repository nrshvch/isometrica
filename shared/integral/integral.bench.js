import { test } from "vitest";
import { Integral } from "./index.js";

//a wind: a few slow waves, two channels and how hard - what a puff of smoke
//asks of it, a thousand puffs a frame
function wind(t, out) {
  var a = 0.7 + Math.sin(t / 170000) * 1.6 + Math.sin(t / 41000 + 2) * 0.5,
    s = 3 + 2.4 * Math.sin(t / 61000 + 1);

  out[0] = Math.cos(a) * s;
  out[1] = Math.sin(a) * s;
  out[2] = s;
}

var N = 1000,
  starts = new Float64Array(N),
  out = new Float64Array(9),
  sink = new Float64Array(2);

for (var i = 0; i < N; i++) starts[i] = 1.8e12 - ((i * 7919) % 6500);

test("Integral", async function ({ bench }) {
  var I = Integral(3, 100, 120000, wind),
    now = 1.8e12;

  await bench.compare(
    bench("over, 1000 stretches of up to 6.5 s", function () {
      for (var i = 0; i < N; i++) I.over(starts[i], now, out);
    }),
    bench("the plain way: 1000 stretches summed step by step", function () {
      for (var i = 0; i < N; i++) {
        sink[0] = sink[1] = 0;

        for (var t = starts[i]; t < now; t += 100) {
          wind(t, out);
          sink[0] += out[0] * 100;
          sink[1] += out[0] * (t - starts[i]) * 100;
        }
      }
    }),
    bench("a frame's new steps, 30 frames a second, 10 s", function () {
      var J = Integral(3, 100, 120000, wind);

      for (var f = 0; f < 300; f++)
        J.over(now + f * 33 - 6500, now + f * 33, out);
    }),
  );
});
