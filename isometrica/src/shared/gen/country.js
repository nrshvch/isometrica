/**
 * The country heard from above it - the woods, the beach, the open sea - the
 * way skyline.js has the city: as it really sounds, not a cartoon of it
 * (sounds.js has the cartoon ones, forest, sea and gulls).
 *
 * What makes it sound real is mostly what makes the city: what goes on all
 * the time is a great many small things too many to tell apart - the
 * leaves, the foam, the crests of the waves far out - each octave of it
 * coming and going on its own; what stands out of it is mostly far off,
 * duller the further, and rings on round about; and nothing in it is ever
 * quite the same twice.
 *
 * - woods by day: a breath of wind through the tops of the trees, the
 *   leaves rattling as it goes - a great many little clicks, not a hiss -
 *   and the birds of a wood singing, each its own song from where it sits,
 *   over and over with a while between: chaffinches (a run down and a
 *   flourish), a great tit (tea-cher tea-cher), a blackbird (fluting, a
 *   squeaky twitter after), a robin (thin, wandering), a wren (trill after
 *   trill, far off), a wood pigeon cooing and a woodpecker drumming further
 *   still - all of them in the ring of the trees;
 * - woods by night: stiller; crickets near and far, and a tawny owl;
 * - beach: small waves - each breaking along the beach from one end of it
 *   to the other, the foam running up the sand fizzing with bubbles
 *   bursting, and draining back - over the surf further along the coast,
 *   and herring gulls - kyow, the long call, kek-kek - harsh and nasal, a
 *   throat's buzz through its own resonances; by night without the gulls;
 *   rough, big waves thumping down, and a gull or two;
 * - offshore: the open sea, out of sight of any beach - the wind gusting,
 *   all its octaves coming and going on their own, the crests of the waves
 *   breaking white here and there round about; in a gale more of it all,
 *   and spray.
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
 * The leaves of the trees as the wind goes through them, both ears: each
 * leaf knocking another a click of noise dying away in a couple of
 * milliseconds, a few dozen a second in a lull, thousands in a gust, so
 * that it rattles and only in the strongest gusts runs into a rush.
 */
function leaves(name, rate, n, over, seconds, gust, loud) {
  var ch = [],
    eddies = wander(seeded(seedOf(name + " eddies")), seconds, 0.8);

  for (var side = 0; side < 2; side++) {
    var rnd = seeded(seedOf(name + " " + side)),
      hiss = white(rnd),
      band = new Biquad(rate, "bandpass", 2500, 0.5),
      top = new OnePole(rate, 6000),
      dies = Math.exp(-1 / (0.004 * rate)),
      shot = 0,
      often = 0,
      buf = new Float32Array(n + over);

    for (var i = 0; i < n + over; i++) {
      if (i % 64 === 0) {
        var t = i / rate + side * 0.6,
          g = gust(t) * (0.7 + 0.6 * eddies(t + side * 0.3));

        often = (20 + 3000 * g * g) / rate;
      }

      if (rnd() < often) shot += -Math.log(1 - rnd() * 0.999);
      shot *= dies;

      buf[i] = top.run(band.run(hiss())) * shot;
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
 * A wave breaking along the beach, both ears: a stretch of it after
 * another, a moment apart, from one side over towards the other - each its
 * own, a little bigger or smaller.
 */
function breaker(rnd, rate, size) {
  var parts = 4 + Math.floor(rnd() * 3),
    along = between(rnd, 0.6, 1.6) * (1 + size),
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

//the surf further along the coast, an octave at a time
var SURF = [
  [63, 0.7],
  [125, 1],
  [250, 0.9],
  [500, 0.7],
  [1000, 0.5],
  [2000, 0.35],
  [4000, 0.2],
  [8000, 0.08],
];

//the breeze off the sea, an octave at a time
var BREEZE = [
  [63, 0.8],
  [125, 1],
  [250, 0.9],
  [500, 0.6],
  [1000, 0.35],
  [2000, 0.18],
  [4000, 0.08],
  [8000, 0.03],
];

/**
 * How long a loop of each is; how long after one wave is done the next
 * comes, s - less than nothing, so they come in over each other - and how
 * big they are; how loud the surf further along and the breeze
 * are; how many gulls call; how long it rings on; and how loud it all is.
 */
var BEACHES = [
  //calm, by day
  {
    seconds: 36,
    waves: [-2.5, 0.5],
    size: 0.45,
    surf: 0.012,
    breeze: 0.008,
    gulls: 7,
    ring: 0.9,
    loud: 0.08,
  },
  //calm, by night
  {
    seconds: 36,
    waves: [-2.5, 0.5],
    size: 0.45,
    surf: 0.012,
    breeze: 0.007,
    gulls: 0,
    ring: 0.9,
    loud: 0.075,
  },
  //rough
  {
    seconds: 36,
    waves: [-3.5, -1],
    size: 1,
    surf: 0.04,
    breeze: 0.025,
    gulls: 2,
    ring: 0.9,
    loud: 0.12,
  },
];

function beach(rnd, variant, rate) {
  var be = BEACHES[variant],
    tag = "beach " + variant,
    n = Math.round(be.seconds * rate),
    over = Math.round(1.5 * rate),
    swell = wander(seeded(seedOf(tag + " swell")), be.seconds, 4),
    surf = bed(
      tag + " surf",
      rate,
      n,
      over,
      be.seconds,
      SURF,
      [1.5, 4],
      swell,
      be.surf,
    ),
    blows = wander(seeded(seedOf(tag + " gusts")), be.seconds, 5),
    breeze = bed(
      tag + " breeze",
      rate,
      n,
      over,
      be.seconds,
      BREEZE,
      [2, 6],
      blows,
      be.breeze,
    ),
    waves = [new Float32Array(n), new Float32Array(n)],
    dry = [new Float32Array(n), new Float32Array(n)],
    send = [new Float32Array(n), new Float32Array(n)],
    c,
    i;

  //the waves, one after another - now and then a set of bigger ones closer
  //together
  again(
    rnd,
    rate,
    be.seconds,
    be.waves,
    function () {
      return breaker(rnd, rate, be.size * between(rnd, 0.7, 1.15));
    },
    function (w, t) {
      var at = Math.round(t * rate);

      lay(waves, w[0], at, -1, Math.SQRT2 * 0.7, true);
      lay(waves, w[1], at, 1, Math.SQRT2 * 0.7, true);
    },
  );

  //the gulls, here and there round the loop - one answering another, now
  //and then
  for (i = 0; i < be.gulls; i++) {
    var at = rnd() * be.seconds,
      r = between(rnd, 25, 150),
      pan = between(rnd, -0.9, 0.9);

    put(
      dry,
      send,
      heard(rate, gullCall(rnd, rate), r, 0.5, 600000),
      Math.round(at * rate),
      pan,
      r,
    );

    if (rnd() < 0.4) {
      var r2 = between(rnd, 30, 170);

      put(
        dry,
        send,
        heard(rate, gullCall(rnd, rate), r2, 0.5, 600000),
        Math.round((at + between(rnd, 0.6, 2)) * rate),
        between(rnd, -0.9, 0.9),
        r2,
      );
    }
  }

  //the waves ringing a little, off the dunes and the water
  for (c = 0; c < 2; c++)
    for (i = 0; i < n; i++) send[c][i] += waves[c][i] * 0.15;

  var back = ring(send, rate, be.ring, 7000, 2);

  scale(back, (0.4 * rms(send)) / (rms(back) || 1));

  var ch = [new Float32Array(n), new Float32Array(n)];

  for (c = 0; c < 2; c++)
    for (i = 0; i < n; i++)
      ch[c][i] =
        surf[c][i] + breeze[c][i] + waves[c][i] + dry[c][i] + back[c][i];

  return level(ch, be.loud);
}

/* ------------------------------------------------------------------------
 * The open sea
 * --------------------------------------------------------------------- */

//the wind over the open sea, an octave at a time
var GALE = [
  [50, 0.8],
  [100, 1],
  [200, 0.9],
  [400, 0.7],
  [800, 0.45],
  [1600, 0.25],
  [3200, 0.12],
  [6400, 0.05],
];

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
 * How long a loop of each is; how hard the wind blows and how much it
 * gusts; how many crests break white; how much spray it blows off them;
 * how loud the swell sloshing under it all is; and how loud it all is.
 */
var OFFSHORE = [
  //a breeze
  {
    seconds: 36,
    wind: 0.05,
    gusts: 0.6,
    crests: 14,
    spray: 0,
    swell: 0.01,
    loud: 0.08,
  },
  //a gale
  {
    seconds: 36,
    wind: 0.08,
    gusts: 0.85,
    crests: 40,
    spray: 0.025,
    swell: 0.02,
    loud: 0.11,
  },
];

function offshore(rnd, variant, rate) {
  var of = OFFSHORE[variant],
    tag = "offshore " + variant,
    n = Math.round(of.seconds * rate),
    over = Math.round(1.5 * rate),
    gusts = wander(seeded(seedOf(tag + " gusts")), of.seconds, 5),
    whirls = wander(seeded(seedOf(tag + " whirls")), of.seconds, 1.4),
    gust = function (t) {
      return 1 - of.gusts + of.gusts * (0.6 * gusts(t) + 0.4 * whirls(t));
    },
    wind = bed(
      tag + " wind",
      rate,
      n,
      over,
      of.seconds,
      GALE,
      [1.2, 3.5],
      gust,
      of.wind,
    ),
    sea = [new Float32Array(n), new Float32Array(n)],
    c,
    i;

  //the swell sloshing far down under the wind, and the spray blown off the
  //crests in a gale - each ear its own
  for (c = 0; c < 2; c++) {
    var low = brown(seeded(seedOf(tag + " swell " + c))),
      hiss = white(seeded(seedOf(tag + " spray " + c))),
      slosh = wander(seeded(seedOf(tag + " slosh " + c)), of.seconds, 3.5),
      lp = new Biquad(rate, "lowpass", 160, 0.7),
      hp = new Biquad(rate, "highpass", 2500, 0.7),
      buf = new Float32Array(n + over);

    for (i = 0; i < n + over; i++) {
      var t = i / rate,
        g = gust(t + c * 0.4);

      buf[i] =
        lp.run(low()) * of.swell * 8 * (0.3 + 0.7 * slosh(t)) +
        hp.run(hiss()) * of.spray * g * g * g;
    }

    var s = seamless(buf, n, over);

    for (i = 0; i < n; i++) sea[c][i] += s[i];
  }

  //the crests breaking white, near and far
  for (i = 0; i < of.crests; i++) {
    var r = between(rnd, 30, 300);

    lay(
      sea,
      heard(rate, crest(rnd, rate, of.gusts), r, 0.5, 1000000),
      Math.floor(rnd() * n),
      between(rnd, -1, 1),
      20 / r,
      true,
    );
  }

  var ch = [new Float32Array(n), new Float32Array(n)];

  for (c = 0; c < 2; c++)
    for (i = 0; i < n; i++) ch[c][i] = wind[c][i] + sea[c][i];

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
