/**
 * The old town's church heard from above it, the way skyline.js has the
 * city and country.js the woods: a small church, with one small bell in its
 * tower - rung for a service, swung, ding ... ding, coming up as the swing
 * does and dying down as it is let go; or tolled, a few slow strokes. Not a
 * loop: played now and then (client/audio/soundman), wherever the church is.
 *
 * A church bell rings at many pitches at once, none of them a whole number
 * of times another: the hum an octave under its note, the prime, a minor
 * third over it, a fifth, the nominal an octave up, and on up (as the bell
 * founders name them) - each two close together, beating against each other
 * (the bell's warble). A small one high, its hum faint, and soon quiet - not
 * a cathedral's great bell booming on.
 *
 * Only the plain pieces (noise, filters, laying sounds somewhere off, the
 * ring round about) come from dsp.js.
 */

import {
  TAU,
  between,
  white,
  Biquad,
  peak,
  rms,
  scale,
  ring,
  heard,
  put,
} from "./dsp.js";

/* ------------------------------------------------------------------------
 * The church's bell
 * --------------------------------------------------------------------- */

/**
 * A church bell's partials over its note (the prime), as the founders name
 * them: how far up, how loud, and how long each rings on next to the hum -
 * a small bell's: its hum faint.
 */
var PARTIALS = [
  //the hum
  [0.5, 0.2, 1],
  //the prime
  [1, 0.5, 0.6],
  //the tierce, a minor third up
  [1.183, 0.75, 0.45],
  //the quint
  [1.506, 0.2, 0.3],
  //the nominal, an octave up
  [2, 1, 0.28],
  [2.514, 0.3, 0.18],
  [2.662, 0.28, 0.16],
  [3.011, 0.25, 0.13],
  [4.166, 0.16, 0.09],
  [5.433, 0.1, 0.06],
  [6.796, 0.06, 0.045],
];

/**
 * A bell struck once, mono: every partial of it ringing on and dying away,
 * the low ones longest, each two close together beating against each
 * other; and the knock of the clapper.
 *
 * @param note {number} its prime, Hz
 * @param long {number} how long it rings on, s
 */
function strike(rnd, rate, note, long) {
  var n = Math.round(long * rate),
    out = new Float32Array(n),
    hiss = white(rnd),
    knock = new Biquad(rate, "bandpass", 3500, 1),
    attack = 0.0015 * rate,
    i;

  PARTIALS.forEach(function (p) {
    var f = note * p[0],
      dies = Math.exp(-1 / ((p[2] * long * rate) / 5)),
      beat = 1 + between(rnd, 0.0008, 0.004),
      a = p[1] * between(rnd, 0.85, 1.15),
      g = a;

    if (f > rate * 0.45) return;

    for (i = 0; i < n; i++) {
      var t = i / rate;

      out[i] +=
        g *
        Math.min(1, i / attack) *
        (0.6 * Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * f * beat * t));
      g *= dies;
    }
  });

  for (i = 0; i < 0.004 * rate; i++)
    out[i] += knock.run(hiss()) * 0.5 * (1 - i / (0.004 * rate));

  return out;
}

//a mono sound laid into another from sample `at` on, so loud
function add(out, sound, at, gain) {
  for (var i = 0; i < sound.length && at + i < out.length; i++)
    out[at + i] += sound[i] * gain;
}

//the bell: its note (prime), Hz, from .. to - a small one, high - and how
//long it rings on after a stroke, s
var NOTE = [560, 740],
  RINGS = 4.5;

/**
 * The bell rung for a service, mono: swung, the clapper striking it about
 * once a second - softly as the swing gets going, then full, then softer as
 * it is let go - never quite evenly.
 */
function rung(rnd, rate) {
  var one = strike(rnd, rate, between(rnd, NOTE[0], NOTE[1]), RINGS),
    times = 10 + Math.floor(rnd() * 7),
    every = between(rnd, 0.95, 1.2),
    out = new Float32Array(Math.round((times * every + RINGS) * rate));

  for (var k = 0; k < times; k++) {
    var u = k / (times - 1),
      swing = Math.min(1, 0.45 + u * 3) * Math.min(1, 0.35 + (1 - u) * 2.5);

    add(
      out,
      one,
      Math.round((k * every + between(rnd, -0.04, 0.04) + 0.05) * rate),
      swing * between(rnd, 0.85, 1),
    );
  }

  return out;
}

/**
 * The bell tolled: a few slow strokes, mono.
 */
function toll(rnd, rate) {
  var one = strike(rnd, rate, between(rnd, NOTE[0], NOTE[1]), RINGS),
    times = 3 + Math.floor(rnd() * 3),
    every = between(rnd, 2.4, 3),
    out = new Float32Array(Math.round((times * every + RINGS) * rate));

  for (var k = 0; k < times; k++)
    add(
      out,
      one,
      Math.round((k * every + between(rnd, -0.05, 0.05) + 0.05) * rate),
      between(rnd, 0.85, 1),
    );

  return out;
}

/**
 * The bell heard from the church's tower some way off, both ears: duller
 * for the way, a little ringing back off the houses round it.
 */
function bells(rnd, variant, rate) {
  var mono = variant === 0 ? rung(rnd, rate) : toll(rnd, rate),
    far = heard(rate, mono, 120, 1, 600000),
    n = far.length,
    dry = [new Float32Array(n), new Float32Array(n)],
    send = [new Float32Array(n), new Float32Array(n)];

  put(dry, send, far, 0, 0, 120);

  var back = ring(send, rate, 1.1, 4000, 0.9);

  scale(back, (0.35 * rms(dry)) / (rms(back) || 1));

  for (var c = 0; c < 2; c++)
    for (var i = 0; i < n; i++) dry[c][i] += back[c][i];

  return peak(dry, 0.7);
}

/**
 * The church's bell as sounds.js lists its sounds: not a loop, and the ways
 * it is rung.
 */
export var BELLS_SOUND = { loop: false, make: bells, ways: ["rung", "toll"] };
