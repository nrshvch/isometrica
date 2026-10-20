/**
 * The old town heard from above it, the way skyline.js has the city and
 * country.js the woods: its market square by day - people talking, a great
 * many of them, near and far, now and then a laugh, a stallholder calling
 * out - all of it ringing off the stone round the square; by night a few
 * passing through; and now and then its church's bells (bells) - one
 * tolling, or all of the tower's rung in rounds.
 *
 * Nobody is understood: what makes a crowd sound like one is not its words
 * but how people talk - one at a time in each knot of them, turn by turn;
 * syllables four or five a second, each a vowel - the throat's buzz through
 * the mouth's resonances (its formants), gliding from one vowel to the next
 * - a breath of noise for the consonant before it; the pitch going up and
 * down and falling towards the end of what is said; men's voices and
 * women's - and so many of them, far enough off, that they run together
 * into the murmur of a square.
 *
 * A church bell rings at many pitches at once, none of them a whole number
 * of times another: the hum an octave under its note, the prime, a minor
 * third over it, a fifth, the nominal an octave up, and on up (as the bell
 * founders name them) - each two close together, beating against each other
 * (the bell's warble), the low ones ringing on longest.
 *
 * Only the plain pieces (noise, filters, laying sounds into the ears and
 * somewhere off, seamless loops, the ring round about) come from dsp.js.
 */

import {
  TAU,
  seeded,
  seedOf,
  between,
  white,
  pink,
  saw,
  OnePole,
  Biquad,
  seamless,
  level,
  peak,
  rms,
  scale,
  ring,
  through,
  heard,
  put,
  again,
} from "./dsp.js";

function clamp(x, a, b) {
  return x < a ? a : x > b ? b : x;
}

function smooth(x) {
  x = clamp(x, 0, 1);

  return x * x * (3 - 2 * x);
}

/* ------------------------------------------------------------------------
 * People talking
 * --------------------------------------------------------------------- */

//the vowels, by their first three formants, Hz - a man's; a woman's are a
//little higher (person)
var VOWELS = [
  [730, 1090, 2440],
  [530, 1840, 2480],
  [270, 2290, 3010],
  [570, 840, 2410],
  [300, 870, 2240],
  [500, 1500, 2500],
  [660, 1720, 2410],
  [440, 1020, 2240],
];

//how wide each formant is, Hz
var WIDTHS = [90, 120, 180];

//a nasal - m, n - by its formants
var NASAL = [250, 1000, 2300];

//the consonants a syllable may start with, and how long each takes, s
var ONSETS = { none: 0, fric: 0.065, stop: 0.025, nasal: 0.05, h: 0.05 },
  KINDS = ["fric", "stop", "nasal", "h"];

/**
 * Somebody: a man or a woman, how high they talk, how long their mouth is
 * (how high their formants), how fast they talk and how breathily.
 */
function person(rnd) {
  var woman = rnd() < 0.45;

  return {
    f0: woman ? between(rnd, 170, 230) : between(rnd, 95, 135),
    k: woman ? between(rnd, 1.12, 1.2) : between(rnd, 0.95, 1.05),
    pace: between(rnd, 4, 5.8),
    breathy: between(rnd, 0.02, 0.06),
  };
}

/**
 * What somebody says in one go, as syllables: when, how long, its vowel,
 * the consonant before it, how much it is stressed and how high: "talk" -
 * a few words to a sentence; "laugh" - ha-ha-ha, higher and falling;
 * "call" - a stallholder's cry, its last vowel drawn out.
 */
function syllables(rnd, who, kind) {
  var out = [],
    t = 0,
    count,
    long,
    i;

  if (kind === "laugh") {
    count = 4 + Math.floor(rnd() * 4);

    for (i = 0; i < count; i++) {
      long = between(rnd, 0.1, 0.14);
      out.push({
        at: t,
        long: long,
        vowel: 0,
        onset: "h",
        stress: 1 - (0.5 * i) / count,
        pitch: 1.35 - 0.05 * i,
      });
      t += long + between(rnd, 0.04, 0.08);
    }
  } else if (kind === "call") {
    count = 2 + Math.floor(rnd() * 3);

    for (i = 0; i < count; i++) {
      var last = i === count - 1;

      long = last ? between(rnd, 0.45, 0.7) : between(rnd, 0.15, 0.22);
      out.push({
        at: t,
        long: long,
        vowel: Math.floor(rnd() * VOWELS.length),
        onset: rnd() < 0.6 ? KINDS[Math.floor(rnd() * 3)] : "none",
        stress: last ? 1 : 0.4,
        pitch: last ? 1.3 : 1.15,
      });
      t += long + 0.02;
    }
  } else {
    count = 3 + Math.floor(rnd() * 12);

    for (i = 0; i < count; i++) {
      long = between(rnd, 0.7, 1.3) / who.pace;
      out.push({
        at: t,
        long: long,
        vowel: Math.floor(rnd() * VOWELS.length),
        onset: rnd() < 0.55 ? KINDS[Math.floor(rnd() * 4)] : "none",
        stress: rnd() < 0.3 ? 1 : 0.3,
        pitch: 1,
      });
      t += long;
      //between words, now and then
      if (rnd() < 0.15) t += between(rnd, 0.05, 0.15);
    }
  }

  return out;
}

/**
 * Somebody saying something, mono: each syllable's vowel the throat's buzz
 * - a saw, its top falling away as a throat's does, a breath of air in it -
 * through three formants gliding from one vowel to the next; its consonant
 * a hiss (s, f), a burst (t, k), a hum through the nose (m, n) or a breath
 * (h) before it. The pitch falls over what is said - or rises, asking - is
 * higher on a stressed syllable, and never quite steady.
 */
function say(rnd, rate, who, kind) {
  var syl = syllables(rnd, who, kind),
    end = syl[syl.length - 1].at + syl[syl.length - 1].long + 0.08,
    n = Math.round(end * rate),
    out = new Float32Array(n),
    tune =
      kind !== "talk"
        ? [1, 1, 0.92]
        : rnd() < 0.15
          ? [1, 0.95, 1.15]
          : [1.08, 1, 0.86],
    grit = white(rnd),
    waver = new OnePole(rate, 30),
    tilt = new OnePole(rate, 900),
    formants = WIDTHS.map(function (w, k) {
      return new Biquad(rate, "bandpass", VOWELS[5][k], VOWELS[5][k] / w);
    }),
    glides = WIDTHS.map(function () {
      return new OnePole(rate / 32, 18);
    }),
    hiss = new Biquad(rate, "bandpass", 4500, 1.5),
    burst = new OnePole(rate, 1500),
    gains = [1, 0.7, 0.4],
    phase = 0,
    f0 = who.f0,
    j = 0,
    k;

  glides.forEach(function (g, k) {
    g.y = VOWELS[syl[0].vowel][k] * who.k;
  });

  for (var i = 0; i < n; i++) {
    var t = i / rate;

    while (j < syl.length - 1 && t >= syl[j + 1].at) j++;

    var s = syl[j],
      into = t - s.at,
      ons = ONSETS[s.onset],
      u = into / s.long,
      v =
        into < ons || into > s.long
          ? 0
          : smooth((into - ons) / 0.025) * smooth((s.long - into) / 0.04);

    //a nasal hums on, before the vowel, through the nose
    if (s.onset === "nasal" && into >= 0 && into < ons)
      v = 0.4 * smooth(into / 0.015);

    if (i % 32 === 0) {
      var target = s.onset === "nasal" && into < ons ? NASAL : VOWELS[s.vowel];

      for (k = 0; k < 3; k++) {
        var f = glides[k].run(target[k] * who.k);

        formants[k].set("bandpass", f, f / WIDTHS[k]);
      }

      f0 =
        who.f0 *
        through(tune, t / end) *
        s.pitch *
        (1 + 0.12 * s.stress * Math.sin(Math.PI * clamp(u, 0, 1)));
    }

    var hz = f0 * (1 + 0.5 * waver.run(grit())),
      dt = hz / rate;

    phase += dt;
    if (phase >= 1) phase -= 1;

    var src = tilt.run(saw(phase, dt)) * v + grit() * who.breathy * v,
      c = 0;

    if (into >= 0 && into < ons) {
      var cu = into / ons;

      if (s.onset === "fric")
        c = hiss.run(grit()) * 0.06 * Math.sin(Math.PI * cu);
      else if (s.onset === "stop")
        c =
          burst.run(grit()) *
          0.05 *
          smooth(into / 0.003) *
          Math.exp(-into / 0.008);
      else if (s.onset === "h") src += grit() * 0.35 * Math.sin(Math.PI * cu);
    }

    var y = c;

    for (k = 0; k < 3; k++) y += formants[k].run(src) * gains[k];

    out[i] = y;
  }

  return out;
}

/**
 * A knot of people talking, somewhere about the square, r metres off and
 * round pan: one at a time, turn by turn, a moment between - or a word
 * over the last one's - now and then one of them laughing.
 *
 * @param gap {number[]} how long between one saying something and the next
 * @param laughs {number} how likely a turn is a laugh
 */
function knot(rnd, rate, seconds, size, r, pan, gap, laughs, dry, send) {
  var people = [],
    last = -1;

  for (var k = 0; k < size; k++)
    people.push({
      who: person(rnd),
      pan: clamp(pan + between(rnd, -0.08, 0.08), -1, 1),
      r: r * between(rnd, 0.92, 1.08),
    });

  again(
    rnd,
    rate,
    seconds,
    gap,
    function () {
      var k = Math.floor(rnd() * size);

      //(nobody answers themselves)
      if (k === last && size > 1) k = (k + 1) % size;
      last = k;

      var s = say(rnd, rate, people[k].who, rnd() < laughs ? "laugh" : "talk");

      s.by = people[k];

      return s;
    },
    function (s, t) {
      put(
        dry,
        send,
        heard(rate, s, s.by.r, 0.3, 300000),
        Math.round(t * rate),
        s.by.pan,
        s.by.r,
      );
    },
  );
}

/* ------------------------------------------------------------------------
 * The square
 * --------------------------------------------------------------------- */

/**
 * How long a loop of each is; how many knots of people talk on the square,
 * how many people to a knot, from .. to, how near and how far off they are,
 * m; how many more talk further off, all run together; how long between one
 * saying something and the next in a knot, s, and how likely a turn is a
 * laugh; how many times a stallholder calls out; how long the square rings
 * on; how loud the air over it is; and how loud it all is.
 */
var SQUARES = [
  //by day: the market
  {
    seconds: 36,
    knots: 9,
    size: [2, 4],
    near: 15,
    far: 70,
    distant: 7,
    gap: [-0.2, 0.9],
    laughs: 0.06,
    calls: 3,
    ring: 1.4,
    air: 0.006,
    loud: 0.06,
  },
  //by night: a few passing through
  {
    seconds: 36,
    knots: 3,
    size: [2, 2],
    near: 25,
    far: 90,
    distant: 0,
    gap: [0.5, 8],
    laughs: 0.1,
    calls: 0,
    ring: 1.6,
    air: 0.004,
    loud: 0.035,
  },
];

function square(rnd, variant, rate) {
  var sq = SQUARES[variant],
    tag = "square " + variant,
    n = Math.round(sq.seconds * rate),
    over = Math.round(1.5 * rate),
    dry = [new Float32Array(n), new Float32Array(n)],
    send = [new Float32Array(n), new Float32Array(n)],
    c,
    i;

  //the knots of people about the square, and further off
  for (i = 0; i < sq.knots + sq.distant; i++) {
    var far = i >= sq.knots;

    knot(
      rnd,
      rate,
      sq.seconds,
      sq.size[0] + Math.floor(rnd() * (sq.size[1] - sq.size[0] + 1)),
      far ? between(rnd, 80, 160) : between(rnd, sq.near, sq.far),
      between(rnd, -0.9, 0.9),
      sq.gap,
      sq.laughs,
      dry,
      send,
    );
  }

  //a stallholder calling out, now and then
  for (i = 0; i < sq.calls; i++) {
    var r = between(rnd, 25, 60);

    put(
      dry,
      send,
      heard(rate, say(rnd, rate, person(rnd), "call"), r, 0.45, 300000),
      Math.floor(rnd() * n),
      between(rnd, -0.8, 0.8),
      r,
    );
  }

  //all of it ringing off the stone round the square
  var back = ring(send, rate, sq.ring, 3500, 1.1);

  scale(back, (0.6 * rms(send)) / (rms(back) || 1));

  //and the air over it, so it is never quite still
  var air = [];

  for (c = 0; c < 2; c++) {
    var noise = pink(seeded(seedOf(tag + " air " + c))),
      lp = new Biquad(rate, "lowpass", 400, 0.5),
      buf = new Float32Array(n + over);

    for (i = 0; i < n + over; i++) buf[i] = lp.run(noise());

    air.push(seamless(buf, n, over));
  }

  scale(air, sq.air / (rms(air) || 1));

  var ch = [new Float32Array(n), new Float32Array(n)];

  for (c = 0; c < 2; c++)
    for (i = 0; i < n; i++) ch[c][i] = dry[c][i] + back[c][i] + air[c][i];

  return level(ch, sq.loud);
}

/* ------------------------------------------------------------------------
 * The church's bells
 * --------------------------------------------------------------------- */

/**
 * A church bell's partials over its note (the prime), as the founders name
 * them: how far up, how loud, and how long each rings on next to the hum.
 */
var PARTIALS = [
  //the hum
  [0.5, 0.45, 1],
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
    knock = new Biquad(rate, "bandpass", 2500, 1),
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
    out[i] += knock.run(hiss()) * 0.3 * (1 - i / (0.004 * rate));

  return out;
}

//a mono sound laid into another from sample `at` on, so loud
function add(out, sound, at, gain) {
  for (var i = 0; i < sound.length && at + i < out.length; i++)
    out[at + i] += sound[i] * gain;
}

//the bells of a tower, down from the treble: a major scale, semitones
var SCALE = [0, -2, -4, -5, -7, -9];

/**
 * A bell tolling: one, struck a handful of times, slowly - mono.
 */
function toll(rnd, rate) {
  var note = between(rnd, 220, 290),
    one = strike(rnd, rate, note, 10),
    times = 4 + Math.floor(rnd() * 4),
    every = between(rnd, 2.2, 2.7),
    out = new Float32Array(Math.round((times * every + 10) * rate));

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
 * The tower's bells rung in rounds - mono: down the scale one after
 * another, a row of them, and again, a beat left out before every other
 * row (the handstroke's gap), the ringers never quite even.
 */
function rounds(rnd, rate) {
  var top = between(rnd, 500, 620),
    bells = SCALE.map(function (st) {
      var note = top * Math.pow(2, st / 12);

      return strike(rnd, rate, note, (6 * top) / note);
    }),
    rows = 6 + Math.floor(rnd() * 3),
    beat = between(rnd, 0.22, 0.26),
    long = rows * (bells.length + 0.5) * beat + 10,
    out = new Float32Array(Math.round(long * rate)),
    t = 0.05;

  for (var r = 0; r < rows; r++) {
    if (r % 2 === 1) t += beat;

    for (var b = 0; b < bells.length; b++) {
      add(
        out,
        bells[b],
        Math.round((t + between(rnd, -0.015, 0.015)) * rate),
        between(rnd, 0.8, 1),
      );
      t += beat;
    }
  }

  return out;
}

/**
 * The bells heard from the church's tower some way off, both ears: duller
 * for the way, and ringing round the streets of the old town. Not a loop:
 * played now and then (client/audio/soundman), wherever the church is.
 */
function bells(rnd, variant, rate) {
  var mono = variant === 0 ? toll(rnd, rate) : rounds(rnd, rate),
    far = heard(rate, mono, 140, 1, 600000),
    n = far.length,
    dry = [new Float32Array(n), new Float32Array(n)],
    send = [new Float32Array(n), new Float32Array(n)];

  put(dry, send, far, 0, 0, 140);

  var back = ring(send, rate, 2.4, 3000, 1.6);

  scale(back, (0.8 * rms(dry)) / (rms(back) || 1));

  for (var c = 0; c < 2; c++)
    for (var i = 0; i < n; i++) dry[c][i] += back[c][i];

  return peak(dry, 0.7);
}

/**
 * The old town as sounds.js lists its sounds: how many ways each comes,
 * whether it loops, and what each way of it is.
 */
export var SQUARE_SOUND = { loop: true, make: square, ways: ["day", "night"] };

export var BELLS_SOUND = { loop: false, make: bells, ways: ["toll", "rounds"] };
