import { describe, expect, it } from "vitest";
import Random from "../random/index.js";
import { Integral } from "./index.js";

//f as Integral holds it: sampled in the middle of each step
function held(f, step, t) {
  return f((Math.floor(t / step) + 0.5) * step);
}

//the plain way: the moments added up over many small pieces of each step
function plain(f, step, a, b) {
  var out = [0, 0, 0],
    k = Math.floor(a / step);

  for (; k * step < b; k++) {
    var lo = Math.max(a, k * step),
      hi = Math.min(b, (k + 1) * step);

    if (hi <= lo) continue;

    var v = held(f, step, lo);

    for (var n = 0; n < 3; n++)
      out[n] +=
        (v * (Math.pow(hi - a, n + 1) - Math.pow(lo - a, n + 1))) / (n + 1);
  }

  return out;
}

function wave(t) {
  return Math.sin(t / 900) * 3 + Math.cos(t / 2700 + 1) * 1.5;
}

function close(a, b, rel) {
  var scale = Math.max(1, Math.abs(b));

  return Math.abs(a - b) <= (rel || 1e-9) * scale;
}

describe("Integral", function () {
  it("gives a constant's integral and moments exactly", function () {
    var I = Integral(1, 10, 1000, function (t, out) {
        out[0] = 2;
      }),
      out = new Float64Array(3);

    I.over(103, 503, out);
    expect(out[0]).toBeCloseTo(800, 9);
    expect(out[1]).toBeCloseTo((2 * 400 * 400) / 2, 6);
    expect(out[2]).toBeCloseTo((2 * 400 * 400 * 400) / 3, 3);
  });

  it("is the plain way's sum over random stretches", function () {
    var random = Random(11),
      step = 100,
      I = Integral(2, step, 60000, function (t, out) {
        out[0] = wave(t);
        out[1] = -wave(t * 1.7);
      }),
      out = new Float64Array(6),
      now = 1.8e12;

    for (var i = 0; i < 400; i++) {
      now += random.range(0, 300);

      var a = now - random.range(0, 50000),
        b = a + random.range(0, now - a);

      I.over(a, b, out);

      var p0 = plain(wave, step, a, b),
        p1 = plain(
          function (t) {
            return -wave(t * 1.7);
          },
          step,
          a,
          b,
        );

      for (var n = 0; n < 3; n++) {
        expect(close(out[n], p0[n], 1e-7)).toBe(true);
        expect(close(out[3 + n], p1[n], 1e-7)).toBe(true);
      }
    }
  });

  it("gives the same in any order asked", function () {
    var make = function () {
        return Integral(1, 50, 20000, function (t, out) {
          out[0] = wave(t);
        });
      },
      one = make(),
      two = make(),
      out = new Float64Array(3),
      times = [],
      random = Random(5),
      i;

    for (i = 0; i < 200; i++) times.push(5e6 + random.range(0, 15000));

    var first = times.map(function (t) {
      return Array.from(one.over(t, t + 3000, out));
    });

    //the other asked for them backwards, after a stretch far on
    two.over(5e6 + 18000, 5e6 + 18500, out);
    for (i = times.length - 1; i >= 0; i--) {
      var got = Array.from(two.over(times[i], times[i] + 3000, out));

      for (var n = 0; n < 3; n++)
        expect(close(got[n], first[i][n], 1e-9)).toBe(true);
    }
  });

  it("holds f over each step, sampled in its middle", function () {
    var I = Integral(1, 100, 1000, function (t, out) {
        out[0] = t;
      }),
      out = new Float64Array(1);

    expect(I.at(1234, out)[0]).toBe(1250);
    expect(I.at(1299.9, out)[0]).toBe(1250);
    expect(I.at(1300, out)[0]).toBe(1350);
  });

  it("starts a stretch from too long ago where what is kept starts", function () {
    var I = Integral(1, 10, 100, function (t, out) {
        out[0] = 1;
      }),
      out = new Float64Array(3);

    I.over(1000, 1000, out);
    //kept: back to 1000 - 100 at least, not to 0
    I.over(0, 1000, out);
    expect(out[0]).toBeGreaterThanOrEqual(100);
    expect(out[0]).toBeLessThan(200);
  });

  it("starts again after a jump, and stays exact long after", function () {
    var I = Integral(
        1,
        100,
        10000,
        function (t, out) {
          out[0] = wave(t);
        },
        2000,
      ),
      out = new Float64Array(3),
      t = 1e9;

    for (var i = 0; i < 50; i++) {
      t += i % 7 === 0 ? 1e6 : 900;
      I.over(t - 6500, t, out);

      var p = plain(wave, 100, t - 6500, t);

      for (var n = 0; n < 3; n++) expect(close(out[n], p[n], 1e-7)).toBe(true);
    }
  });

  it("gives nothing over nothing", function () {
    var I = Integral(1, 100, 1000, function (t, out) {
        out[0] = 5;
      }),
      out = new Float64Array(3);

    expect(Array.from(I.over(500, 500, out))).toEqual([0, 0, 0]);
    expect(Array.from(I.over(500, 400, out))).toEqual([0, 0, 0]);
  });
});
