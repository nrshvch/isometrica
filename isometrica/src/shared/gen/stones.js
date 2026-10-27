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
 * How high the stones stand at x, y along the tile, and which of them it is
 * there: {z, stone}, z 0 and stone null where there are none.
 */
function heightAt(stones, x, y) {
  var best = 0,
    which = null;

  for (var i = 0; i < stones.length; i++) {
    var s = stones[i],
      dx = x - s.x,
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
 * they get: {x, y, z, stone}, or where it meets the ground, stone null.
 */
function cast(stones, px, py) {
  var a = px + 0.5 - OX;

  for (var z = TALLEST; z >= 0; z -= STEP) {
    var b = 2 * (OY - (py + 0.5) - z),
      x = (a + b) / 2,
      y = (b - a) / 2,
      at = heightAt(stones, x, y);

    if (at.stone !== null && at.z >= z)
      return { x: x, y: y, z: z, stone: at.stone };
  }

  var b0 = 2 * (OY - (py + 0.5));

  return { x: (a + b0) / 2, y: (b0 - a) / 2, z: 0, stone: null };
}

//which way the stones look at x, y
function normalAt(stones, x, y) {
  var e = 0.5,
    dx = heightAt(stones, x + e, y).z - heightAt(stones, x - e, y).z,
    dy = heightAt(stones, x, y + e).z - heightAt(stones, x, y - e).z;

  return normalize([-dx / (2 * e), -dy / (2 * e), 1]);
}

//whether the ground at x, y is in the shadow of a stone
function shadowed(stones, x, y) {
  for (var t = STEP * 2; t < 14; t += STEP * 2) {
    var sx = x + SHADOW_SUN[0] * t,
      sy = y + SHADOW_SUN[1] * t,
      z = SHADOW_SUN[2] * t;

    if (z > TALLEST) return false;
    if (heightAt(stones, sx, sy).z > z) return true;
  }

  return false;
}

/**
 * One picture: name "stone" or "stone0", "-m" after it for the other way
 * round - its stones laid out the other way across the tile, lit by the
 * same sun - and "/r1" to "/r3" after that for it seen from another side,
 * that many quarter turns round.
 */
export function paint(name) {
  var m = /^([a-z0-9]+)(-m)?(?:\/r([123]))?$/.exec(name),
    plan = m && PLANS[m[1]];

  if (!plan) throw new Error("no such stones: " + name);

  var turned = m[2] !== undefined,
    turns = +(m[3] || 0),
    stones = stonesOf(plan),
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
    for (var t = 0; t < turns; t++) {
      var dx = s.x - TILE / 2,
        dy = s.y - TILE / 2;

      s.x = TILE / 2 + dy;
      s.y = TILE / 2 - dx;
      s.turn -= Math.PI / 2;
    }
  });

  for (py = 0; py < H; py++)
    for (px = 0; px < W; px++) hit[py * W + px] = cast(stones, px, py);

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
          shadowed(stones, h.x, h.y)
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
        //the edge at its foot a shade darker, to stand out on the grass
        edge = below === null || below.stone !== h.stone ? 0.82 : 1,
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
