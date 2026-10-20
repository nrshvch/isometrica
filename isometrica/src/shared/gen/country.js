/**
 * The country heard from above it - the woods, the beach, the open sea - the
 * way skyline.js has the city: as it really sounds, not a cartoon of it
 * (sounds.js has the cartoon ones, forest, sea and gulls).
 *
 * What makes it sound real is mostly what makes the city: what goes on all
 * the time is soft and smooth - the air, the leaves, the sea further off -
 * rising and falling on its own, never a tone or a grain in it; what stands
 * out of it is mostly far off, duller the further, and rings on round
 * about; and nothing in it is ever quite the same twice.
 *
 * - woods by day: a breath of wind through the tops of the trees, the
 *   leaves rustling softly as it goes, and the birds of a wood singing, each its own song from where it sits,
 *   over and over with a while between: chaffinches (a run down and a
 *   flourish), a great tit (tea-cher tea-cher), a blackbird (fluting, a
 *   squeaky twitter after), a robin (thin, wandering), a wren (trill after
 *   trill, far off), a wood pigeon cooing and a woodpecker drumming further
 *   still - all of them in the ring of the trees;
 * - woods by night: stiller; crickets near and far, and a tawny owl;
 * - beach, calm: a small wave now and then, one at a time, hardly breaking
 *   - a soft woosh up the sand and back, a breath of foam - over the sea
 *   further along, and herring gulls one at a time - kyow, the long call,
 *   kek-kek - harsh and nasal, a throat's buzz through its own resonances;
 *   by night without the gulls. Rough: big waves breaking along the beach,
 *   thumping down, the foam fizzing with bubbles bursting, and a gull or
 *   two;
 * - offshore: the open sea, out of sight of any beach - in a breeze only a
 *   light woosh of wind rising and falling, nothing breaking; in a gale the
 *   wind gusting and whirling, higher air over it, the crests of the waves
 *   breaking white round about, and spray.
 *
 * Only the plain pieces (noise, filters, laying sounds into the ears,
 * seamless loops, the ring round about) come from dsp.js. Each loops,
 * seamlessly, the way the skyline does.
 */

import {
  TAU,
  seeded,
  seedOf,
  between,
  white,
  pink,
  brown,
  wander,
  OnePole,
  Biquad,
  lay,
  seamless,
  level,
  rms,
  scale,
  ring,
} from "./dsp.js";

function clamp(x, a, b) {
  return x < a ? a : x > b ? b : x;
}

function smooth(x) {
  x = clamp(x, 0, 1);

  return x * x * (3 - 2 * x);
}

//smoothly up from nothing at the start, and back down to it at the end
function fade(u, edge) {
  return smooth(Math.min(u, 1 - u) / edge);
}

//a curve through evenly spaced points, u 0..1, smooth all the way through
//them (Catmull-Rom's)
function through(p, u) {
  var n = p.length;

  if (n === 1) return p[0];

  var x = clamp(u, 0, 1) * (n - 1),
    i = Math.min(n - 2, Math.floor(x)),
    t = x - i,
    p0 = p[Math.max(0, i - 1)],
    p1 = p[i],
    p2 = p[i + 1],
    p3 = p[Math.min(n - 1, i + 2)];

  return (
    0.5 *
    (2 * p1 +
      (p2 - p0) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
      (3 * p1 - p0 - 3 * p2 + p3) * t * t * t)
  );
}

/* ------------------------------------------------------------------------
 * What goes on all the time
 * --------------------------------------------------------------------- */

/**
 * Both ears, each its own noise: an octave at a time, each wandering louder
 * and quieter on its own - the way the roar of the town does in skyline.js
 * - and all of it going with the gusts, if any: the higher octaves the
 * more, the way the wind sounds brighter the harder it blows. As loud on
 * the whole as `loud`.
 *
 * @param octaves {number[][]} [Hz, how loud] each, from the lowest
 * @param every {number[]} how often an octave wanders anew, s, from .. to
 * @param [gust] {function(number): number} 0..1 at each second
 */
function bed(name, rate, n, over, seconds, octaves, every, gust, loud) {
  var ch = [];

  for (var side = 0; side < 2; side++) {
    var rnd = seeded(seedOf(name + " " + side)),
      source = pink(rnd),
      bands = octaves.map(function (o, k) {
        return {
          filter: new Biquad(rate, "bandpass", o[0], 1.4),
          loud: o[1],
          moves: wander(rnd, seconds, between(rnd, every[0], every[1])),
          tilt: 0.5 + 0.3 * k,
          now: o[1],
        };
      }),
      buf = new Float32Array(n + over),
      i,
      k;

    for (i = 0; i < n + over; i++) {
      if (i % 64 === 0) {
        //(the wind gets to either side a moment apart)
        var g = gust ? 0.25 + 0.75 * gust(i / rate + side * 0.4) : 1;

        for (k = 0; k < bands.length; k++)
          bands[k].now =
            bands[k].loud *
            (0.6 + 0.8 * bands[k].moves(i / rate)) *
            Math.pow(g, bands[k].tilt);
      }

      var s = source(),
        x = 0;

      for (k = 0; k < bands.length; k++)
        x += bands[k].filter.run(s) * bands[k].now;

      buf[i] = x;
    }

    ch.push(seamless(buf, n, over));
  }

  return scale(ch, loud / (rms(ch) || 1));
}

/**
 * The leaves of the trees as the wind goes through them, both ears: a soft
 * rustle high up, fluttering a dozen times a second as the leaves turn this
 * way and that - louder and a little brighter the harder it blows, and
 * smooth all the way: no click in it.
 */
function leaves(name, rate, n, over, seconds, gust, loud) {
  var ch = [];

  for (var side = 0; side < 2; side++) {
    var rnd = seeded(seedOf(name + " " + side)),
      hiss = pink(rnd),
      flutter = wander(rnd, seconds, 0.08),
      band = new Biquad(rate, "bandpass", 2500, 0.7),
      top = new Biquad(rate, "lowpass", 6000, 0.7),
      g = 0,
      buf = new Float32Array(n + over);

    for (var i = 0; i < n + over; i++) {
      var t = i / rate + side * 0.6;

      if (i % 64 === 0) {
        g = gust(t);
        band.set("bandpass", 1800 + 1500 * g, 0.7);
      }

      buf[i] = top.run(band.run(hiss())) * g * g * (0.35 + 0.65 * flutter(t));
    }

    ch.push(seamless(buf, n, over));
  }

  return scale(ch, loud / (rms(ch) || 1));
}

/**
 * A soft woosh, both ears, each its own: air, or water a long way off,
 * rising and falling with `swell` - louder and brighter as it rises, from
 * `low` Hz at the least to `high` at the most - and nothing else in it:
 * no tone, no grain. Two lowpasses, so its top falls away gently.
 */
function woosh(name, rate, n, over, seconds, swell, low, high, loud) {
  var ch = [];

  for (var side = 0; side < 2; side++) {
    var rnd = seeded(seedOf(name + " " + side)),
      air = pink(rnd),
      a = new Biquad(rate, "lowpass", low, 0.5),
      b = new Biquad(rate, "lowpass", low * 1.5, 0.5),
      g = 0,
      buf = new Float32Array(n + over);

    for (var i = 0; i < n + over; i++) {
      if (i % 64 === 0) {
        //(it gets to either side a moment apart)
        g = swell(i / rate + side * 0.5);

        var f = low + (high - low) * g;

        a.set("lowpass", f, 0.5);
        b.set("lowpass", f * 1.5, 0.5);
      }

      buf[i] = b.run(a.run(air())) * (0.35 + 0.65 * g);
    }

    ch.push(seamless(buf, n, over));
  }

  return scale(ch, loud / (rms(ch) || 1));
}

/**
 * Bubbles bursting in foam, mono: each a ring dying away in a millisecond
 * or two, at a pitch the smaller the higher, rising as it goes (Minnaert's
 * bubbles, as van den Doel models them) - so many at a time that they fizz.
 */
function Fizz(rnd, rate) {
  this.rnd = rnd;
  this.rate = rate;
  this.on = [];
}

//the next sample, `often` bubbles bursting a second
Fizz.prototype.run = function (often) {
  var rnd = this.rnd,
    on = this.on,
    x = 0;

  if (on.length < 48 && rnd() < often / this.rate) {
    var f = 1200 * Math.pow(8, rnd()),
      //(how many times it rings before it is gone)
      q = between(rnd, 8, 25);

    on.push({
      f: f,
      p: 0,
      a: -Math.log(1 - rnd() * 0.999),
      dies: Math.exp(-(Math.PI * f) / q / this.rate),
      rises: 1 + between(rnd, 0.5, 2) / this.rate,
    });
  }

  for (var j = on.length - 1; j >= 0; j--) {
    var b = on[j];

    x += Math.sin(TAU * b.p) * b.a;
    b.p += b.f / this.rate;
    b.f *= b.rises;
    b.a *= b.dies;
    if (b.a < 0.001) on.splice(j, 1);
  }

  return x;
};

/* ------------------------------------------------------------------------
 * Somewhere off
 * --------------------------------------------------------------------- */

/**
 * A sound as it is heard from r metres off, mono: duller the further - the
 * air, and the leaves in a wood, taking the top off it - as loud at its
 * loudest as `loud` (before how far off it is).
 *
 * @param clear {number} how far the top carries: Hz at 1 m
 */
function heard(rate, sound, r, loud, clear) {
  var air = new OnePole(rate, clamp(clear / r, 1200, 18000)),
    out = new Float32Array(sound.length),
    top = 0,
    i;

  for (i = 0; i < sound.length; i++) top = Math.max(top, Math.abs(sound[i]));

  var k = top > 0 ? loud / top : 0;

  for (i = 0; i < sound.length; i++) out[i] = air.run(sound[i]) * k;

  return out;
}

/**
 * Lays what is heard (heard) into the loop round pan: quieter the further
 * off, and as much of it sent on to ring round about wherever it is - so
 * what is far off is mostly its ring.
 */
function put(dry, send, sound, at, pan, r) {
  lay(dry, sound, at, pan, 20 / r, true);
  if (send) lay(send, sound, at, pan, 0.3, true);
}

/**
 * One after another round the loop, from somewhere into it: what `make`
 * makes - a bird's song, a wave - then a while, then the next (a while
 * less than nothing: the next comes in over the last). As many as go into
 * the loop, each while stretched or shrunk a little alike so they go
 * round it evenly, the last as far from the first coming round again as
 * any from the next.
 *
 * @param gap {number[]} how long between, s, from .. to
 * @param each {function(Float32Array|Float32Array[], number)} lays it at
 *        the second it starts
 */
function again(rnd, rate, seconds, gap, make, each) {
  var all = [],
    total = 0;

  do {
    var s = make(),
      long = (s.length === 2 ? s[0].length : s.length) / rate,
      next = long + between(rnd, gap[0], gap[1]);

    all.push({ s: s, next: next });
    total += next;
  } while (total < seconds);

  //one too many, if the loop is nearer round without it
  if (all.length > 1 && total - seconds > seconds - (total - next)) {
    all.pop();
    total -= next;
  }

  var k = seconds / total,
    t = rnd() * seconds;

  all.forEach(function (a) {
    each(a.s, t);
    t += a.next * k;
  });
}

/* ------------------------------------------------------------------------
 * Birds
 * --------------------------------------------------------------------- */

/**
 * A bird's song, mono, out of its notes: each a pure whistle - the
 * syrinx's - sweeping through its frequencies fast, a little of its octave
 * and twelfth in it, never quite steady, in and out over a few
 * milliseconds. The low ones - a pigeon's, an owl's - a breath of air in
 * them too.
 *
 * @param notes {{at: number, long: number, f: number[], a: number[],
 *        vib: number[], edge: number}[]} when, how long, s; the frequencies
 *        it sweeps through and how loud along it; a vibrato, [Hz, how
 *        deep]; how long to come in and go out, s
 * @param tone {{h2: number, h3: number, shaky: number, breath: number}}
 */
function sing(rnd, rate, notes, tone) {
  var end = 0;

  notes.forEach(function (note) {
    end = Math.max(end, note.at + note.long);
  });

  var out = new Float32Array(Math.round((end + 0.02) * rate)),
    waver = new OnePole(rate, 25),
    grit = white(rnd),
    air = new Biquad(rate, "bandpass", 500, 3);

  notes.forEach(function (note) {
    var from = Math.round(note.at * rate),
      len = Math.max(1, Math.round(note.long * rate)),
      edge = Math.max(1, Math.min((note.edge || 0.005) * rate, len * 0.3)),
      phase = 0;

    for (var i = 0; i < len && from + i < out.length; i++) {
      var u = i / len,
        f = Math.max(80, through(note.f, u));

      if (note.vib)
        f *= 1 + note.vib[1] * Math.sin((TAU * note.vib[0] * i) / rate);
      f *= 1 + tone.shaky * waver.run(grit());

      phase += f / rate;
      phase -= Math.floor(phase);

      var e =
          smooth(Math.min(i, len - i) / edge) *
          (note.a ? through(note.a, u) : 1),
        x =
          Math.sin(TAU * phase) +
          tone.h2 * Math.sin(2 * TAU * phase) +
          tone.h3 * Math.sin(3 * TAU * phase);

      if (tone.breath) {
        if (i % 64 === 0) air.set("bandpass", f, 3);
        x += tone.breath * air.run(grit()) * 6;
      }

      out[from + i] += x * Math.max(0, e);
    }
  });

  return out;
}

//a chaffinch: a run of notes down, slow and high, then quicker and lower,
//and a flourish at the end - its own, every time
function chaffinch(rnd, rate) {
  var top = between(rnd, 5600, 6600),
    drop = between(rnd, 0.62, 0.72),
    first = 4 + Math.floor(rnd() * 3),
    second = 5 + Math.floor(rnd() * 4),
    low = between(rnd, 3800, 4400),
    end = [
      between(rnd, 2400, 3000),
      between(rnd, 4200, 5000),
      between(rnd, 5200, 6000),
      between(rnd, 2600, 3200),
      between(rnd, 1900, 2300),
    ];

  return function () {
    var notes = [],
      t = 0,
      k = between(rnd, 0.98, 1.02),
      i;

    for (i = 0; i < first; i++) {
      var f = top * (1 - 0.035 * i) * k;

      notes.push({
        at: t,
        long: 0.04,
        f: [f, f * drop],
        a: [0.55 + 0.07 * i, 0.8],
      });
      t += 0.115 - 0.004 * i;
    }

    for (i = 0; i < second + Math.floor(rnd() * 2); i++) {
      var g = low * (1 - 0.03 * i) * k;

      notes.push({
        at: t,
        long: 0.03,
        f: [g * 1.12, g, g * 0.76],
        a: [1, 0.85],
      });
      t += 0.07;
    }

    notes.push({
      at: t + 0.03,
      long: between(rnd, 0.2, 0.26),
      f: end.map(function (f) {
        return f * k;
      }),
      a: [0.4, 1, 1, 0.8, 0.3],
    });

    return sing(rnd, rate, notes, { h2: 0.08, h3: 0.02, shaky: 0.15 });
  };
}

//a great tit: tea-cher tea-cher tea-cher - a high note and a low one, over
//and over
function greatTit(rnd, rate) {
  var hi = between(rnd, 6000, 7200),
    lo = between(rnd, 3600, 4300),
    beat = between(rnd, 0.22, 0.3);

  return function () {
    var notes = [],
      count = 3 + Math.floor(rnd() * 4);

    for (var i = 0; i < count; i++) {
      var t = i * beat * between(rnd, 0.98, 1.02);

      notes.push({ at: t, long: 0.07, f: [hi * 1.03, hi * 0.9], a: [0.75, 1] });
      notes.push({
        at: t + 0.1,
        long: 0.085,
        f: [lo * 1.03, lo, lo * 0.96],
        a: [1, 0.8],
      });
    }

    return sing(rnd, rate, notes, { h2: 0.05, h3: 0.01, shaky: 0.12 });
  };
}

//a blackbird: a few fluting notes, low and slow, gliding - a phrase of its
//own it sings a little differently each time - then a squeaky twitter
function blackbird(rnd, rate) {
  var base = between(rnd, 1600, 2100),
    phrase = [],
    count = 4 + Math.floor(rnd() * 3);

  for (var i = 0; i < count; i++) {
    var a = between(rnd, 1, 1.9),
      b = between(rnd, 1, 1.9);

    phrase.push({
      long: between(rnd, 0.12, 0.32),
      f: [a, (a + b) / 2 + between(rnd, -0.1, 0.1), b],
      gap: between(rnd, 0.03, 0.09),
    });
  }

  return function () {
    var notes = [],
      t = 0;

    phrase.forEach(function (p) {
      //now and then a note left out
      if (rnd() < 0.12) return;

      var k = base * between(rnd, 0.97, 1.03);

      notes.push({
        at: t,
        long: p.long,
        f: p.f.map(function (r) {
          return r * k;
        }),
        a: [0.7, 1, 0.8],
        edge: 0.015,
      });
      t += p.long + p.gap;
    });

    for (var j = 3 + Math.floor(rnd() * 5); j > 0; j--) {
      var long = between(rnd, 0.03, 0.06);

      notes.push({
        at: t,
        long: long,
        f: [
          between(rnd, 5000, 7500),
          between(rnd, 4000, 8000),
          between(rnd, 5000, 7000),
        ],
        a: [0.35],
      });
      t += long + between(rnd, 0.03, 0.06);
    }

    return sing(rnd, rate, notes, { h2: 0.18, h3: 0.05, shaky: 0.1 });
  };
}

//a robin: thin and high, wandering up and down fast, now and then a little
//trill - never quite the same phrase twice
function robin(rnd, rate) {
  return function () {
    var notes = [],
      t = 0;

    for (var k = 8 + Math.floor(rnd() * 8); k > 0; k--) {
      var a = between(rnd, 0.5, 1);

      if (rnd() < 0.3) {
        var lo = between(rnd, 4000, 7000),
          hi = lo * between(rnd, 1.1, 1.4),
          long = between(rnd, 0.025, 0.04);

        for (var r = 2 + Math.floor(rnd() * 3); r > 0; r--) {
          notes.push({ at: t, long: long, f: [lo, hi, lo], a: [a] });
          t += long + 0.02;
        }
      } else {
        var len = between(rnd, 0.04, 0.12),
          f = [];

        for (var p = 2 + Math.floor(rnd() * 3); p > 0; p--)
          f.push(between(rnd, 2500, 8000));

        notes.push({
          at: t,
          long: len,
          f: f,
          a: [a, a * between(rnd, 0.6, 1)],
        });
        t += len;
      }

      t += between(rnd, 0.02, 0.06);
    }

    return sing(rnd, rate, notes, { h2: 0.03, h3: 0, shaky: 0.2 });
  };
}

//a wren: loud and fast, trill after trill, each of its own note, for a few
//seconds
function wren(rnd, rate) {
  var trills = [];

  for (var k = 5 + Math.floor(rnd() * 3); k > 0; k--)
    trills.push({
      long: between(rnd, 0.018, 0.03),
      f: [between(rnd, 4000, 8500), between(rnd, 4000, 8500)],
      times: 6 + Math.floor(rnd() * 9),
      beat: 1 / between(rnd, 14, 22),
    });

  return function () {
    var notes = [],
      t = 0;

    trills.forEach(function (tr) {
      for (var i = 0; i < tr.times; i++) {
        notes.push({ at: t, long: tr.long, f: tr.f, a: [0.8 + 0.2 * rnd()] });
        t += tr.beat;
      }
      t += 0.03;
    });

    return sing(rnd, rate, notes, { h2: 0.04, h3: 0, shaky: 0.1 });
  };
}

//a wood pigeon: coo-COO-coo, coo-coo, three or four times over, low and
//soft, and one coo to end with
function pigeon(rnd, rate) {
  var f = between(rnd, 420, 520);

  function coo(at, long, up, loud) {
    return {
      at: at,
      long: long,
      f: [f * 0.9 * up, f * up, f * 0.96 * up],
      a: [0.6 * loud, loud, 0.7 * loud],
      edge: 0.05,
    };
  }

  return function () {
    var notes = [],
      t = 0,
      times = 3 + Math.floor(rnd() * 2);

    for (var i = 0; i < times; i++) {
      notes.push(
        coo(t, 0.28, 1, 0.6),
        coo(t + 0.42, 0.55, 1.04, 1),
        coo(t + 1.1, 0.26, 0.98, 0.6),
        coo(t + 1.55, 0.28, 1, 0.65),
        coo(t + 1.95, 0.3, 0.98, 0.6),
      );
      t += 2.25 + between(rnd, 0.4, 0.8);
    }

    notes.push(coo(t, 0.3, 1, 0.6));

    return sing(rnd, rate, notes, {
      h2: 0.3,
      h3: 0.1,
      shaky: 0.05,
      breath: 0.15,
    });
  };
}

//a great spotted woodpecker drumming: a burst of a dozen or more blows on a
//dead branch in under a second, dying off at the end - the branch ringing
//at its own note under each
function woodpecker(rnd, rate) {
  var note = between(rnd, 500, 900),
    count = 12 + Math.floor(rnd() * 6),
    beat = between(rnd, 0.045, 0.055);

  return function () {
    var n = Math.round((count * beat + 0.12) * rate),
      blows = new Float32Array(n),
      hiss = white(rnd),
      wood = new Biquad(rate, "bandpass", note, 7),
      upper = new Biquad(rate, "bandpass", note * 2.4, 6),
      knock = new Biquad(rate, "bandpass", 2200, 1),
      out = new Float32Array(n),
      i;

    for (var k = 0; k < count; k++) {
      var at = Math.round(k * beat * (1 + 0.004 * k) * rate),
        a = Math.min(1, 0.6 + 0.2 * k) * (1 - 0.6 * Math.pow(k / count, 2)),
        len = Math.round(0.002 * rate);

      for (i = 0; i < len && at + i < n; i++)
        blows[at + i] += hiss() * a * (1 - i / len);
    }

    for (i = 0; i < n; i++)
      out[i] =
        wood.run(blows[i]) * 3 +
        upper.run(blows[i]) +
        knock.run(blows[i]) * 0.5;

    return out;
  };
}

/**
 * The birds of a wood, by day: what sings, how many of each, how near and
 * how far off they sit, m, and how long each waits between its songs, s.
 */
var CHORUS = [
  { kind: chaffinch, count: 1, near: 35, far: 80, gap: [10, 20] },
  { kind: greatTit, count: 1, near: 40, far: 100, gap: [10, 18] },
  { kind: blackbird, count: 1, near: 60, far: 130, gap: [8, 16] },
  { kind: robin, count: 1, near: 35, far: 80, gap: [8, 16] },
  { kind: wren, count: 1, near: 80, far: 150, gap: [15, 30] },
  { kind: pigeon, count: 1, near: 90, far: 170, gap: [15, 30] },
  { kind: woodpecker, count: 1, near: 120, far: 220, gap: [12, 25] },
];

/* ------------------------------------------------------------------------
 * By night
 * --------------------------------------------------------------------- */

//a cricket's chirp, mono: its wings rubbing - a few pulses of one pure high
//note (the harp of its wing ringing), each rising and cut off, dropping a
//little in pitch
function chirp(rnd, rate) {
  var carrier = between(rnd, 4300, 5100),
    pulses = 3 + Math.floor(rnd() * 2),
    long = between(rnd, 0.014, 0.02),
    beat = between(rnd, 0.032, 0.04),
    out = new Float32Array(Math.round((pulses * beat + 0.01) * rate)),
    len = Math.round(long * rate);

  for (var p = 0; p < pulses; p++) {
    var from = Math.round(p * beat * rate),
      phase = 0;

    for (var i = 0; i < len && from + i < out.length; i++) {
      var u = i / len;

      phase += (carrier * (1 - 0.04 * u)) / rate;
      out[from + i] =
        Math.sin(TAU * phase) *
        Math.pow(Math.sin(Math.PI * u), 0.6) *
        (0.55 + 0.45 * u) *
        (0.85 + 0.15 * rnd());
    }
  }

  return out;
}

/**
 * Crickets in the grass, near and far: each chirping on its own steady beat
 * - a whole number of chirps to the loop, so the beat goes on over its
 * seam - and now and then falling quiet a while.
 */
function crickets(rnd, rate, seconds, count, dry, send) {
  for (var c = 0; c < count; c++) {
    var times = Math.round(seconds / between(rnd, 0.35, 0.7)),
      every = seconds / times,
      r = between(rnd, 15, 120),
      sound = heard(rate, chirp(rnd, rate), r, 0.2, 300000),
      pan = between(rnd, -1, 1),
      quiet = wander(rnd, seconds, between(rnd, 4, 9)),
      start = rnd() * every;

    for (var k = 0; k < times; k++) {
      var t = start + k * every + between(rnd, -0.006, 0.006),
        on = smooth((quiet(t) - 0.2) / 0.2);

      if (on > 0.01) {
        lay(dry, sound, Math.round(t * rate), pan, (20 / r) * on, true);
        lay(send, sound, Math.round(t * rate), pan, 0.3 * on, true);
      }
    }
  }
}

//a tawny owl, the male: a long hoo, a while, then hu, and hu-hu-hoooo,
//the last one long and quavering
function owl(rnd, rate) {
  var f = between(rnd, 560, 660);

  return function () {
    var gap = between(rnd, 2.5, 4.5),
      then = 0.8 + gap;

    return sing(
      rnd,
      rate,
      [
        {
          at: 0,
          long: 0.8,
          f: [f * 0.94, f * 1.02, f * 0.97, f * 0.9],
          a: [0.7, 1, 0.9, 0.6],
          edge: 0.06,
        },
        { at: then, long: 0.14, f: [f * 0.92, f * 0.98], a: [0.6], edge: 0.03 },
        {
          at: then + 0.38,
          long: 0.12,
          f: [f * 0.93, f * 0.99],
          a: [0.6],
          edge: 0.03,
        },
        {
          at: then + 0.62,
          long: 1.4,
          f: [f * 0.95, f * 1.03, f, f * 0.9],
          a: [0.8, 1, 0.9, 0.5],
          vib: [between(rnd, 9, 12), 0.025],
          edge: 0.06,
        },
      ],
      { h2: 0.18, h3: 0.06, shaky: 0.2, breath: 0.1 },
    );
  };
}

/* ------------------------------------------------------------------------
 * The woods
 * --------------------------------------------------------------------- */

//the air in the trees, an octave at a time: mostly low, a soft rush
var CANOPY = [
  [63, 0.5],
  [125, 0.8],
  [250, 1],
  [500, 0.9],
  [1000, 0.55],
  [2000, 0.3],
  [4000, 0.15],
  [8000, 0.06],
];

/**
 * How long a loop of each is; how loud the air in the trees and the leaves
 * in it are, next to the birds, and how much it gusts; whether the birds of
 * the day sing; how
 * many crickets chirp and whether an owl hoots; how long the trees ring on;
 * and how loud it all is.
 */
var WOODS = [
  //day
  {
    seconds: 36,
    air: 0.035,
    leaves: 0.015,
    gusts: 0.5,
    birds: true,
    crickets: 0,
    owl: false,
    ring: 0.9,
    loud: 0.07,
  },
  //night
  {
    seconds: 36,
    air: 0.02,
    leaves: 0.008,
    gusts: 0.4,
    birds: false,
    crickets: 24,
    owl: true,
    ring: 1.2,
    loud: 0.06,
  },
];

function woods(rnd, variant, rate) {
  var wo = WOODS[variant],
    tag = "woods " + variant,
    n = Math.round(wo.seconds * rate),
    over = Math.round(1.5 * rate),
    gusts = wander(seeded(seedOf(tag + " gusts")), wo.seconds, 6),
    gust = function (t) {
      return 0.15 + wo.gusts * gusts(t);
    },
    air = bed(
      tag + " air",
      rate,
      n,
      over,
      wo.seconds,
      CANOPY,
      [2, 6],
      gust,
      wo.air,
    ),
    rattle = leaves(
      tag + " leaves",
      rate,
      n,
      over,
      wo.seconds,
      gust,
      wo.leaves,
    ),
    dry = [new Float32Array(n), new Float32Array(n)],
    send = [new Float32Array(n), new Float32Array(n)],
    c,
    i;

  //the birds, each from where it sits, singing over and over
  if (wo.birds)
    CHORUS.forEach(function (b) {
      for (var k = 0; k < b.count; k++) {
        var song = b.kind(rnd, rate),
          r = between(rnd, b.near, b.far),
          pan = between(rnd, -0.9, 0.9);

        again(rnd, rate, wo.seconds, b.gap, song, function (s, t) {
          put(
            dry,
            send,
            heard(rate, s, r, 0.4, 250000),
            Math.round(t * rate),
            pan,
            r,
          );
        });
      }
    });

  if (wo.crickets > 0) crickets(rnd, rate, wo.seconds, wo.crickets, dry, send);

  if (wo.owl) {
    var hoots = owl(rnd, rate),
      far = between(rnd, 60, 140),
      where = between(rnd, -0.8, 0.8);

    again(rnd, rate, wo.seconds, [12, 20], hoots, function (s, t) {
      put(
        dry,
        send,
        heard(rate, s, far, 0.5, 250000),
        Math.round(t * rate),
        where,
        far,
      );
    });
  }

  //all of it ringing in the trees, and a little of the air too
  for (c = 0; c < 2; c++) for (i = 0; i < n; i++) send[c][i] += air[c][i] * 0.1;

  var back = ring(send, rate, wo.ring, 3500, 0.8);

  scale(back, (0.45 * rms(send)) / (rms(back) || 1));

  var ch = [new Float32Array(n), new Float32Array(n)];

  for (c = 0; c < 2; c++)
    for (i = 0; i < n; i++)
      ch[c][i] = air[c][i] + rattle[c][i] + dry[c][i] + back[c][i];

  return level(ch, wo.loud);
}

/* ------------------------------------------------------------------------
 * The beach
 * --------------------------------------------------------------------- */

/**
 * A small wave on a calm day, both ears: hardly breaking - the swell
 * sliding up the sand with a soft woosh, a little brighter at its height,
 * and running back down quieter, a breath of foam at the end of it. Each
 * ear its own water, a moment apart, so it is wide and not doubled.
 */
function swash(rnd, rate, size) {
  var long = between(rnd, 4, 6),
    up = between(rnd, 1.2, 1.8),
    back = between(rnd, 1, 1.6),
    n = Math.round(long * rate),
    ch = [];

  for (var side = 0; side < 2; side++) {
    var rush = pink(rnd),
      hiss = white(rnd),
      a = new Biquad(rate, "lowpass", 300, 0.5),
      b = new Biquad(rate, "lowpass", 450, 0.5),
      foam = new Biquad(rate, "bandpass", 2200, 0.6),
      lag = side * between(rnd, 0.05, 0.15),
      out = new Float32Array(n);

    for (var i = 0; i < n; i++) {
      var t = Math.max(0, i / rate - lag),
        end = smooth((n - i) / (0.6 * rate)),
        e =
          (t < up
            ? Math.pow(smooth(t / up), 1.5)
            : Math.exp(-(t - up) / back)) * end,
        w =
          smooth((t - up * 0.85) / 0.4) *
          Math.exp(-Math.max(0, t - up) / 1.1) *
          end;

      if (i % 64 === 0) {
        var f = 250 + 1100 * e * size;

        a.set("lowpass", f, 0.5);
        b.set("lowpass", f * 1.5, 0.5);
      }

      out[i] = b.run(a.run(rush())) * e + foam.run(hiss()) * w * 0.06 * size;
    }

    ch.push(out);
  }

  return ch;
}

/**
 * One stretch of a wave breaking on the beach, mono: the lip of it coming
 * over and hitting the water - a thump, the bigger the wave the more - the
 * white water rushing, the foam running up the sand fizzing with bubbles
 * bursting, and draining back down, duller, dying away.
 */
function stretch(rnd, rate, long, size) {
  var n = Math.round(long * rate),
    out = new Float32Array(n),
    rush = pink(rnd),
    hiss = white(rnd),
    low = brown(rnd),
    crash = new Biquad(rate, "lowpass", 1000, 0.6),
    thud = new Biquad(rate, "lowpass", 110, 0.7),
    foam = new Biquad(rate, "bandpass", 3000, 0.5),
    fizz = new Fizz(rnd, rate),
    rise = between(rnd, 0.3, 0.6) * (0.6 + 0.4 * size),
    falls = 0.3 + 0.5 * size,
    runs = 1.2 + 1.2 * size,
    hit = Math.pow(size, 1.5),
    b = 0;

  for (var i = 0; i < n; i++) {
    var t = i / rate,
      after = t - rise;

    if (i % 32 === 0) {
      b = after < 0 ? Math.pow(t / rise, 2) : Math.exp(-after / falls);
      crash.set("lowpass", 400 + 4000 * b * (0.4 + 0.6 * size), 0.6);
      foam.set(
        "bandpass",
        1200 + 2500 * Math.exp(-Math.max(0, after) / 1.5),
        0.5,
      );
    }

    var w =
        smooth((t - rise * 0.8) / 0.4) *
        Math.exp(-Math.max(0, after) / runs) *
        fade(t / long, 0.1),
      x =
        crash.run(rush() * 0.8 + hiss() * 0.3) * b +
        thud.run(low()) * hit * Math.exp(-Math.abs(after) / 0.08) * 1.5 +
        foam.run(hiss()) * w * 0.5 +
        fizz.run((600 + 1500 * size) * w) * 0.05;

    out[i] = x;
  }

  return out;
}

/**
 * A big wave breaking along the beach in rough weather, both ears: a
 * stretch of it and another or two, a moment apart, from one side over
 * towards the other - each its own, a little bigger or smaller.
 */
function breaker(rnd, rate, size) {
  var parts = 2 + Math.floor(rnd() * 2),
    along = between(rnd, 0.4, 0.9),
    long = 3.5 + 3 * size,
    from = between(rnd, -0.8, 0.8),
    to = clamp(
      from + between(rnd, 0.5, 1.2) * (rnd() < 0.5 ? -1 : 1),
      -0.9,
      0.9,
    ),
    n = Math.round((along + long) * rate),
    ch = [new Float32Array(n), new Float32Array(n)];

  for (var k = 0; k < parts; k++) {
    var u = k / (parts - 1),
      at = Math.round(
        clamp(u + between(rnd, -0.05, 0.05), 0, 1) * along * rate,
      );

    lay(
      ch,
      stretch(rnd, rate, long, size * between(rnd, 0.6, 1)),
      at,
      from + (to - from) * u,
      1 / Math.sqrt(parts),
      false,
    );
  }

  return ch;
}

/**
 * A herring gull's voice, mono: its syrinx buzzing at the pitch of the call
 * - many harmonics, the pitch never quite steady and now and then breaking
 * into a rasp, every other cycle louder - through the resonances of its
 * throat and beak, a little breath through them too.
 *
 * @param notes {{at: number, long: number, f: number[], a: number[],
 *        harsh: number}[]} when, how long; its pitch and how loud along
 *        it; how much of a rasp, 0..1
 */
function squawk(rnd, rate, notes) {
  var end = 0;

  notes.forEach(function (note) {
    end = Math.max(end, note.at + note.long);
  });

  var n = Math.round((end + 0.05) * rate),
    voice = new Float32Array(n),
    breath = new Float32Array(n),
    grit = white(rnd),
    waver = new OnePole(rate, 40),
    out = new Float32Array(n),
    throat = [
      [new Biquad(rate, "bandpass", between(rnd, 1100, 1500), 3), 1],
      [new Biquad(rate, "bandpass", between(rnd, 2400, 3000), 4), 0.7],
      [new Biquad(rate, "bandpass", between(rnd, 3800, 4600), 5), 0.35],
    ],
    i;

  notes.forEach(function (note) {
    var from = Math.round(note.at * rate),
      len = Math.round(note.long * rate),
      edge = 0.012 * rate,
      phase = 0,
      half = 0;

    for (i = 0; i < len && from + i < n; i++) {
      var u = i / len,
        f = through(note.f, u) * (1 + 0.6 * waver.run(grit())),
        e = smooth(Math.min(i, len - i) / edge) * through(note.a, u),
        x = 0;

      phase += f / rate;
      phase -= Math.floor(phase);
      half += f / 2 / rate;
      half -= Math.floor(half);

      for (var h = 1; h <= 14 && h * f < rate * 0.45; h++)
        x += Math.sin(TAU * h * phase) / Math.pow(h, 0.8);

      //the rasp: every other cycle louder than the one between
      x *= 1 + note.harsh * 0.6 * Math.sin(TAU * half);

      voice[from + i] += x * e;
      breath[from + i] += grit() * e * (0.15 + 0.3 * note.harsh);
    }
  });

  for (i = 0; i < n; i++) {
    var y = 0;

    for (var k = 0; k < throat.length; k++)
      y += throat[k][0].run(voice[i] + breath[i] * 3) * throat[k][1];

    out[i] = y;
  }

  return out;
}

/**
 * What a gull calls: kyow, once or a few times; the long call - a long kyow
 * and ha-ha-ha-ha after it, quicker and lower; or kek-kek-kek, alarmed.
 */
function gullCall(rnd, rate) {
  var top = between(rnd, 700, 950),
    k = rnd(),
    notes = [],
    t = 0,
    i;

  function kyow(at, long, f) {
    return {
      at: at,
      long: long,
      f: [0.7 * f, f, 0.98 * f, 0.85 * f, 0.55 * f],
      a: [0.6, 1, 1, 0.9, 0.4],
      harsh: between(rnd, 0.2, 0.45),
    };
  }

  if (k < 0.5) {
    for (i = 1 + Math.floor(rnd() * 3); i > 0; i--) {
      var long = between(rnd, 0.32, 0.45);

      notes.push(kyow(t, long, top * between(rnd, 0.95, 1.05)));
      t += long + between(rnd, 0.15, 0.3);
    }
  } else if (k < 0.8) {
    notes.push(kyow(0, 0.5, top * 1.05));
    t = 0.65;

    for (i = 0; i < 6 + Math.floor(rnd() * 5); i++) {
      var ha = between(rnd, 0.13, 0.17),
        f = top * (1 - 0.02 * i);

      notes.push({
        at: t,
        long: ha,
        f: [0.8 * f, f, 0.9 * f, 0.7 * f],
        a: [0.5, 1, 0.8, 0.3],
        harsh: 0.5,
      });
      t += ha + between(rnd, 0.08, 0.1);
    }
  } else {
    for (i = 3 + Math.floor(rnd() * 4); i > 0; i--) {
      var kek = between(rnd, 0.08, 0.11);

      notes.push({
        at: t,
        long: kek,
        f: [0.85 * top, 0.95 * top, 0.8 * top],
        a: [0.8, 1, 0.5],
        harsh: 0.7,
      });
      t += kek + between(rnd, 0.12, 0.18);
    }
  }

  return squawk(rnd, rate, notes);
}

/**
 * How long a loop of each is; whether it is rough - big waves breaking, not
 * small ones sliding up the sand; how long after one wave is done the next
 * comes, s; how loud the sea further along is; how long between one gull's
 * call and the next, s, if any call; how long it rings on; and how loud it
 * all is.
 */
var BEACHES = [
  //calm, by day
  {
    seconds: 36,
    rough: false,
    waves: [3, 7],
    sea: 0.02,
    gulls: [3, 9],
    ring: 0.9,
    loud: 0.06,
  },
  //calm, by night
  {
    seconds: 36,
    rough: false,
    waves: [3, 7],
    sea: 0.02,
    gulls: null,
    ring: 0.9,
    loud: 0.055,
  },
  //rough
  {
    seconds: 36,
    rough: true,
    waves: [0.5, 3],
    sea: 0.04,
    gulls: [10, 20],
    ring: 0.9,
    loud: 0.1,
  },
];

function beach(rnd, variant, rate) {
  var be = BEACHES[variant],
    tag = "beach " + variant,
    n = Math.round(be.seconds * rate),
    over = Math.round(1.5 * rate),
    swell = wander(
      seeded(seedOf(tag + " swell")),
      be.seconds,
      be.rough ? 4 : 6,
    ),
    //the sea further along the coast, a soft woosh
    sea = be.rough
      ? woosh(tag + " sea", rate, n, over, be.seconds, swell, 300, 1400, be.sea)
      : woosh(tag + " sea", rate, n, over, be.seconds, swell, 200, 600, be.sea),
    waves = [new Float32Array(n), new Float32Array(n)],
    dry = [new Float32Array(n), new Float32Array(n)],
    send = [new Float32Array(n), new Float32Array(n)],
    c,
    i;

  //the waves, one at a time
  again(
    rnd,
    rate,
    be.seconds,
    be.waves,
    function () {
      return be.rough
        ? breaker(rnd, rate, between(rnd, 0.8, 1.1))
        : swash(rnd, rate, between(rnd, 0.6, 1));
    },
    function (w, t) {
      var at = Math.round(t * rate);

      lay(waves, w[0], at, -1, Math.SQRT2 * 0.6, true);
      lay(waves, w[1], at, 1, Math.SQRT2 * 0.6, true);
    },
  );

  //the gulls, one at a time, here and there
  if (be.gulls)
    again(
      rnd,
      rate,
      be.seconds,
      be.gulls,
      function () {
        return gullCall(rnd, rate);
      },
      function (call, t) {
        var r = between(rnd, 40, 180);

        put(
          dry,
          send,
          heard(rate, call, r, 0.4, 600000),
          Math.round(t * rate),
          between(rnd, -0.9, 0.9),
          r,
        );
      },
    );

  //the waves ringing a little, off the dunes and the water
  for (c = 0; c < 2; c++)
    for (i = 0; i < n; i++) send[c][i] += waves[c][i] * 0.15;

  var back = ring(send, rate, be.ring, 7000, 2);

  scale(back, (0.4 * rms(send)) / (rms(back) || 1));

  var ch = [new Float32Array(n), new Float32Array(n)];

  for (c = 0; c < 2; c++)
    for (i = 0; i < n; i++)
      ch[c][i] = sea[c][i] + waves[c][i] + dry[c][i] + back[c][i];

  return level(ch, be.loud);
}

/* ------------------------------------------------------------------------
 * The open sea
 * --------------------------------------------------------------------- */

/**
 * The crest of a wave breaking white somewhere out on the open sea, mono:
 * a rush of water coming up quickly and dying away more slowly, fizzing.
 */
function crest(rnd, rate, big) {
  var long = between(rnd, 1.2, 2.4) * (0.7 + 0.3 * big),
    n = Math.round(long * rate),
    out = new Float32Array(n),
    body = pink(rnd),
    hiss = white(rnd),
    band = new Biquad(rate, "bandpass", between(rnd, 900, 1800), 0.6),
    top = new Biquad(rate, "lowpass", 3000, 0.5),
    fizz = new Fizz(rnd, rate),
    rise = between(rnd, 0.08, 0.25);

  for (var i = 0; i < n; i++) {
    var t = i / rate,
      e =
        (t < rise
          ? Math.pow(t / rise, 1.5)
          : Math.exp(-(t - rise) / (long * 0.35))) * fade(t / long, 0.08);

    out[i] =
      (band.run(body()) * 0.8 + top.run(hiss()) * 0.4) * e +
      fizz.run(800 * e) * 0.03;
  }

  return out;
}

/**
 * How long a loop of each is; the wind's woosh - how low it is at its
 * least and how high at its most, Hz, and how often it gusts anew, s;
 * how loud the higher air over it is; how many crests break white; how much
 * spray it blows off them; and how loud it all is.
 */
var OFFSHORE = [
  //a breeze: a light woosh, nothing breaking
  {
    seconds: 36,
    low: 150,
    high: 650,
    every: 7,
    air: 0,
    crests: 0,
    spray: 0,
    loud: 0.05,
  },
  //a gale
  {
    seconds: 36,
    low: 300,
    high: 1600,
    every: 3.5,
    air: 0.015,
    crests: 14,
    spray: 0.01,
    loud: 0.1,
  },
];

function offshore(rnd, variant, rate) {
  var of = OFFSHORE[variant],
    tag = "offshore " + variant,
    n = Math.round(of.seconds * rate),
    over = Math.round(1.5 * rate),
    gusts = wander(seeded(seedOf(tag + " gusts")), of.seconds, of.every),
    whirls = wander(seeded(seedOf(tag + " whirls")), of.seconds, 1.6),
    gust = function (t) {
      return of.air > 0 ? 0.7 * gusts(t) + 0.3 * whirls(t) : gusts(t);
    },
    ch = woosh(
      tag + " wind",
      rate,
      n,
      over,
      of.seconds,
      gust,
      of.low,
      of.high,
      0.05,
    ),
    c,
    i;

  //in a gale, the air higher over it, the spray blown off the crests, and
  //the crests breaking white, near and far
  if (of.air > 0) {
    var air = woosh(
      tag + " air",
      rate,
      n,
      over,
      of.seconds,
      gust,
      800,
      3000,
      of.air,
    );

    for (c = 0; c < 2; c++) {
      var hiss = white(seeded(seedOf(tag + " spray " + c))),
        hp = new Biquad(rate, "highpass", 2500, 0.7),
        buf = new Float32Array(n + over);

      for (i = 0; i < n + over; i++) {
        var g = gust(i / rate + c * 0.4);

        buf[i] = hp.run(hiss()) * of.spray * g * g * g;
      }

      var spray = seamless(buf, n, over);

      for (i = 0; i < n; i++) ch[c][i] += air[c][i] + spray[i];
    }

    for (i = 0; i < of.crests; i++) {
      var r = between(rnd, 60, 300);

      lay(
        ch,
        heard(rate, crest(rnd, rate, 1), r, 0.4, 1000000),
        Math.floor(rnd() * n),
        between(rnd, -1, 1),
        20 / r,
        true,
      );
    }
  }

  return level(ch, of.loud);
}

/**
 * The country as sounds.js lists its sounds: how many ways each comes, that
 * they loop, and what each way of them is.
 */
export var WOODS_SOUND = { loop: true, make: woods, ways: ["day", "night"] };

export var BEACH_SOUND = {
  loop: true,
  make: beach,
  ways: ["calm, gulls", "calm, by night", "rough"],
};

export var OFFSHORE_SOUND = {
  loop: true,
  make: offshore,
  ways: ["breeze", "gale"],
};
