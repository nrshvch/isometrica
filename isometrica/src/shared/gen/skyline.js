/**
 * The city heard from high above it - from a tall roof, or the sky over it -
 * the way the city map of an old management game sounded (Pizza Tycoon's,
 * as remembered), and the way a real city does: a hum, not a cartoon.
 *
 * What makes it sound real is mostly how much of it there is and how far off
 * it all is. Thousands of engines and tyres too far off to tell apart add up
 * to a steady roar, loudest low down and falling off above, each octave of
 * it a little louder and quieter as the traffic moves, the top of it soaked
 * up by the air on the way up - further off than a couple of hundred metres
 * nothing stands out of it. Out of that, a few dozen nearer vehicles rise
 * over many seconds and sink back: cars mostly the rush of their tyres,
 * lorries and buses the thud of their engines, a bus pulling away through
 * its gears, the hiss of its brakes. And horns - real ones, a diaphragm
 * buzzing through a trumpet, often two a third apart, tapped, leaned on, or
 * answering each other in a jam - each coming back off the buildings. All of
 * it in the long echo of streets between tall walls: a feedback delay
 * network (Jot's), denser and longer than the little reverb of the cartoon
 * sounds.
 *
 * Nothing here is laid in from the other sounds - the cars and horns are
 * their own models - only the plain pieces (noise, filters, laying sounds
 * into the ears, seamless loops) come from dsp.js. It loops, seamlessly,
 * the way the forest and the sea do.
 */

import {
  seeded,
  seedOf,
  between,
  white,
  pink,
  wander,
  OnePole,
  Biquad,
  soft,
  ears,
  lay,
  seamless,
  peak,
  level,
} from "./dsp.js";

//how fast sound goes, metres a second - for the pitch of what goes by
var SOUND = 343;

/**
 * How long a loop of each is, how loud the roar of the town under it, how
 * many cars, lorries and buses come up out of it, how many times a bus's
 * brakes hiss, how many horns go on their own and how many jams of them,
 * how hard the wind blows up here, and how long the streets ring on.
 */
var SKYLINES = [
  //day
  {
    seconds: 36,
    roar: 1,
    cars: 24,
    lorries: 8,
    buses: 3,
    brakes: 3,
    horns: 6,
    jams: 1,
    wind: 0.25,
    ring: 2.2,
  },
  //rush hour
  {
    seconds: 36,
    roar: 1.35,
    cars: 34,
    lorries: 10,
    buses: 5,
    brakes: 5,
    horns: 9,
    jams: 3,
    wind: 0.2,
    ring: 2.2,
  },
  //night
  {
    seconds: 36,
    roar: 0.4,
    cars: 8,
    lorries: 3,
    buses: 0,
    brakes: 0,
    horns: 1,
    jams: 0,
    wind: 0.45,
    ring: 2.6,
  },
];

//how loud the roar of the whole town is in each octave, by its middle: a
//city's noise is loudest round 60-250 Hz and falls off above, and from up
//high the air takes even more of the top off
var OCTAVES = [
  [40, 0.8],
  [80, 1],
  [160, 0.9],
  [320, 0.5],
  [640, 0.22],
  [1280, 0.09],
  [2560, 0.03],
  [5120, 0.01],
];

//how loud the nearest of each is next to the roar of a day: a vehicle at
//its nearest, a horn, a bus's brakes - all as loud as this at 30 m, and
//quieter the further off
var LOUD = { vehicle: 0.35, horn: 1.3, brakes: 0.45 };

function clamp(x, a, b) {
  return x < a ? a : x > b ? b : x;
}

//how much of the top is left of something r metres off - taken by the air,
//and by the buildings in the way
function airAt(r) {
  return clamp(200000 / r, 600, 7000);
}

//smoothly up from nothing at the start, and back down to it at the end
function fade(u, edge) {
  var s = clamp(Math.min(u, 1 - u) / edge, 0, 1);

  return s * s * (3 - 2 * s);
}

//how loud on the whole, both ears together
function rms(ch) {
  var sum = 0,
    n = 0;

  for (var c = 0; c < ch.length; c++)
    for (var i = 0; i < ch[c].length; i++) {
      sum += ch[c][i] * ch[c][i];
      n++;
    }

  return n > 0 ? Math.sqrt(sum / n) : 0;
}

function scale(ch, k) {
  for (var c = 0; c < ch.length; c++)
    for (var i = 0; i < ch[c].length; i++) ch[c][i] *= k;

  return ch;
}

/* ------------------------------------------------------------------------
 * The roar of the town
 * --------------------------------------------------------------------- */

/**
 * The whole town at once, both ears, each its own noise: an octave at a
 * time, each wandering a little louder and quieter on its own, so the roar
 * moves without ever stopping. As loud on the whole as `loud`.
 */
function roar(tag, rate, n, over, seconds, loud) {
  var ch = [];

  for (var side = 0; side < 2; side++) {
    var rnd = seeded(seedOf(tag + " roar " + side)),
      source = pink(rnd),
      bands = OCTAVES.map(function (o) {
        return {
          filter: new Biquad(rate, "bandpass", o[0], 1.4),
          loud: o[1],
          moves: wander(rnd, seconds, between(rnd, 2, 7)),
          now: o[1],
        };
      }),
      buf = new Float32Array(n + over),
      i,
      k;

    for (i = 0; i < n + over; i++) {
      if (i % 64 === 0)
        for (k = 0; k < bands.length; k++)
          bands[k].now =
            bands[k].loud * (0.65 + 0.7 * bands[k].moves(i / rate));

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
 * The wind up here: soft and low, in gusts, a little different in each ear.
 */
function wind(tag, rate, n, over, seconds, loud) {
  var ch = [],
    gust = wander(seeded(seedOf(tag + " gusts")), seconds, 3);

  for (var side = 0; side < 2; side++) {
    var air = pink(seeded(seedOf(tag + " wind " + side))),
      lp = new Biquad(rate, "lowpass", 300, 0.7),
      band = new Biquad(rate, "bandpass", 500, 0.8),
      buf = new Float32Array(n + over);

    for (var i = 0; i < n + over; i++) {
      var g = gust(i / rate + side * 0.4);

      if (i % 64 === 0) band.set("bandpass", 250 + 500 * g, 0.8);

      var a = air();

      buf[i] = (lp.run(a) * 0.8 + band.run(a) * 0.6 * g) * (0.3 + 0.7 * g);
    }

    ch.push(seamless(buf, n, over));
  }

  return scale(ch, loud / (rms(ch) || 1));
}

/* ------------------------------------------------------------------------
 * What goes by
 * --------------------------------------------------------------------- */

/**
 * A car, a lorry or a bus going by somewhere below, both ears: it comes up
 * out of the roar over many seconds and sinks back into it, brighter as it
 * comes nearer, from one side towards the other, its pitch a little higher
 * coming than going. A car is mostly the rush of its tyres on the road;
 * a lorry or a bus mostly its engine - the thud of each cylinder firing,
 * never quite steady. A bus pulls away through its gears.
 *
 * @returns {{ch: Float32Array[], near: number}} and how near it came, metres
 */
function vehicle(rnd, rate, kind) {
  var heavy = kind !== "car",
    bus = kind === "bus",
    near = between(rnd, 45, 200),
    speed = bus ? between(rnd, 3, 6) : between(rnd, 8, 15),
    seconds = clamp((4 * near) / speed, 6, 12),
    n = Math.round(seconds * rate),
    //cylinders firing a second: a diesel's slow thud, a car's hum
    fire = heavy ? between(rnd, 26, 42) : between(rnd, 50, 90),
    engine = heavy ? 1 : 0.35,
    tyres = heavy ? 0.4 : 0.75,
    hiss = pink(rnd),
    grit = white(rnd),
    tread = new Biquad(rate, "bandpass", between(rnd, 450, 850), 0.7),
    body = new Biquad(rate, "lowpass", heavy ? 200 : 320, 1.1),
    pipe = new Biquad(rate, "bandpass", heavy ? 110 : 180, 2.5),
    air = new Biquad(rate, "lowpass", 4000, 0.7),
    still = new Biquad(rate, "highpass", 25, 0.7),
    //(what changes slowly is worked out every 64 samples, not every one)
    waver = new OnePole(rate / 64, 6),
    centre = between(rnd, -0.8, 0.8),
    across = between(rnd, 0.2, 0.7) * (rnd() < 0.5 ? -1 : 1),
    gears = between(rnd, 2.2, 3.2),
    phase = 0,
    step = 0,
    dies = 1,
    knock = 0,
    turn = 1,
    g = 0,
    pan = ears(centre),
    out = [new Float32Array(n), new Float32Array(n)];

  for (var i = 0; i < n; i++) {
    if (i % 64 === 0) {
      var t = i / rate,
        u = t / seconds,
        x = speed * (t - seconds / 2),
        r = Math.sqrt(near * near + x * x);

      g = (near / r) * fade(u, 0.12);
      air.set("lowpass", airAt(r), 0.7);
      pan = ears(clamp(centre + across * (2 * u - 1), -1, 1));

      //how hard the engine turns: a bus pulling off up through its gears,
      //the rest about steady; a little higher coming than going
      turn = bus ? 0.65 + 0.75 * Math.pow((u * gears) % 1, 0.7) : 1;
      step =
        (fire *
          turn *
          (SOUND / (SOUND + (speed * x) / r)) *
          (1 + 0.2 * waver.run(grit()))) /
        rate;
      dies = Math.exp(-10 * step);
    }

    //each firing a knock dying away, rough with the burning in it
    phase += step;
    if (phase >= 1) {
      phase -= 1;
      knock = 1;
    }
    knock *= dies;

    var bang = (knock - 0.1) * (0.7 + 0.6 * grit()),
      y =
        engine *
          (body.run(bang) + pipe.run(bang) * 0.5) *
          (bus ? 0.6 + 0.5 * turn : 1) +
        tyres * tread.run(hiss()) * 1.5,
      z = still.run(air.run(y)) * g;

    out[0][i] = z * pan[0];
    out[1][i] = z * pan[1];
  }

  return { ch: out, near: near };
}

/**
 * A bus's brakes letting off air - pssht - mono.
 */
function brakes(rnd, rate) {
  var n = Math.round(0.9 * rate),
    out = new Float32Array(n),
    hiss = white(rnd),
    hp = new Biquad(rate, "highpass", 1200, 0.7),
    band = new Biquad(rate, "bandpass", between(rnd, 2500, 4000), 0.7),
    long = between(rnd, 0.18, 0.32);

  for (var i = 0; i < n; i++) {
    var t = i / rate,
      env =
        Math.min(1, t / 0.008) *
        (0.4 * Math.exp(-t / 0.04) + Math.exp(-t / long)) *
        fade(t / (0.9 + 1e-9), 0.05);

    out[i] = band.run(hp.run(hiss())) * env;
  }

  return out;
}

/* ------------------------------------------------------------------------
 * Horns
 * --------------------------------------------------------------------- */

/**
 * How a driver sounds the horn - [start, how long] in seconds: a tap, two,
 * leaning on it, tap-tap-and-lean, or lean-and-tap-tap.
 */
function honking(rnd) {
  var k = Math.floor(rnd() * 5),
    a = between(rnd, 0.1, 0.16);

  if (k === 0) return [[0, between(rnd, 0.12, 0.22)]];
  if (k === 1)
    return [
      [0, a],
      [a + between(rnd, 0.08, 0.14), between(rnd, 0.12, 0.18)],
    ];
  if (k === 2) return [[0, between(rnd, 0.6, 1.5)]];
  if (k === 3)
    return [
      [0, a],
      [0.24, a],
      [0.48, between(rnd, 0.5, 0.9)],
    ];

  var lean = between(rnd, 0.4, 0.7);

  return [
    [0, lean],
    [lean + 0.14, a],
    [lean + 0.38, a],
  ];
}

/**
 * A car's horn, mono: its diaphragm slapping at the note - sharp clicks,
 * rich in harmonics - through the trumpet's resonance, often two of them a
 * third or so apart. Each note takes a moment to get going, and none is
 * quite steady.
 */
function horn(rnd, rate, notes) {
  var two = rnd() < 0.7,
    tones = two ? [between(rnd, 330, 480)] : [between(rnd, 360, 520)],
    trumpet = new Biquad(rate, "bandpass", between(rnd, 1800, 2800), 1.8),
    low = new Biquad(rate, "lowpass", 3000, 0.7),
    waver = new OnePole(rate, 20),
    grit = white(rnd),
    last = notes[notes.length - 1],
    n = Math.round((last[0] + last[1] + 0.08) * rate),
    out = new Float32Array(n),
    phases = [0, 0];

  if (two) tones.push(tones[0] * between(rnd, 1.18, 1.27));

  for (var i = 0; i < n; i++) {
    var t = i / rate,
      env = 0,
      into = 1;

    for (var j = 0; j < notes.length; j++) {
      var s = t - notes[j][0],
        long = notes[j][1];

      if (s >= 0 && s < long + 0.05) {
        env = Math.min(1, s / 0.01) * (s > long ? 1 - (s - long) / 0.05 : 1);
        into = s;
      }
    }

    var bend =
        (1 - 0.07 * Math.exp(-into / 0.02)) * (1 + 0.6 * waver.run(grit())),
      x = 0;

    for (var k = 0; k < tones.length; k++) {
      phases[k] += (tones[k] * bend) / rate;
      if (phases[k] >= 1) phases[k] -= 1;
      x += Math.exp(-phases[k] * 18) - 1 / 18;
    }

    out[i] = soft((trumpet.run(x) * 3 + low.run(x) * 0.6) * env, 1.4);
  }

  return out;
}

/**
 * Something heard from `far` metres off laid into the loop round `pan`,
 * duller the further, as loud as LOUD says at its loudest - and coming back
 * off the buildings round about a few times, later, quieter and duller each
 * time, from here and there.
 */
function echoing(ch, rnd, rate, sound, at, pan, far, loud) {
  var air = new Biquad(rate, "lowpass", airAt(far), 0.7),
    top = 0,
    i;

  for (i = 0; i < sound.length; i++) {
    sound[i] = air.run(sound[i]);
    top = Math.max(top, Math.abs(sound[i]));
  }

  var k = top > 0 ? (loud * 30) / far / top : 0,
    back = 0.08;

  lay(ch, sound, at, pan, k, true);

  for (var b = 0; b < 4; b++) {
    var dull = new OnePole(rate, 1800 - b * 300),
      copy = new Float32Array(sound.length);

    back += between(rnd, 0.05, 0.14);

    for (i = 0; i < sound.length; i++) copy[i] = dull.run(sound[i]);

    lay(
      ch,
      copy,
      at + Math.round(back * rate),
      clamp(pan + between(rnd, -0.5, 0.5), -1, 1),
      k * 0.42 * Math.pow(0.6, b),
      true,
    );
  }
}

/* ------------------------------------------------------------------------
 * The streets ringing on
 * --------------------------------------------------------------------- */

//how long each of the eight lines is, in samples at 44.1 kHz: none a
//multiple of another, so they never ring together
var LINES = [1433, 1601, 1867, 2053, 2251, 2399, 2617, 2797];

/**
 * What comes back off the streets of a city: eight delay lines of different
 * lengths fed back into each other through a mixing matrix (Jot's feedback
 * delay network, Householder's matrix), each a little duller every time
 * round, so what goes in rings on for `ring` seconds as a dense, even wash.
 * The left ear feeds and hears half the lines, the right the other half.
 * Only what comes back; it goes round twice and the second time is kept, so
 * what rings on past the end of the loop comes in at its start.
 */
function streets(ch, rate, ring) {
  var n = ch[0].length,
    m = LINES.length,
    lines = LINES.map(function (len) {
      var size = Math.round(len * 1.6 * (rate / 44100));

      return {
        buf: new Float32Array(size),
        i: 0,
        //down by 60 dB after `ring` seconds
        keep: Math.pow(10, (-3 * size) / rate / ring),
        dull: 0,
      };
    }),
    damp = 1 - Math.exp((-2 * Math.PI * 3500) / rate),
    taken = new Float64Array(m),
    out = [new Float32Array(n), new Float32Array(n)];

  for (var pass = 0; pass < 2; pass++)
    for (var i = 0; i < n; i++) {
      var sum = 0,
        l = 0,
        r = 0,
        j,
        line;

      for (j = 0; j < m; j++) {
        line = lines[j];

        var y = line.buf[line.i];

        if (j % 2 === 0) l += y;
        else r += y;

        line.dull += damp * (y - line.dull);
        taken[j] = line.dull * line.keep;
        sum += taken[j];
      }

      sum *= 2 / m;

      for (j = 0; j < m; j++) {
        line = lines[j];
        line.buf[line.i] = taken[j] - sum + ch[j % 2][i] * 0.5;
        line.i = (line.i + 1) % line.buf.length;
      }

      out[0][i] = l * 0.5;
      out[1][i] = r * 0.5;
    }

  return out;
}

/* ------------------------------------------------------------------------
 * The skyline
 * --------------------------------------------------------------------- */

function skyline(rnd, variant, rate) {
  var sk = SKYLINES[variant],
    tag = "skyline " + variant,
    n = Math.round(sk.seconds * rate),
    over = Math.round(1.5 * rate),
    //(the roar of a day is the measure of everything else)
    base = 0.1,
    bed = roar(tag, rate, n, over, sk.seconds, base * sk.roar),
    air = wind(tag, rate, n, over, sk.seconds, base * sk.wind),
    traffic = [new Float32Array(n), new Float32Array(n)],
    loud = [new Float32Array(n), new Float32Array(n)],
    kinds = [],
    i,
    c;

  for (i = 0; i < sk.cars; i++) kinds.push("car");
  for (i = 0; i < sk.lorries; i++) kinds.push("lorry");
  for (i = 0; i < sk.buses; i++) kinds.push("bus");

  //what goes by, here and there round the loop
  kinds.forEach(function (kind) {
    var v = vehicle(rnd, rate, kind),
      at = Math.floor(rnd() * n);

    peak(v.ch, (LOUD.vehicle * 30) / v.near);
    lay(traffic, v.ch[0], at, -1, Math.SQRT2, true);
    lay(traffic, v.ch[1], at, 1, Math.SQRT2, true);
  });

  //horns on their own
  for (i = 0; i < sk.horns; i++)
    echoing(
      loud,
      rnd,
      rate,
      horn(rnd, rate, honking(rnd)),
      Math.floor(rnd() * n),
      between(rnd, -0.85, 0.85),
      between(rnd, 80, 320),
      LOUD.horn,
    );

  //and jams: a few cars in the same street leaning on them, one after
  //another
  for (i = 0; i < sk.jams; i++) {
    var at = Math.floor(rnd() * n),
      where = between(rnd, -0.6, 0.6),
      far = between(rnd, 100, 260),
      count = 2 + Math.floor(rnd() * 3);

    for (var h = 0; h < count; h++)
      echoing(
        loud,
        rnd,
        rate,
        horn(rnd, rate, honking(rnd)),
        at + Math.round(between(rnd, 0, 3.5) * rate),
        clamp(where + between(rnd, -0.25, 0.25), -1, 1),
        far * between(rnd, 0.85, 1.2),
        LOUD.horn,
      );
  }

  //a bus's brakes now and then
  for (i = 0; i < sk.brakes; i++)
    echoing(
      loud,
      rnd,
      rate,
      brakes(rnd, rate),
      Math.floor(rnd() * n),
      between(rnd, -0.8, 0.8),
      between(rnd, 60, 200),
      LOUD.brakes,
    );

  //the streets ringing with all of it - the horns most, the roar of the
  //town least (it is all echo already)
  var send = [new Float32Array(n), new Float32Array(n)];

  for (c = 0; c < 2; c++)
    for (i = 0; i < n; i++)
      send[c][i] = bed[c][i] * 0.15 + traffic[c][i] * 0.4 + loud[c][i];

  var back = streets(send, rate, sk.ring);

  scale(back, (0.6 * rms(send)) / (rms(back) || 1));

  var ch = [new Float32Array(n), new Float32Array(n)];

  for (c = 0; c < 2; c++)
    for (i = 0; i < n; i++)
      ch[c][i] =
        bed[c][i] + air[c][i] + traffic[c][i] + loud[c][i] + back[c][i];

  return level(ch, 0.12);
}

/**
 * The skyline as sounds.js lists its sounds: how many ways it comes, that
 * it loops, and what each way of it is.
 */
export var SKYLINE = {
  loop: true,
  make: skyline,
  ways: ["day", "rush hour", "night"],
};
