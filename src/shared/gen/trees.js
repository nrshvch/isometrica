/**
 * Paints the broadleaf trees of the grassland - the ones the world grows on
 * its own, and the ones a city has planted - the way the two trees the game
 * started with were drawn by hand: a crown heaped up out of a few big round
 * puffs of leaves, each one shaded round, lit along its edge where the sun
 * catches it and dark in the crease under the puff in front of it, in strong
 * greens with a fine grain of pixels over them; a short trunk under it, and
 * its shadow on the ground. Seen from the angle the boxes of shared/gen/isobox
 * are, a unit a pixel, and lit by their sun, so that a tree stands among the
 * houses as if it were one of them.
 *
 *   - oak: a short thick trunk under a broad crown, wider than it is tall,
 *     of big puffs heaped unevenly; deep green;
 *   - beech: a smooth grey trunk under a dense round dome that comes down
 *     low; a fresher green;
 *   - ash: a taller trunk under an open crown of smaller puffs; yellow-green;
 *   - alder: slim, puffs stacked into a narrow crown tapering to a point;
 *     dark, bluish green.
 *
 * Each comes in two, grown from different seeds. None is turned: a tree
 * looks much the same from every side, and the camera turning round
 * (client/view) shows the same picture.
 *
 * A ray goes into the tree for every pixel, along the way the boxes are
 * looked at, and meets the nearest puff - a sphere, exactly - or the trunk.
 * Where it meets the ground instead it is in the tree's shadow, or nothing:
 * the shadow is short, the sun for it higher than the one for the light, so
 * that it stays under the tree rather than across the next tile.
 */

var W = 64,
  H = 72,
  //where the foot of the tree is in the picture: the middle of its tile
  PIVOT_X = 28,
  PIVOT_Y = 60;

//the boxes' sun (isobox SUN), x and y along the tile, z up
var SUN = normalize([-0.45, 0.35, 1]);
//the sun the shadow is cast by: higher, so it falls short
var SHADOW_SUN = normalize([-0.22, 0.18, 1]);
var SHADOW_ALPHA = 0.4;

//the way every ray goes into the picture: where isobox project() has a
//point stay put
var VIEW = normalize([1, 1, -1]);

//how many pixels under the edge of a puff in front of it a puff is in its
//shade, and how dark that is
var CREASE = 2,
  CREASE_DARK = 0.62;

function normalize(v) {
  var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

  return [v[0] / l, v[1] / l, v[2] / l];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function mix(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

//a colour along stops dark to light, t 0..1
function ramp(stops, t) {
  t = clamp(t, 0, 1) * (stops.length - 1);

  var i = Math.min(stops.length - 2, Math.floor(t));

  return mix(stops[i], stops[i + 1], t - i);
}

//0..1, the same for the same numbers
function hash(x, y, z) {
  var h =
    Math.imul(x | 0, 0x27d4eb2d) ^
    Math.imul(y | 0, 0x165667b1) ^
    Math.imul(z | 0, 0x9e3779b1);

  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);

  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* --- The kinds ------------------------------------------------------- */

//every kind: its leaves, darkest to lightest, and its bark; its trunk; and
//how its puffs are heaped, given a random number source - each [x, y, z, r]
var KINDS = {
  oak: {
    leaves: [
      [0, 40, 6],
      [0, 72, 9],
      [0, 96, 12],
      [34, 128, 28],
      [96, 170, 64],
    ],
    bark: [
      [56, 40, 28],
      [86, 64, 42],
      [116, 90, 60],
    ],
    trunk: { height: 16, radius: 2.4 },
    grow: function (r) {
      var puffs = [[0, 0, 26, 10]],
        n = 6;

      for (var i = 0; i < n; i++) {
        var a = (2 * Math.PI * (i + 0.4 * r())) / n,
          d = 9 + 3 * r();

        puffs.push([
          Math.cos(a) * d,
          Math.sin(a) * d,
          20 + 8 * r(),
          6.5 + 2.5 * r(),
        ]);
      }
      puffs.push([r() * 4 - 2, r() * 4 - 2, 33 + 2 * r(), 7]);

      return puffs;
    },
  },

  beech: {
    leaves: [
      [6, 50, 12],
      [14, 84, 20],
      [24, 112, 30],
      [70, 150, 48],
      [140, 196, 90],
    ],
    bark: [
      [96, 98, 96],
      [132, 134, 130],
      [170, 170, 164],
    ],
    trunk: { height: 12, radius: 2 },
    grow: function (r) {
      var puffs = [[0, 0, 24, 11]],
        n = 5;

      for (var i = 0; i < n; i++) {
        var a = (2 * Math.PI * (i + 0.3 * r())) / n,
          d = 7 + 2 * r();

        puffs.push([
          Math.cos(a) * d,
          Math.sin(a) * d,
          16 + 9 * r(),
          7.5 + 2 * r(),
        ]);
      }
      puffs.push([0, 0, 32, 8]);

      return puffs;
    },
  },

  ash: {
    leaves: [
      [24, 60, 12],
      [48, 94, 22],
      [72, 122, 32],
      [118, 158, 56],
      [176, 200, 104],
    ],
    bark: [
      [64, 62, 56],
      [90, 88, 80],
      [118, 114, 104],
    ],
    trunk: { height: 17, radius: 1.8 },
    grow: function (r) {
      var puffs = [],
        n = 7;

      for (var i = 0; i < n; i++) {
        var a = (2 * Math.PI * (i + 0.4 * r())) / n,
          d = 6 + 4 * r();

        puffs.push([
          Math.cos(a) * d,
          Math.sin(a) * d,
          19 + 9 * r(),
          5 + 1.5 * r(),
        ]);
      }
      puffs.push([0, 0, 26, 7]);
      puffs.push([r() * 3, -r() * 3, 33, 5.5]);

      return puffs;
    },
  },

  alder: {
    leaves: [
      [0, 36, 18],
      [4, 62, 30],
      [12, 86, 40],
      [44, 118, 62],
      [100, 160, 104],
    ],
    bark: [
      [52, 46, 42],
      [76, 68, 60],
      [102, 92, 82],
    ],
    trunk: { height: 30, radius: 1.5 },
    grow: function (r) {
      var puffs = [],
        //up the trunk, each puff smaller than the one under it
        tiers = [
          [17, 7.5, 4.5],
          [25, 6.5, 3.5],
          [32, 5.5, 2.5],
          [38, 4.5, 1],
          [43, 3, 0],
        ];

      tiers.forEach(function (t, k) {
        var a = 2 * Math.PI * r();

        puffs.push([
          Math.cos(a) * t[2] * 0.5,
          Math.sin(a) * t[2] * 0.5,
          t[0],
          t[1],
        ]);
        if (t[2] > 0)
          puffs.push([
            -Math.cos(a) * t[2],
            -Math.sin(a) * t[2],
            t[0] - 2 + k * 0.5,
            t[1] * 0.8,
          ]);
      });

      return puffs;
    },
  },
};

//how many of each kind there are
var EACH = 2;

export var NAMES = [];

Object.keys(KINDS).forEach(function (kind) {
  for (var v = 1; v <= EACH; v++) NAMES.push(kind + "-" + v);
});

/* --- A tree ---------------------------------------------------------- */

function random(seed) {
  var i = 0;

  return function () {
    return hash(seed, i++, 7919);
  };
}

/**
 * A tree of a kind, grown from a seed: its puffs and its trunk, a little
 * bigger or smaller than the next one.
 */
function grow(kind, seed) {
  var k = KINDS[kind],
    scale = 0.9 + 0.14 * hash(seed, 1, 3);

  return {
    kind: k,
    seed: seed,
    puffs: k.grow(random(seed)).map(function (p) {
      return [p[0] * scale, p[1] * scale, p[2] * scale, p[3] * scale];
    }),
    trunk: {
      //into the crown, so that it does not end in mid air between puffs
      height: (k.trunk.height + 8) * scale,
      radius: k.trunk.radius * scale,
    },
  };
}

/**
 * Where along a ray from o along d it first meets the tree: {t, part, n} -
 * part the puff it meets, or -1 for the trunk, n the way the surface looks
 * there - or null.
 */
function hit(tree, o, d) {
  var best = null,
    i;

  for (i = 0; i < tree.puffs.length; i++) {
    var p = tree.puffs[i],
      ox = o[0] - p[0],
      oy = o[1] - p[1],
      oz = o[2] - p[2],
      b = ox * d[0] + oy * d[1] + oz * d[2],
      c = ox * ox + oy * oy + oz * oz - p[3] * p[3],
      disc = b * b - c;

    if (disc < 0) continue;

    var t = -b - Math.sqrt(disc);

    if (t > 0 && (best === null || t < best.t))
      best = {
        t: t,
        part: i,
        n: [
          (ox + d[0] * t) / p[3],
          (oy + d[1] * t) / p[3],
          (oz + d[2] * t) / p[3],
        ],
      };
  }

  //the trunk: upright, round, from the ground
  var tr = tree.trunk,
    a = d[0] * d[0] + d[1] * d[1],
    bb = o[0] * d[0] + o[1] * d[1],
    cc = o[0] * o[0] + o[1] * o[1] - tr.radius * tr.radius,
    dd = bb * bb - a * cc;

  if (a > 0 && dd >= 0) {
    var tt = (-bb - Math.sqrt(dd)) / a,
      z = o[2] + d[2] * tt;

    if (tt > 0 && z >= 0 && z <= tr.height && (best === null || tt < best.t))
      best = {
        t: tt,
        part: -1,
        n: normalize([o[0] + d[0] * tt, o[1] + d[1] * tt, 0]),
      };
  }

  return best;
}

/* --- Painting -------------------------------------------------------- */

/**
 * The picture of a tree: a ray for every pixel, along the way the boxes are
 * looked at, from in front of the tree - painted as the tree is lit where it
 * meets it, or as its shadow where it meets the ground in it.
 */
function paintTree(tree) {
  var data = new Uint8ClampedArray(W * H * 4),
    back = 90,
    hits = new Array(W * H),
    k = tree.kind,
    px,
    py,
    i;

  for (py = 0; py < H; py++) {
    for (px = 0; px < W; px++) {
      //the point on the ground that is drawn at this pixel (isobox project:
      //x - y across, -(x + y) / 2 - z down)
      var sx = px + 0.5 - PIVOT_X,
        sy = py + 0.5 - PIVOT_Y,
        g = [(sx - 2 * sy) / 2, (-sx - 2 * sy) / 2, 0],
        o = [
          g[0] - VIEW[0] * back,
          g[1] - VIEW[1] * back,
          g[2] - VIEW[2] * back,
        ],
        h = hit(tree, o, VIEW);

      i = py * W + px;
      hits[i] = h;

      if (h === null && hit(tree, [g[0], g[1], 0.1], SHADOW_SUN) !== null)
        data[i * 4 + 3] = Math.round(SHADOW_ALPHA * 255);
    }
  }

  //whether the pixel is just under the edge of a puff nearer the eye: in its
  //shade, the crease between the two
  function creased(px, py, h) {
    for (var dy = -CREASE; dy <= 0; dy++)
      for (var dx = -1; dx <= 1; dx++) {
        var x = px + dx,
          y = py + dy;

        if ((dx === 0 && dy === 0) || x < 0 || y < 0 || x >= W) continue;

        var o = hits[y * W + x];

        if (o !== null && o.part >= 0 && o.part !== h.part && o.t < h.t - 1)
          return true;
      }

    return false;
  }

  for (py = 0; py < H; py++) {
    for (px = 0; px < W; px++) {
      i = py * W + px;

      var h = hits[i];

      if (h === null) continue;

      var sun = dot(h.n, SUN),
        grainy = hash(px, py, tree.seed + 77) - 0.5,
        colour;

      if (h.part < 0) colour = ramp(k.bark, 0.35 + 0.55 * sun + grainy * 0.2);
      else {
        //round, lit from the sun's side, dark round the far side of it
        var light = 0.3 + 0.5 * sun,
          //how square on to the eye the surface is: low at the edge
          facing = -dot(h.n, VIEW);

        //the edge the sun catches, a band lighter round it
        if (facing < 0.42 && sun > 0.35) light += 0.28;

        if (creased(px, py, h)) light *= CREASE_DARK;

        colour = ramp(k.leaves, light + grainy * 0.2);
      }

      data[i * 4] = colour[0];
      data[i * 4 + 1] = colour[1];
      data[i * 4 + 2] = colour[2];
      data[i * 4 + 3] = 255;
    }
  }

  return { width: W, height: H, data: data };
}

/**
 * Every tree, by sprite name - "gen/trees/oak-1" - with its size and where
 * its foot is in it, without painting it.
 */
export function describe() {
  var sizes = {};

  NAMES.forEach(function (name) {
    sizes["gen/trees/" + name] = {
      w: W,
      h: H,
      pivotX: PIVOT_X,
      pivotY: PIVOT_Y,
    };
  });

  return { sizes: sizes, data: { names: NAMES } };
}

/**
 * One tree, by sprite name.
 *
 * @returns {{width, height, data}}
 */
export function paint(name) {
  var m = /^gen\/trees\/([a-z]+)-(\d+)$/.exec(name);

  if (m === null || KINDS[m[1]] === undefined)
    throw new Error("no such tree: " + name);

  return paintTree(grow(m[1], hashSeed(m[1]) + +m[2] * 101));
}

function hashSeed(s) {
  var h = 0;

  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;

  return Math.abs(h) % 10000;
}

export { W, H, PIVOT_X, PIVOT_Y };
