/**
 * A building blown up, heard from a little way off - from up above the town,
 * where the game looks down on it from - not a cartoon of it: a real
 * demolition, the way it sounds from a couple of hundred metres back.
 *
 * What makes it sound like that, and not like a firework in the ear:
 *
 *   - the blast itself is a pressure wave, not a bang of noise: the air
 *     shoved out all at once and sucked back (Friedlander's curve - up in
 *     an instant, down past nothing, slowly back), felt more than heard,
 *     with a short tearing crack on top of it;
 *   - further off, the air has taken the top off it: what comes is the
 *     thump and the low roar after it, not the crack;
 *   - the roar rolls on - the fireball, the dust and the building tearing
 *     apart - lower and lower as it dies away, never quite steady;
 *   - and it comes back: off the walls of the streets round it, each echo
 *     later, duller and more off to one side than the last - which is what
 *     turns one boom into a ba-da-boom - and then the long ring of the town
 *     (dsp.js ring) under it all;
 *   - with the pieces of it coming down after: a patter of small stuff and
 *     glass, the odd heavy lump, quiet under the roar.
 *
 * One deep boom, two seconds of it. It knows when, into it, the building
 * goes up (`at`, seconds): the game starts it that long before the pieces
 * fly, so the boom comes as they do (client/audio/soundman blasts).
 */

import {
  TAU,
  between,
  white,
  brown,
  OnePole,
  Biquad,
  soft,
  lay,
  ring,
  peak,
} from "./dsp.js";

//how long every one of them is, s
var SECONDS = 2;

/**
 * How far off it is, m; how big the blast; when, into the sound, it goes
 * up, s; how many echoes off the streets, and how long the town rings on.
 */
var BLAST = { far: 140, size: 1, at: 0.03, echoes: 3, ring: 1.3 };

//the top the air leaves of what comes from r metres off, Hz
function air(r) {
  return Math.max(900, Math.min(16000, 900000 / r));
}

/**
 * The pressure wave of a blast, mono, `long` seconds of it: up at once,
 * down below nothing and slowly back (Friedlander's curve), how long the
 * push lasts `push` seconds.
 */
function friedlander(rate, push, long) {
  var n = Math.round(long * rate),
    out = new Float32Array(n),
    rise = Math.max(2, Math.round(0.0008 * rate));

  for (var i = 0; i < n; i++) {
    var t = i / rate,
      u = t / push,
      up = i < rise ? i / rise : 1;

    out[i] = up * (1 - u) * Math.exp(-1.6 * u);
  }

  return out;
}

/**
 * The blast as it leaves the building, mono: the pressure wave, the crack
 * of it tearing on top, and the roar of what it throws up rolling on after
 * it, lower and lower - as big as `size`.
 */
function boom(rnd, rate, size, long) {
  var n = Math.round(long * rate),
    out = new Float32Array(n),
    wave = friedlander(rate, 0.028 * size, 0.4),
    hiss = white(rnd),
    rumble = brown(rnd),
    //the crack: noise through a band that falls as it goes
    crackBand = new Biquad(rate, "bandpass", 1800, 0.8),
    //the body: low noise, its top coming down as it dies away
    body = new Biquad(rate, "lowpass", 400, 0.9),
    body2 = new Biquad(rate, "lowpass", 400, 0.7),
    //the deepest of it: a sine that drops as the air settles
    phase = 0,
    //the roar rolling, never quite steady
    wob = new OnePole(rate, 9),
    i;

  for (i = 0; i < n; i++) {
    var t = i / rate,
      x = 0;

    //the pressure wave, the heaviest of it
    if (i < wave.length) x += wave[i] * 0.9;

    //the crack on top of it, gone in a few hundredths of a second
    if (t < 0.25) {
      crackBand.set("bandpass", 600 + 2400 * Math.exp(-t / 0.03), 0.7);
      x += crackBand.run(hiss()) * 2.2 * Math.exp(-t / 0.022);
    }

    //the body of the roar: fast up, rolling down over a second or so
    var cut = 140 + 760 * Math.exp(-t / 0.2),
      roll = 0.6 + 0.8 * wob.run(rnd()),
      env =
        Math.min(1, t / 0.006) *
        (0.6 * Math.exp(-t / (0.25 * size)) +
          0.4 * Math.exp(-t / (0.8 * size)));

    if (i % 32 === 0) {
      body.set("lowpass", cut, 0.9);
      body2.set("lowpass", cut, 0.7);
    }
    x += body2.run(body.run(rumble() + hiss() * 0.15)) * 3.4 * env * roll;

    //and under it all, the thud of the ground: 75 Hz down to 42
    var f = 42 + 33 * Math.exp(-t / 0.15);

    phase = (phase + f / rate) % 1;
    x +=
      Math.sin(TAU * phase) *
      0.4 *
      size *
      Math.min(1, t / 0.004) *
      Math.exp(-t / 0.32);

    out[i] = x;
  }

  return out;
}

/**
 * The pieces of it coming down, stereo, laid into ch from `from` s on: a
 * patter of small stuff and glass, and the odd heavy lump.
 */
function debris(rnd, rate, ch, from, until, far) {
  var hiss = white(rnd),
    k,
    i;

  //small stuff: bits of brick, glass - tiny ticks
  for (k = 0; k < 70; k++) {
    var at = from + Math.pow(rnd(), 0.8) * (until - from),
      len = Math.round(between(rnd, 0.004, 0.02) * rate),
      bit = new Float32Array(len),
      band = new Biquad(rate, "bandpass", between(rnd, 900, 4500), 2.5);

    for (i = 0; i < len; i++)
      bit[i] = band.run(hiss()) * Math.exp((-i / len) * 5);

    lay(
      ch,
      bit,
      Math.round(at * rate),
      between(rnd, -0.7, 0.7),
      (between(rnd, 0.05, 0.25) * (1 - (at - from) / (until - from)) * 200) /
        far,
      false,
    );
  }

  //heavy lumps landing: dull thuds
  for (k = 0; k < 7; k++) {
    var when = from + 0.1 + rnd() * (until - from) * 0.8,
      long = Math.round(0.12 * rate),
      thud = new Float32Array(long),
      lp = new Biquad(rate, "lowpass", between(rnd, 140, 260), 1),
      f = between(rnd, 55, 90),
      p = 0;

    for (i = 0; i < long; i++) {
      p = (p + f / rate) % 1;
      thud[i] =
        (lp.run(hiss()) * 0.6 + Math.sin(TAU * p) * 0.6) *
        Math.exp(-i / (0.03 * rate));
    }

    lay(
      ch,
      thud,
      Math.round(when * rate),
      between(rnd, -0.5, 0.5),
      (between(rnd, 0.1, 0.25) * 200) / far,
      false,
    );
  }
}

/**
 * A sound as it carries r metres: the air takes the top off it.
 */
function carried(rate, sound, r) {
  var lp1 = new OnePole(rate, air(r)),
    lp2 = new OnePole(rate, air(r) * 1.5),
    hp = new Biquad(rate, "highpass", 22, 0.7),
    out = new Float32Array(sound.length);

  for (var i = 0; i < sound.length; i++)
    out[i] = hp.run(lp2.run(lp1.run(sound[i])));

  return out;
}

/**
 * The echoes of what was laid at `at` off the streets round it: each later,
 * duller, quieter and more off to one side than the last.
 */
function echoes(rnd, rate, ch, dry, at, count, far) {
  var t = at,
    side = rnd() < 0.5 ? -1 : 1;

  for (var e = 0; e < count; e++) {
    t += between(rnd, 0.09, 0.2) * (1 + e * 0.25);

    var copy = carried(rate, dry, far + 120 * (e + 1)),
      gain = 0.42 * Math.pow(0.62, e);

    lay(
      ch,
      copy,
      Math.round(t * rate),
      side * between(rnd, 0.3, 0.8),
      gain,
      false,
    );
    side = -side;
  }
}

function blast(rnd, variant, rate) {
  var k = BLAST,
    n = Math.round(SECONDS * rate),
    ch = [new Float32Array(n), new Float32Array(n)],
    room,
    i,
    c;

  //and it goes up
  var main = carried(rate, boom(rnd, rate, k.size, SECONDS - k.at), k.far),
    start = Math.round(k.at * rate);

  lay(ch, main, start, between(rnd, -0.08, 0.08), 1, false);
  echoes(rnd, rate, ch, main, k.at, k.echoes, k.far);

  //the pieces of it coming down
  debris(
    rnd,
    rate,
    ch,
    k.at + 0.15,
    Math.min(SECONDS - 0.2, k.at + 1.4),
    k.far,
  );

  //and the town ringing round it all: the further off, the more of it
  room = ring(ch, rate, k.ring, 2200, 1.4);

  var wet = Math.min(0.75, 0.25 + k.far / 600);

  for (c = 0; c < 2; c++)
    for (i = 0; i < n; i++) ch[c][i] = ch[c][i] + room[c][i] * wet * 1.6;

  //loud, rounded off rather than cut - the way a blast fills the air
  peak(ch, 1);
  for (c = 0; c < 2; c++)
    for (i = 0; i < n; i++) ch[c][i] = soft(ch[c][i] * 1.25, 1.4);

  //gone to nothing by the end, not cut off
  var fade = Math.round(0.35 * rate);

  for (i = 0; i < fade; i++) {
    var f = i / fade;

    ch[0][n - 1 - i] *= f * f;
    ch[1][n - 1 - i] *= f * f;
  }

  return peak(ch, 0.95);
}

/**
 * The blast, as sounds.js SOUNDS has its sounds - and when, into it, the
 * building goes up, s.
 */
export var BLAST_SOUND = {
  loop: false,
  make: blast,
  ways: ["boom"],
  at: BLAST.at,
};
