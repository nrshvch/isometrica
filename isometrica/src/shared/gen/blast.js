/**
 * A building blown up, heard from a little way off - from up above the town,
 * where the game looks down on it from - not a cartoon of it: TNT going off
 * in a building and the building tearing apart, the way it sounds a hundred
 * or two metres back.
 *
 * What a real one has that a clean synthetic boom does not (Farnell's
 * explosion in Designing Sound splits it into the rumble, the air and the
 * dust; sound designers layer the transient, the body and the tail):
 *
 *   - the crack: not one smooth pressure wave - that is a sonic boom - but
 *     a cluster of sharp fronts a few milliseconds apart, the charges and
 *     what they tear, so loud that whatever hears it clips: harsh, broad,
 *     a snap more than a thud;
 *   - the roar of the fireball: noise, but never steady - turbulent,
 *     lumpy, rolling - its top closing down as it cools, and crackling all
 *     through, densely at first and then here and there;
 *   - the building itself: concrete and brick breaking - a crunching grit
 *     in the middle of the range - and then its floors coming down, a deep
 *     rumble of thuds, rising after the blast and rolling on;
 *   - what it throws: a rain of gravel and grit, the tinkle of glass, a
 *     lump landing here and there, all over the place;
 *   - and the town round it: the crack coming back off the walls of the
 *     streets, many times, each later and duller (early reflections), then
 *     the long ring of the town (dsp.js ring) under it all - and the air
 *     taking the very top off everything on the way.
 *
 * Three of it, to pick one from: TNT - one big charge and the building
 * going; demolition charges - a quick ripple of them at its foot, then it
 * going; and heavier, further off - two blasts close together and the
 * collapse rolling round the streets. None longer than two seconds.
 *
 * Each knows when, into it, the building goes up (`at`, seconds): the game
 * starts it that long before the pieces fly, so the blast comes as they do
 * (client/audio/soundman blasts).
 */

import {
  between,
  white,
  pink,
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
 * Each way of it: how far off it is, m; how big the blast; when it goes up,
 * s; how many charges go off at its foot before it; a second blast so long
 * after the first, s, if any; how many times the crack comes back off the
 * streets; how long the town rings on, s, and how much of it is heard; how
 * hard the collapse is.
 */
var BLASTS = [
  //TNT
  {
    far: 120,
    size: 1,
    at: 0.04,
    charges: 0,
    second: null,
    echoes: 10,
    ring: 1.4,
    wet: 0.35,
    collapse: 1,
  },
  //demolition charges, then it goes
  {
    far: 140,
    size: 1,
    at: 0.5,
    charges: 7,
    second: null,
    echoes: 10,
    ring: 1.4,
    wet: 0.38,
    collapse: 1.1,
  },
  //heavier, further off
  {
    far: 200,
    size: 1.35,
    at: 0.04,
    charges: 0,
    second: 0.14,
    echoes: 14,
    ring: 1.8,
    wet: 0.55,
    collapse: 1.3,
  },
];

//the top the air leaves of what comes from r metres off, Hz
function air(r) {
  return Math.max(1500, Math.min(16000, 1100000 / r));
}

//as loud at its loudest as `to`
function norm(a, to) {
  var most = 0,
    i;

  for (i = 0; i < a.length; i++) most = Math.max(most, Math.abs(a[i]));
  if (most > 0) for (i = 0; i < a.length; i++) a[i] *= to / most;

  return a;
}

//b laid into a from sample `at`, times k
function mix(a, b, at, k) {
  for (var i = 0; i < b.length && at + i < a.length; i++)
    if (at + i >= 0) a[at + i] += b[i] * k;
}

/**
 * How lumpy something turbulent is, n samples of it: a new random level
 * about `hz` times a second, glided into, peaky - mostly low, now and then
 * a surge - about 1 on the whole.
 */
function lumps(rnd, rate, n, hz, peaky) {
  var out = new Float32Array(n),
    glide = new OnePole(rate, hz * 1.3),
    every = rate / hz,
    next = 0,
    want = 0,
    sum = 0,
    i;

  for (i = 0; i < n; i++) {
    if (i >= next) {
      want = Math.pow(rnd(), peaky);
      next = i + every * between(rnd, 0.5, 1.5);
    }
    out[i] = glide.run(want);
    sum += out[i];
  }

  var mean = sum / n || 1;

  for (i = 0; i < n; i++) out[i] /= mean;

  return out;
}

/**
 * The crack of a charge going off, mono: a cluster of sharp fronts a few
 * milliseconds apart, a harsh snap of noise on them, a short low punch
 * under them - and all of it clipped, as whatever hears it from near is.
 */
function crack(rnd, rate, size) {
  var n = Math.round(0.3 * rate),
    out = new Float32Array(n),
    hiss = white(rnd),
    rumble = brown(rnd),
    fronts = 3 + Math.floor(rnd() * 5),
    snapHp = new Biquad(rate, "highpass", 300, 0.7),
    snapLp = new Biquad(rate, "lowpass", 9000, 0.7),
    punch1 = new Biquad(rate, "lowpass", 160, 0.9),
    punch2 = new Biquad(rate, "lowpass", 160, 0.9),
    punch = new Float32Array(n),
    i,
    j;

  //the fronts: N-shaped, each up at once and down past nothing
  for (j = 0; j < fronts; j++) {
    var at =
        j === 0 ? 0 : Math.round(Math.pow(rnd(), 1.4) * 0.02 * size * rate),
      w = 1 + Math.round(between(rnd, 0.0002, 0.0014) * rate),
      a = j === 0 ? 1 : between(rnd, 0.35, 0.95);

    for (i = 0; i < 2 * w && at + i < n; i++)
      out[at + i] += a * (i < w ? 1 - i / w : -0.6 * (1 - (i - w) / w));
  }

  //the snap: harsh broad noise, gone in a few hundredths of a second
  for (i = 0; i < n; i++) {
    var t = i / rate,
      env = Math.exp(-t / 0.01) + 0.3 * Math.exp(-t / (0.045 * size));

    out[i] += snapLp.run(snapHp.run(hiss())) * 0.85 * env;
  }

  //the punch under it: low noise, short
  for (i = 0; i < n; i++) {
    var u = i / rate;

    punch[i] =
      punch2.run(punch1.run(rumble())) *
      Math.min(1, u / 0.002) *
      Math.exp(-u / (0.05 * size));
  }
  norm(punch, 0.9 * size);
  for (i = 0; i < n; i++) out[i] += punch[i];

  //clipped - a little more one way than the other, as a blast is
  for (i = 0; i < n; i++) {
    var x = out[i] * 2.6;

    out[i] = x > 0 ? soft(x, 1.8) : soft(x * 0.8, 2.4);
  }

  return out;
}

/**
 * The roar of the fireball, mono, `long` seconds: noise rolling and
 * surging, its top closing down as it cools, crackling all through - thick
 * at first, then here and there.
 */
function roar(rnd, rate, size, long) {
  var n = Math.round(long * rate),
    out = new Float32Array(n),
    crackle = new Float32Array(n),
    hiss = pink(rnd),
    rumble = brown(rnd),
    fast = lumps(rnd, rate, n, 26, 2.2),
    slow = lumps(rnd, rate, n, 5, 1.5),
    lp1 = new Biquad(rate, "lowpass", 2000, 0.8),
    lp2 = new Biquad(rate, "lowpass", 2000, 0.6),
    body = new Float32Array(n),
    i;

  for (i = 0; i < n; i++) {
    var t = i / rate,
      cut = 180 + 3200 * Math.exp(-t / (0.2 * size)),
      env =
        Math.min(1, t / 0.006) *
        (0.5 * Math.exp(-t / (0.16 * size)) +
          0.5 * Math.exp(-t / (0.65 * size)));

    if (i % 32 === 0) {
      lp1.set("lowpass", cut, 0.8);
      lp2.set("lowpass", cut * 1.3, 0.6);
    }

    body[i] =
      lp2.run(lp1.run(hiss() * 0.8 + rumble() * 0.6)) *
      env *
      (0.3 + 0.7 * fast[i]) *
      (0.55 + 0.45 * slow[i]);

    //the crackle: clicks, as many as `dense` a second
    var dense = 1400 * Math.exp(-t / 0.12) + 90 * Math.exp(-t / 0.7);

    if (rnd() < dense / rate)
      crackle[i] =
        (rnd() < 0.5 ? -1 : 1) *
        Math.pow(rnd(), 2.5) *
        (0.3 + 0.7 * Math.exp(-t / 0.4));
  }
  norm(body, 1);

  //the clicks a little rounded, the low of them off
  var hp = new Biquad(rate, "highpass", 700, 0.7),
    lp = new Biquad(rate, "lowpass", 7000, 0.7),
    ring1 = new Biquad(rate, "bandpass", 2600, 0.8);

  for (i = 0; i < n; i++) {
    var c = lp.run(hp.run(crackle[i]));

    crackle[i] = c + ring1.run(c) * 0.6;
  }
  norm(crackle, 0.8);

  for (i = 0; i < n; i++) out[i] = body[i] + crackle[i];

  return out;
}

/**
 * The building breaking, mono, `long` seconds: concrete and brick cracking
 * up - grains of crunching grit in the middle of the range, thickest just
 * after the blast - and then its floors coming down: a deep rumble of
 * thuds, rising and rolling on, and the odd heavy one.
 */
function building(rnd, rate, size, hard, long) {
  var n = Math.round(long * rate),
    out = new Float32Array(n),
    crunch = new Float32Array(n),
    fall = new Float32Array(n),
    hiss = white(rnd),
    rumble = brown(rnd),
    k,
    i;

  //the crunch: grains of filtered noise
  for (k = 0; k < Math.round(260 * size); k++) {
    var when = 0.01 + Math.pow(rnd(), 1.7) * 1.2,
      len = Math.round(between(rnd, 0.004, 0.045) * rate),
      band = new Biquad(
        rate,
        "bandpass",
        between(rnd, 180, 1400),
        between(rnd, 1.2, 4),
      ),
      a = Math.pow(rnd(), 1.8) * Math.exp(-when / 0.45),
      at = Math.round(when * rate),
      sharp = between(rnd, 3, 7);

    for (i = 0; i < len && at + i < n; i++)
      crunch[at + i] +=
        band.run(hiss()) *
        a *
        Math.min(1, i / (0.0008 * rate)) *
        Math.exp((-i / len) * sharp);
  }
  norm(crunch, 0.7);

  //the floors coming down: a deep rumble of thuds
  var thuds = lumps(rnd, rate, n, 9, 2.6),
    lpA = new Biquad(rate, "lowpass", 150, 0.9),
    lpB = new Biquad(rate, "lowpass", 220, 0.7);

  for (i = 0; i < n; i++) {
    var t = i / rate,
      up = t < 0.08 ? 0 : Math.min(1, (t - 0.08) / 0.35),
      env = up * up * (3 - 2 * up) * Math.exp(-Math.max(0, t - 0.45) / 0.8);

    fall[i] =
      lpB.run(lpA.run(rumble() + hiss() * 0.05)) *
      env *
      (0.25 + 0.75 * thuds[i]);
  }

  //and the heavy ones: a lump of it landing
  for (k = 0; k < 9; k++) {
    var at2 = Math.round((0.25 + rnd() * 1.3) * rate),
      len2 = Math.round(between(rnd, 0.08, 0.2) * rate),
      lp3 = new Biquad(rate, "lowpass", between(rnd, 120, 320), 1.1),
      a2 = between(rnd, 0.5, 1.4);

    for (i = 0; i < len2 && at2 + i < n; i++)
      fall[at2 + i] +=
        lp3.run(hiss()) *
        a2 *
        Math.min(1, i / (0.003 * rate)) *
        Math.exp(-i / (len2 * 0.25));
  }
  norm(fall, 0.9 * hard);

  for (i = 0; i < n; i++) out[i] = crunch[i] + fall[i];

  return out;
}

/**
 * What it throws coming down, stereo, laid into ch from `from` s on: a
 * rain of gravel and grit - thickest a little while after the blast, as
 * what went up comes down - glass tinkling, and lumps here and there.
 */
function debris(rnd, rate, ch, from, size) {
  var hiss = white(rnd),
    n = ch[0].length,
    k,
    i;

  function grain(at, len, band, a, pan) {
    var g = new Float32Array(len);

    for (i = 0; i < len; i++)
      g[i] = band.run(hiss()) * Math.exp((-i / len) * 5) * a;

    lay(ch, g, Math.round(at * rate), pan, 1, false);
  }

  //gravel and grit: falls about the moment what went up comes down
  for (k = 0; k < Math.round(700 * size); k++) {
    var at = from + 0.05 + ((rnd() + rnd() + rnd()) / 3) * 1.5;

    if (at * rate >= n) continue;
    grain(
      at,
      Math.round(between(rnd, 0.0015, 0.009) * rate),
      new Biquad(rate, "bandpass", between(rnd, 1200, 6500), 1.3),
      Math.pow(rnd(), 2.5) * 0.35,
      between(rnd, -0.85, 0.85),
    );
  }

  //glass: a ringing tick
  for (k = 0; k < 45; k++) {
    var when = from + 0.15 + rnd() * 1.2,
      len = Math.round(between(rnd, 0.015, 0.05) * rate),
      bell = new Biquad(rate, "bandpass", between(rnd, 2500, 7500), 18),
      g2 = new Float32Array(len),
      a = Math.pow(rnd(), 2) * 1.6;

    if (when * rate >= n) continue;
    for (i = 0; i < len; i++)
      g2[i] =
        bell.run(i < 3 ? hiss() : hiss() * 0.02) * a * Math.exp((-i / len) * 4);
    lay(ch, g2, Math.round(when * rate), between(rnd, -0.9, 0.9), 1, false);
  }

  //lumps: a dull knock
  for (k = 0; k < 16; k++) {
    var at3 = from + 0.3 + rnd() * 1.3;

    if (at3 * rate >= n) continue;
    grain(
      at3,
      Math.round(between(rnd, 0.02, 0.06) * rate),
      new Biquad(rate, "bandpass", between(rnd, 180, 600), 1.5),
      between(rnd, 0.25, 0.6),
      between(rnd, -0.7, 0.7),
    );
  }
}

/**
 * A sound as it carries r metres: the air takes the top off it.
 */
function carried(rate, sound, r) {
  var lp1 = new OnePole(rate, air(r)),
    lp2 = new OnePole(rate, air(r) * 1.6),
    hp = new Biquad(rate, "highpass", 28, 0.7),
    out = new Float32Array(sound.length);

  for (var i = 0; i < sound.length; i++)
    out[i] = hp.run(lp2.run(lp1.run(sound[i])));

  return out;
}

/**
 * What was laid at `at` coming back off the walls of the streets round
 * it, many times: each later, duller and quieter, from here and there.
 */
function echoes(rnd, rate, ch, dry, at, count, far) {
  var times = [],
    e;

  for (e = 0; e < count; e++) times.push(0.02 + Math.pow(rnd(), 1.3) * 0.45);
  times.sort(function (a, b) {
    return a - b;
  });

  for (e = 0; e < count; e++) {
    var t = times[e],
      copy = carried(rate, dry, far + t * 343 * 1.5),
      gain = between(rnd, 0.2, 0.42) * Math.exp(-t / 0.3);

    lay(
      ch,
      copy,
      Math.round((at + t) * rate),
      between(rnd, -0.9, 0.9),
      gain,
      false,
    );
  }
}

function blast(rnd, variant, rate) {
  var k = BLASTS[variant],
    n = Math.round(SECONDS * rate),
    ch = [new Float32Array(n), new Float32Array(n)],
    room,
    i,
    c,
    j;

  //the charges at its foot: a ripple of cracks, quicker and quicker
  for (j = 0; j < k.charges; j++) {
    var u = j / k.charges,
      when =
        0.03 +
        (k.at - 0.1) * (1 - Math.pow(1 - u, 1.6)) +
        between(rnd, -0.012, 0.012),
      bang = crack(rnd, rate, 0.4),
      puff = roar(rnd, rate, 0.35, 0.4);

    mix(bang, puff, 0, 0.3);
    bang = carried(rate, bang, k.far);
    lay(
      ch,
      bang,
      Math.round(when * rate),
      between(rnd, -0.35, 0.35),
      between(rnd, 0.28, 0.42),
      false,
    );
    echoes(rnd, rate, ch, bang, when, 4, k.far);
  }

  //it goes up: the crack and the fireball - and a second, if there is one
  var long = SECONDS - k.at,
    main = new Float32Array(Math.round(long * rate)),
    start = Math.round(k.at * rate);

  mix(main, crack(rnd, rate, k.size), 0, 1);
  mix(main, roar(rnd, rate, k.size, long), Math.round(0.003 * rate), 0.75);
  if (k.second !== null) {
    var at2 = Math.round(k.second * rate);

    mix(main, crack(rnd, rate, k.size * 0.85), at2, 0.85);
    mix(main, roar(rnd, rate, k.size * 1.1, long - k.second), at2, 0.6);
  }
  main = carried(rate, main, k.far);
  lay(ch, main, start, between(rnd, -0.06, 0.06), 1, false);
  echoes(rnd, rate, ch, main, k.at, k.echoes, k.far);

  //the building breaking and coming down, a little wide
  var b = carried(rate, building(rnd, rate, k.size, k.collapse, long), k.far);

  lay(ch, b, start, -0.25, 0.7, false);
  lay(ch, b.slice(Math.round(0.011 * rate)), start, 0.25, 0.7, false);

  //what it throws, coming down all round
  var thrown = [new Float32Array(n), new Float32Array(n)];

  debris(rnd, rate, thrown, k.at, k.size);
  for (c = 0; c < 2; c++) {
    thrown[c] = carried(rate, thrown[c], k.far * 0.8);
    for (i = 0; i < n; i++) ch[c][i] += thrown[c][i] * 0.8;
  }

  //and the town ringing round it all
  room = ring(ch, rate, k.ring, 2600, 1.5);
  for (c = 0; c < 2; c++)
    for (i = 0; i < n; i++) ch[c][i] += room[c][i] * k.wet * 1.4;

  //loud, the way a blast fills the air: pressed up under its peak
  peak(ch, 1);
  for (c = 0; c < 2; c++)
    for (i = 0; i < n; i++) ch[c][i] = soft(ch[c][i] * 1.2, 1.3);

  //gone to nothing by the end, not cut off
  var fade = Math.round(0.4 * rate);

  for (i = 0; i < fade; i++) {
    var f = i / fade;

    ch[0][n - 1 - i] *= f * f;
    ch[1][n - 1 - i] *= f * f;
  }

  return peak(ch, 0.95);
}

/**
 * The blast, as sounds.js SOUNDS has its sounds - and when, into each way
 * of it, the building goes up, s.
 */
export var BLAST_SOUND = {
  loop: false,
  make: blast,
  ways: ["TNT", "demolition charges", "heavier, further off"],
  at: BLASTS.map(function (k) {
    return k.at;
  }),
};
