/**
 * Parks, put together the way the shops are (shared/gen/shops): one park
 * painted whole on its footprint and cut into its tiles (onTile). Every
 * footprint - 1x1, 1x2, 1x3, 2x2, 2x3 - comes in three kinds, one of them
 * picked for each park when it is placed (client/compoundbuilding):
 *
 *   - sports: courts and a skate spot inside a wire fence - a basketball
 *     court, half a one on a single tile; a skate spot of ramps, a box and
 *     a rail; a tennis court on three tiles; on the bigger footprints two or
 *     three of them side by side - with benches and bushes round them;
 *   - garden: a formal garden laid out to a pattern - straight walks of
 *     paving crossing each other, a ring walk round the bigger ones, beds
 *     edged with low box hedges and full of flowers or with a small tree in
 *     each, a fountain where the walks cross, benches facing it;
 *   - city: a town park - gravel walks winding through it, trees all over,
 *     bushes, benches along the walks with a bin by each, lamps; on the
 *     bigger footprints a plaza with a big fountain, or a pond.
 *
 * Each kind comes in two variants (which court, which feature). While a park
 * is laid out its tiles are a building site like anybody's (shared/gen/sites),
 * then its ground graded with the walks laid out (stage 1), then grassed and
 * paved, the courts surfaced and the beds dug, nothing planted yet (stage 2).
 *
 * Units as everywhere: a tile is 32 along the ground, about ten metres;
 * heights in pixels, twelve to a storey.
 */
import * as iso from "./isobox.js";
import {
  box,
  darker,
  TILE,
  STOREY,
  GRASS,
  STRIPE,
  WOOD,
  METAL,
  LEAF,
  HEDGE,
  DIRT,
  CONCRETE,
  LIT,
  madeOf,
  random,
  round,
  tree,
  hedge,
  wireFence,
  measureOnTile,
  onTile,
  TURNS,
} from "./blocks.js";
import { turned, disc } from "./utilities.js";

var GRAVEL = madeOf([206, 190, 156], "gravel"),
  SLAB = madeOf([212, 206, 192], "slabs"),
  SOIL = madeOf([118, 88, 62], "dirt"),
  STONE = madeOf([206, 200, 186], "stone"),
  WATER = madeOf([70, 150, 200], "water"),
  JET = [196, 228, 246],
  BIN = [52, 96, 64],
  POLE = [70, 74, 82],
  LAMP = [252, 238, 180],
  //what the courts are surfaced with
  COURT_RED = [184, 92, 70],
  COURT_GREEN = [74, 132, 92],
  COURT_BLUE = [70, 112, 168],
  SKATE = madeOf([186, 186, 180], "concrete"),
  HOOP = [232, 110, 40],
  NET = [56, 60, 66],
  FLOWERS = [
    [222, 64, 72],
    [246, 196, 52],
    [236, 236, 230],
    [178, 98, 204],
    [246, 136, 60],
  ];

/* --- Bits of parks --------------------------------------------------- */

//a seat 4 long facing `facing` (-y, +y, -x, +x), its corner at x, y
function seat(b, x, y, facing) {
  var along = facing === "-y" || facing === "+y",
    back = facing === "-y" || facing === "-x" ? 1 : 0;

  if (along) {
    b.push(box(x, x + 4, y, y + 2, 2, 3, WOOD));
    b.push(box(x, x + 4, y + back, y + back + 1, 3, 4, WOOD));
    b.push(box(x, x + 1, y, y + 2, 1, 2, METAL));
    b.push(box(x + 3, x + 4, y, y + 2, 1, 2, METAL));
  } else {
    b.push(box(x, x + 2, y, y + 4, 2, 3, WOOD));
    b.push(box(x + back, x + back + 1, y, y + 4, 3, 4, WOOD));
    b.push(box(x, x + 2, y, y + 1, 1, 2, METAL));
    b.push(box(x, x + 2, y + 3, y + 4, 1, 2, METAL));
  }
}

//a litter bin
function bin(b, x, y) {
  b.push(box(x, x + 1, y, y + 1, 1, 3, BIN));
  b.push(box(x, x + 1, y, y + 1, 3, 3.1, darker(BIN, 0.3)));
}

//a lamp on a post
function lamp(b, x, y) {
  b.push(box(x, x + 1, y, y + 1, 1, 10, POLE));
  b.push(box(x - 0.5, x + 1.5, y - 0.5, y + 1.5, 10, 11, LAMP, LIT));
  b.push(box(x - 0.5, x + 1.5, y - 0.5, y + 1.5, 11, 11.5, POLE));
}

//a bush, round, r across
function bush(b, x, y, r, color) {
  var h = r * 1.4;

  round(b, x, y, r, color || HEDGE, 0.08, function (u, v) {
    var d = (u * u + v * v) / (r * r);

    if (d >= 1) return null;

    var k = Math.sqrt(1 - d);

    return [1, 1 + h * k, u / (r * r), v / (r * r), k / h];
  });
}

/**
 * A fountain at cx, cy: a round basin of stone r across with water in it,
 * a column up the middle, a bowl on it running over, and a jet out of the
 * top. Laid out in columns a unit across (utilities turned).
 */
function fountain(b, cx, cy, r) {
  var big = r >= 7;

  turned(b, cx, cy, 1, 3, constant(r), constant(STONE), "stone");
  disc(b, cx, cy, r - 1, 2.6, WATER, "water");
  turned(b, cx, cy, 2, big ? 7 : 5, constant(1.5), constant(STONE), "stone");

  var top = big ? 7 : 5;

  if (big) {
    turned(b, cx, cy, top, top + 1, constant(4), constant(STONE), "stone");
    disc(b, cx, cy, 3, top + 1, WATER, "water");
    top += 1;
  }

  turned(b, cx, cy, top, top + (big ? 5 : 3), constant(0.8), constant(JET));
}

function constant(c) {
  return function () {
    return c;
  };
}

/**
 * Cells of a footprint W by H that are something - a walk, a pond - laid as
 * boxes from z0 to z1, a row of cells next to each other in one box.
 */
function cells(b, W, H, inside, z0, z1, color) {
  for (var y = 0; y < H; y++) {
    var run = -1;

    for (var x = 0; x <= W; x++) {
      var on = x < W && inside(x + 0.5, y + 0.5);

      if (on && run < 0) run = x;
      if (!on && run >= 0) {
        b.push(box(run, x, y, y + 1, z0, z1, color));
        run = -1;
      }
    }
  }
}

//a flower bed from x0 to x1, y0 to y1: dug over, and rows of flowers in it,
//each row its own colour
function flowerBed(b, x0, x1, y0, y1, rnd) {
  b.push(box(x0, x1, y0, y1, 1, 1.1, SOIL));

  var a = Math.floor(rnd() * FLOWERS.length);

  for (var y = y0 + 1; y < y1 - 0.5; y += 2) {
    var c = FLOWERS[(a + Math.floor((y - y0) / 2)) % FLOWERS.length];

    for (var x = x0 + ((y - y0) % 4 === 1 ? 1 : 0); x < x1 - 0.5; x += 2)
      b.push(box(x, x + 1, y, y + 1, 1, 2, c));
  }
}

/* --- Sports ---------------------------------------------------------- */

//lines a unit wide round a rectangle
function outline(b, x0, x1, y0, y1, z, color) {
  b.push(box(x0, x1, y0, y0 + 1, z, z + 0.1, color));
  b.push(box(x0, x1, y1 - 1, y1, z, z + 0.1, color));
  b.push(box(x0, x0 + 1, y0, y1, z, z + 0.1, color));
  b.push(box(x1 - 1, x1, y0, y1, z, z + 0.1, color));
}

//a hoop at x, y on the line at the end of a court, the board facing the way
//dir (+1: towards +y)
function hoop(b, x, y, dir) {
  var back = y - dir * 2;

  b.push(box(x - 0.5, x + 0.5, back, back + 1, 1, 12, POLE));
  b.push(
    box(
      x - 3,
      x + 3,
      y - (dir > 0 ? 1 : 0),
      y + (dir > 0 ? 0 : 1),
      10,
      14,
      STRIPE,
    ),
  );
  b.push(
    box(
      x - 1,
      x + 1,
      y + (dir > 0 ? 0 : -2),
      y + (dir > 0 ? 2 : 0),
      11,
      11.1,
      HOOP,
    ),
  );
}

/**
 * A basketball court from x0 to x1 along x and y0 to y1 along y, its hoops at
 * the ends along y - one hoop only for half a court (half), at y1.
 */
function basketball(b, x0, x1, y0, y1, half, stage) {
  b.push(box(x0, x1, y0, y1, 1, 1.1, stage === 1 ? CONCRETE : COURT_RED));
  if (stage === 1) return;

  var cx = Math.floor((x0 + x1) / 2),
    z = 1.1;

  outline(b, x0 + 1, x1 - 1, y0 + 1, y1 - 1, z, STRIPE);
  //the key at either end, and the circle round the middle
  b.push(box(cx - 4, cx + 4, y1 - 9, y1 - 8, z, z + 0.1, STRIPE));
  b.push(box(cx - 4, cx - 3, y1 - 9, y1 - 1, z, z + 0.1, STRIPE));
  b.push(box(cx + 3, cx + 4, y1 - 9, y1 - 1, z, z + 0.1, STRIPE));
  if (!half) {
    b.push(box(cx - 4, cx + 4, y0 + 8, y0 + 9, z, z + 0.1, STRIPE));
    b.push(box(cx - 4, cx - 3, y0 + 1, y0 + 9, z, z + 0.1, STRIPE));
    b.push(box(cx + 3, cx + 4, y0 + 1, y0 + 9, z, z + 0.1, STRIPE));

    var my = Math.floor((y0 + y1) / 2);

    b.push(box(x0 + 1, x1 - 1, my, my + 1, z, z + 0.1, STRIPE));
    cells(
      b,
      x1,
      y1,
      function (x, y) {
        var d = Math.sqrt(
          (x - cx) * (x - cx) + (y - my - 0.5) * (y - my - 0.5),
        );

        return x > x0 && y > y0 && d > 3 && d < 4.2;
      },
      z,
      z + 0.1,
      STRIPE,
    );
  }

  if (stage) return;

  hoop(b, cx, y1 - 2, -1);
  if (!half) hoop(b, cx, y0 + 2, 1);
}

/**
 * A tennis court from x0 to x1, y0 to y1, played along y: its surface, the
 * lines, the net across the middle on its posts.
 */
function tennis(b, x0, x1, y0, y1, stage) {
  b.push(box(x0, x1, y0, y1, 1, 1.1, stage === 1 ? CONCRETE : COURT_GREEN));
  if (stage === 1) return;

  var z = 1.1,
    cx = Math.floor((x0 + x1) / 2),
    my = Math.floor((y0 + y1) / 2),
    ix0 = x0 + 4,
    ix1 = x1 - 4,
    iy0 = y0 + 8,
    iy1 = y1 - 8;

  b.push(box(ix0, ix1, iy0, iy1, z, z + 0.05, COURT_BLUE));
  outline(b, ix0, ix1, iy0, iy1, z + 0.05, STRIPE);
  b.push(box(ix0 + 3, ix0 + 4, iy0, iy1, z + 0.05, z + 0.1, STRIPE));
  b.push(box(ix1 - 4, ix1 - 3, iy0, iy1, z + 0.05, z + 0.1, STRIPE));
  b.push(box(ix0 + 3, ix1 - 3, my - 12, my - 11, z + 0.05, z + 0.1, STRIPE));
  b.push(box(ix0 + 3, ix1 - 3, my + 11, my + 12, z + 0.05, z + 0.1, STRIPE));
  b.push(box(cx, cx + 1, my - 12, my + 12, z + 0.05, z + 0.1, STRIPE));

  if (stage) return;

  //the net, its white band along the top, the posts at its ends
  b.push(box(ix0 - 1, ix1 + 1, my, my + 0.3, 1, 3, NET));
  b.push(box(ix0 - 1, ix1 + 1, my, my + 0.3, 3, 4, STRIPE));
  b.push(box(ix0 - 2, ix0 - 1, my, my + 1, 1, 4, POLE));
  b.push(box(ix1 + 1, ix1 + 2, my, my + 1, 1, 4, POLE));
}

/**
 * A skate spot from x0 to x1, y0 to y1: a concrete pad, a ramp up to a deck
 * at either end along y (at one end on a short one), a box with sloped ends
 * in the middle and a rail beside it.
 */
function skate(b, x0, x1, y0, y1, stage) {
  b.push(box(x0, x1, y0, y1, 1, 1.1, SKATE));
  if (stage === 1) return;

  var long = y1 - y0 >= 40,
    cx = Math.floor((x0 + x1) / 2);

  //a ramp at the back up to its deck, half a unit up for every one along
  function ramp(ya, yb, up) {
    var h = 6,
      run = 12,
      deck = up > 0 ? [yb - 3, yb] : [ya, ya + 3],
      slope = up > 0 ? [yb - 3 - run, yb - 3] : [ya + 3, ya + 3 + run],
      grad = h / run;

    b.push(box(x0 + 2, x1 - 2, deck[0], deck[1], 1, 1 + h, CONCRETE));
    b.push(
      iso.cut(box(x0 + 2, x1 - 2, slope[0], slope[1], 1, 1 + h, SKATE), [
        up > 0
          ? iso.plane(0, -grad, 1, 1 - grad * slope[0])
          : iso.plane(0, grad, 1, 1 + grad * slope[1]),
      ]),
    );
    //the coping along its lip
    var lip = up > 0 ? deck[0] : deck[1] - 1;

    b.push(box(x0 + 2, x1 - 2, lip, lip + 1, 1 + h, 2 + h, METAL));
  }

  ramp(y0, y1, 1);
  if (long) ramp(y0, y1, -1);

  if (stage) return;

  //the box in the middle, its ends sloped, and the rail by it
  var my = Math.floor((y0 + y1) / 2) - (long ? 0 : 4),
    bx0 = cx - 4,
    bx1 = cx + 2;

  b.push(box(bx0, bx1, my - 3, my + 3, 1, 4, CONCRETE));
  [
    [my - 9, my - 3, 1],
    [my + 3, my + 9, -1],
  ].forEach(function (q) {
    var g = 3 / 6;

    b.push(
      iso.cut(box(bx0, bx1, q[0], q[1], 1, 4, SKATE), [
        q[2] > 0
          ? iso.plane(0, -g, 1, 1 - g * q[0])
          : iso.plane(0, g, 1, 1 + g * q[1]),
      ]),
    );
  });

  b.push(box(cx + 5, cx + 6, my - 7, my + 7, 3, 4, METAL));
  b.push(box(cx + 5, cx + 6, my - 6, my - 5, 1, 3, METAL));
  b.push(box(cx + 5, cx + 6, my + 5, my + 6, 1, 3, METAL));
}

/**
 * A fence of wire round a court, a gate's width left open at the front.
 */
function cage(b, x0, x1, y0, y1) {
  var mid = Math.floor((x0 + x1) / 2);

  wireFence(b, "x", y0, x0, x1, [[mid - 3, mid + 3]]);
  wireFence(b, "x", y1 - 1, x0, x1);
  wireFence(b, "y", x0, y0, y1);
  wireFence(b, "y", x1 - 1, y0, y1);
}

/**
 * A sports park on a footprint W by H: what courts it has where by how big
 * it is - variant 0 or 1 picks between a court and a skate spot where both
 * would fit - and benches and bushes round them.
 */
function sports(b, W, H, variant, stage, rnd) {
  var full = !stage;

  function court(kind, x0, x1, y0, y1) {
    if (kind === "basket") basketball(b, x0, x1, y0, y1, y1 - y0 < 40, stage);
    else if (kind === "tennis") tennis(b, x0, x1, y0, y1, stage);
    else skate(b, x0, x1, y0, y1, stage);

    if (full && kind !== "skate") cage(b, x0 - 1, x1 + 1, y0 - 1, y1 + 1);
  }

  var a = variant ? "skate" : "basket";

  if (W === TILE && H === TILE) court(a, 4, 28, 4, 27);
  else if (W === TILE && H === 2 * TILE) court(a, 4, 28, 5, 59);
  else if (W === TILE && H === 3 * TILE) court("tennis", 4, 28, 4, 92);
  else if (W === 2 * TILE && H === 2 * TILE) {
    court("basket", 4, 28, 5, 59);
    court(variant ? "skate" : "basket", 36, 60, 5, 59);
  } else {
    court("tennis", 4, 28, 4, 92);
    court(a, 36, 60, 5, 59);
    court(variant ? "basket" : "skate", 36, 60, 66, 92);
  }

  if (!full) return;

  //benches along the front, bushes in the corners
  for (var x = 6; x < W - 6; x += TILE) seat(b, x, 0.5, "-y");
  [
    [2, H - 2],
    [W - 2, H - 2],
  ].forEach(function (p) {
    bush(b, p[0], p[1], 2 + rnd());
  });
}

/* --- The formal garden ----------------------------------------------- */

//the low box hedges round the beds of a formal garden
var BOX = [70, 120, 62];

/**
 * A formal garden on a footprint W by H, laid out to a pattern: a ring walk
 * round it, a walk down the middle along y and one across the middle, a
 * round plaza where they cross with a fountain in it and benches facing it,
 * and in the four quarters between the walks beds edged with low box
 * hedges - two of them, across from each other, full of flowers in rows,
 * the other two lawn with small trees on them (variant swaps which). Lamps
 * either side of the way in.
 */
function garden(b, W, H, variant, stage, rnd) {
  var cx = W / 2,
    cy = H / 2,
    inset = 2,
    ring = 3,
    axis = W > TILE ? 4 : 3,
    pr = W > TILE || H > 2 * TILE ? 9 : H > TILE ? 7 : 6;

  function onRing(x, y) {
    var inX = x > inset && x < W - inset,
      inY = y > inset && y < H - inset;

    return (
      inX &&
      inY &&
      (x < inset + ring ||
        x > W - inset - ring ||
        y < inset + ring ||
        y > H - inset - ring)
    );
  }

  function inPlaza(x, y, r) {
    return (x - cx) * (x - cx) + (y - cy) * (y - cy) < r * r;
  }

  function isWalk(x, y) {
    if (onRing(x, y) || inPlaza(x, y, pr)) return true;
    //the way in from the front, through the ring
    if (Math.abs(x - cx) < axis / 2 && y < H - inset) return true;

    return Math.abs(y - cy) < axis / 2 && x > inset && x < W - inset;
  }

  //which bed a spot is in: 0..3 by quarter, -1 for none - a unit clear of
  //every walk
  function bedOf(x, y) {
    if (x < inset + ring + 1 || x > W - inset - ring - 1) return -1;
    if (y < inset + ring + 1 || y > H - inset - ring - 1) return -1;
    if (Math.abs(x - cx) < axis / 2 + 1 || Math.abs(y - cy) < axis / 2 + 1)
      return -1;
    if (inPlaza(x, y, pr + 1)) return -1;

    return (x < cx ? 0 : 1) + (y < cy ? 0 : 2);
  }

  b.push(box(0, W, 0, H, 0, 1, stage === 1 ? DIRT : GRASS));
  cells(b, W, H, isWalk, 1, 1.1, stage === 1 ? GRAVEL : SLAB);

  if (stage === 1) return;

  //flowers in the quarters across from each other: 0 and 3, or 1 and 2
  function flowery(q) {
    return (q === 0 || q === 3) !== !!variant;
  }

  var colors = [0, 1, 2, 3].map(function () {
    return Math.floor(rnd() * FLOWERS.length);
  });

  for (var y = 0; y < H; y++)
    for (var x = 0; x < W; x++) {
      var q = bedOf(x + 0.5, y + 0.5);

      if (q < 0) continue;

      var edge =
        bedOf(x - 0.5, y + 0.5) !== q ||
        bedOf(x + 1.5, y + 0.5) !== q ||
        bedOf(x + 0.5, y - 0.5) !== q ||
        bedOf(x + 0.5, y + 1.5) !== q;

      if (edge) {
        if (!stage) b.push(box(x, x + 1, y, y + 1, 1, 3, BOX));
        continue;
      }

      if (!flowery(q)) continue;

      b.push(box(x, x + 1, y, y + 1, 1, 1.1, SOIL));
      //rows of flowers, every other row and every other spot in it
      if (!stage && y % 2 === 0 && (x + y / 2) % 2 === 0)
        b.push(
          box(
            x,
            x + 1,
            y,
            y + 1,
            1,
            2,
            FLOWERS[(colors[q] + Math.floor(y / 4)) % FLOWERS.length],
          ),
        );
    }

  if (stage) return;

  //small trees on the lawns, one in the middle of each - two down a long one
  [0, 1, 2, 3].forEach(function (q) {
    if (flowery(q)) return;

    var x0 = q % 2 ? cx + axis / 2 + 1 : inset + ring + 1,
      x1 = q % 2 ? W - inset - ring - 1 : cx - axis / 2 - 1,
      y0 = q < 2 ? inset + ring + 1 : cy + axis / 2 + 1,
      y1 = q < 2 ? cy - axis / 2 - 1 : H - inset - ring - 1,
      n = y1 - y0 > 30 ? 2 : 1;

    for (var k = 0; k < n; k++) {
      var tx = Math.round((x0 + x1) / 2),
        ty = Math.round(y0 + ((y1 - y0) * (k + 0.5)) / n);

      if (bedOf(tx, ty) === q) tree(b, tx, ty, W > TILE ? 3 : 2);
    }
  });

  //the fountain, and benches round it on the cross walk
  fountain(b, Math.round(cx), Math.round(cy), pr - 3);
  seat(b, Math.round(cx) - pr + 1, Math.round(cy) - 2, "+x");
  seat(b, Math.round(cx) + pr - 3, Math.round(cy) - 2, "-x");

  //lamps either side of the way in
  lamp(b, Math.round(cx) - axis / 2 - 2, 1);
  lamp(b, Math.round(cx) + axis / 2 + 1, 1);
}

/* --- The town park --------------------------------------------------- */

/**
 * A town park on a footprint W by H: a walk winding in from the front to the
 * back - and on a wide one another across it - with a plaza and a big
 * fountain (variant 0) or a pond (variant 1) on the bigger footprints;
 * trees all over the grass, bushes, benches along the walks with a bin by
 * each, lamps.
 */
function cityPark(b, W, H, variant, stage, rnd) {
  var big = W * H >= 2 * TILE * TILE,
    feature = !big ? null : variant ? "pond" : "fountain",
    fx = Math.round(W / 2),
    fy = Math.round(H / 2),
    fr = W > TILE ? 9 : 7;

  //where the main walk is at y: swaying across from one side to the other
  function walkX(y) {
    return W / 2 + (W / 2 - 7) * 0.55 * Math.sin((y / H) * Math.PI * 1.6 + 0.4);
  }

  function walkY(x) {
    return H * 0.3 + 6 * Math.sin((x / W) * Math.PI * 2);
  }

  function inPond(x, y) {
    if (feature !== "pond") return false;

    var dx = (x - fx) / (W > TILE ? 16 : 10),
      dy = (y - fy) / (H > 2 * TILE ? 20 : 14),
      wobble = 0.12 * Math.sin(Math.atan2(dy, dx) * 3 + 1);

    return dx * dx + dy * dy < 1 + wobble;
  }

  function isWalk(x, y) {
    if (inPond(x, y)) return false;
    if (Math.abs(x - walkX(y)) < 2) return true;
    if (W > TILE && Math.abs(y - walkY(x)) < 2) return true;

    if (feature === "fountain") {
      var d = Math.sqrt((x - fx) * (x - fx) + (y - fy) * (y - fy));

      return d < fr + 3;
    }

    return false;
  }

  //the ground: grass, and a hollow where the pond is
  cells(
    b,
    W,
    H,
    function (x, y) {
      return !inPond(x, y);
    },
    0,
    1,
    stage === 1 ? DIRT : GRASS,
  );
  cells(b, W, H, isWalk, 1, 1.1, GRAVEL);

  if (feature === "pond")
    cells(b, W, H, inPond, 0, 0.2, stage === 1 ? DIRT : WATER);

  if (stage) return;

  if (feature === "fountain") fountain(b, fx, fy, fr - 2);

  //trees and bushes on the grass, clear of the walks and of each other
  var planted = [],
    tries = Math.floor((W * H) / 40);

  function clear(x, y, r) {
    for (var dx = -r; dx <= r; dx++)
      for (var dy = -r; dy <= r; dy++) {
        var px = x + dx,
          py = y + dy;

        if (px < 2 || py < 2 || px > W - 2 || py > H - 2) return false;
        if (isWalk(px, py) || inPond(px, py)) return false;
      }

    for (var i = 0; i < planted.length; i++) {
      var q = planted[i];

      if (
        Math.abs(q[0] - x) < q[2] + r + 2 &&
        Math.abs(q[1] - y) < q[2] + r + 2
      )
        return false;
    }

    return true;
  }

  for (var k = 0; k < tries; k++) {
    var x = 3 + Math.floor(rnd() * (W - 6)),
      y = 3 + Math.floor(rnd() * (H - 6)),
      size = rnd() < 0.7 ? 3 + Math.floor(rnd() * 2) : 2;

    if (!clear(x, y, size)) continue;

    planted.push([x, y, size]);
    if (size > 2) tree(b, x, y, size);
    else bush(b, x, y, 2, rnd() < 0.5 ? HEDGE : LEAF);
  }

  //benches along the walk, a bin by each, lamps between
  for (var sy = 10; sy < H - 6; sy += 22) {
    var wx = Math.round(walkX(sy)),
      side = (sy / 22) % 2 ? 1 : -1,
      bx = side > 0 ? wx + 3 : wx - 5;

    if (bx < 1 || bx > W - 3 || inPond(bx, sy)) continue;
    seat(b, bx, sy, side > 0 ? "-x" : "+x");
    bin(b, bx, sy + 5);
  }
  for (var ly = 20; ly < H - 4; ly += 22) {
    var lx = Math.round(walkX(ly)) + 3;

    if (lx < W - 2 && !inPond(lx, ly)) lamp(b, lx, ly);
  }

  //reeds and a stone or two round the pond
  if (feature === "pond")
    for (var r = 0; r < 14; r++) {
      var a = rnd() * Math.PI * 2,
        rx = Math.round(fx + Math.cos(a) * (W > TILE ? 16 : 10)),
        ry = Math.round(fy + Math.sin(a) * (H > 2 * TILE ? 20 : 14));

      if (isWalk(rx, ry)) continue;
      b.push(box(rx, rx + 1, ry, ry + 1, 0, 3, darker(LEAF, 0.1)));
    }
}

/* --- Parts ----------------------------------------------------------- */

var KINDS = { sports: sports, garden: garden, city: cityPark };

/**
 * The boxes of a whole park: of a kind, on a footprint "1x2", a variant of
 * it - and at a stage of being laid out, 0 when it is done.
 */
function park(kind, fp, variant, stage) {
  var size = fp.split("x").map(Number),
    b = [],
    rnd = random([kind, fp, variant].join("/"));

  if (kind !== "garden" && kind !== "city")
    b.push(
      box(
        0,
        size[0] * TILE,
        0,
        size[1] * TILE,
        0,
        1,
        stage === 1 ? DIRT : GRASS,
      ),
    );

  KINDS[kind](b, size[0] * TILE, size[1] * TILE, +variant, stage, rnd);

  return b;
}

var FOOTPRINT_NAMES = ["1x1", "1x2", "1x3", "2x2", "2x3"];

/**
 * What every footprint can be, as shared/gen/shops has them: a design for
 * each kind of park, equally likely, its variant picked at random too.
 */
var FOOTPRINTS = (function () {
  var out = {};

  FOOTPRINT_NAMES.forEach(function (fp) {
    var size = fp.split("x").map(Number),
      tiles = [];

    for (var x = 0; x < size[0]; x++)
      for (var y = 0; y < size[1]; y++)
        tiles.push({
          x: x,
          y: y,
          parts: ["parks/{kind}/" + fp + "/{variant}/" + x + "/" + y],
        });

    out[fp] = Object.keys(KINDS).map(function (kind) {
      return {
        design: kind,
        weight: 1,
        axes: { kind: [kind], variant: ["0", "1"] },
        tiles: tiles,
      };
    });
  });

  return out;
})();

/**
 * Every part there is, by name without its turn: every tile of every kind,
 * footprint and variant of park - "parks/garden/2x2/1/0/1" - and of each
 * while it is laid out - "parks/frame/garden/2x2/1/0/1", stage 1 or 2
 * (shared/gen/stacking houseSite names them).
 */
var PARTS = (function () {
  var out = {};

  FOOTPRINT_NAMES.forEach(function (fp) {
    var size = fp.split("x").map(Number);

    Object.keys(KINDS).forEach(function (kind) {
      ["0", "1"].forEach(function (variant) {
        for (var x = 0; x < size[0]; x++)
          for (var y = 0; y < size[1]; y++) {
            out[
              "parks/" + kind + "/" + fp + "/" + variant + "/" + x + "/" + y
            ] = {
              kind: kind,
              fp: fp,
              variant: variant,
              stage: 0,
              x: x,
              y: y,
            };
            //a frame is named by the park's kind and footprint, and the
            //stage it is at: the variant shows only once it is done
            [1, 2].forEach(function (stage) {
              out[
                "parks/frame/" +
                  kind +
                  "/" +
                  fp +
                  "/" +
                  stage +
                  "/" +
                  x +
                  "/" +
                  y
              ] = {
                kind: kind,
                fp: fp,
                variant: "0",
                stage: stage,
                x: x,
                y: y,
              };
            });
          }
      });
    });
  });

  return out;
})();

var whole = {};

/**
 * The boxes of a part by its name without its turn, as it is painted: the
 * whole park, so far off as the tile is from the corner of the footprint -
 * onTile cuts out the tile.
 */
export function partBoxes(key) {
  var p = PARTS[key];

  if (p === undefined) throw new Error("no such part: " + key);

  var id = [p.kind, p.fp, p.variant, p.stage].join("/");

  if (whole[id] === undefined)
    whole[id] = park(p.kind, p.fp, p.variant, p.stage);

  return whole[id].map(function (c) {
    return iso.moved(c, -p.x * TILE, -p.y * TILE, 0);
  });
}

/**
 * Every part, by sprite name - "gen/parks/city/2x3/0/1/2/r1" - with its size
 * and pivot, without painting it; and what every footprint can be.
 */
export function describe() {
  var sizes = {};

  Object.keys(PARTS).forEach(function (key) {
    TURNS.forEach(function (turns) {
      sizes["gen/" + key + "/r" + turns] = measureOnTile(
        iso.rotate(partBoxes(key), 1, 1, turns),
      );
    });
  });

  return {
    sizes: sizes,
    data: {
      storey: STOREY,
      footprints: FOOTPRINTS,
      turns: TURNS,
      overlays: {},
    },
  };
}

/**
 * One part, by sprite name.
 *
 * @returns {{width, height, data}}
 */
export function paint(name) {
  var key = name.replace(/^gen\//, ""),
    at = key.lastIndexOf("/r"),
    turns = parseInt(key.slice(at + 2), 10);

  if (TURNS.indexOf(turns) === -1) throw new Error("no such part: " + name);

  return iso.toImage(
    onTile(iso.rotate(partBoxes(key.slice(0, at)), 1, 1, turns)),
  );
}

export { PARTS, STOREY, FOOTPRINTS };
