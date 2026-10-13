/**
 * Puffs of smoke, a picture for every size a puff grows through as it rises
 * (client/components/smokeScript): "steam<f>" - white, out of a chimney -
 * and "soot<f>" - black, out of an engine on fire, greyer the higher it gets
 * - f from 0, the smallest, as it comes out, to FRAMES - 1, as big as it gets
 * before it is gone.
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
//as high as it gets, greyer and thinner on the way up
var KINDS = {
  steam: {
    lit: [[246, 247, 249]],
    mid: [[222, 226, 232]],
    shade: [[192, 198, 208]],
  },
  soot: {
    lit: [
      [82, 78, 74],
      [120, 117, 114],
    ],
    mid: [
      [58, 55, 52],
      [98, 96, 94],
    ],
    shade: [
      [36, 34, 33],
      [76, 75, 74],
    ],
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
  var m = /^(steam|soot)(\d+)$/.exec(name),
    kind = m ? KINDS[m[1]] : undefined,
    f = m ? +m[2] : -1;

  if (kind === undefined || f < 0 || f >= FRAMES)
    throw new Error("no such smoke: " + name);

  var d = SIZES[f],
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
 * What paint paints, without painting it: every picture by name, and how big.
 */
export function describe() {
  var sizes = {};

  Object.keys(KINDS).forEach(function (kind) {
    for (var f = 0; f < FRAMES; f++)
      sizes[kind + f] = { w: SIZES[f], h: SIZES[f] };
  });

  return sizes;
}
