/**
 * Paints the broadleaf trees of the grassland - the ones the world grows on
 * its own, and the ones a city has planted - as pixel art in the manner of
 * the buildings: a tree's own shape, the way that kind grows, filled in with
 * three flat greens - in shade, in the light, and where the sun catches it
 * - and two browns or greys for the wood, lit by the boxes' sun
 * (shared/gen/isobox), with no grain, dithering or speckle over them.
 *
 *   - oak: a short thick trunk under a broad crown, wider than it is tall,
 *     heaped up out of big uneven lobes; dark green;
 *   - beech: a smooth grey trunk under a dense dome that comes down low;
 *     a fresher green;
 *   - ash: a tall open crown of small clumps on branches that show between
 *     them; grey-green, light;
 *   - alder: slim, a narrow crown tapering to a point; dark green.
 *
 * Each comes in two, grown from different seeds, and each of those is
 * painted from its four sides - "gen/trees/oak-1", "gen/trees/oak-1/r1" - so
 * that the camera turning round (client/view) sees another side of it, and
 * two trees of the same seed side by side need not show the same one
 * (data/trees turned).
 *
 * A tree is a trunk, a few branches and a crown of lobes, each a distance
 * from a point - the crown lumpy with a few big clumps of leaves, so its
 * outline is a tree's. A ray goes into it for every pixel, along the way the
 * boxes are looked at, and where it meets it the light there picks one of
 * the tones outright; a pixel of one tone alone among another is then given
 * the other, so every tone lies in patches, as drawn by hand. Where the ray
 * meets the ground instead it is in the tree's shadow, or nothing: the
 * shadow is short, the sun for it higher than the one for the light, so that
 * it stays under the tree rather than across the next tile.
 */
import * as Looks from "./looks.js";

var W = 80,
  H = 72,
  //where the foot of the tree is in the picture: the middle of its tile
  PIVOT_X = 38,
  PIVOT_Y = 60;

//the boxes' sun (isobox SUN), x and y along the tile, z up
var SUN = normalize([-0.45, 0.35, 1]);
//the sun the shadow is cast by: higher, so it falls short
var SHADOW_SUN = normalize([-0.22, 0.18, 1]);
var SHADOW_ALPHA = 0.12;

//the way every ray goes into the picture: where isobox project() has a
//point stay put
var VIEW = normalize([1, 1, -1]);

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

//smooth noise, 0..1, a blob every unit
function noise(x, y, z) {
  var ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z),
    fx = x - ix,
    fy = y - iy,
    fz = z - iz,
    u = fx * fx * (3 - 2 * fx),
    v = fy * fy * (3 - 2 * fy),
    w = fz * fz * (3 - 2 * fz);

  function at(dx, dy, dz) {
    return hash(ix + dx, iy + dy, iz + dz);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  return lerp(
    lerp(
      lerp(at(0, 0, 0), at(1, 0, 0), u),
      lerp(at(0, 1, 0), at(1, 1, 0), u),
      v,
    ),
    lerp(
      lerp(at(0, 0, 1), at(1, 0, 1), u),
      lerp(at(0, 1, 1), at(1, 1, 1), u),
      v,
    ),
    w,
  );
}

//a limb from a to b, ra thick at a and rb at b: how far p is from it
function limb(p, a, b, ra, rb) {
  var ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
    ap = [p[0] - a[0], p[1] - a[1], p[2] - a[2]],
    t = clamp(dot(ap, ab) / dot(ab, ab), 0, 1),
    dx = ap[0] - ab[0] * t,
    dy = ap[1] - ab[1] * t,
    dz = ap[2] - ab[2] * t;

  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * t);
}

//two shapes run into each other over k, rather than meeting in a crease
function smoothMin(a, b, k) {
  var h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1);

  return b + (a - b) * h - k * h * (1 - h);
}

/* --- The kinds ------------------------------------------------------- */

//every kind: its colours, leaves dark to light and bark dark to light; and
//how it grows, given a random number source - the trunk, its branches and
//the lobes of its crown, each lobe [x, y, z, rx, ry, rz]
var KINDS = {
  oak: {
    leaves: [
      [24, 52, 22],
      [38, 72, 28],
      [56, 94, 34],
      [82, 120, 44],
      [118, 150, 62],
    ],
    bark: [
      [52, 42, 34],
      [78, 64, 50],
      [104, 88, 70],
    ],
    //lumps of leaves: how big, and how far they stand out
    clump: 0.3,
    bumps: 1.7,
    grow: function (r) {
      var lobes = [[0, 0, 25, 13, 13, 9]],
        n = 6;

      for (var i = 0; i < n; i++) {
        var a = (2 * Math.PI * (i + 0.4 * r())) / n,
          d = 8 + 3 * r();

        lobes.push([
          Math.cos(a) * d,
          Math.sin(a) * d,
          21 + 9 * r(),
          6 + 3 * r(),
          6 + 3 * r(),
          5 + 2 * r(),
        ]);
      }

      return {
        trunk: { height: 18, foot: 2.6, top: 1.8, lean: [0.6, -0.4] },
        branches: branchesTo(lobes, 14, 1.3, 0.6),
        lobes: lobes,
      };
    },
  },

  beech: {
    leaves: [
      [28, 64, 26],
      [44, 88, 32],
      [66, 114, 40],
      [98, 144, 52],
      [140, 178, 74],
    ],
    bark: [
      [92, 94, 92],
      [128, 130, 126],
      [164, 164, 158],
    ],
    clump: 0.34,
    bumps: 1.2,
    grow: function (r) {
      var lobes = [[0, 0, 23, 12, 12, 12]],
        n = 5;

      for (var i = 0; i < n; i++) {
        var a = (2 * Math.PI * (i + 0.3 * r())) / n,
          d = 6 + 2 * r();

        lobes.push([
          Math.cos(a) * d,
          Math.sin(a) * d,
          16 + 10 * r(),
          7 + 2 * r(),
          7 + 2 * r(),
          7 + 2 * r(),
        ]);
      }

      return {
        trunk: { height: 14, foot: 2, top: 1.5, lean: [0, 0] },
        branches: [],
        lobes: lobes,
      };
    },
  },

  ash: {
    leaves: [
      [40, 66, 36],
      [58, 88, 46],
      [80, 112, 56],
      [110, 140, 72],
      [150, 174, 100],
    ],
    bark: [
      [74, 74, 68],
      [104, 104, 96],
      [136, 134, 124],
    ],
    clump: 0.36,
    bumps: 1.9,
    grow: function (r) {
      var lobes = [],
        n = 8;

      for (var i = 0; i < n; i++) {
        var a = (2 * Math.PI * (i + 0.4 * r())) / n,
          d = 6 + 4 * r(),
          up = i === n - 1;

        lobes.push([
          up ? 0 : Math.cos(a) * d,
          up ? 0 : Math.sin(a) * d,
          up ? 36 : 21 + 12 * r(),
          4.5 + 1.5 * r(),
          4.5 + 1.5 * r(),
          4 + 1.5 * r(),
        ]);
      }

      return {
        trunk: { height: 22, foot: 1.9, top: 1.1, lean: [-0.3, 0.2] },
        branches: branchesTo(lobes, 13, 0.9, 0.4),
        lobes: lobes,
      };
    },
  },

  alder: {
    leaves: [
      [22, 50, 28],
      [34, 70, 36],
      [50, 92, 44],
      [74, 118, 54],
      [108, 146, 72],
    ],
    bark: [
      [50, 44, 40],
      [74, 66, 58],
      [100, 90, 80],
    ],
    clump: 0.4,
    bumps: 1.3,
    grow: function (r) {
      var lobes = [
          [0, 0, 22, 8, 8, 10],
          [0, 0, 33, 6, 6, 8],
          [0, 0, 42, 3.5, 3.5, 5],
        ],
        n = 4;

      for (var i = 0; i < n; i++) {
        var a = (2 * Math.PI * (i + 0.4 * r())) / n;

        lobes.push([
          Math.cos(a) * 4.5,
          Math.sin(a) * 4.5,
          17 + 14 * r(),
          4 + 1.5 * r(),
          4 + 1.5 * r(),
          5 + 2 * r(),
        ]);
      }

      return {
        trunk: { height: 34, foot: 1.6, top: 0.8, lean: [0, 0] },
        branches: [],
        lobes: lobes,
      };
    },
  },
};

//a branch from the trunk out to every lobe off the middle
function branchesTo(lobes, from, ra, rb) {
  var out = [];

  lobes.forEach(function (l) {
    if (Math.abs(l[0]) + Math.abs(l[1]) < 3) return;

    out.push({
      from: [l[0] * 0.15, l[1] * 0.15, from],
      to: [l[0] * 0.8, l[1] * 0.8, l[2] - l[5] * 0.3],
      ra: ra,
      rb: rb,
    });
  });

  return out;
}

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
 * A tree of a kind, grown from a seed: shape(p) is how far p is from it - and
 * which part it is nearest, in part.
 */
/**
 * A plan turned a quarter turn `turns` times, the way client/view turns what
 * is seen: (x, y) to (y, -x) each time.
 */
function turnPlan(plan, turns) {
  function at(x, y) {
    for (var i = 0; i < turns; i++) {
      var t = x;

      x = y;
      y = -t;
    }

    return [x, y];
  }

  function point(p) {
    var q = at(p[0], p[1]);

    return [q[0], q[1], p[2]];
  }

  return {
    trunk: {
      height: plan.trunk.height,
      foot: plan.trunk.foot,
      top: plan.trunk.top,
      lean: at(plan.trunk.lean[0], plan.trunk.lean[1]),
    },
    branches: plan.branches.map(function (b) {
      return { from: point(b.from), to: point(b.to), ra: b.ra, rb: b.rb };
    }),
    lobes: plan.lobes.map(function (l) {
      var q = at(l[0], l[1]),
        odd = turns & 1;

      return [q[0], q[1], l[2], odd ? l[4] : l[3], odd ? l[3] : l[4], l[5]];
    }),
  };
}

function grow(kind, seed, turns) {
  var k = KINDS[kind],
    plan = turnPlan(k.grow(random(seed)), turns || 0),
    //the tree's own way round, for its clumps to be where they are on it
    //whichever side it is seen from
    back = function (x, y) {
      for (var i = 0; i < (turns || 0); i++) {
        var t = y;

        y = x;
        x = -t;
      }

      return [x, y];
    },
    trunk = plan.trunk,
    top = [trunk.lean[0], trunk.lean[1], trunk.height],
    //smaller ones and bigger ones
    scale = 0.88 + 0.16 * hash(seed, 1, 3),
    tree = { part: "leaves" };

  function crown(p) {
    var d = Infinity;

    plan.lobes.forEach(function (l) {
      var dx = (p[0] - l[0]) / l[3],
        dy = (p[1] - l[1]) / l[4],
        dz = (p[2] - l[2]) / l[5],
        //an ellipsoid's, near enough, in the units of its smallest radius
        e =
          (Math.sqrt(dx * dx + dy * dy + dz * dz) - 1) *
          Math.min(l[3], l[4], l[5]);

      d = d === Infinity ? e : smoothMin(d, e, 2.5);
    });

    //lumpy with clumps of leaves
    var c = k.clump,
      o = back(p[0], p[1]);

    return (
      d + k.bumps * (noise(o[0] * c, o[1] * c, p[2] * c + seed * 13) - 0.5) * 2
    );
  }

  tree.shape = function (q) {
    var p = [q[0] / scale, q[1] / scale, q[2] / scale],
      wood = limb(p, [0, 0, -1], top, trunk.foot, trunk.top);

    plan.branches.forEach(function (b) {
      wood = Math.min(wood, limb(p, b.from, b.to, b.ra, b.rb));
    });

    var leaves = crown(p);

    tree.part = leaves < wood ? "leaves" : "bark";

    return Math.min(leaves, wood) * scale;
  };

  tree.kind = k;
  tree.seed = seed;

  return tree;
}

/* --- Painting -------------------------------------------------------- */

//how far along a ray it first meets the tree, or -1
function march(tree, origin, dir, far) {
  var t = 0;

  for (var i = 0; i < 160 && t < far; i++) {
    var d = tree.shape([
      origin[0] + dir[0] * t,
      origin[1] + dir[1] * t,
      origin[2] + dir[2] * t,
    ]);

    if (d < 0.05) return t;

    //lumpy shapes are stepped into carefully
    t += Math.max(0.08, d * 0.7);
  }

  return -1;
}

function normalAt(tree, p) {
  var e = 0.35;

  return normalize([
    tree.shape([p[0] + e, p[1], p[2]]) - tree.shape([p[0] - e, p[1], p[2]]),
    tree.shape([p[0], p[1] + e, p[2]]) - tree.shape([p[0], p[1] - e, p[2]]),
    tree.shape([p[0], p[1], p[2] + e]) - tree.shape([p[0], p[1], p[2] - e]),
  ]);
}

//how much of the sky a point sees: less deep in among the leaves
function openness(tree, p, n) {
  var shade = 0;

  for (var i = 1; i <= 4; i++) {
    var h = i * 1.2;

    shade +=
      (h - tree.shape([p[0] + n[0] * h, p[1] + n[1] * h, p[2] + n[2] * h])) /
      Math.pow(2, i);
  }

  return clamp(1 - 0.4 * shade, 0.25, 1);
}

//which of three tones a light 0..1 is: in shade, in the light, or where
//the sun catches it
function toneOf(light) {
  return light < 0.36 ? 0 : light < 0.66 ? 1 : 2;
}

/**
 * The picture of a tree: a ray for every pixel, along the way the boxes are
 * looked at, from in front of the tree - painted as the tree is lit where it
 * meets it, or as its shadow where it meets the ground in it.
 */
function paintTree(tree, look) {
  var faces = look === "faces",
    data = new Uint8ClampedArray(W * H * 4),
    //for its faces (shared/gen/looks): which way every pixel looks the most
    //- 0 towards -x, 1 -y, 2 up - each pixel's light then the light that
    //falls that way, as it is drawn
    sides = new Int8Array(W * H).fill(2),
    back = 90,
    //for every pixel: -1 nothing, else the part and tone, part * 3 + tone -
    //leaves 0, bark 1
    tones = new Int8Array(W * H).fill(-1),
    //and how high it is there, for the height picture
    zs = look === "height" ? new Float32Array(W * H) : null,
    leaves = [tree.kind.leaves[1], tree.kind.leaves[2], tree.kind.leaves[3]],
    bark = [tree.kind.bark[0], tree.kind.bark[1], tree.kind.bark[2]],
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
        origin = [
          g[0] - VIEW[0] * back,
          g[1] - VIEW[1] * back,
          g[2] - VIEW[2] * back,
        ],
        t = march(tree, origin, VIEW, back);

      i = py * W + px;

      if (t >= 0) {
        var p = [
          origin[0] + VIEW[0] * t,
          origin[1] + VIEW[1] * t,
          origin[2] + VIEW[2] * t,
        ];

        tree.shape(p);
        if (zs !== null) zs[i] = p[2];

        var part = tree.part === "leaves" ? 0 : 1,
          n = normalAt(tree, p),
          sun = Math.max(0, dot(n, SUN)),
          open = openness(tree, p, n),
          //lit as it is drawn, the tone is only how far into the leaves it
          //is; the light on it comes with the face it looks most towards
          light = faces ? 0.15 + 0.85 * open : (0.15 + 0.85 * sun) * open;

        if (faces) sides[i] = mostOf(Looks.weights(n));

        //the trunk is never caught by the sun the way the leaves are
        tones[i] = part * 3 + Math.min(toneOf(light), part ? 1 : 2);
      } else if (march(tree, [g[0], g[1], 0.2], SHADOW_SUN, 70) >= 0)
        data[i * 4 + 3] = Math.round(SHADOW_ALPHA * 255);
    }
  }

  //a pixel of a tone alone among another tone of the same part takes that
  //one - twice over, so the odd pair goes too
  for (var pass = 0; pass < 2; pass++) {
    var next = tones.slice();

    for (py = 1; py < H - 1; py++)
      for (px = 1; px < W - 1; px++) {
        i = py * W + px;

        var own = tones[i];

        if (own < 0) continue;

        var count = {},
          best = own,
          most = 0;

        [i - 1, i + 1, i - W, i + W].forEach(function (j) {
          var o = tones[j];

          if (o < 0 || ((o / 3) | 0) !== ((own / 3) | 0)) return;

          count[o] = (count[o] || 0) + 1;
          if (count[o] > most) {
            most = count[o];
            best = o;
          }
        });

        if (best !== own && most >= 3 && !count[own]) next[i] = best;
      }

    tones = next;
    if (faces) sides = alone(sides, tones);
  }

  if (look === "faces" || look === "night")
    return sideBySide(data, tones, sides, leaves, bark, look);

  //how high every pixel of it is - its shadow on the ground not at all - and
  //the whole of it in white (shared/gen/looks HEIGHT)
  if (look === "height") {
    var out = Looks.blank(W, H, Looks.HEIGHT);

    for (i = 0; i < W * H; i++) {
      var a = tones[i] < 0 ? data[i * 4 + 3] : 255;

      if (a === 0) continue;
      Looks.put(
        out,
        W,
        0,
        i % W,
        (i / W) | 0,
        Looks.height1(tones[i] < 0 ? 0 : zs[i]),
        a,
      );
      Looks.put(out, W, 1, i % W, (i / W) | 0, [255, 255, 255], a);
    }

    return out;
  }

  for (i = 0; i < W * H; i++) {
    if (tones[i] < 0) continue;

    var c = tones[i] < 3 ? leaves[tones[i]] : bark[tones[i] - 3];

    data[i * 4] = c[0];
    data[i * 4 + 1] = c[1];
    data[i * 4 + 2] = c[2];
    data[i * 4 + 3] = 255;
  }

  return { width: W, height: H, data: data };
}

/**
 * Every tree from every side, by sprite name - "gen/trees/oak-1",
 * "gen/trees/oak-1/r1" - with its size and where
 * its foot is in it, without painting it.
 */
export function describe() {
  var sizes = {};

  NAMES.forEach(function (name) {
    [0, 1, 2, 3].forEach(function (turns) {
      sizes["gen/trees/" + name + (turns ? "/r" + turns : "")] = {
        w: W,
        h: H,
        pivotX: PIVOT_X,
        pivotY: PIVOT_Y,
      };
    });
  });

  return { sizes: sizes, data: { names: NAMES } };
}

/**
 * One tree, by sprite name.
 *
 * @returns {{width, height, data}}
 */
export function paint(name, look) {
  var m = /^gen\/trees\/([a-z]+)-(\d+)(?:\/r([123]))?$/.exec(name);

  if (m === null || KINDS[m[1]] === undefined)
    throw new Error("no such tree: " + name);

  return paintTree(
    grow(m[1], hashSeed(m[1]) + +m[2] * 101, +(m[3] || 0)),
    look,
  );
}

//which of three it is most of
function mostOf(w) {
  return w[0] >= w[1] && w[0] >= w[2] ? 0 : w[1] >= w[2] ? 1 : 2;
}

//a pixel looking a way none of the pixels round it of the same part do
//takes the way most of them look - as a tone alone among another does
function alone(sides, tones) {
  var next = sides.slice();

  for (var py = 1; py < H - 1; py++)
    for (var px = 1; px < W - 1; px++) {
      var i = py * W + px,
        count = [0, 0, 0],
        same = 0;

      if (tones[i] < 0) continue;

      [i - 1, i + 1, i - W, i + W].forEach(function (j) {
        if (tones[j] < 0 || ((tones[j] / 3) | 0) !== ((tones[i] / 3) | 0))
          return;
        count[sides[j]]++;
        if (sides[j] === sides[i]) same++;
      });

      var m = mostOf(count);

      if (same === 0 && count[m] >= 3) next[i] = m;
    }

  return next;
}

/**
 * The tree's pictures side by side (shared/gen/looks): its faces, every
 * pixel of it in its tone on the picture of the way it looks the most and
 * black on the others; or for the night, nothing of it shining and all of
 * it black - its shadow, as see-through as it is, on all of them.
 */
function sideBySide(data, tones, sides, leaves, bark, look) {
  var n = look === "faces" ? 3 : Looks.NIGHT,
    out = Looks.blank(W, H, n),
    i,
    k;

  for (i = 0; i < W * H; i++) {
    var px = i % W,
      py = (i / W) | 0;

    if (tones[i] < 0) {
      //its shadow on the ground
      if (data[i * 4 + 3] > 0)
        for (k = 0; k < n; k++)
          Looks.put(out, W, k, px, py, [0, 0, 0], data[i * 4 + 3]);
      continue;
    }

    var c = tones[i] < 3 ? leaves[tones[i]] : bark[tones[i] - 3];

    for (k = 0; k < n; k++)
      Looks.put(
        out,
        W,
        k,
        px,
        py,
        look === "faces" && k === sides[i] ? c : [0, 0, 0],
      );
  }

  return out;
}

function hashSeed(s) {
  var h = 0;

  for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;

  return Math.abs(h) % 10000;
}

export { W, H, PIVOT_X, PIVOT_Y };
