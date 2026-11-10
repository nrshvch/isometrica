/**
 * Puffs of smoke, a picture for every size a puff grows through as it rises
 * (client/components/smokeScript): "steam<f>" - white, out of a chimney -
 * "soot<f>" - black, out of an engine on fire, greyer the higher it gets -
 * "dust<f>" - the brown of the earth, kicked up where the ground is being
 * cleared (client/clearworks), paler as it settles - and "debris<f>" - the
 * grey of a building coming down, a cloud of it (client/demolition) - and
 * "fire<f>" - a fireball, white-hot yellow as it bursts out, orange, and
 * dull red going to soot as it swells (client/explosion) - and
 * "plume<f>", the black smoke of a building on fire, billowing out of it
 * and up over the city, greying as it goes (client/fires) - f from
 * 0, the smallest, as it comes out, to FRAMES - 1, as big as it gets before
 * it is gone.
 *
 * A puff is a soft round lump: a little lumpy round its edge, lit from above
 * and from the left, darker under itself, its edge broken up every other
 * pixel - thinner the bigger it has grown. How see-through it is as it
 * rises is not painted: the puff fades as it goes (smokeScript).
 *
 * It paints into plain pictures, {width, height, data} with the pixels as
 * RGBA, as it is asked for them.
 */

//how many sizes a puff grows through, and how big across each is
export var FRAMES = 6;

var SIZES = [3, 4, 5, 7, 8, 10];

//the colours, lit to in shade, of either kind - soot from as it comes out to
//as high as it gets, greyer and thinner on the way up - and its sizes, if
//not SIZES
var KINDS = {
  steam: {
    lit: [[246, 247, 249]],
    mid: [[222, 226, 232]],
    shade: [[192, 198, 208]],
  },
  soot: {
    lit: [
      [46, 44, 42],
      [92, 90, 88],
    ],
    mid: [
      [30, 28, 27],
      [72, 70, 69],
    ],
    shade: [
      [16, 15, 15],
      [54, 53, 52],
    ],
    //bigger than steam, as much more of it comes out at once
    sizes: [4, 6, 7, 9, 10, 12],
  },
  dust: {
    lit: [
      [206, 178, 136],
      [218, 204, 180],
    ],
    mid: [
      [178, 146, 104],
      [198, 182, 158],
    ],
    shade: [
      [142, 112, 80],
      [170, 154, 132],
    ],
    //a cloud of it, low and wide, spreading as it goes
    sizes: [5, 7, 9, 11, 13, 15],
  },
  debris: {
    lit: [
      [204, 201, 194],
      [214, 212, 207],
    ],
    mid: [
      [186, 183, 176],
      [200, 198, 193],
    ],
    shade: [
      [164, 160, 154],
      [184, 182, 177],
    ],
    //billowing, bigger than anything else that smokes - big from the
    //start, for a cloud of it to be one
    sizes: [14, 18, 22, 26, 31, 36],
  },
  plume: {
    lit: [
      [58, 54, 52],
      [120, 118, 116],
    ],
    mid: [
      [36, 33, 32],
      [96, 94, 93],
    ],
    shade: [
      [20, 18, 18],
      [74, 73, 72],
    ],
    //billowing, big from the start and huge as it spreads up there - and
    //not a lump but a cauliflower of them, every one lit of its own (billows)
    sizes: [18, 30, 44, 60, 78, 98],
    billows: true,
  },
  fire: {
    lit: [
      [255, 248, 196],
      [214, 96, 40],
    ],
    mid: [
      [255, 204, 84],
      [168, 62, 32],
    ],
    shade: [
      [246, 128, 36],
      [96, 40, 30],
    ],
    //bursting out big, and swelling
    sizes: [12, 18, 24, 30, 36, 42],
  },
};

//a number 0..1 for x, y and a seed, always the same for them
function hash(x, y, s) {
  var h = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;

  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;

  return (h >>> 0) / 4294967296;
}

//the colour of kind k, f of the way up (0..1), from what it has at either
//end
function colourOf(list, f) {
  if (list.length === 1) return list[0];

  var a = list[0],
    b = list[1];

  return [0, 1, 2].map(function (i) {
    return a[i] + (b[i] - a[i]) * f;
  });
}

/**
 * One picture: "steam3", "soot0".
 */
export function paint(name) {
  var m = /^(steam|soot|dust|debris|fire|plume)(\d+)$/.exec(name),
    kind = m ? KINDS[m[1]] : undefined,
    f = m ? +m[2] : -1;

  if (kind === undefined || f < 0 || f >= FRAMES)
    throw new Error("no such smoke: " + name);

  if (kind.billows) return billows(kind, f);

  var d = (kind.sizes || SIZES)[f],
    up = f / (FRAMES - 1),
    out = { width: d, height: d, data: new Uint8ClampedArray(d * d * 4) },
    r = d / 2,
    lit = colourOf(kind.lit, up),
    mid = colourOf(kind.mid, up),
    shade = colourOf(kind.shade, up);

  //a big puff is a few round lumps together, the way a cloud is
  var lumps = [[r, r, r]];

  if (d >= 7)
    lumps = [
      [r * 0.82, r * 1.12, r * 0.72],
      [r * 1.22, r * 1.05, r * 0.66],
      [r * 1.02, r * 0.72, r * 0.62],
    ];

  for (var y = 0; y < d; y++)
    for (var x = 0; x < d; x++) {
      var px = x + 0.5,
        py = y + 0.5,
        dist = Infinity;

      lumps.forEach(function (l) {
        dist = Math.min(dist, Math.hypot(px - l[0], py - l[1]) / l[2]);
      });

      if (dist > 1) continue;

      //as it thins out, high up, a pixel or two of its rim gone
      if (dist > 0.75 && up > 0.75 && hash(x, y, f) < 0.4) continue;

      var dx = px - r,
        dy = py - r;

      //lit from above and the left, in shade under itself
      var towards = (-dx * 0.6 - dy * 0.8) / r,
        c = towards > 0.25 ? lit : towards > -0.3 ? mid : shade,
        o = (y * d + x) * 4;

      out.data[o] = c[0];
      out.data[o + 1] = c[1];
      out.data[o + 2] = c[2];
      out.data[o + 3] = 255;
    }

  return out;
}

/**
 * A puff of a kind that billows (plume): a heap of round lumps of every
 * size, rolled over each other - the ones to the front and up over the rest
 * - every one lit from above and the left on its own and darker where it
 * tucks in under the next, so it reads as smoke rolling over itself; its
 * edge broken, more so the higher it is.
 */
function billows(kind, f) {
  var d = kind.sizes[f],
    up = f / (FRAMES - 1),
    r = d / 2,
    out = { width: d, height: d, data: new Uint8ClampedArray(d * d * 4) },
    tones = [
      colourOf(kind.shade, up),
      colourOf(kind.mid, up),
      colourOf(kind.lit, up),
    ],
    //a lump in the middle, one ring of them round it and another round
    //that, smaller - lower down drawn first, the ones up top over them
    lumps = [[r, r * 1.05, r * 0.5]],
    rings = d >= 26 ? 2 : 1,
    k,
    i;

  for (k = 0; k < rings; k++) {
    var n = k === 0 ? 6 : 9,
      far = k === 0 ? 0.42 : 0.68,
      big = k === 0 ? 0.36 : 0.25;

    for (i = 0; i < n; i++) {
      var a = ((i + hash(i, k, f + 7) * 0.6) / n) * Math.PI * 2,
        reach = r * far * (0.85 + 0.3 * hash(i, k, f + 11));

      lumps.push([
        r + Math.cos(a) * reach,
        r + Math.sin(a) * reach * 0.9,
        r * big * (0.8 + 0.45 * hash(i, k, f + 13)),
      ]);
    }
  }

  //the bottom first, the top over it
  lumps.sort(function (a, b) {
    return b[1] - a[1];
  });

  for (var y = 0; y < d; y++)
    for (var x = 0; x < d; x++) {
      var px = x + 0.5,
        py = y + 0.5,
        on = -1;

      for (i = lumps.length - 1; i >= 0; i--)
        if (Math.hypot(px - lumps[i][0], py - lumps[i][1]) < lumps[i][2]) {
          on = i;
          break;
        }

      if (on < 0) continue;

      var l = lumps[on],
        dx = (px - l[0]) / l[2],
        dy = (py - l[1]) / l[2],
        edge = Math.hypot(dx, dy),
        //its rim, high up and thinning, broken
        rim = Math.hypot(px - r, py - r) / r;

      if (rim > 0.8 && hash(x, y, f + 3) < 0.25 + 0.35 * up) continue;

      //lit from above and the left on the lump, and the whole of it
      //darker underneath; tucked in dark at its own edge low down
      var lit =
          -dx * 0.55 -
          dy * 0.85 -
          ((py - r) / r) * 0.6 -
          (edge > 0.8 && dy > 0 ? 0.6 : 0),
        //dithered between one tone and the next
        t = lit + (((x + y) & 1) === 0 ? 0.12 : -0.12),
        c = tones[t > 0.35 ? 2 : t > -0.4 ? 1 : 0],
        o = (y * d + x) * 4;

      out.data[o] = c[0];
      out.data[o + 1] = c[1];
      out.data[o + 2] = c[2];
      out.data[o + 3] = 255;
    }

  return out;
}

/**
 * What paint paints, without painting it: every picture by name, and how big.
 */
export function describe() {
  var sizes = {};

  Object.keys(KINDS).forEach(function (kind) {
    var list = KINDS[kind].sizes || SIZES;

    for (var f = 0; f < FRAMES; f++)
      sizes[kind + f] = { w: list[f], h: list[f] };
  });

  return sizes;
}
