/**
 * What the sounds and the music are made with (shared/gen/sounds,
 * shared/gen/music): the plain pieces every synthesis book has - chance that
 * comes out the same for the same seed; white, pink and brown noise; one-
 * and two-pole filters (Robert Bristow-Johnson's cookbook); band-limited saw
 * and square waves (polyBLEP); soft clipping; a little Schroeder reverb for
 * the space round a sound, and a longer, denser ring - Jot's feedback delay
 * network - for the streets of a city or the trees of a wood; and the ways
 * of laying sounds into two ears, of making what loops go round without a
 * seam, and of setting how loud it all is.
 */

export var TAU = Math.PI * 2;

/* ------------------------------------------------------------------------
 * Chance
 * --------------------------------------------------------------------- */

//numbers that look random, the same ones for the same seed (mulberry32)
export function seeded(seed) {
  var s = seed >>> 0;

  return function () {
    s = (s + 0x6d2b79f5) >>> 0;

    var t = s;

    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

//a seed out of a name (FNV-1a)
export function seedOf(text) {
  var h = 2166136261;

  for (var i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }

  return h >>> 0;
}

export function between(rnd, a, b) {
  return a + rnd() * (b - a);
}

/* ------------------------------------------------------------------------
 * Noise
 * --------------------------------------------------------------------- */

//every frequency as loud as every other: hiss
export function white(rnd) {
  return function () {
    return rnd() * 2 - 1;
  };
}

//as loud in every octave: rain, wind, surf (Paul Kellet's filter)
export function pink(rnd) {
  var b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0;

  return function () {
    var w = rnd() * 2 - 1,
      out;

    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    out = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;

    return out * 0.11;
  };
}

//louder the lower it goes: rumble, a roar far off
export function brown(rnd) {
  var b = 0;

  return function () {
    b = (b + 0.02 * (rnd() * 2 - 1)) / 1.02;

    return b * 3.5;
  };
}

/**
 * A wobble that wanders smoothly between random heights, 0..1, a new one
 * about every `every` seconds - and comes round to where it started after
 * `length` seconds, for a sound that loops.
 */
export function wander(rnd, length, every) {
  var n = Math.max(2, Math.round(length / every)),
    points = [];

  for (var i = 0; i < n; i++) points.push(rnd());

  return function (t) {
    var u = (((t / length) % 1) + 1) % 1,
      x = u * n,
      i = Math.floor(x),
      f = x - i,
      a = points[i % n],
      b = points[(i + 1) % n],
      s = (1 - Math.cos(f * Math.PI)) / 2;

    return a + (b - a) * s;
  };
}

/* ------------------------------------------------------------------------
 * Filters
 * --------------------------------------------------------------------- */

//the simplest smoothing there is: a little of the difference every sample
export function OnePole(rate, freq) {
  this.rate = rate;
  this.y = 0;
  this.set(freq);
}

OnePole.prototype.set = function (freq) {
  this.a = 1 - Math.exp((-TAU * freq) / this.rate);
  return this;
};

OnePole.prototype.run = function (x) {
  this.y += this.a * (x - this.y);
  return this.y;
};

/**
 * A two-pole filter, as Robert Bristow-Johnson's cookbook has them:
 * "lowpass", "highpass" or "bandpass" (its peak as loud as what goes in).
 */
export function Biquad(rate, type, freq, q) {
  this.rate = rate;
  this.x1 = this.x2 = this.y1 = this.y2 = 0;
  this.set(type, freq, q);
}

Biquad.prototype.set = function (type, freq, q) {
  var w = (TAU * Math.min(freq, this.rate * 0.45)) / this.rate,
    cos = Math.cos(w),
    alpha = Math.sin(w) / (2 * (q || 0.707)),
    a0 = 1 + alpha,
    b0,
    b1,
    b2;

  if (type === "lowpass") {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = b0;
  } else if (type === "highpass") {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = b0;
  } else {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
  }

  this.type = type;
  this.b0 = b0 / a0;
  this.b1 = b1 / a0;
  this.b2 = b2 / a0;
  this.a1 = (-2 * cos) / a0;
  this.a2 = (1 - alpha) / a0;

  return this;
};

Biquad.prototype.run = function (x) {
  var y =
    this.b0 * x +
    this.b1 * this.x1 +
    this.b2 * this.x2 -
    this.a1 * this.y1 -
    this.a2 * this.y2;

  this.x2 = this.x1;
  this.x1 = x;
  this.y2 = this.y1;
  this.y1 = y;

  return y;
};

/* ------------------------------------------------------------------------
 * Waves
 * --------------------------------------------------------------------- */

//what takes the click out of a jump in a wave (polyBLEP): t how far into
//its cycle it is, dt how far it goes in a sample
export function blep(t, dt) {
  if (t < dt) {
    t /= dt;
    return t + t - t * t - 1;
  }

  if (t > 1 - dt) {
    t = (t - 1) / dt;
    return t * t + t + t + 1;
  }

  return 0;
}

//a wave at phase p, 0..1, going dt of a cycle a sample
export function saw(p, dt) {
  return 2 * p - 1 - blep(p, dt);
}

export function square(p, dt) {
  return (p < 0.5 ? 1 : -1) + blep(p, dt) - blep((p + 0.5) % 1, dt);
}

//soft clipping: loud stays loud, but rounded off rather than cut
export function soft(x, drive) {
  return Math.tanh(x * drive) / Math.tanh(drive);
}

/* ------------------------------------------------------------------------
 * Space
 * --------------------------------------------------------------------- */

/**
 * The room - or the sky, or the street - round a sound: four combs that
 * ring on, a little duller every time round, and two all-passes that smear
 * them into a wash (Schroeder's, as Freeverb has it). Each ear's are a
 * little longer than the other's, so the space is wide.
 *
 * @param size {number} 1 for a street, more for the open sky
 * @param damp {number} 0..1, how much duller every time round
 * @param side {number} 0 for the left, 1 for the right
 * @returns {function(number): number} what comes back of what goes in
 */
export function space(rate, size, damp, side) {
  var k = rate / 44100,
    spread = side * 23,
    combs = [1116, 1188, 1277, 1356].map(function (n) {
      return {
        buf: new Float32Array(Math.round((n + spread) * size * k)),
        i: 0,
        store: 0,
      };
    }),
    passes = [556, 341].map(function (n) {
      return { buf: new Float32Array(Math.round((n + spread) * k)), i: 0 };
    }),
    feedback = 0.84;

  return function (x) {
    var out = 0,
      c,
      y,
      j;

    for (j = 0; j < combs.length; j++) {
      c = combs[j];
      y = c.buf[c.i];
      c.store = y * (1 - damp) + c.store * damp;
      //(scaled so what comes back is about as loud as what went in)
      c.buf[c.i] = x * 0.17 + c.store * feedback;
      c.i = (c.i + 1) % c.buf.length;
      out += y;
    }

    for (j = 0; j < passes.length; j++) {
      c = passes[j];
      y = c.buf[c.i];
      c.buf[c.i] = out + y * 0.5;
      c.i = (c.i + 1) % c.buf.length;
      out = y - out;
    }

    return out;
  };
}

/**
 * A sound in the space round it, dry and wet mixed, both ears - mono in,
 * stereo out. For a loop, the sound is put through twice and the second
 * time kept: what rings on past the end of it comes in at the start.
 */
export function spaced(dry, rate, size, damp, wet, loop) {
  var n = dry.length,
    out = [new Float32Array(n), new Float32Array(n)];

  for (var side = 0; side < 2; side++) {
    var room = space(rate, size, damp, side),
      ch = out[side],
      i;

    if (loop) for (i = 0; i < n; i++) room(dry[i]);

    for (i = 0; i < n; i++)
      ch[i] = dry[i] * (1 - wet * 0.5) + room(dry[i]) * wet;
  }

  return out;
}

//spaced, for a sound already in both ears
export function spacedStereo(ch, rate, size, damp, wet, loop) {
  var l = spaced(ch[0], rate, size, damp, wet, loop),
    r = spaced(ch[1], rate, size, damp, wet, loop);

  for (var i = 0; i < l[0].length; i++) {
    l[0][i] = (l[0][i] + r[0][i] * 0.3) / 1.3;
    l[1][i] = (r[1][i] + l[1][i] * 0.3) / 1.3;
  }

  return l;
}

/* ------------------------------------------------------------------------
 * Putting it together
 * --------------------------------------------------------------------- */

//how loud each ear is, a sound put at pan, -1 left .. 1 right
export function ears(pan) {
  var a = ((pan + 1) * Math.PI) / 4;

  return [Math.cos(a), Math.sin(a)];
}

/**
 * Lays a sound into both ears at pan, from sample `at` on - round the end
 * of a loop and in again at its start, for one that loops.
 */
export function lay(ch, sound, at, pan, gain, loop) {
  var e = ears(pan),
    n = ch[0].length,
    i,
    j;

  var l = e[0] * gain,
    r = e[1] * gain,
    left = ch[0],
    right = ch[1];

  if (loop) at = ((at % n) + n) % n;

  for (i = 0, j = at; i < sound.length; i++, j++) {
    if (j >= n) {
      if (!loop) break;
      j -= n;
    }

    left[j] += sound[i] * l;
    right[j] += sound[i] * r;
  }
}

/**
 * What goes on all the time in a loop, made `over` samples longer than it
 * and the end of it faded into the start: it goes round without a seam.
 */
export function seamless(buf, n, over) {
  var out = new Float32Array(n);

  for (var i = 0; i < n; i++) out[i] = buf[i];

  for (i = 0; i < over; i++) {
    var f = i / over,
      a = Math.sin((f * Math.PI) / 2),
      b = Math.cos((f * Math.PI) / 2);

    out[i] = buf[i] * a + buf[n + i] * b;
  }

  return out;
}

//as loud at its loudest as peak
export function peak(ch, to) {
  var most = 0,
    i,
    c;

  for (c = 0; c < ch.length; c++)
    for (i = 0; i < ch[c].length; i++)
      most = Math.max(most, Math.abs(ch[c][i]));

  if (most > 0)
    for (c = 0; c < ch.length; c++)
      for (i = 0; i < ch[c].length; i++) ch[c][i] *= to / most;

  return ch;
}

//as loud on the whole as rms, the odd loud bit rounded off below 1
export function level(ch, rms) {
  var sum = 0,
    n = 0,
    i,
    c;

  for (c = 0; c < ch.length; c++)
    for (i = 0; i < ch[c].length; i++) {
      sum += ch[c][i] * ch[c][i];
      n++;
    }

  var k = sum > 0 ? rms / Math.sqrt(sum / n) : 1;

  for (c = 0; c < ch.length; c++)
    for (i = 0; i < ch[c].length; i++) {
      var x = ch[c][i] * k;

      ch[c][i] =
        Math.abs(x) < 0.7
          ? x
          : Math.sign(x) * (0.7 + 0.29 * Math.tanh((Math.abs(x) - 0.7) / 0.29));
    }

  return ch;
}

/**
 * Only what comes back from the space round a stereo sound - for a mix that
 * sends a little of each part to one shared room. For a loop, it goes
 * through twice and the second time is kept.
 */
export function wet(ch, rate, size, damp, loop) {
  var n = ch[0].length,
    out = [new Float32Array(n), new Float32Array(n)];

  for (var side = 0; side < 2; side++) {
    var room = space(rate, size, damp, side),
      src = ch[side],
      i;

    if (loop) for (i = 0; i < n; i++) room(src[i]);

    for (i = 0; i < n; i++) out[side][i] = room(src[i]);
  }

  return out;
}

//how loud on the whole, both ears together
export function rms(ch) {
  var sum = 0,
    n = 0;

  for (var c = 0; c < ch.length; c++)
    for (var i = 0; i < ch[c].length; i++) {
      sum += ch[c][i] * ch[c][i];
      n++;
    }

  return n > 0 ? Math.sqrt(sum / n) : 0;
}

export function scale(ch, k) {
  for (var c = 0; c < ch.length; c++)
    for (var i = 0; i < ch[c].length; i++) ch[c][i] *= k;

  return ch;
}

//how long each of the eight lines of ring is, in samples at 44.1 kHz: none
//a multiple of another, so they never ring together
var LINES = [1433, 1601, 1867, 2053, 2251, 2399, 2617, 2797];

/**
 * What comes back off what is round a sound - the streets of a city, the
 * trees of a wood: eight delay lines of different lengths fed back into
 * each other through a mixing matrix (Jot's feedback delay network,
 * Householder's matrix), each a little duller every time round, so what
 * goes in rings on for `seconds` as a dense, even wash - denser and longer
 * than space's. The left ear feeds and hears half the lines, the right the
 * other half. Only what comes back; it goes round twice and the second time
 * is kept, so what rings on past the end of a loop comes in at its start.
 *
 * @param seconds {number} how long until it is down by 60 dB
 * @param bright {number} Hz, how much of the top is kept every time round
 * @param size {number} how far apart what it comes back off is - 1.6 for
 *        the streets of a city
 */
export function ring(ch, rate, seconds, bright, size) {
  var n = ch[0].length,
    m = LINES.length,
    lines = LINES.map(function (len) {
      var long = Math.round(len * size * (rate / 44100));

      return {
        buf: new Float32Array(long),
        i: 0,
        //down by 60 dB after `seconds`
        keep: Math.pow(10, (-3 * long) / rate / seconds),
        dull: 0,
      };
    }),
    damp = 1 - Math.exp((-2 * Math.PI * bright) / rate),
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
 * Somewhere off - for what stands out of a loop that goes on all the time
 * --------------------------------------------------------------------- */

function clamp(x, a, b) {
  return x < a ? a : x > b ? b : x;
}

//a curve through evenly spaced points, u 0..1, smooth all the way through
//them (Catmull-Rom's)
export function through(p, u) {
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

/**
 * A sound as it is heard from r metres off, mono: duller the further - the
 * air, and the leaves in a wood, taking the top off it - as loud at its
 * loudest as `loud` (before how far off it is).
 *
 * @param clear {number} how far the top carries: Hz at 1 m
 */
export function heard(rate, sound, r, loud, clear) {
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
export function put(dry, send, sound, at, pan, r) {
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
export function again(rnd, rate, seconds, gap, make, each) {
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
