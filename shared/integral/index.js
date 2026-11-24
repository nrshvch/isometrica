/**
 * A function of time integrated as time goes on, so that over any stretch of
 * the last while its integral and first two moments come in a few sums,
 * however long the stretch: what an effect worked out from its start and the
 * time needs of something that changed all the while it went (a puff of
 * smoke and the wind: engine/docs/world.md, Three kinds of things).
 *
 * f is sampled once a step, in the middle of it, and held across it; the
 * steps go by the time itself (step k is [k * step, (k + 1) * step)), never
 * by when they were filled in, so the same stretch gives the same numbers
 * whoever asks, in any order. Running sums are kept in a ring as far back as
 * window; they are started again from nothing after a jump longer than that,
 * and every rebase steps, so that they stay small enough to be exact.
 *
 *   var wind = Integral(2, 100, 60000, function (t, out) {
 *     out[0] = Math.sin(t / 1000);
 *     out[1] = Math.cos(t / 1000);
 *   });
 *   wind.over(a, b, out); //out[c * 3 + n] = ∫ from a to b of (τ - a)^n f_c(τ) dτ
 *   wind.at(t, out); //f_c as held over the step t is in
 */

/**
 * @param channels {number} how many numbers f gives
 * @param step {number} how long f is held, in the units of the time
 * @param window {number} how far back from the latest time asked for a
 *        stretch may start
 * @param sample {function(number, Float64Array)} f at t into out[0..channels)
 * @param [rebase] {number} steps after which the sums start again
 */
export function Integral(channels, step, window, sample, rebase) {
  var cap = Math.ceil(window / step) + 3,
    C = channels,
    //the sums at every boundary kept, n = 0..2 per channel, a boundary k
    //at slot(k) * C * 3
    sums = new Float64Array(cap * C * 3),
    //the value held over step k, at slot(k) * C
    values = new Float64Array(cap * C),
    got = new Float64Array(C),
    //the oldest and the newest boundary kept, and the one the sums start
    //from (where the time they are kept about is 0)
    first = 0,
    last = 0,
    origin = 0,
    any = false;

  rebase = rebase || Math.max(cap * 16, 4096);

  //where boundary or step k is kept, k below 0 too
  function slot(k) {
    var s = k % cap;

    return s < 0 ? s + cap : s;
  }

  //started again at boundary k: nothing summed yet
  function restart(k) {
    first = last = origin = k;

    var o = slot(k) * C * 3;

    for (var i = 0; i < C * 3; i++) sums[o + i] = 0;
    any = true;
  }

  //every step up to boundary k filled in
  function fill(k) {
    if (!any || k < first || k - last > cap - 2 || k - origin > rebase)
      restart(k - (cap - 2));

    while (last < k) {
      var from = slot(last) * C * 3,
        to = slot(last + 1) * C * 3,
        held = slot(last) * C,
        u0 = (last - origin) * step,
        u1 = u0 + step,
        d0 = step,
        d1 = (u1 * u1 - u0 * u0) / 2,
        d2 = (u1 * u1 * u1 - u0 * u0 * u0) / 3;

      sample((last + 0.5) * step, got);

      for (var c = 0; c < C; c++) {
        var v = got[c],
          a = from + c * 3,
          b = to + c * 3;

        values[held + c] = v;
        sums[b] = sums[a] + v * d0;
        sums[b + 1] = sums[a + 1] + v * d1;
        sums[b + 2] = sums[a + 2] + v * d2;
      }

      last++;
      if (last - first > cap - 2) first++;
    }
  }

  var integral = {
    channels: C,
    step: step,

    /*
     * The integral of each channel over [a, b], and of it times (τ - a)
     * and (τ - a)²: out[c * 3 + n]. A stretch starting further back than
     * window from the latest asked for starts where what is kept does.
     */
    over: function (a, b, out) {
      if (b < a) b = a;

      var kb = Math.floor(b / step);

      fill(kb + 1);

      var ka = Math.floor(a / step),
        c,
        v,
        o;

      if (ka < first) {
        ka = first;
        a = Math.max(a, first * step);
        if (b < a) b = a;
      }

      if (ka === kb) {
        var s = b - a;

        o = slot(ka) * C;
        for (c = 0; c < C; c++) {
          v = values[o + c];
          out[c * 3] = v * s;
          out[c * 3 + 1] = (v * s * s) / 2;
          out[c * 3 + 2] = (v * s * s * s) / 3;
        }

        return out;
      }

      var h = (ka + 1) * step - a,
        t0 = kb * step - a,
        t1 = b - a,
        A = a - origin * step,
        lo = slot(ka + 1) * C * 3,
        hi = slot(kb) * C * 3,
        head = slot(ka) * C,
        tail = slot(kb) * C;

      for (c = 0; c < C; c++) {
        var D0 = sums[hi + c * 3] - sums[lo + c * 3],
          D1 = sums[hi + c * 3 + 1] - sums[lo + c * 3 + 1],
          D2 = sums[hi + c * 3 + 2] - sums[lo + c * 3 + 2],
          vh = values[head + c],
          vt = values[tail + c];

        out[c * 3] = vh * h + D0 + vt * (t1 - t0);
        out[c * 3 + 1] =
          (vh * h * h) / 2 + (D1 - A * D0) + (vt * (t1 * t1 - t0 * t0)) / 2;
        out[c * 3 + 2] =
          (vh * h * h * h) / 3 +
          (D2 - 2 * A * D1 + A * A * D0) +
          (vt * (t1 * t1 * t1 - t0 * t0 * t0)) / 3;
      }

      return out;
    },

    //f as it is held over the step t is in, into out[0..channels)
    at: function (t, out) {
      var k = Math.floor(t / step);

      fill(k + 1);
      if (k < first) k = first;

      var o = slot(k) * C;

      for (var c = 0; c < C; c++) out[c] = values[o + c];

      return out;
    },

    //everything forgotten: the next stretch asked for starts the sums again
    clear: function () {
      any = false;
    },
  };

  return integral;
}
