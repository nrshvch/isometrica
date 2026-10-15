/**
 * Music, made the way the sounds are (shared/gen/sounds): slow, light, a
 * little smoky jazz to drive about to - a New York trio after hours, played
 * by a band of numbers. A Rhodes comps the chords, an upright bass walks
 * under them, brushes swish on the snare and a ride cymbal ticks, and over
 * it all a lead - a jazz guitar, a muted trumpet, a sax, a flute or a
 * vibraphone - says a few things and leaves a lot of room.
 *
 * There is a piece for each place - "town", the small town out in the
 * country; "city", the big city; "outside", the fields and woods beyond
 * them - and each comes by "day" and by "night", the way Minecraft's music
 * tells you the sun has gone down without saying so: by night slower,
 * darker in its keys, sparser, a pad of strings under it, further off in a
 * bigger room.
 *
 * And each of those comes three ways, for the weather: "clear"; "rain" -
 * lazy, the way a grey drizzly day is: half the notes, long ones, laid back
 * behind the beat, the drums down to a slow brush swirl, the whole of it
 * dulled and wobbling a little like an old tape; and "storm" - picked up:
 * the bass walking hard, the ride busy, crashes, toms, the Rhodes stabbing
 * the offbeats, strings shivering, the lead running fills between its
 * phrases. The three ways of a piece are the same tune at the same tempo,
 * bar for bar and sample for sample, as long as each other: a game plays
 * all three at once from the same moment and turns up whichever the
 * weather is, and the music picks up or slows down mid-phrase without a
 * seam. Every one loops without a seam too.
 *
 * How it is made, after the books:
 *
 *   - the harmony is a jazz standard's - ii-V-Is, turnarounds, a backdoor
 *     cadence here and there, a few modal pieces for the open country - in
 *     an AABA form of 32 bars; the Rhodes plays rootless voicings, the 3rd,
 *     7th, 9th and 13th, each chord's voices moving as little as they can
 *     from the last (Mark Levine, The Jazz Piano Book), comping on the
 *     Charleston and other off-the-beat rhythms;
 *   - the bass walks the way Ed Friedland's Building Walking Bass Lines has
 *     it: the root on the downbeat, chord tones and steps through the bar,
 *     and a chromatic approach into the next chord's root; by night it
 *     plays in two;
 *   - the melody is a motif and what is done with it - stated, answered,
 *     stated again over the new chords, and brought home on a long note -
 *     each note a step through the chord's own scale, landing on a chord
 *     tone on the strong beats (Mark Levine, The Jazz Theory Book; Gerhard
 *     Nierhaus, Algorithmic Composition);
 *   - the instruments are small models (Andy Farnell, Designing Sound;
 *     Curtis Roads, The Computer Music Tutorial): the Rhodes is John
 *     Chowning's FM, a sine bending a sine, with the click of its tine;
 *     the bass and the guitar are plucked strings, Karplus and Strong's
 *     delay line fed back through a little smoothing; the horns are saws
 *     through the formants of a bell and a mute; the vibraphone a few
 *     inharmonic bars and its motor's tremolo; the cymbals six square waves
 *     at odd ratios, the way the old drum machines made theirs.
 *
 * Everything comes out as two channels of numbers, -1..1, for Web Audio
 * (generate), tools/genmusic.js writes them out as .wav files, and
 * lab/music.html plays all three weathers of a piece together and fades
 * between them, the way a game would.
 */
import {
  TAU,
  seeded,
  seedOf,
  between,
  white,
  pink,
  OnePole,
  Biquad,
  saw,
  square,
  soft,
  lay,
  wet,
} from "./dsp.js";

//how many samples a second, unless asked for another rate
export var RATE = 44100;

export var PLACES = ["town", "city", "outside"];
export var TIMES = ["day", "night"];
export var WEATHERS = ["clear", "rain", "storm"];

/* ------------------------------------------------------------------------
 * Harmony
 * --------------------------------------------------------------------- */

var NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function hz(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

//each kind of chord: its rootless voicing for the Rhodes, its chord tones
//for the melody to land on, and the scale it moves through - all from the
//root, in semitones
var MINOR = {
    voicing: [3, 7, 10, 14],
    tones: [0, 3, 7, 10],
    scale: [0, 2, 3, 5, 7, 9, 10],
  },
  DOMINANT = {
    voicing: [4, 9, 10, 14],
    tones: [0, 4, 7, 10],
    scale: [0, 2, 4, 7, 9, 10],
  },
  SUS = {
    voicing: [5, 9, 10, 14],
    tones: [0, 5, 7, 10],
    scale: [0, 2, 5, 7, 9, 10],
  };

var QUALITIES = {
  maj9: {
    voicing: [4, 7, 11, 14],
    tones: [0, 4, 7, 11],
    scale: [0, 2, 4, 7, 9, 11],
  },
  "maj9#11": {
    voicing: [4, 6, 11, 14],
    tones: [0, 4, 7, 11],
    scale: [0, 2, 4, 6, 7, 9, 11],
  },
  m9: MINOR,
  m7: MINOR,
  m7b5: {
    voicing: [3, 6, 10, 15],
    tones: [0, 3, 6, 10],
    scale: [0, 3, 5, 6, 8, 10],
  },
  13: DOMINANT,
  9: {
    voicing: [4, 7, 10, 14],
    tones: [0, 4, 7, 10],
    scale: [0, 2, 4, 7, 9, 10],
  },
  "7b9": {
    voicing: [4, 7, 10, 13],
    tones: [0, 4, 7, 10],
    scale: [0, 1, 4, 7, 8, 10],
  },
  "13sus": SUS,
  "7sus": SUS,
};

function chordOf(name) {
  var m = /^([A-G])(#|b)?(.*)$/.exec(name),
    quality = m && QUALITIES[m[3]];

  if (!quality) throw new Error("no such chord: " + name);

  return {
    name: name,
    root: (NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0) + 12) % 12,
    q: quality,
  };
}

/**
 * Every piece: its tempo and how much it swings, its tunes - the A and the
 * B of an AABA, eight bars each, a bar's chords split by spaces - its lead
 * and where it sits, and how it is played: the bass walking or in two, how
 * busy the drums are, how big the room, whether strings lie under it.
 */
var PIECES = {
  town: {
    day: {
      bpm: 76,
      swing: 0.62,
      a: "Cmaj9 | Am9 | Dm9 | G13 | Em7 A7b9 | Dm9 G13 | Cmaj9 | Gm9 C13",
      b: "Fmaj9 | Fm9 Bb13 | Em7 | A7b9 | Dm9 | G13 | Cmaj9 Am9 | Dm9 G13",
      lead: "guitar",
      range: [55, 79],
      bass: "walk",
      drums: "day",
      room: 0.25,
    },
    night: {
      bpm: 64,
      swing: 0.64,
      a: "Abmaj9 | Fm9 | Bbm9 | Eb13 | Cm9 | F7b9 | Bbm9 | Eb13sus",
      b: "Dbmaj9 | Dbm9 Gb13 | Cm9 | F7b9 | Bbm9 | Eb13 | Abmaj9 | Abmaj9",
      lead: "vibes",
      range: [60, 84],
      bass: "two",
      drums: "night",
      room: 0.4,
      pad: true,
      slow: true,
    },
  },
  city: {
    day: {
      bpm: 84,
      swing: 0.64,
      a: "Gm9 | C13 | Fmaj9 | D7b9 | Gm9 | C13 | Am7 D7b9 | Gm9 C13",
      b: "Cm9 | F13 | Bbmaj9 | Eb9 | Am7 | D7b9 | Gm9 | C7b9",
      lead: "trumpet",
      range: [58, 80],
      bass: "walk",
      drums: "day",
      room: 0.28,
    },
    night: {
      bpm: 66,
      swing: 0.66,
      a: "Ebm9 | Ab13 | Dbmaj9 | Bb7b9 | Ebm9 | Fm7b5 Bb7b9 | Ebm9 | Ab13",
      b: "Bmaj9 | Bbm9 Eb7b9 | Abm9 | Db13 | Gbmaj9 | Fm7b5 | Bb7b9 | Bb7b9",
      lead: "sax",
      range: [51, 74],
      bass: "two",
      drums: "night",
      room: 0.42,
      pad: true,
      slow: true,
    },
  },
  outside: {
    day: {
      bpm: 70,
      swing: 0.6,
      a: "Dmaj9 | Dmaj9 | Gmaj9#11 | Gmaj9#11 | Bm9 | Bm9 | Em9 | A13sus",
      b: "Gmaj9#11 | F#m9 | Em9 | A13sus | Dmaj9 | Bm9 | Gmaj9#11 | A13sus",
      lead: "flute",
      range: [67, 89],
      bass: "two",
      drums: "light",
      room: 0.35,
      slow: true,
    },
    night: {
      bpm: 60,
      swing: 0.62,
      a: "Dm9 | Dm9 | Bbmaj9 | Bbmaj9 | Gm9 | Gm9 | A7sus | A7b9",
      b: "Fmaj9 | Fmaj9 | Ebmaj9#11 | Ebmaj9#11 | Dm9 | Bbmaj9 | Gm9 | A7b9",
      lead: "vibes",
      range: [62, 84],
      bass: "two",
      drums: "night",
      room: 0.48,
      pad: true,
      slow: true,
    },
  },
};

//the form: which tune each eight bars are
var FORM = ["a", "a", "b", "a"];

/**
 * The chords of a piece, bar by bar: each with where it starts and ends, in
 * eighth notes from the top of the piece.
 */
function chartOf(piece) {
  var out = [],
    e = 0;

  FORM.forEach(function (part) {
    piece[part].split("|").forEach(function (bar) {
      var names = bar.trim().split(/\s+/),
        each = 8 / names.length;

      names.forEach(function (name) {
        out.push({ chord: chordOf(name), from: e, to: e + each });
        e += each;
      });
    });
  });

  return out;
}

function chordAt(chart, e) {
  for (var i = 0; i < chart.length; i++)
    if (e >= chart[i].from && e < chart[i].to) return chart[i];

  return chart[chart.length - 1];
}

//every note of these pitch classes from lo to hi
function notesOf(root, intervals, lo, hi) {
  var out = [];

  for (var m = lo; m <= hi; m++)
    for (var k = 0; k < intervals.length; k++)
      if ((m - root - intervals[k] + 1200) % 12 === 0) {
        out.push(m);
        break;
      }

  return out;
}

function nearest(list, m) {
  var best = list[0];

  for (var i = 1; i < list.length; i++)
    if (Math.abs(list[i] - m) < Math.abs(best - m)) best = list[i];

  return best;
}

/**
 * A chord's rootless voicing for the Rhodes, its voices as near as they can
 * be to the last chord's - each note in the octave nearest where the last
 * voicing sat - and no wider than a ninth or so.
 */
function voice(chord, last) {
  var centre = last
      ? last.reduce(function (a, b) {
          return a + b;
        }, 0) / last.length
      : 62,
    out = chord.q.voicing
      .map(function (i) {
        var pc = (chord.root + i) % 12,
          m = pc + 12 * Math.round((centre - pc) / 12);

        return m;
      })
      .sort(function (a, b) {
        return a - b;
      });

  while (out[out.length - 1] - out[0] > 14) {
    out[0] += 12;
    out.sort(function (a, b) {
      return a - b;
    });
  }

  while (out[0] < 52) out = out.map((m) => m + 12);
  while (out[out.length - 1] > 76) out = out.map((m) => m - 12);

  return out;
}

/* ------------------------------------------------------------------------
 * Time
 * --------------------------------------------------------------------- */

/**
 * When an eighth note of the piece falls, in seconds: the off-beat ones
 * late, by how much the piece swings.
 */
function timer(piece) {
  var beat = 60 / piece.bpm;

  return {
    beat: beat,
    at: function (e) {
      var whole = Math.floor(e / 2),
        half = e - whole * 2;

      return (whole + (half >= 1 ? piece.swing : 0) + (half % 1) * 0.5) * beat;
    },
  };
}

/* ------------------------------------------------------------------------
 * The melody
 * --------------------------------------------------------------------- */

//rhythms of a two-bar motif, [eighth, how many eighths long]
var RHYTHMS = [
  [
    [0, 3],
    [3, 1],
    [4, 4],
    [10, 2],
    [12, 4],
  ],
  [
    [1, 2],
    [3, 1],
    [4, 2],
    [6, 4],
    [12, 3],
  ],
  [
    [0, 2],
    [2, 2],
    [4, 6],
    [11, 1],
    [12, 4],
  ],
  [
    [2, 1],
    [3, 1],
    [4, 1],
    [5, 3],
    [8, 8],
  ],
  [
    [3, 1],
    [4, 3],
    [7, 1],
    [8, 6],
  ],
  [
    [0, 2],
    [3, 1],
    [4, 2],
    [7, 3],
    [11, 1],
    [12, 4],
  ],
];

//and slower ones, for night and the open country
var SLOW = [
  [
    [0, 6],
    [6, 2],
    [8, 8],
  ],
  [
    [0, 4],
    [4, 4],
    [10, 6],
  ],
  [
    [2, 2],
    [4, 10],
  ],
  [
    [0, 3],
    [3, 5],
    [12, 4],
  ],
];

//answers to a motif, in the two bars after it
var ANSWERS = [
  [],
  [
    [3, 1],
    [4, 4],
  ],
  [
    [2, 2],
    [4, 4],
  ],
  [
    [1, 1],
    [2, 1],
    [3, 5],
  ],
  [],
];

//steps through the scale from one note to the next, the small ones likelier
var STEPS = [-1, -1, -2, 1, 1, 2, 0, -3, 3];

function pick(rnd, list) {
  return list[Math.floor(rnd() * list.length)];
}

/**
 * The tune over a piece's chords: a motif and what becomes of it in each
 * eight bars - stated, answered, stated again over the new chords, and
 * brought home on a long note. Each note a step or two through the chord's
 * scale from the last, landing on a chord tone on the strong beats.
 *
 * @returns {{e: number, len: number, m: number, v: number, kind: string}[]}
 *          where each note starts and how long it is, in eighths; its pitch;
 *          how hard it is played; and what part of a phrase it is
 */
function tune(piece, chart, rnd) {
  var lo = piece.range[0],
    hi = piece.range[1],
    at = Math.round((lo + hi) / 2),
    motifs = {},
    notes = [];

  function step(m, e, by, strong) {
    var c = chordAt(chart, e).chord,
      scale = notesOf(c.root, c.q.scale, lo, hi),
      i = scale.indexOf(nearest(scale, m)) + by;

    if (i < 0) i = -i;
    if (i >= scale.length) i = 2 * (scale.length - 1) - i;

    m = scale[Math.max(0, Math.min(scale.length - 1, i))];

    return strong ? nearest(notesOf(c.root, c.q.tones, lo, hi), m) : m;
  }

  function phrase(rhythm, steps, from, kind, loud) {
    rhythm.forEach(function (r, k) {
      var e = from + r[0];

      at = step(at, e, steps[k % steps.length], e % 4 === 0);
      notes.push({
        e: e,
        len: r[1],
        m: at,
        v: loud * between(rnd, 0.85, 1),
        kind: kind,
      });
    });
  }

  FORM.forEach(function (part, s) {
    var base = s * 64,
      motif = motifs[part];

    if (motif === undefined) {
      var rhythm = pick(rnd, piece.slow ? SLOW : RHYTHMS);

      motif = motifs[part] = {
        rhythm: rhythm,
        steps: rhythm.map(function () {
          return pick(rnd, STEPS);
        }),
      };
    }

    //stated
    phrase(motif.rhythm, motif.steps, base, "call", 0.9);

    //answered - or not
    var answer = pick(rnd, ANSWERS);

    phrase(answer, [-1, -2, 1], base + 16, "answer", 0.7);

    //stated again, its last steps a little changed
    phrase(
      motif.rhythm,
      motif.steps.map(function (st, k) {
        return k < motif.steps.length - 2 ? st : pick(rnd, STEPS);
      }),
      base + 32,
      "call",
      0.85,
    );

    //and home: a step or two down onto a long chord tone
    var c = chordAt(chart, base + 48).chord,
      home = nearest(notesOf(c.root, c.q.tones, lo, hi), at - 2);

    if (rnd() < 0.6) {
      at = step(at, base + 47, -1, false);
      notes.push({ e: base + 47, len: 1, m: at, v: 0.7, kind: "home" });
    }

    at = home;
    notes.push({
      e: base + 48,
      len: piece.slow ? 14 : 10,
      m: home,
      v: 0.8,
      kind: "home",
    });
  });

  return notes;
}

/**
 * The tune as the weather plays it. Rain: lazy - only the notes on the
 * strong beats and a few others, held on, laid back. Storm: the tune, a
 * little harder, and a run of eighths through the scale in every gap it
 * leaves.
 */
function tuneFor(weather, notes, piece, chart, rnd) {
  if (weather === "clear") return notes.slice();

  if (weather === "rain") {
    var kept = notes.filter(function (n) {
      return n.kind === "home" || n.e % 4 === 0 || rnd() < 0.3;
    });

    return kept.map(function (n, i) {
      var next = kept[i + 1] ? kept[i + 1].e : n.e + 16;

      return {
        e: n.e,
        len: Math.min(12, Math.max(n.len, next - n.e)),
        m: n.m,
        v: n.v * 0.75,
        lazy: true,
      };
    });
  }

  //storm: the gaps filled with runs
  var out = notes.map(function (n) {
      return { e: n.e, len: n.len, m: n.m, v: Math.min(1, n.v * 1.1) };
    }),
    lo = piece.range[0],
    hi = piece.range[1],
    total = chart[chart.length - 1].to;

  for (var i = 0; i < notes.length; i++) {
    var end = notes[i].e + notes[i].len,
      next = i + 1 < notes.length ? notes[i + 1].e : total,
      gap = next - end;

    if (gap < 5) continue;

    var m = notes[i].m,
      up = rnd() < 0.5 ? 1 : -1,
      count = Math.min(gap - 1, 8);

    for (var k = 0; k < count; k++) {
      var e = next - count + k,
        c = chordAt(chart, e).chord,
        scale = notesOf(c.root, c.q.scale, lo, hi),
        j = scale.indexOf(nearest(scale, m)) + up;

      if (j < 0 || j >= scale.length) {
        up = -up;
        j = scale.indexOf(nearest(scale, m)) + up;
      }

      m = scale[Math.max(0, Math.min(scale.length - 1, j))];
      out.push({ e: e, len: 1, m: m, v: 0.6 + 0.15 * (k / count) });
    }
  }

  return out.sort(function (a, b) {
    return a.e - b.e;
  });
}

/* ------------------------------------------------------------------------
 * Instruments: each a note, mono
 * --------------------------------------------------------------------- */

//a Rhodes: a sine bent by a sine (FM), brighter the harder it is struck,
//and the click of its tine
function rhodes(rnd, f, dur, vel, rate) {
  var rel = 0.12,
    n = Math.round((dur + rel * 5) * rate),
    out = new Float32Array(n),
    tau = Math.max(0.7, Math.min(2.4, 2.4 - (f - 200) / 400)),
    held = Math.round(dur * rate),
    //the envelopes, worked out a sample at a time by multiplying
    decay = 1,
    decayBy = Math.exp(-1 / (tau * rate)),
    let_go = 1,
    let_goBy = Math.exp(-1 / (rel * rate)),
    bright = 1,
    brightBy = Math.exp(-1 / (0.3 * rate)),
    click = 0.06 * vel,
    clickBy = Math.exp(-1 / (0.015 * rate)),
    p = 0,
    tine = 0,
    dp = f / rate,
    dtine = (f * 13.9) / rate,
    attack = 0.002 * rate,
    i;

  for (i = 0; i < n; i++) {
    var index = vel * (1.1 * bright + 0.2),
      env = (i < attack ? i / attack : 1) * decay * let_go;

    p += dp;
    if (p >= 1) p -= 1;
    tine += dtine;
    if (tine >= 1) tine -= 1;

    out[i] =
      (Math.sin(TAU * p + index * Math.sin(TAU * p)) +
        (click > 1e-4 ? Math.sin(TAU * tine) * click : 0)) *
      env *
      vel;

    decay *= decayBy;
    bright *= brightBy;
    click *= clickBy;
    if (i >= held) let_go *= let_goBy;
    if (env < 1e-4 && i > attack) break;
  }

  return i < n ? out.subarray(0, i) : out;
}

/**
 * A plucked string (Karplus and Strong): a burst of noise going round a
 * delay line a period long, smoothed a little every time round - so it
 * rings at its pitch, dulling as it dies. Damped once it is let go of.
 */
function pluck(rnd, f, dur, vel, rate, bright, ring) {
  var period = rate / f,
    size = Math.ceil(period) + 2,
    buf = new Float32Array(size),
    n = Math.round((dur + 0.25) * rate),
    out = new Float32Array(n),
    lp = new OnePole(rate, 500 + bright * 5000),
    keep = Math.pow(0.001, 1 / (ring * f)),
    damp = Math.pow(0.001, 1 / (0.12 * f)),
    w = 0,
    last = 0,
    i;

  for (i = 0; i < size; i++) buf[i] = lp.run(rnd() * 2 - 1) * vel;

  for (i = 0; i < n; i++) {
    var r = w - period;

    while (r < 0) r += size;

    var i0 = Math.floor(r),
      fr = r - i0,
      y = buf[i0] * (1 - fr) + buf[(i0 + 1) % size] * fr;

    buf[w] = (y + last) * 0.5 * (i / rate < dur ? keep : damp);
    last = y;
    w = (w + 1) % size;
    out[i] = y;
  }

  return out;
}

//an upright bass: a dark pluck, with the thump of the string under it
function bass(rnd, f, dur, vel, rate) {
  var out = pluck(rnd, f, dur, vel, rate, 0.08, 2.2),
    lp = new Biquad(rate, "lowpass", 900, 0.7),
    p = 0;

  for (var i = 0; i < out.length; i++) {
    var t = i / rate;

    p = (p + f / rate) % 1;
    out[i] = lp.run(
      out[i] * 1.6 + Math.sin(TAU * p) * vel * Math.exp(-t / 0.35) * 0.6,
    );
  }

  return out;
}

//a jazz guitar: a warm pluck through a hollow body
function guitar(rnd, f, dur, vel, rate) {
  var out = pluck(rnd, f, dur, vel, rate, 0.35, 1.6),
    lp = new Biquad(rate, "lowpass", 2400, 0.7),
    body = new Biquad(rate, "bandpass", 220, 1.2);

  for (var i = 0; i < out.length; i++)
    out[i] = lp.run(out[i]) + body.run(out[i]) * 0.4;

  return out;
}

//a vibraphone: a few bars ringing at odd ratios, its motor's tremolo, and
//the tap of the mallet
function vibes(rnd, f, dur, vel, rate) {
  var n = Math.round((dur + 1) * rate),
    out = new Float32Array(n),
    parts = [
      [1, 1, 2.6],
      [4, 0.22, 0.45],
      [10.1, 0.05, 0.1],
    ],
    phases = [0, 0, 0];

  var levels = parts.map(function (p) {
      return p[1];
    }),
    by = parts.map(function (p) {
      return Math.exp(-1 / (p[2] * rate));
    }),
    steps = parts.map(function (p) {
      return (f * p[0]) / rate;
    }),
    held = Math.round((dur + 0.4) * rate),
    damp = 1,
    dampBy = Math.exp(-1 / (0.2 * rate));

  for (var i = 0; i < n; i++) {
    var x = 0;

    for (var k = 0; k < parts.length; k++) {
      phases[k] += steps[k];
      if (phases[k] >= 1) phases[k] -= 1;
      x += Math.sin(TAU * phases[k]) * levels[k];
      levels[k] *= by[k];
    }

    if (i >= held) damp *= dampBy;

    out[i] =
      x *
      vel *
      Math.min(1, i / (0.002 * rate)) *
      (1 - 0.3 * (0.5 + 0.5 * Math.sin((TAU * 5.2 * i) / rate))) *
      damp;
  }

  return out;
}

/**
 * A horn: a saw scooping up into its note, a slow vibrato coming in, through
 * the formants of the horn - "trumpet" muted and nasal, "sax" lower and
 * breathier - and a breath of air with it.
 */
function horn(kind, rnd, f, dur, vel, rate) {
  var sax = kind === "sax",
    n = Math.round((dur + 0.15) * rate),
    out = new Float32Array(n),
    f1 = new Biquad(rate, "bandpass", sax ? 650 : 1150, sax ? 1.4 : 3),
    f2 = new Biquad(rate, "bandpass", sax ? 1350 : 2500, sax ? 2.2 : 4),
    lp = new Biquad(rate, "lowpass", sax ? 2600 : 3400, 0.7),
    air = new Biquad(rate, "bandpass", sax ? 1200 : 1800, 1),
    noise = white(rnd),
    attack = sax ? 0.06 : 0.035,
    p = 0;

  for (var i = 0; i < n; i++) {
    var t = i / rate,
      bend =
        1 -
        0.02 * Math.exp(-t / 0.05) +
        0.007 *
          Math.min(1, Math.max(0, (t - 0.25) / 0.3)) *
          Math.sin(TAU * 5.3 * t),
      g = f * bend,
      dt = g / rate;

    p = (p + dt) % 1;

    var x = sax ? 0.65 * saw(p, dt) + 0.35 * square(p, dt) : saw(p, dt),
      env =
        Math.min(1, t / attack) *
        (t > dur ? Math.max(0, 1 - (t - dur) / 0.12) : 1);

    out[i] =
      (lp.run(f1.run(x) * 1.4 + f2.run(x) * 0.9 + x * 0.15) +
        air.run(noise()) * (sax ? 0.12 : 0.06)) *
      env *
      vel;
  }

  return out;
}

//a flute: a sine with a little of its octave, a breath round it, and a
//vibrato coming in
function flute(rnd, f, dur, vel, rate) {
  var n = Math.round((dur + 0.15) * rate),
    out = new Float32Array(n),
    air = new Biquad(rate, "bandpass", f * 2, 2),
    noise = white(rnd),
    p = 0;

  for (var i = 0; i < n; i++) {
    var t = i / rate,
      g =
        f *
        (1 +
          0.006 *
            Math.min(1, Math.max(0, (t - 0.25) / 0.3)) *
            Math.sin(TAU * 5 * t)),
      env =
        Math.min(1, t / 0.08) *
        (t > dur ? Math.max(0, 1 - (t - dur) / 0.12) : 1);

    p = (p + g / rate) % 1;

    out[i] =
      (Math.sin(TAU * p) +
        0.12 * Math.sin(2 * TAU * p) +
        0.04 * Math.sin(3 * TAU * p) +
        air.run(noise()) * 0.25) *
      env *
      vel;
  }

  return out;
}

/**
 * Strings, a chord of them: each note two saws a little out of tune with
 * each other, all through one dark filter, swelling in and dying away
 * slowly - shivering, for a storm.
 */
function strings(rnd, freqs, dur, vel, rate, shiver) {
  var n = Math.round((dur + 1.5) * rate),
    out = new Float32Array(n),
    lp = new Biquad(rate, "lowpass", 1100, 0.6),
    voices = [],
    held = Math.round(dur * rate),
    swell = Math.round(0.6 * rate),
    fade = 1,
    fadeBy = Math.exp(-1 / (0.5 * rate)),
    k,
    i;

  freqs.forEach(function (f) {
    voices.push({ p: rnd(), dt: (f * 0.996) / rate });
    voices.push({ p: rnd(), dt: (f * 1.005) / rate });
  });

  for (i = 0; i < n; i++) {
    var x = 0;

    for (k = 0; k < voices.length; k++) {
      var v = voices[k];

      v.p += v.dt;
      if (v.p >= 1) v.p -= 1;
      x += saw(v.p, v.dt);
    }

    var env =
      (i < swell ? i / swell : 1) *
      fade *
      (shiver ? 0.6 + 0.4 * Math.sin((TAU * shiver * i) / rate) : 1);

    if (i >= held) fade *= fadeBy;

    out[i] = (lp.run(x) / voices.length) * env * vel;
  }

  return out;
}

var LEADS = {
  guitar: guitar,
  vibes: vibes,
  flute: flute,
  trumpet: function (rnd, f, dur, vel, rate) {
    return horn("trumpet", rnd, f, dur, vel, rate);
  },
  sax: function (rnd, f, dur, vel, rate) {
    return horn("sax", rnd, f, dur, vel, rate);
  },
};

/* ------------------------------------------------------------------------
 * Drums
 * --------------------------------------------------------------------- */

//metal: six square waves at odd ratios, the way the drum machines did it
var METAL = [205.3, 304.4, 369.6, 522.7, 540, 800];

function metal(n, rate, scale) {
  var out = new Float32Array(n),
    phases = [0, 0, 0, 0, 0, 0];

  for (var i = 0; i < n; i++) {
    var x = 0;

    for (var k = 0; k < 6; k++) {
      phases[k] = (phases[k] + (METAL[k] * scale) / rate) % 1;
      x += phases[k] < 0.5 ? 1 : -1;
    }

    out[i] = x / 6;
  }

  return out;
}

function ride(rnd, vel, rate, dark) {
  var n = Math.round(1.3 * rate),
    out = metal(n, rate, 1.62),
    hp = new Biquad(rate, "highpass", dark ? 3200 : 4500, 0.7),
    lp = new Biquad(rate, "lowpass", dark ? 6500 : 11000, 0.7),
    noise = white(rnd);

  for (var i = 0; i < n; i++) {
    var t = i / rate;

    out[i] =
      lp.run(hp.run(out[i] + noise() * 0.3)) *
      (0.22 * Math.exp(-t / (dark ? 0.45 : 0.75)) +
        0.6 * Math.exp(-t / 0.008)) *
      vel;
  }

  return out;
}

function crash(rnd, vel, rate) {
  var n = Math.round(2.2 * rate),
    out = metal(n, rate, 1.9),
    hp = new Biquad(rate, "highpass", 3000, 0.7),
    noise = white(rnd);

  for (var i = 0; i < n; i++)
    out[i] =
      hp.run(out[i] * 0.5 + noise()) * Math.exp(-(i / rate) / 0.7) * vel * 0.5;

  return out;
}

function hat(rnd, vel, rate) {
  var n = Math.round(0.08 * rate),
    out = metal(n, rate, 2.1),
    hp = new Biquad(rate, "highpass", 7000, 0.7);

  for (var i = 0; i < n; i++)
    out[i] = hp.run(out[i]) * Math.exp(-(i / rate) / 0.02) * vel;

  return out;
}

//a brush swept round the snare: a swish of noise, rising and falling
function swish(rnd, dur, vel, rate) {
  var n = Math.round(dur * rate),
    out = new Float32Array(n),
    noise = pink(rnd),
    band = new Biquad(rate, "bandpass", 3500, 0.8);

  for (var i = 0; i < n; i++)
    out[i] =
      band.run(noise()) * Math.pow(Math.sin((Math.PI * i) / n), 1.5) * vel;

  return out;
}

//a brush slapped on the snare
function slap(rnd, vel, rate) {
  var n = Math.round(0.18 * rate),
    out = new Float32Array(n),
    noise = white(rnd),
    hp = new Biquad(rate, "highpass", 1800, 0.7);

  for (var i = 0; i < n; i++)
    out[i] = hp.run(noise()) * Math.exp(-(i / rate) / 0.045) * vel;

  return out;
}

//a stick on the snare, for a storm: the crack and the drum under it
function snare(rnd, vel, rate) {
  var n = Math.round(0.25 * rate),
    out = new Float32Array(n),
    noise = white(rnd),
    band = new Biquad(rate, "bandpass", 2400, 0.6),
    p = 0;

  for (var i = 0; i < n; i++) {
    var t = i / rate;

    p = (p + 190 / rate) % 1;
    out[i] =
      (band.run(noise()) * Math.exp(-t / 0.09) +
        Math.sin(TAU * p) * 0.6 * Math.exp(-t / 0.05)) *
      vel;
  }

  return out;
}

function rim(rnd, vel, rate) {
  var n = Math.round(0.05 * rate),
    out = new Float32Array(n);

  for (var i = 0; i < n; i++) {
    var t = i / rate;

    out[i] =
      (Math.sin(TAU * 1700 * t) * 0.6 + Math.sin(TAU * 520 * t) * 0.4) *
      Math.exp(-t / 0.012) *
      vel;
  }

  return out;
}

//a drum: a sine dropping into its pitch - the kick, or a tom
function drum(rnd, f, vel, rate, long) {
  var n = Math.round(long * 2.5 * rate),
    out = new Float32Array(n),
    p = 0;

  for (var i = 0; i < n; i++) {
    var t = i / rate,
      g = f * (1 + 1.4 * Math.exp(-t / 0.03));

    p = (p + g / rate) % 1;
    out[i] = Math.sin(TAU * p) * Math.exp(-t / long) * vel;
  }

  return out;
}

/**
 * The drums' sounds, each made a few times over and kept: a hit is one of
 * them picked at random, laid in as loud as it is played - every ride a
 * little different from the last, without making a new one for every one.
 */
function kitOf(rate) {
  var rnd = seeded(seedOf("kit")),
    few = function (make) {
      return [make(), make(), make()];
    };

  return {
    ride: few(function () {
      return ride(rnd, 1, rate, false);
    }),
    darkRide: few(function () {
      return ride(rnd, 1, rate, true);
    }),
    crash: few(function () {
      return crash(rnd, 1, rate);
    }),
    hat: few(function () {
      return hat(rnd, 1, rate);
    }),
    slap: few(function () {
      return slap(rnd, 1, rate);
    }),
    snare: few(function () {
      return snare(rnd, 1, rate);
    }),
    rim: few(function () {
      return rim(rnd, 1, rate);
    }),
    kick: few(function () {
      return drum(rnd, 52, 1, rate, 0.22);
    }),
    swishes: {},
    toms: {},
  };
}

/* ------------------------------------------------------------------------
 * The band
 * --------------------------------------------------------------------- */

/**
 * What the Rhodes plays: the voicing of each chord, on a rhythm the weather
 * picks - off the beat and short by day, held by night, held and rolled
 * slowly in the rain, stabbing the offbeats in a storm.
 */
function comping(piece, chart, weather, rnd) {
  var out = [],
    last = null;

  chart.forEach(function (c) {
    var span = c.to - c.from,
      voicing = voice(c.chord, last),
      hits;

    last = voicing;

    if (weather === "rain") hits = [[0, span]];
    else if (weather === "storm")
      hits =
        span >= 8
          ? pick(rnd, [
              [
                [0, 1],
                [3, 1],
                [5, 1],
                [7, 1],
              ],
              [
                [1, 1],
                [3, 1],
                [4, 1],
                [7, 1],
              ],
            ])
          : [
              [0, 1],
              [3, 1],
            ];
    else if (piece.slow)
      hits = span >= 8 ? pick(rnd, [[[0, 8]], [[0, 6]], [[3, 5]]]) : [[0, 4]];
    else
      hits =
        span >= 8
          ? pick(rnd, [
              [[0, 3]],
              [
                [0, 2],
                [3, 4],
              ],
              [[3, 5]],
              [
                [0, 1],
                [3, 2],
                [6, 2],
              ],
              [[0, 6]],
            ])
          : pick(rnd, [
              [[0, 3]],
              [[1, 3]],
              [
                [0, 1],
                [3, 1],
              ],
            ]);

    hits.forEach(function (h) {
      out.push({
        e: c.from + h[0],
        len: h[1],
        notes: voicing,
        v:
          weather === "storm"
            ? between(rnd, 0.6, 0.8)
            : weather === "rain"
              ? 0.4
              : between(rnd, 0.42, 0.58),
        roll: weather === "rain" ? 0.06 : 0.012,
      });
    });
  });

  return out;
}

/**
 * What the bass plays: walking by day - the root on the downbeat, chord
 * tones and steps through the bar, a half step into the next root - in two
 * by night, the roots held in the rain, and walking hard in a storm with a
 * dead note kicking into every other beat.
 */
function bassLine(piece, chart, weather, rnd) {
  var out = [],
    lo = 28,
    hi = 45,
    at = 36,
    feel =
      weather === "storm" ? "walk" : weather === "rain" ? "hold" : piece.bass;

  function near(pc, to) {
    return nearest(notesOf(pc, [0], lo, hi), to);
  }

  chart.forEach(function (c, ci) {
    var span = c.to - c.from,
      root = near(c.chord.root, at),
      next = chart[(ci + 1) % chart.length].chord,
      beats = span / 2;

    if (feel === "hold") {
      out.push({ e: c.from, len: span, m: root, v: 0.7 });
      at = root;
      return;
    }

    if (feel === "two") {
      out.push({ e: c.from, len: Math.min(span, 4), m: root, v: 0.75 });
      if (span >= 8) {
        var fifth = nearest(notesOf(c.chord.root, [7, 0], lo, hi), root + 5);

        out.push({
          e: c.from + 4,
          len: 4,
          m: rnd() < 0.7 ? fifth : root + 12 <= hi ? root + 12 : root,
          v: 0.65,
        });
      }
      at = root;
      return;
    }

    //walking
    var target = near(next.root, root),
      approach =
        rnd() < 0.7
          ? target + (rnd() < 0.5 ? 1 : -1)
          : nearest(notesOf(next.root, [7], lo, hi), target),
      tones = notesOf(c.chord.root, c.chord.q.tones, lo, hi),
      m = root;

    for (var b = 0; b < beats; b++) {
      if (b === 0) m = root;
      else if (b === beats - 1)
        //into the next root - a half step off it if the way in would only
        //sit on the note it is on
        m = approach !== m ? approach : target + (target > m ? -1 : 1);
      else {
        var towards = approach > m ? 1 : -1,
          options = tones.filter(function (t) {
            return t !== m && Math.abs(t - m) <= 5;
          });

        m =
          options.length > 0 && rnd() < 0.7
            ? pick(rnd, options)
            : m + towards * (rnd() < 0.5 ? 1 : 2);
        m = Math.max(lo, Math.min(hi, m));
      }

      out.push({ e: c.from + b * 2, len: 2, m: m, v: b === 0 ? 0.85 : 0.72 });

      //a storm kicks a dead note into the beat
      if (weather === "storm" && b % 2 === 0 && rnd() < 0.6)
        out.push({ e: c.from + b * 2 + 1, len: 1, m: m, v: 0.35, dead: true });
    }

    at = root;
  });

  return out;
}

/**
 * What the drums play - by day the ride's spang-a-lang, the hi-hat's foot
 * on two and four and the brushes going round; by night the same darker
 * and sparer; the open country just the brushes and the hat; in the rain a
 * slow swirl and the odd rim click; in a storm the ride and the snare and
 * the kick all at it, crashes on the phrases, and a tom fill at the end of
 * every eight bars.
 */
function drumming(piece, weather, bars, rnd) {
  var out = [],
    style = weather === "clear" ? piece.drums : weather;

  for (var bar = 0; bar < bars; bar++) {
    var e0 = bar * 8;

    for (var beat = 0; beat < 4; beat++) {
      var e = e0 + beat * 2,
        backbeat = beat % 2 === 1;

      if (style === "rain") {
        if (beat % 2 === 0)
          out.push({
            e: e,
            kind: "swish",
            len: 4,
            v: 0.2,
            pan: beat === 0 ? -0.2 : 0.2,
          });
        if (beat === 3 && bar % 2 === 1 && rnd() < 0.8)
          out.push({ e: e, kind: "rim", v: 0.16 });
        continue;
      }

      //the brushes going round, slapped on two and four
      out.push({
        e: e,
        kind: "swish",
        len: style === "night" ? 2 : 2,
        v: style === "storm" ? 0.16 : 0.2,
        pan: -0.15,
      });
      if (backbeat && style !== "storm")
        out.push({ e: e, kind: "slap", v: 0.22 });

      //the hi-hat's foot
      if (backbeat)
        out.push({ e: e, kind: "hat", v: style === "storm" ? 0.45 : 0.3 });

      if (style === "light") continue;

      //the ride
      if (style === "night") {
        if (rnd() < 0.85)
          out.push({
            e: e,
            kind: "ride",
            v: backbeat ? 0.24 : 0.18,
            dark: true,
          });
      } else {
        out.push({
          e: e,
          kind: "ride",
          v: (backbeat ? 0.36 : 0.28) * (style === "storm" ? 1.5 : 1),
        });
        if (backbeat)
          out.push({
            e: e - 1,
            kind: "ride",
            v: 0.22 * (style === "storm" ? 1.4 : 1),
          });
      }

      if (style === "day" && beat === 0 && rnd() < 0.5)
        out.push({ e: e, kind: "kick", v: 0.25 });

      if (style === "storm") {
        if (beat % 2 === 0) out.push({ e: e, kind: "kick", v: 0.6 });
        if (rnd() < 0.35)
          out.push({ e: e + 1, kind: "snare", v: between(rnd, 0.3, 0.5) });
        if (beat === 2 && rnd() < 0.3)
          out.push({ e: e + 1, kind: "kick", v: 0.45 });
      }
    }

    if (style === "storm") {
      if (bar % 4 === 0) out.push({ e: e0, kind: "crash", v: 0.55 });

      //a tom fill into the next eight bars
      if (bar % 8 === 7)
        for (var k = 0; k < 4; k++)
          out.push({
            e: e0 + 4 + k,
            kind: "tom",
            f: 150 - k * 22,
            v: 0.55,
            pan: 0.4 - k * 0.25,
          });
    }
  }

  return out;
}

/* ------------------------------------------------------------------------
 * Playing it
 * --------------------------------------------------------------------- */

function buses(n) {
  return [new Float32Array(n), new Float32Array(n)];
}

//a whole number of turns of something wobbling in the length of a loop,
//about `hz` a second - so it comes round to where it started
function looped(hz, seconds) {
  return Math.max(1, Math.round(hz * seconds)) / seconds;
}

/**
 * Plays a piece in a weather: every part laid into its own pair of ears
 * round the loop, a little of each sent to the room, the weather's touch on
 * the whole - and as loud as that weather is meant to be.
 */
function play(place, time, weather, rate) {
  var piece = PIECES[place][time],
    chart = chartOf(piece),
    bars = chart[chart.length - 1].to / 8,
    clock = timer(piece),
    seconds = bars * 4 * clock.beat,
    n = Math.round(seconds * rate),
    //the tune is the piece's - the same in every weather - and the rest the
    //weather's own
    tuneRnd = seeded(seedOf(place + "/" + time + " tune")),
    rnd = seeded(seedOf(place + "/" + time + "/" + weather)),
    keys = buses(n),
    low = buses(n),
    lead = buses(n),
    kit = buses(n),
    pad = buses(n),
    i;

  function sample(e) {
    return Math.round(clock.at(e) * rate);
  }

  function nudge(spread) {
    return Math.round((rnd() * 2 - 1) * spread * rate);
  }

  //the Rhodes
  comping(piece, chart, weather, rnd).forEach(function (h) {
    var dur = clock.at(h.e + h.len) - clock.at(h.e) - 0.03;

    h.notes.forEach(function (m, k) {
      var note = rhodes(
        rnd,
        hz(m),
        Math.max(0.12, dur),
        h.v * between(rnd, 0.9, 1.05),
        rate,
      );

      lay(
        keys,
        note,
        sample(h.e) + Math.round(k * h.roll * rate) + nudge(0.006),
        0,
        0.32,
        true,
      );
    });
  });

  //strings under it, by night and when the weather turns
  if (piece.pad || weather !== "clear") {
    var shiver = weather === "storm" ? looped(piece.bpm / 15, seconds) : 0;

    chart.forEach(function (c) {
      var dur = clock.at(c.to) - clock.at(c.from),
        notes = [nearest(notesOf(c.chord.root, [0], 40, 52), 46)].concat(
          voice(c.chord, null),
        );

      //spread across the room: the low notes to one side, the high to the
      //other
      var lowHalf = notes.slice(0, 2).map(hz),
        highHalf = notes.slice(2).map(hz),
        loud = weather === "storm" ? 0.7 : 0.5;

      lay(
        pad,
        strings(rnd, lowHalf, dur, loud, rate, shiver),
        sample(c.from),
        -0.4,
        0.25,
        true,
      );
      lay(
        pad,
        strings(rnd, highHalf, dur, loud, rate, shiver),
        sample(c.from),
        0.4,
        0.25,
        true,
      );
    });
  }

  //the bass
  bassLine(piece, chart, weather, rnd).forEach(function (b) {
    var dur = b.dead ? 0.06 : clock.at(b.e + b.len) - clock.at(b.e) - 0.02;

    lay(
      low,
      bass(rnd, hz(b.m), dur, b.v, rate),
      sample(b.e) + nudge(0.005),
      0,
      0.9,
      true,
    );
  });

  //the lead
  var play2 = LEADS[piece.lead],
    back = weather === "rain" ? 0.07 : 0.01;

  tuneFor(weather, tune(piece, chart, tuneRnd), piece, chart, rnd).forEach(
    function (t) {
      var dur = clock.at(t.e + t.len) - clock.at(t.e) - 0.04;

      lay(
        lead,
        play2(rnd, hz(t.m), Math.max(0.08, dur), t.v, rate),
        sample(t.e) + Math.round(back * rate) + nudge(0.008),
        -0.25,
        0.42,
        true,
      );
    },
  );

  //the drums
  var drums = kitOf(rate);

  drumming(piece, weather, bars, rnd).forEach(function (d) {
    var at = sample(d.e) + nudge(0.004),
      sound,
      pan = d.pan || 0;

    if (d.kind === "ride") {
      sound = pick(rnd, d.dark ? drums.darkRide : drums.ride);
      pan = 0.35;
    } else if (d.kind === "crash") {
      sound = pick(rnd, drums.crash);
      pan = -0.4;
    } else if (d.kind === "hat") {
      sound = pick(rnd, drums.hat);
      pan = -0.3;
    } else if (d.kind === "swish") {
      var key = d.len;

      if (!drums.swishes[key])
        drums.swishes[key] = [0, 1, 2].map(function () {
          return swish(rnd, d.len * 0.5 * clock.beat, 1, rate);
        });

      sound = pick(rnd, drums.swishes[key]);
    } else if (d.kind === "tom") {
      if (!drums.toms[d.f]) drums.toms[d.f] = drum(rnd, d.f, 1, rate, 0.35);

      sound = drums.toms[d.f];
    } else sound = pick(rnd, drums[d.kind]);

    lay(kit, sound, at, pan, 0.8 * d.v, true);
  });

  //the Rhodes swaying from ear to ear, the way its amp's tremolo has it
  var sway = looped(time === "night" ? 2.2 : 3.2, seconds);

  for (i = 0; i < n; i++) {
    var s = 0.35 * Math.sin((TAU * sway * i) / rate);

    keys[0][i] *= 1 + s;
    keys[1][i] *= 1 - s;
  }

  //a little of each to the room
  var send = buses(n),
    parts = [
      [keys, 0.3],
      [pad, 0.6],
      [lead, 0.4],
      [kit, 0.18],
      [low, 0.05],
    ];

  parts.forEach(function (p) {
    for (var c = 0; c < 2; c++)
      for (i = 0; i < n; i++) send[c][i] += p[0][c][i] * p[1];
  });

  var room = piece.room + (weather === "rain" ? 0.15 : 0),
    back2 = wet(send, rate, time === "night" ? 1.6 : 1.3, 0.45, true),
    mix = buses(n);

  for (var c = 0; c < 2; c++)
    for (i = 0; i < n; i++)
      mix[c][i] =
        keys[c][i] +
        pad[c][i] +
        low[c][i] +
        lead[c][i] +
        kit[c][i] +
        back2[c][i] * room * 2;

  return finish(mix, place, time, weather, seconds, rate, rnd);
}

/**
 * The weather's touch on the whole of it, and how loud it is: by night a
 * little duller; in the rain duller still, a tape wobbling and the crackle
 * of an old record; in a storm pushed a little harder. A rainy one is
 * quieter than a clear one and a storm louder, so a game fading from one
 * to the other hears the music settle or pick up.
 */
function finish(mix, place, time, weather, seconds, rate, rnd) {
  var n = mix[0].length,
    i,
    c;

  if (weather === "rain") {
    //the tape wobbling: read a little late, by a wavering amount, round
    //the loop
    var wob = looped(0.45, seconds),
      out = buses(n);

    for (c = 0; c < 2; c++)
      for (i = 0; i < n; i++) {
        var d = (0.004 + 0.0018 * Math.sin((TAU * wob * i) / rate)) * rate,
          r = i - d,
          i0 = Math.floor(r),
          f = r - i0;

        out[c][i] =
          mix[c][((i0 % n) + n) % n] * (1 - f) +
          mix[c][(((i0 + 1) % n) + n) % n] * f;
      }

    mix = out;

    //and the crackle
    var pops = Math.round(seconds * 6);

    for (i = 0; i < pops; i++) {
      var at = Math.floor(rnd() * n),
        a = (rnd() * 2 - 1) * between(rnd, 0.01, 0.05);

      for (var k = 0; k < 3; k++) {
        mix[0][(at + k) % n] += a * (1 - k / 3);
        mix[1][(at + k) % n] += a * (1 - k / 3);
      }
    }
  }

  var cut = weather === "rain" ? 2600 : time === "night" ? 6000 : 12000;

  for (c = 0; c < 2; c++) {
    var lp = new Biquad(rate, "lowpass", cut, 0.7),
      ch = mix[c];

    //round twice, the second time kept, so the filter has settled at the
    //seam
    for (i = 0; i < n; i++) lp.run(ch[i]);
    for (i = 0; i < n; i++) ch[i] = lp.run(ch[i]);
  }

  var rms = { clear: 0.1, rain: 0.08, storm: 0.13 }[weather],
    sum = 0;

  for (c = 0; c < 2; c++) for (i = 0; i < n; i++) sum += mix[c][i] * mix[c][i];

  var gain = rms / Math.sqrt(sum / (2 * n)),
    drive = weather === "storm" ? 1.3 : 1;

  for (c = 0; c < 2; c++)
    for (i = 0; i < n; i++)
      mix[c][i] = soft(mix[c][i] * gain * 1.1, drive * 1.1) / 1.1;

  return mix;
}

/* ------------------------------------------------------------------------
 * Every piece
 * --------------------------------------------------------------------- */

/**
 * Every piece by the name it is made by: "town/day/clear", "city/night/storm"
 * ... with its tempo, how many bars it is and how long it lasts.
 *
 * @returns {{name: string, place: string, time: string, weather: string,
 *          bpm: number, bars: number, seconds: number, lead: string}[]}
 */
export function list() {
  var out = [];

  PLACES.forEach(function (place) {
    TIMES.forEach(function (time) {
      var piece = PIECES[place][time],
        bars = chartOf(piece)[chartOf(piece).length - 1].to / 8;

      WEATHERS.forEach(function (weather) {
        out.push({
          name: place + "/" + time + "/" + weather,
          place: place,
          time: time,
          weather: weather,
          bpm: piece.bpm,
          bars: bars,
          seconds: (bars * 4 * 60) / piece.bpm,
          lead: piece.lead,
        });
      });
    });
  });

  return out;
}

/**
 * Makes a piece in a weather - the same every time. The three weathers of a
 * place and time are exactly as long as each other, bar for bar: played
 * together from the same moment, any of them can be faded up in place of
 * another.
 *
 * @param name {string} "town/night/rain", as list has them
 * @param [rate] {number} samples a second, RATE unless given
 * @returns {{rate: number, loop: boolean, bpm: number, bars: number,
 *          channels: Float32Array[]}}
 */
export function generate(name, rate) {
  var parts = name.split("/"),
    piece = PIECES[parts[0]] && PIECES[parts[0]][parts[1]];

  if (!piece || WEATHERS.indexOf(parts[2]) === -1)
    throw new Error("no such piece: " + name);

  rate = rate || RATE;

  var channels = play(parts[0], parts[1], parts[2], rate);

  return {
    rate: rate,
    loop: true,
    bpm: piece.bpm,
    bars:
      channels[0].length > 0
        ? chartOf(piece)[chartOf(piece).length - 1].to / 8
        : 0,
    channels: channels,
  };
}
