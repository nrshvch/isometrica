/**
 * Stones lying about on the ground, a tile's worth of them to a picture -
 * the thick of a rock field ("stone": five grey boulders together) and its
 * thin edges ("stone0": three brownish ones strewn about) - and each the
 * other way round ("-m"), for the same few not to show twice the same. Each
 * of those is painted from its four sides as well - "stone/r1" a quarter
 * turn round, as the camera turning round (client/view) sees it, the way
 * the trees are (data/trees turned).
 *
 * Every stone is a lump: a rounded, flattish boulder, its top lumpy with
 * noise. A ray goes into the picture for every pixel, along the way the boxes
 * are looked at, and where it meets a stone the stone is lit there by the
 * boxes' sun - picking one of four tones outright, the way it would be drawn
 * by hand - its lower edge darkened a little to stand out against the grass.
 * Where the ray meets the ground in a stone's shadow, the shadow is laid
 * there as black, see-through; everywhere else there is nothing, so the
 * stones lie on whatever ground the tile is.
 *
 * And what a building comes down to (client/demolition): a heap of rubble
 * on every tile of it till the bulldozer pushes it away - a low mound of
 * dusty grey debris ("rubble", "rubble0"), and on it, piled any which way,
 * slabs of concrete, broken brick and splintered timber: flat-topped and
 * sharp-edged, the lumps a stone is but squared off.
 *
 * And the heaps a building blown up leaves (client/explosion, data/buildings
 * rubble), which run on into the heaps on the tiles next to them as one
 * pile ("pile/<rubble>/<mask>"): its mound, a ridge on to every tile next
 * to it along a side with a heap of its own, and where four heaps meet at a
 * corner, a mound over it too - each tile's picture its own square of it,
 * so that tiles side by side meet where they join. A pile lies on the
 * ground as it is, not levelled: on a tile that slopes, its picture is of
 * it on that slope ("pile/<rubble>/<mask>/<slope>"), the corners of the
 * tile as high as they are and the tile folded along the diagonal the
 * ground's own picture is (shared/gen/terrain fold) - taller than a stone's
 * by as much as a tile can rise, PILE_RISE.
 *
 * Every picture is the size of a tile of the ground, its middle where the
 * tile's is (data/rocks: pivot 32, 24). It paints into plain pictures,
 * {width, height, data} with the pixels as RGBA, as it is asked for them.
 */

//the picture: a tile's worth, and where the middle of the tile is on it - so
//that a point x, y along the tile (0..32) and z up stands at OX + x - y,
//OY - (x + y) / 2 - z
var W = 64,
  H = 47,
  OX = 32,
  OY = 40,
  TILE = 32;

//how far up the picture a step of the ground is, pixels (shared/gen/terrain
//HEIGHT_STEP), and how far a tile's corners can rise over its lowest one,
//steps - a pile's picture taller by as much, and the middle of its tile as
//much further down it
var GROUND_STEP = 8,
  PILE_RISE = 2;

//the boxes' sun (isobox SUN), and the one the shadows are cast by - higher,
//so they fall short, under the stones
var SUN = normalize([-0.45, 0.35, 1]),
  SHADOW_SUN = normalize([-0.6, 0.45, 0.65]),
  SHADOW_ALPHA = 0.3;

//as high as a stone can stand, and how finely a ray is followed down to it
var TALLEST = 12,
  STEP = 0.2;

//the colours of the stones, light to dark, by what they are
var GREY = [
    [178, 178, 172],
    [150, 150, 146],
    [118, 118, 116],
    [88, 88, 88],
  ],
  BROWN = [
    [168, 152, 132],
    [140, 125, 108],
    [110, 98, 86],
    [80, 72, 64],
  ],
  //rubble: the dust and grit it lies in, and what it is broken out of
  DEBRIS = [
    [166, 160, 150],
    [144, 138, 129],
    [116, 111, 104],
    [88, 85, 80],
  ],
  CONCRETE = [
    [190, 188, 182],
    [162, 160, 154],
    [128, 127, 123],
    [96, 95, 93],
  ],
  BRICK = [
    [182, 106, 84],
    [152, 86, 68],
    [120, 68, 54],
    [88, 51, 41],
  ],
  TIMBER = [
    [156, 122, 86],
    [128, 99, 68],
    [99, 76, 53],
    [72, 55, 39],
  ];

//what is on each picture: how many stones, in what colours, how big round
//(along the tile) and how high
var PLANS = {
  stone: {
    count: 5,
    colours: GREY,
    size: [2.2, 4],
    high: [3.5, 6.5],
    seed: 11,
  },
  stone0: {
    count: 3,
    colours: BROWN,
    size: [3.2, 4.8],
    high: [4, 6.5],
    seed: 23,
  },
  //rubble: a mound, how big round and how high, and the pieces piled on it
  //any which way - each of one of the colours - flat on top
  rubble: {
    mound: { r: 13, high: 4.6, colours: DEBRIS },
    count: 24,
    palettes: [CONCRETE, CONCRETE, BRICK, BRICK, TIMBER],
    size: [1.2, 3],
    high: [1.4, 3.6],
    blocky: true,
    seed: 41,
  },
  rubble0: {
    mound: { r: 12, high: 3.8, colours: DEBRIS },
    count: 20,
    palettes: [CONCRETE, CONCRETE, CONCRETE, BRICK, TIMBER],
    size: [1.3, 3.2],
    high: [1.2, 3.2],
    blocky: true,
    seed: 53,
  },
};

//the tiles next to a heap that a pile runs on into, as its mask has them:
//its sides, -x, -y, +x, +y, then its corners, -x-y, +x-y, +x+y, -x+y -
//corner k between sides k and k + 1, and only ever where both of them run
//on, for it to make any odds
var SIDES = [
    [-1, 0],
    [0, -1],
    [1, 0],
    [0, 1],
  ],
  CORNERS = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];

//how wide a ridge from one heap to the next is, either side of the line
//between their middles, and how big round the mound where four meet -
//short of the tiles round them that have none
var RIDGE = 12,
  MEET = 14;

/**
 * Every slope a tile can have, as a pile's picture is named by it: how many
 * steps over its lowest corner each of its corners is - x, y; x + 1, y;
 * x, y + 1; x + 1, y + 1 - none more than a step over the ones next to it.
 *
 * @returns {string[]} "0000", "1000", "0112"...
 */
export function slopes() {
  var out = [];

  for (var k = 0; k < 81; k++) {
    var z = [
      k % 3,
      Math.floor(k / 3) % 3,
      Math.floor(k / 9) % 3,
      Math.floor(k / 27),
    ];

    if (
      Math.min.apply(null, z) === 0 &&
      Math.abs(z[0] - z[1]) <= 1 &&
      Math.abs(z[0] - z[2]) <= 1 &&
      Math.abs(z[1] - z[3]) <= 1 &&
      Math.abs(z[2] - z[3]) <= 1
    )
      out.push(z.join(""));
  }

  return out;
}

/**
 * How high the ground of a tile of slope (slopes) is at x, y along it, as
 * it is in the world, pixels over its lowest corner: the two flat faces it
 * folds into, along the diagonal whose ends are as high as each other - of
 * a saddle, where both are, the lower - as the ground's picture is folded
 * (shared/gen/terrain fold), so that a pile lies on the ground drawn.
 */
function groundOf(slope) {
  var z = slope.split("").map(function (c) {
      return +c * GROUND_STEP;
    }),
    a = z[0],
    b = z[1],
    c = z[2],
    d = z[3],
    //along the diagonal from x, y to x + 1, y + 1 - or the other one
    alongAD = a + d === b + c ? true : a === d && b === c ? a < b : a === d;

  return function (x, y) {
    var u = Math.max(0, Math.min(1, x / TILE)),
      v = Math.max(0, Math.min(1, y / TILE));

    if (alongAD)
      return u >= v
        ? a + (b - a) * u + (d - b) * v
        : a + (c - a) * v + (d - c) * u;

    return u + v <= 1
      ? a + (b - a) * u + (c - a) * v
      : d + (d - c) * (u - 1) + (d - b) * (v - 1);
  };
}

/**
 * Every pile's mask there is: "0000" to "1111" for its sides, and for its
 * corners "0000" but where both sides of one are "1".
 *
 * @returns {string[]}
 */
export function masks() {
  var out = [];

  for (var sides = 0; sides < 16; sides++) {
    var both = [0, 1, 2, 3].filter(function (k) {
      return (sides >> k) & 1 && (sides >> ((k + 1) % 4)) & 1;
    });

    for (var c = 0; c < 1 << both.length; c++) {
      var corners = [0, 0, 0, 0];

      both.forEach(function (k, i) {
        corners[k] = (c >> i) & 1;
      });

      out.push(
        [0, 1, 2, 3]
          .map(function (k) {
            return (sides >> k) & 1;
          })
          .join("") + corners.join(""),
      );
    }
  }

  return out;
}

function normalize(v) {
  var l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

  return [v[0] / l, v[1] / l, v[2] / l];
}

//a number 0..1 for x, y and a seed, always the same for them
function hash(x, y, s) {
  var h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;

  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;

  return (h >>> 0) / 4294967296;
}

//noise, smooth between whole x and y
function noise(x, y, s) {
  var x0 = Math.floor(x),
    y0 = Math.floor(y),
    fx = x - x0,
    fy = y - y0,
    sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy),
    a = hash(x0, y0, s),
    b = hash(x0 + 1, y0, s),
    c = hash(x0, y0 + 1, s),
    d = hash(x0 + 1, y0 + 1, s);

  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

//what the piles are of: one of the rubbles - pictures enough as it is,
//with every mask on every slope
var PILES = ["rubble"];

//noise the same at either edge of a tile, so that what is lumpy by it on
//a tile meets what is on the tile next to it: cells across the tile
function wrapped(x, y, s, cells) {
  var f = cells / TILE,
    gx = x * f,
    gy = y * f,
    x0 = Math.floor(gx),
    y0 = Math.floor(gy),
    fx = gx - x0,
    fy = gy - y0,
    sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);

  function at(i, j) {
    return hash(
      (((x0 + i) % cells) + cells) % cells,
      (((y0 + j) % cells) + cells) % cells,
      s,
    );
  }

  var a = at(0, 0),
    b = at(1, 0),
    c = at(0, 1),
    d = at(1, 1);

  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

//a run of numbers 0..1 from a seed
function random(seed) {
  var s = seed >>> 0 || 1;

  return function () {
    s = Math.imul(s ^ (s >>> 15), 2246822519) + 0x6d2b79f5;
    s ^= s >>> 13;

    return (s >>> 0) / 4294967296;
  };
}

/**
 * The stones of a picture: where each is, how big round either way, how
 * high, how it is turned, and its colours - laid out so that none sits on
 * another, all on the tile.
 */
function stonesOf(plan) {
  var rnd = random(plan.seed),
    out = [],
    tries = 0;

  if (plan.mound) return heapOf(plan, rnd);

  while (out.length < plan.count && tries++ < 2000) {
    var r = plan.size[0] + rnd() * (plan.size[1] - plan.size[0]),
      x = 5 + r + rnd() * (TILE - 10 - 2 * r),
      y = 5 + r + rnd() * (TILE - 10 - 2 * r);

    //each a stone of its own, a little ground between it and the next
    if (
      out.some(function (o) {
        return Math.hypot(o.x - x, o.y - y) < (o.r * o.long + r * 1.3) * 0.95;
      })
    )
      continue;

    out.push({
      x: x,
      y: y,
      r: r,
      //longer one way than the other, turned any way
      long: 1 + rnd() * 0.3,
      turn: rnd() * Math.PI,
      high: plan.high[0] + rnd() * (plan.high[1] - plan.high[0]),
      colours: plan.colours,
      seed: (rnd() * 1e6) | 0,
    });
  }

  return out;
}

/**
 * The pieces of a heap of rubble: its mound in the middle of the tile, and
 * on it the pieces, thicker towards the top of it, each lying as high as
 * the mound is where it lies - over one another as they come.
 */
function heapOf(plan, rnd) {
  var m = plan.mound,
    mound = {
      x: TILE / 2,
      y: TILE / 2,
      r: m.r,
      long: 1.15,
      turn: rnd() * Math.PI,
      high: m.high,
      colours: m.colours,
      seed: (rnd() * 1e6) | 0,
      base: 0,
    },
    out = [mound];

  for (var i = 0; i < plan.count; i++) {
    var a = rnd() * 2 * Math.PI,
      d = Math.sqrt(rnd()) * m.r * 0.8,
      x = TILE / 2 + Math.cos(a) * d,
      y = TILE / 2 + Math.sin(a) * d;

    out.push({
      x: x,
      y: y,
      r: plan.size[0] + rnd() * (plan.size[1] - plan.size[0]),
      //slabs and beams, longer one way than a stone ever is
      long: 1 + rnd() * 0.9,
      turn: rnd() * Math.PI,
      high: plan.high[0] + rnd() * (plan.high[1] - plan.high[0]),
      colours: plan.palettes[Math.floor(rnd() * plan.palettes.length)],
      seed: (rnd() * 1e6) | 0,
      base: heightAt([mound], x, y).z * 0.8,
      blocky: plan.blocky,
    });
  }

  return out;
}

/**
 * A heap of rubble that runs on into the heaps next to it, as mask says
 * (masks): its mound - the mound of a heap - the ridges on to the heaps
 * next to it and the mounds where four meet, all one ground of debris
 * (field), and the pieces of the heap piled on it, thicker the higher it
 * is. All of it on the tile, as the tile is in the world: what is seen of
 * it from another side is turned round after.
 */
function pileOf(plan, mask, slope) {
  var m = plan.mound,
    c = TILE / 2,
    shapes = [{ x: c, y: c, r: m.r }],
    rnd = random(plan.seed * 131 + parseInt(mask, 2));

  SIDES.forEach(function (d, k) {
    if (mask[k] === "1")
      shapes.push({
        x: c,
        y: c,
        x1: c + d[0] * TILE,
        y1: c + d[1] * TILE,
        r: RIDGE,
      });
  });
  CORNERS.forEach(function (d, k) {
    if (mask[4 + k] === "1")
      shapes.push({
        x: c + (d[0] * TILE) / 2,
        y: c + (d[1] * TILE) / 2,
        r: MEET,
      });
  });

  //how high the debris lies at x, y on the tile, as it is in the world -
  //nothing off it, which is the tile next to it's to show
  function exact(x, y) {
    if (x < -PAST || y < -PAST || x > TILE + PAST || y > TILE + PAST) return 0;
    var best = 0;

    shapes.forEach(function (s) {
      var px = x,
        py = y;

      //a ridge: how far from the line between the two middles
      if (s.x1 !== undefined) {
        var ex = s.x1 - s.x,
          ey = s.y1 - s.y,
          t = Math.max(
            0,
            Math.min(
              1,
              ((x - s.x) * ex + (y - s.y) * ey) / (ex * ex + ey * ey),
            ),
          );

        px = x - (s.x + ex * t) + s.x;
        py = y - (s.y + ey * t) + s.y;
      }

      var d =
        (Math.hypot(px - s.x, py - s.y) / s.r) *
        (1 + (wrapped(x, y, plan.seed, 24) - 0.5) * 0.22);

      if (d < 1) best = Math.max(best, Math.sqrt(1 - Math.pow(d, 6)));
    });

    return best === 0
      ? 0
      : m.high * best * (0.92 + wrapped(x, y, plan.seed + 7, 16) * 0.16);
  }

  //worked out once every half a pixel across the tile and a little way
  //past it, and read off that between - a ray looks for it at every step
  //down. Past the tile, which way the debris slopes at its edge is worked
  //out the way the tile next to it is (whole), but none of it is seen
  //there, which is the tile next to it's to show
  var PAST = 2,
    N = (TILE + 2 * PAST) * 2 + 1,
    grid = new Float32Array(N * N);

  for (var gy = 0; gy < N; gy++)
    for (var gx = 0; gx < N; gx++)
      grid[gy * N + gx] = exact(gx / 2 - PAST, gy / 2 - PAST);

  function field(x, y, whole) {
    if (!whole && (x < 0 || y < 0 || x > TILE || y > TILE)) return 0;

    var fx = Math.max(0, Math.min(N - 1.001, (x + PAST) * 2)),
      fy = Math.max(0, Math.min(N - 1.001, (y + PAST) * 2)),
      x0 = Math.floor(fx),
      y0 = Math.floor(fy),
      ax = fx - x0,
      ay = fy - y0,
      o = y0 * N + x0;

    return (
      (grid[o] * (1 - ax) + grid[o + 1] * ax) * (1 - ay) +
      (grid[o + N] * (1 - ax) + grid[o + N + 1] * ax) * ay
    );
  }

  var under = groundOf(slope),
    ground = {
      x: c,
      y: c,
      turn: 0,
      turns: 0,
      colours: m.colours,
      seed: plan.seed,
      field: field,
      //and the ground it lies on, as high as it is there
      under: under,
    },
    out = [ground],
    joins = mask.slice(0, 4).split("1").length - 1,
    count = Math.round(plan.count * (1 + 0.15 * joins));

  for (var tries = 0; out.length <= count && tries < count * 40; tries++) {
    var r = plan.size[0] + rnd() * (plan.size[1] - plan.size[0]),
      x = r + 1 + rnd() * (TILE - 2 * r - 2),
      y = r + 1 + rnd() * (TILE - 2 * r - 2),
      debris = field(x, y);

    //thicker the higher the debris is
    if (debris < m.high * (0.25 + 0.5 * rnd())) continue;

    out.push({
      x: x,
      y: y,
      r: r,
      long: 1 + rnd() * 0.9,
      turn: rnd() * Math.PI,
      high: plan.high[0] + rnd() * (plan.high[1] - plan.high[0]),
      colours: plan.palettes[Math.floor(rnd() * plan.palettes.length)],
      seed: (rnd() * 1e6) | 0,
      base: under(x, y) + debris * 0.8,
      blocky: plan.blocky,
    });
  }

  return out;
}

//where x, y of a picture seen turned so many times is on its tile in the
//world - turned back (paint turns (x, y) to (y, -x) round the middle)
function unturned(x, y, turns) {
  for (var t = 0; t < turns; t++) {
    var tx = x;

    x = TILE - y;
    y = tx;
  }

  return [x, y];
}

/**
 * How high the stones stand at x, y along the tile, and which of them it is
 * there: {z, stone}, z 0 and stone null where there are none - and for a
 * pile, whole, the debris a little way past the tile too, for which way it
 * slopes and what it shades at the edge of it.
 */
function heightAt(stones, x, y, whole) {
  var best = 0,
    which = null;

  for (var i = 0; i < stones.length; i++) {
    var s = stones[i];

    //the ground of a pile, seen turned as many times as it is: where x, y
    //is on it in the world - on the ground there
    if (s.field) {
      var w = unturned(x, y, s.turns),
        f = s.field(w[0], w[1], whole);

      if (f > 0 && f + s.under(w[0], w[1]) > best) {
        best = f + s.under(w[0], w[1]);
        which = s;
      }
      continue;
    }

    var dx = x - s.x,
      dy = y - s.y,
      c = Math.cos(s.turn),
      n = Math.sin(s.turn),
      u = (dx * c + dy * n) / (s.r * s.long),
      v = (-dx * n + dy * c) / s.r,
      d = Math.sqrt(u * u + v * v);

    //a little lumpy round the edge
    d *= 1 + (noise(x * 0.7, y * 0.7, s.seed) - 0.5) * 0.2;

    if (d >= 1) continue;

    //a boulder: steep round its foot, its top flattish - a face or two on
    //it, as a broken stone has; a piece of rubble flat on top, sheer
    //round it
    var z = s.blocky
      ? s.high * Math.min(1, (1 - d) / 0.2)
      : s.high * Math.sqrt(1 - Math.pow(d, 6));

    if (!s.blocky) z *= 0.92 + noise(x * 0.5, y * 0.5, s.seed + 7) * 0.16;
    z += s.base || 0;

    if (z > best) {
      best = z;
      which = s;
    }
  }

  return { z: best, stone: which };
}

/**
 * Where the ray of pixel px, py meets the stones going down from as high as
 * they get: {x, y, z, stone}, or where it meets the ground, stone null -
 * in a picture of frame (FLAT, or a pile's: taller, its tile further down,
 * and its ground, ground(x, y), as high as it is on the tile there).
 */
function cast(stones, px, py, frame) {
  var a = px + 0.5 - OX,
    oy = frame.oy;

  //what the ray meets that high, if anything
  function at(z) {
    var b = 2 * (oy - (py + 0.5) - z),
      x = (a + b) / 2,
      y = (b - a) / 2,
      h = heightAt(stones, x, y);

    if (h.stone !== null && h.z >= z)
      return { x: x, y: y, z: z, stone: h.stone };

    //the ground, on the tile, where it is that high
    if (
      frame.ground !== null &&
      x >= 0 &&
      y >= 0 &&
      x <= TILE &&
      y <= TILE &&
      z <= frame.ground(x, y)
    )
      return { x: x, y: y, z: z, stone: null };

    return null;
  }

  //down a pile's taller picture in long steps first, then back over the
  //last of them a STEP at a time, for where it meets it
  var long = frame.ground !== null ? STEP * 3 : STEP,
    z,
    hit;

  for (z = frame.tallest; z >= 0; z -= long) {
    hit = at(z);

    if (hit === null) continue;
    if (long === STEP) return hit;

    for (
      var fine = Math.min(frame.tallest, z + long - STEP);
      fine > z;
      fine -= STEP
    ) {
      var first = at(fine);

      if (first !== null) return first;
    }

    return hit;
  }

  var b0 = 2 * (oy - (py + 0.5));

  return { x: (a + b0) / 2, y: (b0 - a) / 2, z: 0, stone: null };
}

//a stone's picture: the tile, flat, and as high as a stone stands
var FLAT = { height: H, oy: OY, tallest: TALLEST, ground: null };

//which way the stones look at x, y
function normalAt(stones, x, y) {
  var e = 0.5,
    dx =
      heightAt(stones, x + e, y, true).z - heightAt(stones, x - e, y, true).z,
    dy =
      heightAt(stones, x, y + e, true).z - heightAt(stones, x, y - e, true).z;

  return normalize([-dx / (2 * e), -dy / (2 * e), 1]);
}

//whether the ground at x, y, as high as it is there, is in the shadow of a
//stone
function shadowed(stones, x, y, frame) {
  var z0 = frame.ground !== null ? frame.ground(x, y) : 0;

  for (var t = STEP * 2; t < 14; t += STEP * 2) {
    var sx = x + SHADOW_SUN[0] * t,
      sy = y + SHADOW_SUN[1] * t,
      z = z0 + SHADOW_SUN[2] * t;

    if (z > frame.tallest) return false;
    if (heightAt(stones, sx, sy, true).z > z) return true;
  }

  return false;
}

/**
 * A pile's picture, of a tile of slope seen turned so many times: taller
 * than a stone's by as far as a tile can rise, its tile as much further
 * down, and its ground as high as it is - in the picture, turned.
 */
function pileFrame(slope, turns) {
  var ground = groundOf(slope);

  return {
    height: H + PILE_RISE * GROUND_STEP,
    oy: OY + PILE_RISE * GROUND_STEP,
    tallest: TALLEST + PILE_RISE * GROUND_STEP,
    ground: function (x, y) {
      var w = unturned(x, y, turns);

      return ground(w[0], w[1]);
    },
  };
}

/**
 * One picture: name "stone" or "stone0", "-m" after it for the other way
 * round - its stones laid out the other way across the tile, lit by the
 * same sun - and "/r1" to "/r3" after that for it seen from another side,
 * that many quarter turns round. Or a pile, "pile/rubble/<mask>/<slope>"
 * (masks, slopes), seen from a side the same way.
 */
export function paint(name) {
  var pile = /^pile\/([a-z0-9]+)\/([01]{8})\/([012]{4})(?:\/r([123]))?$/.exec(
      name,
    ),
    m = pile
      ? [name, pile[1], undefined, pile[4]]
      : /^([a-z0-9]+)(-m)?(?:\/r([123]))?$/.exec(name),
    plan = m && PLANS[m[1]];

  if (!plan || (pile && !plan.mound))
    throw new Error("no such stones: " + name);

  var turned = m[2] !== undefined,
    turns = +(m[3] || 0),
    stones = pile ? pileOf(plan, pile[2], pile[3]) : stonesOf(plan),
    frame = pile ? pileFrame(pile[3], turns) : FLAT,
    H = frame.height,
    out = { width: W, height: H, data: new Uint8ClampedArray(W * H * 4) },
    hit = new Array(W * H),
    i,
    px,
    py;

  if (turned)
    stones.forEach(function (s) {
      var x = s.x;

      s.x = s.y;
      s.y = x;
      s.turn = Math.PI / 2 - s.turn;
    });

  //seen from another side: the stones turned round the middle of the tile
  //a quarter turn at a time, the way client/view turns what is seen -
  //(x, y) to (y, -x)
  stones.forEach(function (s) {
    if (s.field) s.turns = turns;

    for (var t = 0; t < turns; t++) {
      var dx = s.x - TILE / 2,
        dy = s.y - TILE / 2;

      s.x = TILE / 2 + dy;
      s.y = TILE / 2 - dx;
      s.turn -= Math.PI / 2;
    }
  });

  for (py = 0; py < H; py++)
    for (px = 0; px < W; px++) hit[py * W + px] = cast(stones, px, py, frame);

  for (py = 0; py < H; py++)
    for (px = 0; px < W; px++) {
      var h = hit[py * W + px],
        o = (py * W + px) * 4;

      if (h.stone === null) {
        //on the tile, in a stone's shadow
        if (
          h.x >= 0 &&
          h.y >= 0 &&
          h.x < TILE &&
          h.y < TILE &&
          shadowed(stones, h.x, h.y, frame)
        )
          out.data[o + 3] = Math.round(SHADOW_ALPHA * 255);
        continue;
      }

      var n = normalAt(stones, h.x, h.y),
        light = Math.max(0, n[0] * SUN[0] + n[1] * SUN[1] + n[2] * SUN[2]),
        //one of the four tones outright: the top the lightest, the side
        //the sun is on the next, the other the darkest
        tone =
          n[2] > 0.88
            ? 0
            : Math.max(
                1,
                Math.min(
                  3,
                  Math.floor((1 - light) * 4 + (hash(px, py, 5) - 0.5) * 0.4),
                ),
              ),
        below = py + 1 < H ? hit[(py + 1) * W + px] : null,
        c = h.stone.colours[tone],
        //the edge at its foot a shade darker, to stand out on the grass -
        //not where a pile runs on off the tile, into the heap next to it
        on =
          below !== null &&
          below.stone === null &&
          h.stone.field !== undefined &&
          (below.x < 0 || below.y < 0 || below.x > TILE || below.y > TILE),
        edge = !on && (below === null || below.stone !== h.stone) ? 0.82 : 1,
        speck = 1 + (hash(px, py, h.stone.seed) - 0.5) * 0.08;

      for (i = 0; i < 3; i++)
        out.data[o + i] = Math.max(0, Math.min(255, c[i] * edge * speck));
      out.data[o + 3] = 255;
    }

  return out;
}

/**
 * What paint paints, without painting it: every picture by name, from every
 * side, the size of a tile.
 */
export function describe() {
  var sizes = {};

  Object.keys(PLANS).forEach(function (plan) {
    [plan, plan + "-m"].forEach(function (name) {
      ["", "/r1", "/r2", "/r3"].forEach(function (side) {
        sizes[name + side] = { w: W, h: H };
      });
    });
  });

  //and the piles of rubble, on every slope
  PILES.forEach(function (plan) {
    masks().forEach(function (mask) {
      slopes().forEach(function (slope) {
        ["", "/r1", "/r2", "/r3"].forEach(function (side) {
          sizes["pile/" + plan + "/" + mask + "/" + slope + side] = {
            w: W,
            h: H + PILE_RISE * GROUND_STEP,
          };
        });
      });
    });
  });

  return sizes;
}

/**
 * Every picture, painted.
 */
export function generate() {
  var out = {};

  Object.keys(describe()).forEach(function (name) {
    out[name] = paint(name);
  });

  return out;
}
