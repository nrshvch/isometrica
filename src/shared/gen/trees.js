/**
 * Paints the broadleaf trees of the grassland - the ones the world grows on
 * its own, and the ones a city has planted - the way the buildings are
 * painted, out of the same boxes (shared/gen/isobox) lit by the same sun:
 * each a trunk, and a crown of a few round puffs, each one laid out in thin
 * columns the way a tree in a garden is (blocks round) - so a tree in a wood
 * looks like the trees in the gardens, only bigger, and as plainly coloured
 * as the houses round it.
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
 * The boxes cast no shadow on the ground, so a tree's is put in under it
 * after: the ground the puffs keep a high sun off, darkened - short, so that
 * it stays under the tree rather than across the next tile.
 */
import * as iso from "./isobox.js";
import { box, free, round, TILE } from "./blocks.js";

var W = 80,
  H = 72,
  //where the foot of the tree is in the picture: the middle of its tile
  PIVOT_X = 38,
  PIVOT_Y = 60;

//the sun the shadow is cast by: the boxes' (isobox SUN), only higher, so the
//shadow falls short
var SHADOW_SUN = normalize([-0.22, 0.18, 1]);
var SHADOW_ALPHA = 0.3;

//how far a column of a crown is lighter or darker than the next, as in the
//gardens' trees
var GRAIN = 0.07;

function normalize(v) {
  var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

  return [v[0] / l, v[1] / l, v[2] / l];
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

//every kind: the colour of its leaves and its bark; its trunk; and how its
//puffs are heaped, given a random number source - each [x, y, z, r] off the
//foot of the tree
var KINDS = {
  oak: {
    leaves: [40, 96, 34],
    bark: [96, 72, 52],
    trunk: { height: 16, radius: 1.5 },
    grow: function (r) {
      var puffs = [[0, 0, 26, 9]],
        n = 6;

      for (var i = 0; i < n; i++) {
        var a = (2 * Math.PI * (i + 0.4 * r())) / n,
          d = 8 + 3 * r();

        puffs.push([
          Math.cos(a) * d,
          Math.sin(a) * d,
          20 + 7 * r(),
          5.5 + 2 * r(),
        ]);
      }
      puffs.push([r() * 4 - 2, r() * 4 - 2, 32, 6]);

      return puffs;
    },
  },

  beech: {
    leaves: [56, 118, 40],
    bark: [138, 138, 130],
    trunk: { height: 12, radius: 1.5 },
    grow: function (r) {
      var puffs = [[0, 0, 23, 10]],
        n = 5;

      for (var i = 0; i < n; i++) {
        var a = (2 * Math.PI * (i + 0.3 * r())) / n,
          d = 6 + 2 * r();

        puffs.push([
          Math.cos(a) * d,
          Math.sin(a) * d,
          16 + 8 * r(),
          6.5 + 2 * r(),
        ]);
      }
      puffs.push([0, 0, 30, 7]);

      return puffs;
    },
  },

  ash: {
    leaves: [86, 130, 48],
    bark: [110, 106, 96],
    trunk: { height: 17, radius: 1 },
    grow: function (r) {
      var puffs = [],
        n = 7;

      for (var i = 0; i < n; i++) {
        var a = (2 * Math.PI * (i + 0.4 * r())) / n,
          d = 6 + 3 * r();

        puffs.push([
          Math.cos(a) * d,
          Math.sin(a) * d,
          19 + 8 * r(),
          4.5 + 1.5 * r(),
        ]);
      }
      puffs.push([0, 0, 26, 6]);
      puffs.push([r() * 3, -r() * 3, 32, 5]);

      return puffs;
    },
  },

  alder: {
    leaves: [32, 82, 50],
    bark: [84, 74, 64],
    trunk: { height: 30, radius: 1 },
    grow: function (r) {
      var puffs = [],
        //up the trunk, each puff smaller than the one under it
        tiers = [
          [16, 7, 4],
          [24, 6, 3],
          [31, 5, 2],
          [37, 4, 1],
          [42, 2.5, 0],
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
            t[1] * 0.75,
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
    puffs: k.grow(random(seed)).map(function (p) {
      return [p[0] * scale, p[1] * scale, p[2] * scale, p[3] * scale];
    }),
    //into the crown, so that it does not end in mid air between puffs
    trunk: (k.trunk.height + 6) * scale,
  };
}

/**
 * The boxes of a tree standing in the middle of its tile: its trunk, and
 * every puff of its crown round, in columns - each a ball, a little flatter
 * underneath.
 */
function boxesOf(tree) {
  var b = [],
    mid = TILE / 2,
    t = tree.kind.trunk.radius;

  b.push(
    box(mid - t, mid + t, mid - t, mid + t, 0, tree.trunk, tree.kind.bark),
  );

  tree.puffs.forEach(function (p) {
    var r = p[3];

    round(
      b,
      mid + p[0],
      mid + p[1],
      r,
      tree.kind.leaves,
      GRAIN,
      function (u, v) {
        var d = (u * u + v * v) / (r * r);

        if (d >= 1) return null;

        var k = Math.sqrt(1 - d);

        return [p[2] - r * k * 0.8, p[2] + r * k, u, v, r * k];
      },
    );
  });

  return b;
}

//whether a ray from o along d meets any of the puffs
function shaded(tree, o, d) {
  return tree.puffs.some(function (p) {
    var ox = o[0] - p[0],
      oy = o[1] - p[1],
      oz = o[2] - p[2],
      b = ox * d[0] + oy * d[1] + oz * d[2],
      c = ox * ox + oy * oy + oz * oz - p[3] * p[3];

    return b < 0 && b * b - c >= 0;
  });
}

/* --- Painting -------------------------------------------------------- */

/**
 * The picture of a tree, its foot at PIVOT_X, PIVOT_Y: the boxes, and its
 * shadow on the ground round them.
 */
function paintTree(tree) {
  var picture = free(boxesOf(tree)),
    painted = iso.toImage(picture),
    data = new Uint8ClampedArray(W * H * 4),
    ox = PIVOT_X - picture.pivotX,
    oy = PIVOT_Y - picture.pivotY,
    px,
    py,
    k;

  for (py = 0; py < H; py++) {
    for (px = 0; px < W; px++) {
      var x = px - ox,
        y = py - oy;

      k = (py * W + px) * 4;

      if (x >= 0 && y >= 0 && x < painted.width && y < painted.height) {
        var s = (y * painted.width + x) * 4;

        if (painted.data[s + 3] > 0) {
          data.set(painted.data.subarray(s, s + 4), k);
          continue;
        }
      }

      //the point on the ground drawn at this pixel, off the foot of the
      //tree (isobox project: x - y across, -(x + y) / 2 - z down)
      var sx = px + 0.5 - PIVOT_X,
        sy = py + 0.5 - PIVOT_Y;

      if (
        shaded(tree, [(sx - 2 * sy) / 2, (-sx - 2 * sy) / 2, 0.1], SHADOW_SUN)
      )
        data[k + 3] = Math.round(SHADOW_ALPHA * 255);
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
