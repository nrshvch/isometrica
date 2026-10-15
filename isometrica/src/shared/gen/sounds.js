/**
 * Sounds, made the way the pictures are: worked out a sample at a time out of
 * a few plain ingredients rather than recorded - noise and simple waves, put
 * through filters and shaped by envelopes. The same sound comes out the same
 * every time, from the name of it.
 *
 * The method is the one Andy Farnell's Designing Sound teaches: look at what
 * makes a sound - what moves, what it moves through, how far it carries - and
 * build a little model of that, not a copy of a recording. A model is a few
 * dozen lines, and turning one knob of it makes another variation. The
 * pieces are the ones every synthesis book has (Curtis Roads' Computer Music
 * Tutorial): white, pink and brown noise; sine, saw and square waves; one-
 * pole and two-pole filters (Robert Bristow-Johnson's cookbook); envelopes;
 * and a small reverb of combs and all-passes (Schroeder, as Freeverb has it)
 * for the space round a sound. None of it aims to pass for the real thing -
 * a pixel city sounds a little like a cartoon, and so do these:
 *
 *   - thunder: the crack of the strike, many short N-shaped pressure waves
 *     from all along the bolt, and then the sky burping - low rumbles, each a
 *     train of pulses slowing down under filtered noise, coming later and
 *     softer from further along the bolt, and the long roll under them all.
 *     Four strikes, from right overhead to far off, and a double one;
 *   - horn: a car's two notes a third apart, squarish, through the horn's
 *     own resonance, each note bending up into pitch as it starts - beep,
 *     beep-beep, a little car's meep-meep and a bus's honk;
 *   - siren: a police car's, through a loudspeaker's horn - the wail, the
 *     yelp and the two-tone nee-naw. It loops: its pitch is worked out so a
 *     whole number of cycles goes into every turn of it;
 *   - forest: wind in gusts through the trees, the leaves rustling when it
 *     blows hardest, and birds - chirps, trills, a two-note whistle and a
 *     warble, near and far, here and there;
 *   - sea: waves - each a swell rising, breaking, and washing back up the
 *     beach fizzing - over the low roar of the surf further out, and in
 *     the rougher one gulls;
 *   - city: a town heard from a little way off - the low roar of its
 *     traffic coming and going, cars whooshing past, a hum under it all,
 *     now and then a horn;
 *   - skyline: a real city heard from high above it, not a cartoon of one
 *     - its own models, in skyline.js.
 *
 * The last three loop, seamlessly: what goes on in them all the time is made
 * a little longer than the loop and its end faded into its start, and what
 * happens now and then - a bird, a wave, a car - is laid in round the loop,
 * so whatever runs over the end of it comes in again at the start.
 *
 * Everything comes out as plain numbers, a Float32Array per channel, -1..1:
 * a game hands them to the browser's Web Audio (AudioContext createBuffer),
 * tools/gensounds.js writes them out as .wav files to listen to, and
 * lab/sounds.html plays them.
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
  saw,
  square,
  soft,
  spaced,
  spacedStereo,
  ears,
  lay,
  seamless,
  peak,
  level,
} from "./dsp.js";
import { SKYLINE } from "./skyline.js";

//how many samples a second, unless asked for another rate
export var RATE = 44100;

/* ------------------------------------------------------------------------
 * Thunder
 * --------------------------------------------------------------------- */

//how far off each strike is (0 overhead .. 1 far), how long it rolls on,
//how many burps of the sky, how hard the crack, and how many strikes
var STRIKES = [
  { far: 0.12, seconds: 5, burps: 9, crack: 1, strikes: 1 },
  { far: 0.45, seconds: 6, burps: 13, crack: 0.45, strikes: 1 },
  { far: 0.9, seconds: 7.5, burps: 16, crack: 0.1, strikes: 1 },
  { far: 0.3, seconds: 7, burps: 15, crack: 0.9, strikes: 2 },
];

/**
 * One burp of the sky: a train of pulses, slowing down - brrrup - under a
 * bit of low noise, a quick rise and a slower fall.
 */
function burp(rnd, rate, seconds, far) {
  var n = Math.round(seconds * rate),
    out = new Float32Array(n),
    noise = brown(rnd),
    lp = new Biquad(
      rate,
      "lowpass",
      between(rnd, 160, 320) * (1 - far * 0.4),
      1.1,
    ),
    rise = between(rnd, 0.03, 0.08),
    pulse = between(rnd, 16, 34),
    slows = between(rnd, 0.5, 0.8),
    phase = 0,
    i;

  for (i = 0; i < n; i++) {
    var t = i / rate,
      u = t / seconds,
      env =
        (t < rise ? t / rise : Math.exp(-(t - rise) / (seconds * 0.32))) *
        //and gone to nothing by the end of it, not cut off
        Math.min(1, (1 - u) / 0.15),
      f = pulse * (1 - (1 - slows) * u),
      p;

    phase = (phase + f / rate) % 1;
    //narrow, rounded pulses - like a throat's
    p = Math.pow(0.5 + 0.5 * Math.cos(TAU * phase), 6);

    out[i] = lp.run(noise() * 0.7 + p * 1.1) * env;
  }

  return out;
}

/**
 * The crack of a strike: many short N-shaped waves from along the bolt, the
 * nearest first and sharpest, crowding in over a tenth of a second.
 */
function crack(rnd, rate, far) {
  var n = Math.round(0.4 * rate),
    out = new Float32Array(n),
    j,
    i;

  for (j = 0; j < 70; j++) {
    var at = Math.round(Math.pow(rnd(), 2) * 0.15 * rate),
      w = Math.max(
        2,
        Math.round((0.0006 + rnd() * 0.003) * (1 + far * 3) * rate),
      ),
      a = (0.3 + rnd() * 0.7) * (1 - j / 90);

    for (i = 0; i < w && at + i < n; i++) out[at + i] += a * (1 - (2 * i) / w);
  }

  var hp = new Biquad(rate, "highpass", 250, 0.7),
    lp = new Biquad(rate, "lowpass", 7000 - far * 5500, 0.7);

  for (i = 0; i < n; i++) out[i] = lp.run(hp.run(out[i]));

  return out;
}

function thunder(rnd, variant, rate) {
  var k = STRIKES[variant],
    n = Math.round(k.seconds * rate),
    dry = new Float32Array(n),
    s,
    i;

  for (s = 0; s < k.strikes; s++) {
    var at = s === 0 ? 0 : between(rnd, 1.6, 2.4),
      start = Math.round(at * rate),
      c = crack(rnd, rate, k.far),
      left = k.seconds - at;

    for (i = 0; i < c.length && start + i < n; i++)
      dry[start + i] += c[i] * k.crack * 1.4;

    //the sky burping, later and softer the further along the bolt
    for (var b = 0; b < k.burps; b++) {
      var when = at + 0.04 + k.far * 0.3 + Math.pow(rnd(), 1.5) * (left - 1.4),
        long = between(rnd, 0.3, 0.9) * (1 + k.far),
        loud = between(rnd, 0.4, 1) * Math.exp(-(when - at) / (left * 0.45)),
        burst = burp(rnd, rate, long, k.far),
        from = Math.round(when * rate);

      for (i = 0; i < burst.length && from + i < n; i++)
        dry[from + i] += burst[i] * loud;
    }
  }

  //and the long roll under it all
  var roll = brown(rnd),
    lp = new Biquad(rate, "lowpass", 90, 0.8);

  for (i = 0; i < n; i++) {
    var t = i / rate;

    dry[i] +=
      lp.run(roll()) *
      0.9 *
      Math.min(1, t / 0.15) *
      Math.exp(-t / (k.seconds * 0.35));
  }

  var ch = spaced(dry, rate, 1.8, 0.4, 0.3 + k.far * 0.3, false);

  for (var c2 = 0; c2 < 2; c2++)
    for (i = 0; i < n; i++) ch[c2][i] = soft(ch[c2][i], 1.5);

  //a moment of quiet at the end, faded to nothing
  var fade = Math.round(0.3 * rate);

  for (i = 0; i < fade; i++) {
    ch[0][n - 1 - i] *= i / fade;
    ch[1][n - 1 - i] *= i / fade;
  }

  return peak(ch, 0.95);
}

/* ------------------------------------------------------------------------
 * Horns
 * --------------------------------------------------------------------- */

//each horn's notes - [start, how long] in seconds - its two pitches, the
//wave it is, where its horn rings, how hard it is driven, and how far each
//note bends up into pitch as it starts
var HORNS = [
  //beep
  {
    notes: [[0, 0.26]],
    pitch: [392, 494],
    wave: "square",
    ring: 1600,
    drive: 2,
    bend: 0.06,
  },
  //beep-beep
  {
    notes: [
      [0, 0.12],
      [0.2, 0.14],
    ],
    pitch: [392, 494],
    wave: "square",
    ring: 1600,
    drive: 2,
    bend: 0.06,
  },
  //a little car's meep-meep
  {
    notes: [
      [0, 0.13],
      [0.21, 0.15],
    ],
    pitch: [740, 932],
    wave: "squeak",
    ring: 2600,
    drive: 1.6,
    bend: 0.25,
  },
  //a bus's honk
  {
    notes: [[0, 0.55]],
    pitch: [196, 247],
    wave: "saw",
    ring: 900,
    drive: 3,
    bend: 0.04,
  },
];

/**
 * A horn's notes, mono: its two pitches together, bent up into tune as each
 * note starts, through the ring of the horn and a little overdriven.
 */
function hornNotes(h, rate) {
  var last = h.notes[h.notes.length - 1],
    n = Math.round((last[0] + last[1] + 0.05) * rate),
    out = new Float32Array(n),
    ring = new Biquad(rate, "bandpass", h.ring, 1.2),
    lp = new Biquad(rate, "lowpass", 4500, 0.7),
    phases = [0, 0],
    i,
    j;

  for (i = 0; i < n; i++) {
    var t = i / rate,
      env = 0,
      into = 0;

    for (j = 0; j < h.notes.length; j++) {
      var u = t - h.notes[j][0],
        long = h.notes[j][1];

      if (u >= 0 && u < long + 0.03) {
        env = Math.min(1, u / 0.006) * (u > long ? 1 - (u - long) / 0.03 : 1);
        into = u;
      }
    }

    var x = 0;

    for (j = 0; j < 2; j++) {
      var f =
          h.pitch[j] *
          (1 - h.bend * Math.exp(-into / 0.03)) *
          (1 + 0.004 * Math.sin(TAU * 6 * t)),
        dt = f / rate;

      phases[j] = (phases[j] + dt) % 1;

      var p = phases[j];

      x +=
        h.wave === "saw"
          ? saw(p, dt)
          : h.wave === "squeak"
            ? 0.6 * Math.sin(TAU * p) + 0.4 * square(p, dt)
            : square(p, dt);
    }

    x *= env * 0.5;
    out[i] = soft(ring.run(x) * 2.2 + lp.run(x) * 0.5, h.drive);
  }

  return out;
}

function horn(rnd, variant, rate) {
  var dry = hornNotes(HORNS[variant], rate),
    n = dry.length + Math.round(0.4 * rate),
    long = new Float32Array(n),
    slap = Math.round(0.045 * rate),
    i;

  //and off the buildings across the street
  for (i = 0; i < dry.length; i++) {
    long[i] += dry[i];
    long[i + slap] += dry[i] * 0.18;
  }

  return peak(spaced(long, rate, 0.8, 0.5, 0.12, false), 0.9);
}

/* ------------------------------------------------------------------------
 * Sirens
 * --------------------------------------------------------------------- */

//how long a turn of each takes, how many turns go into the loop, and its
//pitch through a turn, u 0..1
var SIRENS = [
  //the wail: up and down, slowly
  {
    turn: 4,
    turns: 2,
    pitch: function (u) {
      return 650 + 850 * Math.pow(0.5 - 0.5 * Math.cos(TAU * u), 0.8);
    },
  },
  //the yelp: up fast, again and again
  {
    turn: 0.4,
    turns: 12,
    pitch: function (u) {
      return 700 + 900 * Math.pow(u, 0.7);
    },
  },
  //the two-tone: nee-naw
  {
    turn: 1.3,
    turns: 4,
    pitch: function (u) {
      var g = 0.03 / 1.3,
        s = u < g ? u / g : u < 0.5 ? 1 : u < 0.5 + g ? 1 - (u - 0.5) / g : 0;

      return 770 + 190 * (s * s * (3 - 2 * s));
    },
  },
];

function siren(rnd, variant, rate) {
  var sir = SIRENS[variant],
    turn = Math.round(sir.turn * rate),
    n = turn * sir.turns,
    i,
    cycles = 0;

  //a whole number of cycles of the tone in every turn, so it loops clean
  for (i = 0; i < turn; i++) cycles += sir.pitch(i / turn) / rate;

  var k = Math.round(cycles) / cycles,
    dry = new Float32Array(n),
    horn = new Biquad(rate, "bandpass", 1400, 0.9),
    lp = new Biquad(rate, "lowpass", 5000, 0.7),
    phase = 0,
    pass;

  //put through twice, the second time kept: the filters have settled
  for (pass = 0; pass < 2; pass++)
    for (i = 0; i < n; i++) {
      var f = sir.pitch((i % turn) / turn) * k,
        dt = f / rate;

      phase = (phase + dt) % 1;

      var x = 0.7 * square(phase, dt) + 0.3 * saw(phase, dt);

      dry[i] = soft(horn.run(x) * 1.8 + lp.run(x) * 0.35, 1.8);
    }

  return peak(spaced(dry, rate, 1, 0.5, 0.18, true), 0.85);
}

/* ------------------------------------------------------------------------
 * Birds
 * --------------------------------------------------------------------- */

//a bird's tone at phase p: a whistle, a little of its octave in it
function tweet(p) {
  return Math.sin(TAU * p) + 0.15 * Math.sin(2 * TAU * p);
}

//a rounded envelope over a syllable, u 0..1
function syllable(u) {
  return u <= 0 || u >= 1 ? 0 : Math.pow(Math.sin(Math.PI * u), 0.7);
}

/**
 * One call of a bird, mono, of one kind: "chirp" - a few quick glides up -
 * "trill" - a high note fluttering - "whistle" - tee-too, once or a few
 * times - or "warble" - a note wandering up and down.
 */
function birdCall(rnd, kind, rate) {
  var notes = [],
    t = 0,
    i;

  if (kind === "chirp") {
    var f0 = between(rnd, 2800, 3600),
      up = rnd() < 0.7 ? between(rnd, 1.2, 1.45) : between(rnd, 0.7, 0.85),
      count = 2 + Math.floor(rnd() * 4);

    for (i = 0; i < count; i++) {
      var long = between(rnd, 0.05, 0.08);

      notes.push({ at: t, long: long, f0: f0, f1: f0 * up });
      t += long + between(rnd, 0.06, 0.1);
    }
  } else if (kind === "trill") {
    var f = between(rnd, 4000, 5200);

    notes.push({
      at: 0,
      long: between(rnd, 0.5, 1),
      f0: f,
      f1: f * 0.9,
      flutter: between(rnd, 22, 34),
    });
  } else if (kind === "whistle") {
    var hi = between(rnd, 2400, 3000),
      times = 1 + Math.floor(rnd() * 3);

    for (i = 0; i < times; i++) {
      notes.push({ at: t, long: 0.2, f0: hi * 0.97, f1: hi });
      t += 0.28;
      notes.push({ at: t, long: 0.22, f0: hi * 0.8, f1: hi * 0.78 });
      t += 0.42;
    }
  } else {
    var base = between(rnd, 2600, 3600);

    notes.push({
      at: 0,
      long: between(rnd, 0.6, 1.2),
      f0: base,
      f1: base * between(rnd, 0.9, 1.1),
      wobble: between(rnd, 9, 16),
      depth: between(rnd, 350, 700),
    });
  }

  var last = notes[notes.length - 1],
    n = Math.round((last.at + last.long + 0.02) * rate),
    out = new Float32Array(n),
    phase = 0;

  notes.forEach(function (note) {
    var from = Math.round(note.at * rate),
      len = Math.round(note.long * rate);

    for (i = 0; i < len && from + i < n; i++) {
      var u = i / len,
        tt = i / rate,
        f = note.f0 + (note.f1 - note.f0) * u;

      if (note.wobble) f += note.depth * Math.sin(TAU * note.wobble * tt);

      phase = (phase + f / rate) % 1;

      var amp = syllable(u);

      if (note.flutter)
        amp *= Math.pow(0.5 + 0.5 * Math.sin(TAU * note.flutter * tt), 2);

      out[from + i] += tweet(phase) * amp;
    }
  });

  return out;
}

var BIRDS = ["chirp", "trill", "whistle", "warble"];

/* ------------------------------------------------------------------------
 * The forest
 * --------------------------------------------------------------------- */

//how many birds call in a loop of each, and how hard the wind blows
var FORESTS = [
  { seconds: 24, birds: 26, wind: 0.6 },
  { seconds: 24, birds: 12, wind: 1 },
];

function forest(rnd, variant, rate) {
  var fo = FORESTS[variant],
    n = Math.round(fo.seconds * rate),
    over = Math.round(1.5 * rate),
    gust = wander(rnd, fo.seconds, 2.2),
    flutter = wander(rnd, fo.seconds, 0.15),
    ch = [],
    side,
    i;

  //the wind in the trees, and the leaves when it blows hardest - a little
  //different in each ear
  for (side = 0; side < 2; side++) {
    var air = pink(seeded(seedOf("forest air" + variant + side))),
      hiss = white(seeded(seedOf("forest leaves" + variant + side))),
      low = brown(seeded(seedOf("forest low" + variant + side))),
      band = new Biquad(rate, "bandpass", 400, 0.6),
      hp = new Biquad(rate, "highpass", 3200, 0.7),
      lp = new Biquad(rate, "lowpass", 120, 0.7),
      buf = new Float32Array(n + over);

    for (i = 0; i < n + over; i++) {
      var t = i / rate,
        g = gust(t);

      if (i % 32 === 0) band.set("bandpass", 250 + 550 * g, 0.6);

      buf[i] =
        fo.wind *
        (band.run(air()) * (0.25 + 0.75 * g) * 1.6 +
          lp.run(low()) * 0.25 * g +
          hp.run(hiss()) * g * g * (0.3 + 0.7 * flutter(t)) * 0.35);
    }

    ch.push(seamless(buf, n, over));
  }

  //the birds, near and far, laid round the loop
  var birds = [new Float32Array(n), new Float32Array(n)];

  for (i = 0; i < fo.birds; i++) {
    var call = birdCall(rnd, BIRDS[Math.floor(rnd() * BIRDS.length)], rate),
      far = rnd(),
      dull = new OnePole(rate, 9000 - far * 5500);

    for (var j = 0; j < call.length; j++) call[j] = dull.run(call[j]);

    lay(
      birds,
      call,
      Math.floor(rnd() * n),
      between(rnd, -0.9, 0.9),
      0.12 + 0.45 * (1 - far),
      true,
    );
  }

  birds = spacedStereo(birds, rate, 1.1, 0.3, 0.25, true);

  for (i = 0; i < n; i++) {
    ch[0][i] += birds[0][i];
    ch[1][i] += birds[1][i];
  }

  return level(ch, 0.11);
}

/* ------------------------------------------------------------------------
 * The sea
 * --------------------------------------------------------------------- */

//how many waves break in a loop of each, how big they are, and how many
//gulls call
var SEAS = [
  { seconds: 24, waves: 4, size: 0.7, gulls: 0 },
  { seconds: 24, waves: 3, size: 1, gulls: 4 },
];

/**
 * One wave, in both ears: a swell rising, the break, and the wash running
 * back fizzing - each ear its own noise, so the wave is wide.
 */
function wave(rnd, rate, seconds, size) {
  var n = Math.round(seconds * rate),
    rise = 0.35,
    out = [];

  for (var side = 0; side < 2; side++) {
    var roar = brown(seeded(seedOf("wave roar" + side + rnd()))),
      hiss = pink(seeded(seedOf("wave hiss" + side + rnd()))),
      fizz = seeded(seedOf("wave fizz" + side + rnd())),
      swell = new Biquad(rate, "lowpass", 200, 0.8),
      breaks = new Biquad(rate, "lowpass", 2500, 0.7),
      wash = new Biquad(rate, "bandpass", 4000, 0.5),
      ch = new Float32Array(n),
      pop = 0,
      popf = 0,
      popp = 0;

    for (var i = 0; i < n; i++) {
      var u = i / n,
        x = 0;

      //the swell coming in, louder and brighter
      if (u < rise + 0.05) {
        var s = Math.min(1, u / rise);

        if (i % 32 === 0) swell.set("lowpass", 150 + 650 * s * s, 0.8);
        x +=
          swell.run(roar()) *
          0.9 *
          s *
          s *
          (u > rise ? 1 - (u - rise) / 0.05 : 1);
      }

      //breaking
      var b = (u - rise) / 0.06;

      if (b > -0.3 && b < 3)
        x +=
          breaks.run(roar() * 0.6 + hiss() * 1.2) *
          Math.exp(-Math.abs(b)) *
          1.1;

      //the wash running up the beach and back, hissing and fizzing - duller
      //as it goes, gone by the end
      if (u > rise) {
        var into = u - rise,
          w =
            Math.min(1, into / 0.06) *
            Math.exp(-into / 0.2) *
            Math.min(1, (1 - u) / 0.25);

        if (i % 32 === 0)
          wash.set("bandpass", 1200 + 3200 * Math.exp(-into / 0.25), 0.5);

        x += wash.run(hiss()) * w * 1.6;

        if (fizz() < 0.0025 * w) {
          pop = between(fizz, 0.05, 0.15) * w;
          popf = between(fizz, 3000, 7000);
        }

        popp = (popp + popf / rate) % 1;
        x += pop * Math.sin(TAU * popp);
        pop *= 0.992;
      }

      ch[i] = x * size * Math.min(1, (1 - u) / 0.05);
    }

    out.push(ch);
  }

  return out;
}

//a gull: kyow - a raspy cry falling, once or a few times
function gull(rnd, rate) {
  var times = 1 + Math.floor(rnd() * 3),
    long = between(rnd, 0.28, 0.4),
    gap = 0.15,
    n = Math.round(times * (long + gap) * rate),
    out = new Float32Array(n),
    top = between(rnd, 1500, 1900),
    phase = 0;

  for (var c = 0; c < times; c++) {
    var from = Math.round(c * (long + gap) * rate),
      len = Math.round(long * rate);

    for (var i = 0; i < len; i++) {
      var u = i / len,
        f =
          top * (1 - 0.45 * Math.pow(u, 0.8)) * (1 + 0.08 * Math.exp(-u * 12)),
        x = 0;

      phase = (phase + f / rate) % 1;

      for (var h = 1; h <= 4; h++) x += Math.sin(TAU * phase * h) / h;

      out[from + i] =
        x * syllable(u) * (0.75 + 0.25 * Math.sin(TAU * 45 * (i / rate)));
    }
  }

  return out;
}

function sea(rnd, variant, rate) {
  var se = SEAS[variant],
    n = Math.round(se.seconds * rate),
    over = Math.round(1.5 * rate),
    swell = wander(rnd, se.seconds, 3),
    ch = [],
    side,
    i;

  //the surf further out, all the time
  for (side = 0; side < 2; side++) {
    var roar = brown(seeded(seedOf("surf" + variant + side))),
      hiss = pink(seeded(seedOf("surf hiss" + variant + side))),
      lp = new Biquad(rate, "lowpass", 180, 0.7),
      lp2 = new Biquad(rate, "lowpass", 700, 0.7),
      buf = new Float32Array(n + over);

    for (i = 0; i < n + over; i++) {
      var s = swell(i / rate);

      buf[i] =
        (lp.run(roar()) * 0.5 + lp2.run(hiss()) * 0.35) *
        (0.5 + 0.5 * s) *
        se.size;
    }

    ch.push(seamless(buf, n, over));
  }

  //the waves breaking, one after another round the loop
  var gap = se.seconds / se.waves;

  for (i = 0; i < se.waves; i++) {
    var long = between(rnd, 5.5, 8),
      w = wave(rnd, rate, long, se.size * between(rnd, 0.7, 1)),
      at = Math.round((i * gap + between(rnd, 0, gap * 0.4)) * rate),
      pan = between(rnd, -0.4, 0.4),
      e = ears(pan);

    lay(ch, w[0], at, -1, e[0] * 1.414, true);
    lay(ch, w[1], at, 1, e[1] * 1.414, true);
  }

  //and the gulls
  if (se.gulls > 0) {
    var gulls = [new Float32Array(n), new Float32Array(n)];

    for (i = 0; i < se.gulls; i++) {
      var g = gull(rnd, rate),
        dull = new OnePole(rate, between(rnd, 2500, 6000));

      for (var j = 0; j < g.length; j++) g[j] = dull.run(g[j]);

      lay(
        gulls,
        g,
        Math.floor(rnd() * n),
        between(rnd, -0.8, 0.8),
        between(rnd, 0.06, 0.16),
        true,
      );
    }

    gulls = spacedStereo(gulls, rate, 1.4, 0.3, 0.3, true);

    for (i = 0; i < n; i++) {
      ch[0][i] += gulls[0][i];
      ch[1][i] += gulls[1][i];
    }
  }

  return level(ch, 0.13);
}

/* ------------------------------------------------------------------------
 * Gulls, over the shore
 * --------------------------------------------------------------------- */

//how long a loop of each is, how many gulls cry in it, how many of them
//laugh, and how hard the breeze off the sea blows under them
var SHORES = [
  { seconds: 20, cries: 7, laughs: 1, breeze: 0.5 },
  { seconds: 20, cries: 4, laughs: 3, breeze: 0.8 },
];

/**
 * A gull laughing: ha-ha-ha-ha - short raspy cries, quicker and lower one
 * after another, the first a long one up high (the herring gull's "long
 * call", toony).
 */
function laugh(rnd, rate) {
  var count = 5 + Math.floor(rnd() * 5),
    top = between(rnd, 1300, 1700),
    parts = [],
    total = 0,
    c;

  for (c = 0; c < count; c++) {
    var long = c === 0 ? 0.42 : Math.max(0.09, 0.2 - c * 0.014),
      gap = c === 0 ? 0.12 : Math.max(0.05, 0.11 - c * 0.008);

    parts.push({ at: total, long: long, top: top * (1 - c * 0.035) });
    total += long + gap;
  }

  var out = new Float32Array(Math.round(total * rate)),
    phase = 0;

  parts.forEach(function (p, k) {
    var from = Math.round(p.at * rate),
      len = Math.round(p.long * rate);

    for (var i = 0; i < len && from + i < out.length; i++) {
      var u = i / len,
        //up into it and down out of it; the long first one falls further
        f =
          p.top *
          (1 + 0.12 * Math.sin(Math.PI * Math.min(1, u * 1.6))) *
          (1 - (k === 0 ? 0.35 : 0.18) * u),
        x = 0;

      phase = (phase + f / rate) % 1;

      for (var h = 1; h <= 5; h++) x += Math.sin(TAU * phase * h) / h;

      //rasp: the throat buzzing at ~60 Hz
      out[from + i] =
        x * syllable(u) * (0.65 + 0.35 * Math.sin(TAU * 62 * (i / rate)));
    }
  });

  return out;
}

/**
 * The shore: a breeze off the sea, and gulls crying and laughing over it,
 * near and far, round the loop.
 */
function gulls(rnd, variant, rate) {
  var sh = SHORES[variant],
    n = Math.round(sh.seconds * rate),
    over = Math.round(1.5 * rate),
    gust = wander(rnd, sh.seconds, 2.5),
    ch = [],
    side,
    i;

  //the breeze, soft and airy
  for (side = 0; side < 2; side++) {
    var air = pink(seeded(seedOf("shore breeze" + variant + side))),
      bp = new Biquad(rate, "bandpass", 500, 0.5),
      buf = new Float32Array(n + over);

    for (i = 0; i < n + over; i++) {
      var g = gust(i / rate);

      if (i % 64 === 0) bp.set("bandpass", 300 + 700 * g, 0.5);
      buf[i] = bp.run(air()) * (0.3 + 0.7 * g) * sh.breeze * 0.5;
    }

    ch.push(seamless(buf, n, over));
  }

  var calls = [new Float32Array(n), new Float32Array(n)];

  for (i = 0; i < sh.cries + sh.laughs; i++) {
    var call = i < sh.cries ? gull(rnd, rate) : laugh(rnd, rate),
      far = rnd(),
      dull = new OnePole(rate, 6500 - 4500 * far);

    for (var j = 0; j < call.length; j++) call[j] = dull.run(call[j]);

    lay(
      calls,
      call,
      Math.floor(rnd() * n),
      between(rnd, -0.85, 0.85),
      0.22 - 0.16 * far,
      true,
    );
  }

  calls = spacedStereo(calls, rate, 1.6, 0.3, 0.35, true);

  for (i = 0; i < n; i++) {
    ch[0][i] += calls[0][i];
    ch[1][i] += calls[1][i];
  }

  return level(ch, 0.1);
}

/* ------------------------------------------------------------------------
 * The city
 * --------------------------------------------------------------------- */

//how many cars whoosh by in a loop of each, how many horns go, whether a
//siren is heard far off, and how loud the roar of the traffic is
var CITIES = [
  { seconds: 30, cars: 14, horns: 3, siren: false, roar: 1 },
  //(no siren far off at night any more: it got on the nerves, looping)
  { seconds: 30, cars: 5, horns: 1, siren: false, roar: 0.6 },
];

/**
 * A car whooshing past, in both ears: the rush of its tyres and the air
 * round it, brighter and louder as it comes by and duller as it goes, its
 * engine a low note falling as it passes, from one side to the other.
 */
function whoosh(rnd, rate, seconds) {
  var n = Math.round(seconds * rate),
    rush = pink(rnd),
    band = new Biquad(rate, "bandpass", 300, 0.8),
    engine = new Biquad(rate, "lowpass", 260, 0.8),
    note = between(rnd, 55, 85),
    from = rnd() < 0.5 ? -0.9 : 0.9,
    phase = 0,
    out = [new Float32Array(n), new Float32Array(n)];

  for (var i = 0; i < n; i++) {
    var u = i / n,
      near = Math.exp(-Math.pow((u - 0.5) / 0.2, 2)),
      f = note * (1 + 0.08 * (0.5 - u) * 2),
      dt = f / rate;

    if (i % 32 === 0) band.set("bandpass", 250 + 850 * near, 0.8);

    phase = (phase + dt) % 1;

    var x =
        band.run(rush()) * 2.2 * Math.pow(near, 1.5) +
        engine.run(saw(phase, dt)) * 0.25 * near,
      e = ears(from * (1 - 2 * u));

    out[0][i] = x * e[0];
    out[1][i] = x * e[1];
  }

  return out;
}

function city(rnd, variant, rate) {
  var ci = CITIES[variant],
    n = Math.round(ci.seconds * rate),
    over = Math.round(1.5 * rate),
    swell = wander(rnd, ci.seconds, 4),
    sweep = wander(rnd, ci.seconds, 2.5),
    ch = [],
    side,
    i;

  //the roar of the traffic all over town, rising and falling - the whoosh
  //of it - and a hum under it
  for (side = 0; side < 2; side++) {
    var roar = brown(seeded(seedOf("town roar" + variant + side))),
      air = pink(seeded(seedOf("town air" + variant + side))),
      lp = new Biquad(rate, "lowpass", 250, 0.7),
      band = new Biquad(rate, "bandpass", 400, 0.7),
      buf = new Float32Array(n + over);

    for (i = 0; i < n + over; i++) {
      var t = i / rate,
        s = swell(t);

      if (i % 32 === 0) band.set("bandpass", 180 + 520 * sweep(t), 0.7);

      buf[i] =
        ci.roar *
          (lp.run(roar()) * 0.6 * (0.6 + 0.4 * s) +
            band.run(air()) * 0.7 * (0.3 + 0.7 * s)) +
        (0.02 * Math.sin(TAU * 52 * t) + 0.012 * Math.sin(TAU * 104 * t)) *
          (0.7 + 0.3 * Math.sin(TAU * t * 0.1));
    }

    ch.push(seamless(buf, n, over));
  }

  //cars whooshing by
  for (i = 0; i < ci.cars; i++) {
    var w = whoosh(rnd, rate, between(rnd, 2.5, 5)),
      at = Math.floor(rnd() * n),
      loud = between(rnd, 0.3, 1);

    lay(ch, w[0], at, -1, loud * 1.414, true);
    lay(ch, w[1], at, 1, loud * 1.414, true);
  }

  //and now and then a horn - or a siren - from a few streets away
  var far = [new Float32Array(n), new Float32Array(n)];

  for (i = 0; i < ci.horns; i++) {
    var h = hornNotes(HORNS[Math.floor(rnd() * HORNS.length)], rate),
      dull = new OnePole(rate, 1200);

    for (var j = 0; j < h.length; j++) h[j] = dull.run(h[j]);

    lay(
      far,
      h,
      Math.floor(rnd() * n),
      between(rnd, -0.8, 0.8),
      between(rnd, 0.06, 0.12),
      true,
    );
  }

  if (ci.siren) {
    var sir = SIRENS[0],
      long = Math.round(6 * rate),
      wail = new Float32Array(long),
      dull2 = new OnePole(rate, 1500),
      phase = 0;

    for (i = 0; i < long; i++) {
      var f = sir.pitch(((i / rate) % sir.turn) / sir.turn),
        dt = f / rate,
        u = i / long;

      phase = (phase + dt) % 1;
      wail[i] = dull2.run(square(phase, dt)) * Math.sin(Math.PI * u);
    }

    lay(far, wail, Math.floor(rnd() * n), between(rnd, -0.6, 0.6), 0.05, true);
  }

  far = spacedStereo(far, rate, 1.6, 0.5, 0.6, true);

  for (i = 0; i < n; i++) {
    ch[0][i] += far[0][i];
    ch[1][i] += far[1][i];
  }

  return level(spacedStereo(ch, rate, 1.5, 0.5, 0.2, true), 0.12);
}

/* ------------------------------------------------------------------------
 * Every sound
 * --------------------------------------------------------------------- */

/**
 * Every sound there is, by name: how many ways it comes, whether it loops,
 * and what each way of it is.
 */
export var SOUNDS = {
  thunder: {
    loop: false,
    make: thunder,
    ways: ["overhead", "near", "far off", "double strike"],
  },
  horn: {
    loop: false,
    make: horn,
    ways: ["beep", "beep-beep", "meep-meep", "honk"],
  },
  siren: { loop: true, make: siren, ways: ["wail", "yelp", "nee-naw"] },
  forest: { loop: true, make: forest, ways: ["birdsong", "breezy"] },
  sea: { loop: true, make: sea, ways: ["calm", "rough, gulls"] },
  gulls: { loop: true, make: gulls, ways: ["crying", "laughing"] },
  city: { loop: true, make: city, ways: ["day", "night"] },
  skyline: SKYLINE,
};

/**
 * Every sound by the name it is made by: "thunder/0", "horn/3", ...
 *
 * @returns {{name: string, sound: string, way: number, label: string,
 *          loop: boolean}[]}
 */
export function list() {
  var out = [];

  Object.keys(SOUNDS).forEach(function (sound) {
    SOUNDS[sound].ways.forEach(function (label, way) {
      out.push({
        name: sound + "/" + way,
        sound: sound,
        way: way,
        label: label,
        loop: SOUNDS[sound].loop,
      });
    });
  });

  return out;
}

/**
 * Makes a sound - the same every time for the same name and rate.
 *
 * @param name {string} "thunder/2", as list has them
 * @param [rate] {number} samples a second, RATE unless given
 * @returns {{rate: number, loop: boolean, channels: Float32Array[]}} two
 *          channels, left and right, -1..1; one that loops goes round
 *          without a seam
 */
export function generate(name, rate) {
  var parts = name.split("/"),
    sound = SOUNDS[parts[0]],
    way = +parts[1];

  if (sound === undefined || !(way >= 0 && way < sound.ways.length))
    throw new Error("no such sound: " + name);

  rate = rate || RATE;

  return {
    rate: rate,
    loop: sound.loop,
    channels: sound.make(seeded(seedOf(name)), way, rate),
  };
}
