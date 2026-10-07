/**
 * Shops, put together out of parts the way the blocks are (shared/gen/blocks)
 * - only a shop does not grow storey by storey: it is one building, as big as
 * it is, cut up into the tiles it stands on. Every one is painted whole and
 * each of its tiles is what the whole shows on that tile (onTile), so a shop
 * three tiles long is still one roof.
 *
 * There are shops for every footprint of every tier (data/shops), and for
 * each a design or more, each with options it is put together with at random
 * for every shop built (client/compoundbuilding picks them, see describe
 * footprints):
 *
 *   - 1x1, a small-town shop: a flat roof behind a false front, a gable or a
 *     lean-to; a shop front with the door in the middle, at the corner or a
 *     door either side of the window; a firm's striped awning or none; a
 *     fascia over the windows or a board on its side, in the firm's colours
 *     and with its emblem (shared/gen/brands);
 *   - 1x2, a shop with a car park in front, a firm's: a flat roof with its
 *     emblem up on the parapet, a front all glass or between brick piers, awnings over
 *     the windows, a sign on a pole in the car park or not;
 *   - the small shops' other footprints: a parade of those small-town shops
 *     side by side, each with its own colours, awning and sign under the same
 *     kind of roof, or shops with car parks side by side - behind a row or
 *     two of car park on the deeper footprints (along);
 *   - 2x2, a superstore over the two tiles at the back, a car park over the
 *     two in front: a firm's - the builders' merchant in orange, or white
 *     and orange; the bank in navy and gold; the grocer in white with green
 *     stripes along it; the burger chain in grey and red - a flat roof or one raised over the way in and
 *     at the back, air conditioning on it, banners down its front, its
 *     emblem over the doors and maybe on a pole by the road;
 *   - 2x3, a shopping centre over four tiles with a glass vault along its
 *     roof, or a market hall under green glass vaults or saw-tooth roofs,
 *     stalls out in front - and a car park over the two tiles in front;
 *   - the stores' other footprints: the superstore along the street on one
 *     row of tiles or three long behind its car park (bigboxAt), or a
 *     department store of two floors over shop windows, every firm on its
 *     sign and a lantern of glass on its roof (departmentAt);
 *   - the farmers' markets, on every footprint: a square of cobbles or slabs
 *     with rows of stalls under striped canopies - or round its edge, round
 *     a fountain - and a farm's trailer come in with hay and pumpkins
 *     (openMarketAt); a timber roof on posts over every row of tiles, the
 *     stalls under it (coveredMarketAt); or on two rows of tiles or more a
 *     glass hall behind a square of stalls (marketHallAt).
 *
 * The cars in a car park are not painted: they are the vehicle generator's,
 * different for every shop (blocks baysOverlay).
 *
 * While a shop goes up its tiles are the same building site as anybody's
 * (shared/gen/sites) and then a steel frame of it (frame).
 */
import * as iso from "./isobox.js";
import { BRANDS, panel, parade } from "./brands.js";
import {
  box,
  darker,
  lighter,
  TILE,
  STOREY,
  GRASS,
  PAVING,
  ASPHALT,
  STRIPE,
  WOOD,
  METAL,
  VENT,
  CONCRETE,
  DIRT,
  MATTE,
  GLASSY,
  LIT,
  SIGN,
  made,
  madeOf,
  finishOf,
  shaded,
  random,
  namesOf,
  tree,
  bench,
  baysOverlay,
  onFace,
  backDoor,
  wallUnit,
  smears,
  graffiti,
  bins,
  dumpster,
  wireFence,
  onTile,
  measureOnTile,
  TURNS,
} from "./blocks.js";

var GLASS = [96, 136, 172],
  DARK_GLASS = [58, 82, 108],
  WHITE = [246, 246, 242],
  INK = [36, 38, 46],
  STEEL = [70, 84, 104],
  GREEN_GLASS = [96, 168, 120],
  CURB = [196, 194, 186];

//the small shops' colours: walls, trim round the windows, the roof, the door,
//the sign
var SMALL = {
  brick: {
    wall: [176, 84, 64],
    made: "brick",
    trim: [236, 228, 210],
    roof: [92, 64, 56],
    door: [40, 96, 72],
    sign: [30, 70, 50],
  },
  cream: {
    wall: [232, 216, 180],
    trim: [120, 64, 48],
    roof: [150, 70, 54],
    door: [40, 90, 150],
    sign: [176, 40, 40],
  },
  sage: {
    wall: [150, 182, 140],
    trim: [246, 242, 230],
    roof: [80, 96, 84],
    door: [196, 60, 50],
    sign: [224, 176, 40],
  },
  sky: {
    wall: [140, 186, 214],
    trim: [250, 248, 240],
    roof: [70, 84, 104],
    door: [232, 140, 40],
    sign: [200, 56, 76],
  },
};

//the shops with a car park, each a firm's (shared/gen/brands): the grocer,
//the burger bar, the bank and the brewery's own pub - the palettes' names
//are kept from before they were, for the shops already built
var STORE = {
  grocer: {
    brand: "orchard",
    wall: [228, 224, 214],
    trim: BRANDS.orchard.main,
    roof: [120, 120, 124],
    sign: BRANDS.orchard.main,
  },
  red: {
    brand: "blaze",
    wall: [214, 206, 196],
    trim: BRANDS.blaze.main,
    roof: [118, 116, 118],
    sign: BRANDS.blaze.main,
  },
  blue: {
    brand: "pillar",
    wall: [220, 226, 232],
    trim: BRANDS.pillar.main,
    roof: [116, 120, 128],
    sign: BRANDS.pillar.main,
  },
  brick: {
    brand: "amber",
    wall: [168, 92, 72],
    made: "brick",
    trim: [236, 226, 200],
    roof: [96, 90, 88],
    sign: BRANDS.amber.main,
  },
};

//the superstores, each a firm's: its walls - a colour of their own, clad in
//steel sheet - the band along the top, and the stripes along it for one
//that has them. The builders' merchant in its orange, or white and orange;
//the bank's navy and gold; the grocer's hypermarket; the burger chain's
var BIGBOX = {
  orange: {
    brand: "bolt",
    wall: BRANDS.bolt.main.slice(),
    band: BRANDS.bolt.accent,
  },
  blue: {
    brand: "pillar",
    wall: BRANDS.pillar.main.slice(),
    band: BRANDS.pillar.accent,
  },
  whiteorange: {
    brand: "bolt",
    wall: [238, 238, 234],
    band: BRANDS.bolt.main,
  },
  greenstripes: {
    brand: "orchard",
    wall: [238, 238, 234],
    band: BRANDS.orchard.main,
    stripes: true,
  },
  red: {
    brand: "blaze",
    wall: [156, 158, 164],
    band: BRANDS.blaze.main,
  },
};

//what is on a superstore's banners: the band's colour and a mark of the
//firm's other colour on it
function bannerMark(S) {
  var f = BRANDS[S.brand];

  return S.band === f.accent ? f.main : f.accent;
}

//the shopping centres
var MALL = {
  sand: { wall: [214, 190, 150], band: [180, 90, 60], trim: [244, 236, 220] },
  white: { wall: [236, 236, 232], band: [60, 120, 180], trim: [200, 210, 220] },
  brick: { wall: [160, 86, 64], band: [232, 220, 196], trim: [236, 228, 210] },
};

//the walls of a palette made of something of its own - brick - and the
//superstores' sheds, clad in steel sheet
[SMALL, STORE].forEach(function (set) {
  Object.keys(set).forEach(function (k) {
    if (set[k].made) madeOf(set[k].wall, set[k].made);
  });
});
Object.keys(BIGBOX).forEach(function (k) {
  madeOf(BIGBOX[k].wall, "metal");
});

//where each design's building stands on its footprint, and how high - far
//enough back from the car park that nothing of it reaches over the tile's
//edge onto it: a tile's parts are only ever painted on that tile - and far
//enough from the back for the service yard behind it (back)
var RECT = {
  small: { x0: 3, x1: 29, y0: 9, y1: 28, h: 13 },
  store: { x0: 2, x1: 30, y0: 38, y1: 58, h: 14 },
  bigbox: { x0: 2, x1: 62, y0: 38, y1: 56, h: 18 },
  mall: { x0: 2, x1: 62, y0: 38, y1: 88, h: 20 },
  market: { x0: 2, x1: 62, y0: 38, y1: 88, h: 10 },
};

//every footprint a farmers' market comes on
var MARKET_FOOTPRINTS = ["1x2", "2x1", "3x1", "1x3", "2x2", "2x3", "3x2"];

/* --- Pictures -------------------------------------------------------- */

/**
 * A picture on a face, a box to a cell, w cells across and h up: on the face
 * looking towards -y at y (axis "y") from x = a, or on the one looking
 * towards -x at x (axis "x") from y = a - its left as it is seen being at
 * the far end. ink(i, j) is the colour of a cell, from the bottom left.
 */
function picture(b, axis, at, a, z0, w, h, ink) {
  for (var i = 0; i < w; i++)
    for (var j = 0; j < h; j++) {
      var c = ink(i, j);

      if (c === null) continue;

      //lit at night, as every sign is
      if (axis === "y")
        b.push(
          box(a + i, a + i + 1, at - 0.15, at, z0 + j, z0 + j + 1, c, SIGN),
        );
      else
        b.push(
          box(
            at - 0.15,
            at,
            a + w - i - 1,
            a + w - i,
            z0 + j,
            z0 + j + 1,
            c,
            SIGN,
          ),
        );
    }
}

//a mark in the middle of a board of colour bg: a round dot of colour mark -
//for a shop of no firm's, which has no emblem of its own
function plainMark(bg, mark, w, h) {
  return function (i, j) {
    var dx = (i + 0.5 - w / 2) / (h / 2),
      dy = (j + 0.5 - h / 2) / (h / 2);

    return dx * dx + dy * dy < 0.5 ? mark : bg;
  };
}

//which firm a small shop's awning colour says it is (shared/gen/brands): a
//burger bar in red, a grocer in green, a bank in navy, a pub in amber - and
//under no awning a shop of nobody's but its own
var SMALL_BRANDS = {
  red: "blaze",
  green: "orchard",
  navy: "pillar",
  amber: "amber",
};

/* --- Bits of shops --------------------------------------------------- */

/**
 * The ground of the tiles from y0 to y1 along x0 to x1: grass, and the
 * pavement in front from yp to the building.
 */
function lot(b, x0, x1, y0, y1, yp, ye) {
  b.push(box(x0, x1, y0, y1, 0, 1, GRASS));
  b.push(box(x0, x1, yp, ye, 1, 1.2, PAVING));
}

//a window from a0 to a1 along the front at y, z0 to z1 high, in its frame
function windowAt(b, y, a0, a1, z0, z1, trim, mullions) {
  b.push(box(a0 - 0.5, a1 + 0.5, y - 0.3, y, z0 - 0.5, z1 + 0.5, trim));
  b.push(box(a0, a1, y - 0.4, y - 0.3, z0, z1, GLASS, GLASSY));
  for (var m = a0 + mullions; m < a1 - 0.5; m += mullions)
    b.push(box(m - 0.25, m + 0.25, y - 0.5, y - 0.3, z0, z1, trim));
}

//a door from a0 to a1 at y, its upper half glazed
function doorAt(b, y, a0, a1, z1, trim, color) {
  b.push(box(a0 - 0.5, a1 + 0.5, y - 0.3, y, 1.2, z1 + 0.5, trim));
  b.push(box(a0, a1, y - 0.4, y - 0.3, 1.2, z1, color));
  b.push(box(a0 + 0.6, a1 - 0.6, y - 0.5, y - 0.4, z1 * 0.5, z1 - 0.7, GLASS));
}

/**
 * A striped awning over the front at y from a0 to a1: sloping out and down
 * from z, its valance hanging at the front, stripes two wide of the colour
 * and white.
 */
function awning(b, y, a0, a1, z, color) {
  var depth = 4.5,
    d,
    x;

  for (d = 0; d < depth; d += 0.5)
    for (x = a0; x < a1; x += 2) {
      var c = Math.floor((x - a0) / 2) % 2 ? WHITE : color,
        zz = z - (d / depth) * 1.8;

      b.push(box(x, Math.min(x + 2, a1), y - d - 0.5, y - d, zz - 0.4, zz, c));
    }

  for (x = a0; x < a1; x += 2)
    b.push(
      box(
        x,
        Math.min(x + 2, a1),
        y - depth - 0.3,
        y - depth,
        z - 2.6,
        z - 1.8,
        Math.floor((x - a0) / 2) % 2 ? WHITE : color,
      ),
    );
}

//a unit of air conditioning at x, y on the roof at z
function airConditioner(b, x, y, z) {
  b.push(box(x, x + 5, y, y + 4, z, z + 3, VENT));
  b.push(box(x + 1, x + 4, y + 0.5, y + 3.5, z + 3, z + 3.3, INK));
}

/**
 * A roof from x0 to x1 and y0 to y1 over z0, under every one of the slopes -
 * each [y, h, g], as high as h over z0 at y and rising g for every unit
 * along y: one for a lean-to, two meeting at a ridge for a gable. Each slope
 * is a plane a unit deep (iso cut), lit by which way it looks, and under it
 * the gable ends of the walls from wx0 to wx1 and wy0 to wy1.
 *
 * A slope of a half, rising or falling, or a quarter falling, keeps the
 * edges at the gable ends clean lines: a step up for one across, level, or a
 * step down for four across.
 */
function slopedRoof(
  b,
  x0,
  x1,
  y0,
  y1,
  z0,
  slopes,
  color,
  wall,
  wx0,
  wx1,
  wy0,
  wy1,
  finish,
) {
  var top = 0;

  function plane(q, down) {
    return iso.plane(0, -q[2], 1, z0 + q[1] - q[2] * q[0] - down);
  }

  slopes.forEach(function (q) {
    top = Math.max(top, q[1] + q[2] * (y0 - q[0]), q[1] + q[2] * (y1 - q[0]));
  });

  slopes.forEach(function (q) {
    b.push(
      iso.cut(
        box(x0, x1, y0, y1, z0, z0 + top, color, finish),
        slopes
          .map(function (o) {
            return plane(o, 0);
          })
          .concat([iso.plane(0, q[2], -1, -(z0 + q[1] - q[2] * q[0] - 1))]),
      ),
    );
  });

  b.push(
    iso.cut(
      box(wx0, wx1, wy0, wy1, z0, z0 + top, wall, finishOf(wall, MATTE)),
      slopes.map(function (o) {
        return plane(o, 1);
      }),
    ),
  );
}

/**
 * A barrel vault from x0 to x1 along y from y0 to y1, its springing at z0: a
 * shell of glass half a pixel across at a time, lit by which way it looks
 * there, ribs every six along it, and glass ends.
 */
function vault(b, x0, x1, y0, y1, z0, color, rib) {
  var r = (x1 - x0) / 2,
    mid = (x0 + x1) / 2,
    x,
    y;

  for (x = x0; x < x1; x += 0.5) {
    var dx = x + 0.25 - mid,
      h = Math.sqrt(Math.max(0, r * r - dx * dx));

    b.push(
      box(
        x,
        x + 0.5,
        y0,
        y1,
        z0 + h - 0.6,
        z0 + h,
        shaded(color, dx / r, 0, h / r + 0.05),
        LIT,
      ),
    );
    b.push(box(x, x + 0.5, y0, y0 + 0.4, z0, z0 + h - 0.6, color, GLASSY));
    b.push(box(x, x + 0.5, y1 - 0.4, y1, z0, z0 + h - 0.6, color, GLASSY));

    for (y = y0; y < y1; y += 6)
      b.push(
        box(
          x,
          x + 0.5,
          y,
          y + 0.6,
          z0 + h - 0.7,
          z0 + h + 0.15,
          shaded(rib, dx / r, 0, h / r + 0.05),
          LIT,
        ),
      );
  }
}

/**
 * The back of a shop and its sides, where nobody is meant to look: a steel
 * door out to the bins - a skip as well behind a big one - the air
 * conditioning's units on the wall, rain streaks down it, a tag or two
 * sprayed on it, and a wire fence along the back of the lot, a gate in it
 * for the bins to go out by.
 *
 * @param R {{x0, x1, y0, y1}} the walls
 * @param h {number} how high they are
 * @param edge {number} where the lot ends behind the shop
 */
function back(b, R, h, wall, edge, rnd) {
  var big = R.x1 - R.x0 > 40,
    door = R.x0 + 3 + Math.floor(rnd() * 4),
    units = big ? 3 : 1 + Math.floor(rnd() * 2),
    i;

  backDoor(b, R, "+y", door, 1);
  bins(b, door + 5, R.y1 + 0.5, big ? 3 : 2, "x");
  if (big) {
    dumpster(b, door + 12, R.y1 + 0.6, "x");
    backDoor(b, R, "+y", R.x1 - 14, 1);
  }

  for (i = 0; i < units; i++)
    wallUnit(
      b,
      R,
      "+y",
      R.x1 - 7 - i * (big ? 13 : 7) - Math.floor(rnd() * 2),
      Math.min(h - 5, 5.5 + Math.floor(rnd() * 3)),
      wall,
    );

  smears(b, R, "+y", R.x0, R.x1, 1.5, h, wall, rnd);
  ["-x", "+x"].forEach(function (f) {
    smears(b, R, f, R.y0, R.y1, 1.5, h, wall, rnd);
  });
  wallUnit(b, R, rnd() < 0.5 ? "-x" : "+x", R.y1 - 7, 5, wall);

  if (rnd() < 0.75)
    graffiti(b, R, "+y", door + (big ? 20 : 9), 2.2, big ? 14 : 8, 5, rnd);
  if (rnd() < 0.5)
    graffiti(b, R, rnd() < 0.5 ? "-x" : "+x", R.y1 - 14, 2, 10, 4, rnd);

  //the fence along the back, a gate's width left open by the bins
  wireFence(b, "x", edge - 0.6, R.x0 - 1, R.x1 + 1, [[door + 4, door + 11]]);
}

/* --- The designs ----------------------------------------------------- */

function smallShop(o, rnd) {
  var b = [],
    P = SMALL[o.pal],
    R = RECT.small,
    h = R.h,
    y = R.y0;

  lot(b, 0, TILE, 0, TILE, 1, R.y0);
  b.push(
    box(
      R.x0 - 0.3,
      R.x1 + 0.3,
      R.y0 - 0.3,
      R.y1 + 0.3,
      1,
      2,
      darker(P.wall, 0.35),
    ),
  );
  b.push(box(R.x0, R.x1, R.y0, R.y1, 2, h, P.wall, finishOf(P.wall, MATTE)));

  //the shop front
  if (o.front === "center") {
    windowAt(b, y, 5, 12, 3, 9, P.trim, 3.5);
    doorAt(b, y, 14, 18, 9, P.trim, P.door);
    windowAt(b, y, 20, 27, 3, 9, P.trim, 3.5);
  } else if (o.front === "corner") {
    doorAt(b, y, 5, 9, 9, P.trim, P.door);
    windowAt(b, y, 11, 27, 3, 9, P.trim, 4);
  } else {
    doorAt(b, y, 5, 9, 9, P.trim, P.door);
    windowAt(b, y, 11, 21, 3, 9, P.trim, 5);
    doorAt(b, y, 23, 27, 9, P.trim, P.door);
  }

  //the fascia over it, in its firm's colours and pattern - or plain, and a
  //board on the side with the firm's emblem (shared/gen/brands)
  var firm = SMALL_BRANDS[o.awning],
    sign = firm ? BRANDS[firm].main : P.sign;

  b.push(box(R.x0 + 1, R.x1 - 1, y - 0.6, y, 10, 13, sign, SIGN));
  if (o.sign === "fascia") {
    if (firm) picture(b, "y", y - 0.6, R.x0 + 2, 11, 22, 2, panel(firm, 22, 2));
  } else {
    b.push(box(R.x0 - 0.6, R.x0, 12, 25, 3, 12, P.trim));
    picture(
      b,
      "x",
      R.x0 - 0.6,
      12.5,
      4,
      12,
      7,
      firm ? panel(firm, 12, 7) : plainMark(P.sign, P.door, 12, 7),
    );
  }

  if (firm) awning(b, y, R.x0 + 0.5, R.x1 - 0.5, 9.5, BRANDS[firm].main);

  //the roof
  if (o.roof === "flat") {
    b.push(box(R.x0, R.x1, R.y0, R.y1, h, h + 0.4, P.roof));
    //a false front, standing up over the roof, and a low parapet round it
    b.push(
      box(
        R.x0,
        R.x1,
        R.y0,
        R.y0 + 0.8,
        h,
        h + 3,
        P.wall,
        finishOf(P.wall, MATTE),
      ),
    );
    b.push(
      box(
        R.x0 - 0.3,
        R.x1 + 0.3,
        R.y0 - 0.3,
        R.y0 + 1.1,
        h + 3,
        h + 3.6,
        P.trim,
      ),
    );
    b.push(box(R.x0, R.x0 + 0.8, R.y0, R.y1, h, h + 1.2, P.wall));
    b.push(box(R.x1 - 0.8, R.x1, R.y0, R.y1, h, h + 1.2, P.wall));
    b.push(box(R.x0, R.x1, R.y1 - 0.8, R.y1, h, h + 1.2, P.wall));
    airConditioner(b, R.x1 - 9, R.y1 - 8, h + 0.4);
  } else if (o.roof === "gable") {
    var mid = (R.y0 + R.y1) / 2;

    slopedRoof(
      b,
      R.x0 - 1,
      R.x1 + 1,
      R.y0 - 2,
      R.y1 + 2,
      h,
      [
        [R.y0 - 2, 1, 0.5],
        [R.y1 + 2, 1, -0.5],
      ],
      P.roof,
      P.wall,
      R.x0,
      R.x1,
      R.y0,
      R.y1,
      made("slate"),
    );
  } else {
    //a lean-to, high at the front
    slopedRoof(
      b,
      R.x0 - 1,
      R.x1 + 1,
      R.y0 - 2,
      R.y1 + 2,
      h,
      [[R.y1 + 2, 1, -0.25]],
      P.roof,
      P.wall,
      R.x0,
      R.x1,
      R.y0,
      R.y1,
      made("metal"),
    );
  }

  //a bench out front, or a tub of flowers
  if (rnd() < 0.5) bench(b, 24, 3);
  else tree(b, 28, 4, 2);

  back(b, R, h, P.wall, TILE, rnd);
  return b;
}

function store(o, rnd) {
  var b = [],
    P = STORE[o.pal],
    R = RECT.store,
    h = R.h,
    y = R.y0;

  lot(b, 0, TILE, TILE, 2 * TILE, TILE, R.y0);
  b.push(box(R.x0, R.x1, R.y0, R.y1, 1, h, P.wall, finishOf(P.wall, MATTE)));

  //the front: glass all along, or windows between brick piers; the doors in
  //the middle under a canopy on posts
  if (o.front === "glass") {
    windowAt(b, y, 4, 12, 2, 10, P.trim, 2.7);
    windowAt(b, y, 20, 28, 2, 10, P.trim, 2.7);
  } else {
    [4, 8.5, 20, 24.5].forEach(function (a) {
      windowAt(b, y, a, a + 3.5, 2.5, 10, P.trim, 4);
    });
    [3, 7.5, 12, 19, 23.5, 28].forEach(function (a) {
      b.push(box(a, a + 1, y - 0.8, y, 1, h, darker(P.wall, 0.15)));
    });
  }
  b.push(box(13, 19, y - 0.3, y, 1, 10.5, P.trim));
  b.push(box(13.5, 18.5, y - 0.45, y - 0.3, 1.2, 10, DARK_GLASS, GLASSY));
  b.push(box(10, 22, y - 5, y, 11, 11.8, P.trim));
  [10.4, 21].forEach(function (a) {
    b.push(box(a, a + 0.6, y - 4.6, y - 4, 1.2, 11, METAL));
  });

  if (o.awning !== "none") {
    //in the firm's colour, whichever the shop was built with
    var color = BRANDS[P.brand].main;

    awning(b, y, 3.5, 12.5, 11.5, color);
    awning(b, y, 19.5, 28.5, 11.5, color);
  }

  //the roof, the parapet raised over the doors with the name on it
  b.push(box(R.x0, R.x1, R.y0, R.y1, h, h + 0.4, P.roof));
  b.push(box(R.x0, R.x1, R.y0, R.y0 + 0.8, h, h + 1.4, P.wall));
  b.push(box(R.x0, R.x0 + 0.8, R.y0, R.y1, h, h + 1.4, P.wall));
  b.push(box(R.x1 - 0.8, R.x1, R.y0, R.y1, h, h + 1.4, P.wall));
  b.push(box(R.x0, R.x1, R.y1 - 0.8, R.y1, h, h + 1.4, P.wall));
  b.push(box(7, 25, R.y0, R.y0 + 0.8, h, h + 5, P.sign, SIGN));
  picture(b, "y", R.y0, 8, h + 0.5, 16, 4, panel(P.brand, 16, 4));
  airConditioner(b, 5, R.y1 - 9, h + 0.4);
  airConditioner(b, 21, R.y1 - 7, h + 0.4);

  back(b, R, h, P.wall, 2 * TILE, rnd);
  return b;
}

function bigbox(o, rnd) {
  var b = [],
    S = BIGBOX[o.style],
    R = RECT.bigbox,
    h = R.h,
    y = R.y0,
    top = o.roof === "stepped" ? h + 6 : h + 2;

  lot(b, 0, 2 * TILE, TILE, 2 * TILE, TILE, R.y0);
  b.push(box(R.x0, R.x1, R.y0, R.y1, 1, h, S.wall, finishOf(S.wall, MATTE)));
  b.push(
    box(R.x0 - 0.2, R.x1 + 0.2, R.y0 - 0.2, R.y1 + 0.2, h - 4, h - 1, S.band),
  );

  if (S.stripes)
    [4, 7, 10].forEach(function (z) {
      b.push(
        box(R.x0 - 0.2, R.x1 + 0.2, R.y0 - 0.2, R.y1 + 0.2, z, z + 1, S.band),
      );
    });

  //a stepped roof: a higher block along the back
  b.push(box(R.x0, R.x1, R.y0, R.y1, h, h + 0.4, [128, 130, 134]));
  if (o.roof === "stepped") {
    b.push(
      box(
        R.x0 + 4,
        R.x1 - 4,
        R.y0 + 13,
        R.y1,
        h,
        h + 4,
        S.wall,
        finishOf(S.wall, MATTE),
      ),
    );
    b.push(
      box(R.x0 + 4, R.x1 - 4, R.y0 + 13, R.y1, h + 4, h + 4.4, [128, 130, 134]),
    );
  }

  //the way in: a block standing out of the front, the doors in it, its
  //name over them
  b.push(box(23, 41, y - 3, y + 2, 1, top, S.band, finishOf(S.band, MATTE)));
  b.push(box(26, 38, y - 3.3, y - 3, 1.2, 9, DARK_GLASS, GLASSY));
  b.push(box(31.8, 32.2, y - 3.5, y - 3.3, 1.2, 9, METAL));
  b.push(box(24, 40, y - 5.5, y - 3, 9.5, 10.3, S.wall));
  [24.4, 39].forEach(function (a) {
    b.push(box(a, a + 0.6, y - 5.1, y - 4.5, 1.2, 9.5, METAL));
  });
  picture(b, "y", y - 3, 25, top - 6, 14, 5, panel(S.brand, 14, 5));

  //banners hanging down the front
  [7, 13, 48, 54].forEach(function (a) {
    b.push(box(a, a + 3, y - 0.5, y, 6, 13, S.band));
    b.push(box(a + 0.5, a + 2.5, y - 0.6, y - 0.5, 8, 10, bannerMark(S)));
  });

  //air conditioning along the roof
  for (var i = 0; i < 5; i++)
    airConditioner(
      b,
      R.x0 + 4 + i * 11 + Math.floor(rnd() * 3),
      R.y0 + 4 + Math.floor(rnd() * 6),
      h + 0.4,
    );

  back(b, R, h, S.wall, 2 * TILE, rnd);
  return b;
}

function mall(o, rnd) {
  var b = [],
    S = MALL[o.style],
    R = RECT.mall,
    h = R.h,
    y = R.y0;

  lot(b, 0, 2 * TILE, TILE, 3 * TILE, TILE, R.y0);
  b.push(box(R.x0, R.x1, R.y0, R.y1, 1, h, S.wall, finishOf(S.wall, MATTE)));
  b.push(box(R.x0 - 0.2, R.x1 + 0.2, R.y0 - 0.2, R.y1 + 0.2, h - 3, h, S.band));

  //pilasters along the front, shop windows between
  for (var a = R.x0 + 2; a < R.x1 - 2; a += 8) {
    if (a > 18 && a < 44) continue;
    b.push(box(a, a + 1.2, y - 0.6, y, 1, h - 3, S.trim));
    windowAt(b, y, a + 2, a + 7, 2, 8, S.trim, 2.5);
  }

  //the way in: glass two storeys high, its name over it
  b.push(box(21, 43, y - 4, y, 1, h + 4, S.trim, finishOf(S.trim, MATTE)));
  b.push(box(23, 41, y - 4.3, y - 4, 1.2, h - 2, GLASS, GLASSY));
  for (var m = 25; m < 41; m += 3)
    b.push(box(m, m + 0.4, y - 4.5, y - 4.3, 1.2, h - 2, S.trim));
  b.push(box(22, 42, y - 4.6, y - 4, h - 1.5, h + 3.5, S.band, SIGN));
  picture(b, "y", y - 4.6, 24, h - 1, 16, 4, parade(16, 4));

  //the roof, a glass vault along the middle of it, and air conditioning
  b.push(box(R.x0, R.x1, R.y0, R.y1, h, h + 0.4, [128, 130, 134]));
  vault(b, 25, 39, R.y0 + 8, R.y1 - 6, h + 0.4, GLASS, S.trim);
  for (var i = 0; i < 6; i++)
    airConditioner(
      b,
      i % 2 ? R.x1 - 14 : R.x0 + 6,
      R.y0 + 10 + Math.floor(i / 2) * 14 + Math.floor(rnd() * 3),
      h + 0.4,
    );

  back(b, R, h, S.wall, 3 * TILE, rnd);
  return b;
}

function market(o, rnd) {
  var b = [],
    R = RECT.market,
    h = R.h,
    y = R.y0,
    brick = [168, 92, 72],
    frame = [40, 104, 64];

  lot(b, 0, 2 * TILE, TILE, 3 * TILE, TILE, R.y0);
  //low brick walls, glass over them to the eaves
  b.push(box(R.x0, R.x1, R.y0, R.y1, 1, 5, brick, made("brick")));
  b.push(
    box(
      R.x0 + 0.3,
      R.x1 - 0.3,
      R.y0 + 0.3,
      R.y1 - 0.3,
      5,
      h,
      GREEN_GLASS,
      GLASSY,
    ),
  );
  for (var a = R.x0; a <= R.x1; a += 6)
    b.push(
      box(
        Math.min(a, R.x1 - 0.6),
        Math.min(a, R.x1 - 0.6) + 0.6,
        y,
        y + 0.6,
        5,
        h,
        frame,
      ),
    );
  b.push(box(R.x0, R.x1, R.y0, R.y1, h, h + 0.5, frame));

  if (o.roof === "barrel")
    [
      [R.x0, 22],
      [22, 42],
      [42, R.x1],
    ].forEach(function (v) {
      vault(b, v[0], v[1], R.y0, R.y1, h + 0.5, GREEN_GLASS, frame);
    });
  else
    //saw-tooth roofs, each sloping down to the back from the glass that
    //looks out over the front of it, bars down the slope every six
    for (var s = R.y0; s < R.y1 - 1; s += 14) {
      slopedRoof(
        b,
        R.x0,
        R.x1,
        s,
        Math.min(s + 14, R.y1),
        h + 0.5,
        [[s + 14, 1, -0.5]],
        GREEN_GLASS,
        GREEN_GLASS,
        R.x0,
        R.x1,
        s,
        s + 14,
        GLASSY,
      );
      for (var bx = R.x0 + 3; bx < R.x1; bx += 6)
        b.push(
          iso.cut(
            box(bx, bx + 1, s, Math.min(s + 14, R.y1), h + 0.5, h + 9.5, frame),
            [iso.plane(0, 0.5, 1, h + 0.5 + 1.5 + 0.5 * (s + 14))],
          ),
        );
      //the glass along the front of the tooth
      b.push(
        box(R.x0, R.x1, s, s + 0.4, h + 0.5, h + 8.5, GREEN_GLASS, GLASSY),
      );
    }

  //the doors, the name over them, the stalls out in front
  b.push(box(28, 36, y - 0.4, y, 1.2, 7, WOOD));
  b.push(box(26, 38, y - 0.8, y, 7.5, 10.5, frame));
  picture(b, "y", y - 0.8, 27, 8, 10, 2, panel("orchard", 10, 2));

  [6, 14, 44, 52].forEach(function (x, i) {
    var crates = [
      [206, 40, 44],
      [240, 150, 40],
      [110, 170, 60],
      [230, 200, 60],
    ];

    b.push(box(x, x + 6, y - 5.5, y - 1.5, 1.2, 3.2, WOOD));
    b.push(box(x + 0.3, x + 2.8, y - 5.2, y - 1.8, 3.2, 4, crates[i % 4]));
    b.push(
      box(
        x + 3.2,
        x + 5.7,
        y - 5.2,
        y - 1.8,
        3.2,
        4,
        crates[(i + 1 + Math.floor(rnd() * 2)) % 4],
      ),
    );
    awning(
      b,
      y - 1,
      x - 0.5,
      x + 6.5,
      7.5,
      i % 2 ? [206, 40, 44] : [36, 132, 72],
    );
  });

  back(b, R, h, brick, 3 * TILE, rnd);
  return b;
}

/* --- More footprints ------------------------------------------------- */

/**
 * A superstore W tiles along the street and D deep, its first `rows` rows
 * of tiles a car park (laid as tiles of their own) - or none, its doors on
 * the pavement: a shed of steel sheet in a firm's colours, the band along
 * the top, the way in standing out of the middle of the front, banners down
 * it, air conditioning along the roof.
 */
function bigboxAt(W, D, rows) {
  var w = W * TILE,
    R = {
      x0: 2,
      x1: w - 2,
      y0: rows * TILE + (rows > 0 ? 6 : 8),
      y1: D * TILE - 7,
      h: D - rows > 1 ? 18 : 16,
    };

  function paint(o, rnd) {
    var b = [],
      S = BIGBOX[o.style],
      h = R.h,
      y = R.y0,
      mid = w / 2,
      top = o.roof === "stepped" ? h + 6 : h + 2;

    lot(b, 0, w, rows * TILE, D * TILE, rows * TILE + (rows ? 0 : 1), R.y0);
    b.push(box(R.x0, R.x1, R.y0, R.y1, 1, h, S.wall, finishOf(S.wall, MATTE)));
    b.push(
      box(R.x0 - 0.2, R.x1 + 0.2, R.y0 - 0.2, R.y1 + 0.2, h - 4, h - 1, S.band),
    );
    if (S.stripes)
      [4, 7, 10].forEach(function (z) {
        b.push(
          box(R.x0 - 0.2, R.x1 + 0.2, R.y0 - 0.2, R.y1 + 0.2, z, z + 1, S.band),
        );
      });

    b.push(box(R.x0, R.x1, R.y0, R.y1, h, h + 0.4, [128, 130, 134]));
    if (o.roof === "stepped") {
      b.push(
        box(
          R.x0 + 4,
          R.x1 - 4,
          R.y0 + 13,
          R.y1,
          h,
          h + 4,
          S.wall,
          finishOf(S.wall, MATTE),
        ),
      );
      b.push(
        box(
          R.x0 + 4,
          R.x1 - 4,
          R.y0 + 13,
          R.y1,
          h + 4,
          h + 4.4,
          [128, 130, 134],
        ),
      );
    }

    //the way in, its name over it
    b.push(
      box(
        mid - 9,
        mid + 9,
        y - 3,
        y + 2,
        1,
        top,
        S.band,
        finishOf(S.band, MATTE),
      ),
    );
    b.push(box(mid - 6, mid + 6, y - 3.3, y - 3, 1.2, 9, DARK_GLASS, GLASSY));
    b.push(box(mid - 0.2, mid + 0.2, y - 3.5, y - 3.3, 1.2, 9, METAL));
    b.push(box(mid - 8, mid + 8, y - 5.5, y - 3, 9.5, 10.3, S.wall));
    [mid - 7.6, mid + 7].forEach(function (a) {
      b.push(box(a, a + 0.6, y - 5.1, y - 4.5, 1.2, 9.5, METAL));
    });
    picture(b, "y", y - 3, mid - 7, top - 6, 14, 5, panel(S.brand, 14, 5));

    //banners down the front either side of it, and windows on the street
    for (var a = R.x0 + 5; a < R.x1 - 6; a += 6) {
      if (Math.abs(a + 1.5 - mid) < 13) continue;
      if (rows === 0 && Math.floor((a - R.x0) / 6) % 2 === 1)
        windowAt(b, y, a - 1, a + 4, 2.5, 8, S.band, 2.5);
      else {
        b.push(box(a, a + 3, y - 0.5, y, 6, 13, S.band));
        b.push(box(a + 0.5, a + 2.5, y - 0.6, y - 0.5, 8, 10, bannerMark(S)));
      }
    }

    for (var i = 0; i < Math.floor((R.x1 - R.x0 - 8) / 11); i++)
      airConditioner(
        b,
        R.x0 + 4 + i * 11 + Math.floor(rnd() * 3),
        R.y0 + 3 + Math.floor(rnd() * Math.max(1, R.y1 - R.y0 - 10)),
        h + 0.4,
      );

    if (rows === 0) {
      bench(b, R.x0 + 2, 2);
      tree(b, w - 4, 4, 2);
    }

    back(b, R, h, S.wall, D * TILE, rnd);
    return b;
  }

  return { paint: paint, rect: R };
}

/**
 * A department store W tiles along the street and D deep, its first `rows`
 * rows of tiles a car park: two storeys over a row of shop windows between
 * pilasters, a canopy along the front, revolving doors in the middle under
 * every firm's colours on its sign, a cornice along the top - and a lantern
 * of glass over the middle of its roof.
 */
function departmentAt(W, D, rows) {
  var w = W * TILE,
    R = {
      x0: 2,
      x1: w - 2,
      y0: rows * TILE + (rows > 0 ? 6 : 5),
      y1: D * TILE - 7,
      h: 28,
    };

  function paint(o, rnd) {
    var b = [],
      S = MALL[o.style],
      h = R.h,
      y = R.y0,
      mid = w / 2,
      a;

    lot(b, 0, w, rows * TILE, D * TILE, rows * TILE + (rows ? 0 : 1), R.y0);
    b.push(box(R.x0, R.x1, R.y0, R.y1, 1, h, S.wall, finishOf(S.wall, MATTE)));
    //the line between the storeys and the cornice
    b.push(box(R.x0 - 0.3, R.x1 + 0.3, R.y0 - 0.3, R.y1 + 0.3, 12, 13, S.trim));
    b.push(
      box(R.x0 - 0.5, R.x1 + 0.5, R.y0 - 0.5, R.y1 + 0.5, h - 2, h, S.band),
    );

    //shop windows, and the windows of the floor over them
    for (a = R.x0 + 1.5; a < R.x1 - 6; a += 7) {
      b.push(box(a, a + 1.2, y - 0.6, y, 1, 12, S.trim));
      if (Math.abs(a + 4 - mid) > 7)
        windowAt(b, y, a + 2, a + 6, 2, 9, S.trim, 2);
      windowAt(b, y, a + 2, a + 6, 15.5, 21.5, S.trim, 2);
    }
    //down the sides, a window to every bay of both floors in its frame
    ["-x", "+x"].forEach(function (f) {
      for (var k = R.y0 + 3; k < R.y1 - 6; k += 7)
        [
          [3, 9],
          [15.5, 21.5],
        ].forEach(function (z) {
          b.push(
            onFace(
              R,
              f,
              k - 0.5,
              k + 4.5,
              z[0] - 0.5,
              z[1] + 0.5,
              0,
              0.3,
              S.trim,
            ),
          );
          b.push(onFace(R, f, k, k + 4, z[0], z[1], 0.3, 0.4, GLASS, GLASSY));
        });
    });

    //the way in: revolving doors, a canopy over them, the sign over that
    b.push(box(mid - 5, mid + 5, y - 0.4, y, 1.2, 10, DARK_GLASS, GLASSY));
    b.push(box(mid - 0.3, mid + 0.3, y - 0.6, y - 0.4, 1.2, 10, METAL));
    b.push(box(mid - 7, mid + 7, y - 4, y, 10.5, 11.5, S.band));
    if (o.awning !== "none")
      awning(
        b,
        y,
        R.x0 + 1,
        mid - 7.5,
        11,
        o.awning === "red" ? [200, 50, 44] : [36, 120, 72],
      );
    if (o.awning !== "none")
      awning(
        b,
        y,
        mid + 7.5,
        R.x1 - 1,
        11,
        o.awning === "red" ? [200, 50, 44] : [36, 120, 72],
      );
    b.push(box(mid - 8, mid + 8, y - 1, y, 21.8, 25.8, S.band, SIGN));
    picture(b, "y", y - 1, mid - 7, 22.3, 14, 3, parade(14, 3));

    //the roof: flat behind the cornice, a lantern of glass, plant on it
    b.push(box(R.x0, R.x1, R.y0, R.y1, h, h + 0.4, [128, 130, 134]));
    b.push(box(R.x0, R.x1, R.y0, R.y0 + 0.8, h, h + 1.6, S.wall));
    vault(
      b,
      mid - 5,
      mid + 5,
      R.y0 + 6,
      Math.max(R.y0 + 14, R.y1 - 8),
      h + 0.4,
      GLASS,
      S.trim,
    );
    airConditioner(b, R.x0 + 2, R.y1 - 7, h + 0.4);
    if (W > 1) airConditioner(b, R.x1 - 8, R.y1 - 7, h + 0.4);

    back(b, R, h, S.wall, D * TILE, rnd);
    return b;
  }

  return { paint: paint, rect: R };
}

//what is for sale on a market stall: crates of fruit or vegetables, buckets
//of flowers, cheeses and loaves
var GOODS = {
  fruit: [
    [206, 40, 44],
    [240, 150, 40],
    [236, 210, 70],
    [120, 180, 60],
  ],
  veg: [
    [92, 150, 60],
    [232, 120, 40],
    [150, 104, 70],
    [200, 60, 80],
  ],
  flowers: [
    [232, 80, 120],
    [250, 220, 70],
    [246, 246, 240],
    [150, 96, 196],
  ],
  deli: [
    [236, 200, 90],
    [196, 140, 80],
    [240, 226, 180],
    [170, 100, 60],
  ],
};

//the canopies of a market's stalls, by its scheme: one colour and white for
//all of them, or each its own
var CANOPIES = {
  red: [[200, 46, 44]],
  green: [[36, 128, 72]],
  blue: [[44, 96, 168]],
  mixed: [
    [200, 46, 44],
    [36, 128, 72],
    [44, 96, 168],
    [232, 160, 40],
  ],
};

/**
 * A market stall from x0, its front at y, six wide and five deep: a table
 * on trestles with what it sells laid out on it, and - unless it stands
 * under a roof - a striped canopy over it on four poles.
 */
function stall(b, x0, y, goods, canopy, rnd) {
  var x1 = x0 + 6,
    g = GOODS[goods];

  b.push(box(x0 + 0.4, x1 - 0.4, y + 0.5, y + 3, 3, 3.5, WOOD));
  [x0 + 0.8, x1 - 1.2].forEach(function (x) {
    b.push(box(x, x + 0.4, y + 0.8, y + 2.7, 1, 3, darker(WOOD, 0.3)));
  });
  for (var x = x0 + 0.7, k = 0; x < x1 - 1.4; x += 1.6, k++) {
    var c = g[(k + Math.floor(rnd() * 2)) % g.length];

    if (goods === "flowers") {
      b.push(box(x, x + 1.2, y + 0.9, y + 2.1, 3.5, 4.4, [70, 80, 96]));
      b.push(box(x + 0.1, x + 1.1, y + 1, y + 2, 4.4, 5.4, c));
    } else if (goods === "deli") {
      b.push(box(x, x + 1.3, y + 1, y + 2.3, 3.5, 4.4, c));
    } else {
      b.push(box(x, x + 1.4, y + 0.7, y + 2.6, 3.5, 4.3, WOOD));
      b.push(box(x + 0.1, x + 1.3, y + 0.8, y + 2.5, 4.3, 4.7, c));
    }
  }
  //crates stacked behind it
  b.push(box(x0 + 1, x0 + 3, y + 3.4, y + 4.8, 1, 2.6, WOOD));
  b.push(box(x0 + 1.1, x0 + 2.9, y + 3.5, y + 4.7, 2.6, 3, g[0]));

  if (canopy === null) return;

  [
    [x0, y],
    [x1 - 0.4, y],
    [x0, y + 4.6],
    [x1 - 0.4, y + 4.6],
  ].forEach(function (p) {
    b.push(box(p[0], p[0] + 0.4, p[1], p[1] + 0.4, 1, 9.5, METAL));
  });
  for (var s = x0 - 0.5, i = 0; s < x1 + 0.5; s += 1, i++) {
    var e = Math.min(s + 1, x1 + 0.5),
      col = i % 2 ? WHITE : canopy;

    b.push(box(s, e, y - 0.6, y + 5.6, 9.5, 10.1, col));
    b.push(box(s, e, y - 0.7, y - 0.5, 8.6, 10.1, col));
  }
}

//a farm's trailer, its load at the market: bales of hay and pumpkins
function farmTrailer(b, x, y) {
  [y + 0.2, y + 4.4].forEach(function (wy) {
    b.push(box(x + 2, x + 5, wy - 0.3, wy + 0.3, 1, 4, [44, 44, 48]));
  });
  b.push(box(x, x + 8, y + 0.5, y + 4.1, 3, 3.6, [160, 60, 44]));
  b.push(box(x - 3, x, y + 2.1, y + 2.5, 2.4, 3, METAL));
  b.push(box(x + 0.4, x + 3.6, y + 0.8, y + 3.8, 3.6, 5.6, [218, 184, 96]));
  [
    [x + 4.6, y + 1.4],
    [x + 6.4, y + 2.6],
    [x + 4.8, y + 3],
  ].forEach(function (p) {
    b.push(
      box(p[0], p[0] + 1.4, p[1] - 0.7, p[1] + 0.7, 3.6, 4.8, [232, 120, 30]),
    );
  });
}

var COBBLES = madeOf([176, 166, 152], "setts"),
  SLABS = madeOf([196, 190, 178], "slabs");

/**
 * The ground of a market square from x0 to x1 and y0 to y1, and on it rows
 * of stalls facing the street, aisles between them - or round its edge,
 * facing in, round a fountain - their canopies as the scheme has them. The
 * rows keep clear of the way to a door at x = door, and of `reserve` along
 * the back.
 */
function marketSquare(b, x0, x1, y0, y1, o, rnd, door, reserve) {
  var colors = CANOPIES[o.scheme],
    kinds = Object.keys(GOODS),
    n = 0;

  b.push(box(x0, x1, y0, y1, 1, 1.2, o.ground === "cobbles" ? COBBLES : SLABS));

  function put(x, y) {
    stall(
      b,
      x,
      y,
      kinds[Math.floor(rnd() * kinds.length)],
      colors[n++ % colors.length],
      rnd,
    );
  }

  if (o.layout === "ring") {
    var mx = (x0 + x1) / 2,
      my = (y0 + y1) / 2,
      x,
      y;

    for (x = x0 + 3; x < x1 - 8; x += 8) {
      if (Math.abs(x + 3 - mx) < 6) continue;
      put(x, y1 - 7);
    }
    for (y = y0 + 10; y < y1 - 14; y += 9) {
      put(x0 + 2, y);
      put(x1 - 8, y);
    }
    b.push(box(mx - 5, mx + 5, my - 5, my + 5, 1.2, 3, SLABS));
    b.push(
      box(mx - 4.2, mx + 4.2, my - 4.2, my + 4.2, 1.2, 2.6, [96, 160, 210]),
    );
    b.push(box(mx - 0.8, mx + 0.8, my - 0.8, my + 0.8, 2.6, 7, SLABS));
    b.push(box(mx - 0.4, mx + 0.4, my - 0.4, my + 0.4, 7, 9, [150, 200, 230]));
    return;
  }

  for (var ry = y0 + 4; ry < y1 - 6 - (reserve || 0); ry += 13)
    for (var rx = x0 + 3; rx < x1 - 7.5; rx += 8.5)
      if (door === undefined || Math.abs(rx + 3 - door) > 6) put(rx, ry);
}

/**
 * A farmers' market in the open, W tiles along the street and D deep: a
 * square of cobbles or slabs with its stalls, a farm's trailer come in with
 * its hay and pumpkins, and trees in tubs, lamps and benches round it.
 */
function openMarketAt(W, D) {
  var w = W * TILE,
    d = D * TILE,
    R = { x0: 2, x1: w - 2, y0: 3, y1: d - 3, h: 9 };

  function paint(o, rnd) {
    var b = [];

    var ring = o.layout === "ring";

    b.push(box(0, w, 0, d, 0, 1, GRASS));
    marketSquare(b, 0.5, w - 0.5, 0.5, d - 0.5, o, rnd, undefined, 9);

    //the corners: trees in tubs, a lamp
    [
      [2.5, 2.5],
      [w - 2.5, d - 2.5],
    ].forEach(function (p) {
      b.push(box(p[0] - 1.6, p[0] + 1.6, p[1] - 1.6, p[1] + 1.6, 1.2, 3, WOOD));
      tree(b, p[0], p[1], 2);
    });
    b.push(box(w - 2.6, w - 2, 1.5, 2.1, 1.2, 12, METAL));
    b.push(box(w - 3.4, w - 1.2, 0.8, 2.8, 12, 13, [240, 230, 180]));
    if (!ring) farmTrailer(b, w - 14, d - 7);
    bench(b, 1.5, d - 4);

    return b;
  }

  return { paint: paint, rect: R };
}

/**
 * A covered market, W tiles along the street and D deep: a timber roof on
 * posts over every row of tiles, open all round, its gables to the sides -
 * tiled, slated or of green-painted sheet - and under it the stalls, each
 * row facing the street, on cobbles.
 */
function coveredMarketAt(W, D) {
  var w = W * TILE,
    d = D * TILE,
    R = { x0: 2, x1: w - 2, y0: 3, y1: d - 3, h: 10 };

  function paint(o, rnd) {
    var b = [],
      roof = {
        tiles: { color: [178, 74, 52], made: "tiles" },
        slate: { color: [98, 102, 112], made: "slate" },
        sheet: { color: [62, 118, 82], made: "metal" },
      }[o.roof],
      kinds = Object.keys(GOODS),
      h = 10;

    b.push(box(0, w, 0, d, 0, 1, GRASS));
    b.push(box(0.5, w - 0.5, 0.5, d - 0.5, 1, 1.2, COBBLES));

    for (var row = 0; row < D; row++) {
      var y0 = row * TILE + 3,
        y1 = row * TILE + TILE - 3,
        mid = (y0 + y1) / 2,
        x;

      //posts round it every eight, a beam along the top of each side
      for (x = 3; x <= w - 3.5; x += 8) {
        var px = Math.min(x, w - 3.8);

        [y0, y1 - 0.8].forEach(function (py) {
          b.push(box(px, px + 0.8, py, py + 0.8, 1.2, h, darker(WOOD, 0.2)));
        });
      }
      [y0, y1 - 0.8].forEach(function (py) {
        b.push(box(3, w - 3, py, py + 0.8, h - 1, h, darker(WOOD, 0.2)));
      });

      //the stalls under it, tables only
      for (x = 5; x < w - 9; x += 8.5)
        stall(b, x, y0 + 4, kinds[Math.floor(rnd() * kinds.length)], null, rnd);

      slopedRoof(
        b,
        1.5,
        w - 1.5,
        y0 - 1.5,
        y1 + 1.5,
        h,
        [
          [y0 - 1.5, 1, 0.5],
          [y1 + 1.5, 1, -0.5],
        ],
        roof.color,
        darker(WOOD, 0.2),
        3,
        w - 3,
        mid - 0.5,
        mid + 0.5,
        made(roof.made),
      );
    }

    farmTrailer(b, w - 12, d < 2 * TILE ? 0.8 : TILE - 2.5);
    return b;
  }

  return { paint: paint, rect: R };
}

/**
 * A market hall over the back rows of a footprint W tiles along the street
 * and D deep, its doors on a market square over the front row where the
 * stalls are out: low brick walls, green glass over them to the eaves, under
 * green glass vaults or saw-tooth roofs.
 */
function marketHallAt(W, D) {
  var w = W * TILE,
    d = D * TILE,
    R = { x0: 2, x1: w - 2, y0: TILE + 4, y1: d - 6, h: 10, from: 0 };

  function paint(o, rnd) {
    var b = [],
      h = R.h,
      y = R.y0,
      mid = w / 2,
      brick = [168, 92, 72],
      frame = [40, 104, 64];

    lot(b, 0, w, TILE, d, TILE, R.y0);
    b.push(box(0, w, 0, TILE, 0, 1, GRASS));
    marketSquare(
      b,
      0.5,
      w - 0.5,
      0.5,
      R.y0 - 1,
      { scheme: o.scheme, ground: "cobbles", layout: "rows" },
      rnd,
      mid,
    );

    b.push(box(R.x0, R.x1, R.y0, R.y1, 1, 5, brick, made("brick")));
    b.push(
      box(
        R.x0 + 0.3,
        R.x1 - 0.3,
        R.y0 + 0.3,
        R.y1 - 0.3,
        5,
        h,
        GREEN_GLASS,
        GLASSY,
      ),
    );
    for (var a = R.x0; a <= R.x1; a += 6)
      b.push(
        box(
          Math.min(a, R.x1 - 0.6),
          Math.min(a, R.x1 - 0.6) + 0.6,
          y,
          y + 0.6,
          5,
          h,
          frame,
        ),
      );
    b.push(box(R.x0, R.x1, R.y0, R.y1, h, h + 0.5, frame));

    if (o.roof === "barrel") {
      var n = Math.max(1, Math.round((R.x1 - R.x0) / 20)),
        span = (R.x1 - R.x0) / n;

      for (var v = 0; v < n; v++)
        vault(
          b,
          R.x0 + v * span,
          R.x0 + (v + 1) * span,
          R.y0,
          R.y1,
          h + 0.5,
          GREEN_GLASS,
          frame,
        );
    } else
      for (var s = R.y0; s < R.y1 - 1; s += 14) {
        var e = Math.min(s + 14, R.y1);

        slopedRoof(
          b,
          R.x0,
          R.x1,
          s,
          e,
          h + 0.5,
          [[s + 14, 1, -0.5]],
          GREEN_GLASS,
          GREEN_GLASS,
          R.x0,
          R.x1,
          s,
          e,
          GLASSY,
        );
        for (var bx = R.x0 + 3; bx < R.x1; bx += 6)
          b.push(
            iso.cut(box(bx, bx + 1, s, e, h + 0.5, h + 9.5, frame), [
              iso.plane(0, 0.5, 1, h + 0.5 + 1.5 + 0.5 * (s + 14)),
            ]),
          );
        b.push(
          box(R.x0, R.x1, s, s + 0.4, h + 0.5, h + 8.5, GREEN_GLASS, GLASSY),
        );
      }

    b.push(box(mid - 4, mid + 4, y - 0.4, y, 1.2, 7, WOOD));
    b.push(box(mid - 6, mid + 6, y - 0.8, y, 7.5, 10.5, frame));
    picture(b, "y", y - 0.8, mid - 5, 8, 10, 2, panel("orchard", 10, 2));

    back(b, R, h, brick, d, rnd);
    return b;
  }

  return { paint: paint, rect: R };
}

var DESIGNS = {
  small: smallShop,
  store: store,
  bigbox: bigbox,
  mall: mall,
  market: market,
};

//the options in a part's name after its design, by design, in order
var OPTIONS = {
  small: ["roof", "pal", "front", "awning", "sign"],
  store: ["pal", "front", "awning"],
  bigbox: ["style", "roof"],
  mall: ["style"],
  market: ["roof"],
};

//the designs made for a footprint - a superstore three tiles long - each
//with its building's place, and its options
function more(name, made, options) {
  DESIGNS[name] = made.paint;
  RECT[name] = made.rect;
  OPTIONS[name] = options;
}

more("bigbox21", bigboxAt(2, 1, 0), ["style", "roof"]);
more("bigbox31", bigboxAt(3, 1, 0), ["style", "roof"]);
more("bigbox32", bigboxAt(3, 2, 1), ["style", "roof"]);
[
  [1, 2, 0],
  [1, 3, 1],
  [2, 1, 0],
  [3, 1, 0],
  [2, 2, 1],
  [3, 2, 1],
].forEach(function (f) {
  more("dept" + f[0] + f[1], departmentAt(f[0], f[1], f[2]), [
    "style",
    "awning",
  ]);
});
MARKET_FOOTPRINTS.forEach(function (fp) {
  var W = +fp[0],
    D = +fp[2],
    id = fp[0] + fp[2];

  more("openmkt" + id, openMarketAt(W, D), ["scheme", "ground", "layout"]);
  more("covmkt" + id, coveredMarketAt(W, D), ["roof"]);
  if (W > 1 && D > 1)
    more("mkthall" + id, marketHallAt(W, D), ["roof", "scheme"]);
});

/**
 * The steel frame of a design's building going up, on its slab: posts
 * round it every eight, beams along the top, and across it.
 */
function frame(design) {
  var b = [],
    R = RECT[design],
    h =
      design === "market" || design.indexOf("mkthall") === 0
        ? R.h + 6
        : design.indexOf("covmkt") === 0
          ? R.h + 5
          : R.h,
    x,
    y;

  //bare earth over every tile of it, and the slab poured on that
  b.push(
    box(
      0,
      Math.ceil(R.x1 / TILE) * TILE,
      R.from !== undefined ? R.from : Math.floor(R.y0 / TILE) * TILE,
      Math.ceil(R.y1 / TILE) * TILE,
      0,
      0.5,
      DIRT,
    ),
  );
  b.push(
    box(R.x0 - 0.3, R.x1 + 0.3, R.y0 - 0.3, R.y1 + 0.3, 0.5, 1.5, CONCRETE),
  );

  for (x = R.x0; x <= R.x1; x += 8) {
    var px = Math.min(x, R.x1 - 0.8);

    b.push(box(px, px + 0.8, R.y0, R.y0 + 0.8, 1.5, h, STEEL));
    b.push(box(px, px + 0.8, R.y1 - 0.8, R.y1, 1.5, h, STEEL));
    b.push(box(px, px + 0.8, R.y0, R.y1, h - 1, h, STEEL));
  }

  for (y = R.y0; y <= R.y1; y += 8) {
    var py = Math.min(y, R.y1 - 0.8);

    b.push(box(R.x0, R.x0 + 0.8, py, py + 0.8, 1.5, h, STEEL));
    b.push(box(R.x1 - 0.8, R.x1, py, py + 0.8, 1.5, h, STEEL));
  }

  b.push(box(R.x0, R.x1, R.y0, R.y0 + 0.8, h - 1, h, STEEL));
  b.push(box(R.x0, R.x1, R.y1 - 0.8, R.y1, h - 1, h, STEEL));

  return b;
}

/* --- Car parks ------------------------------------------------------- */

//the bays of a car park, as blocks PARKING_BAYS has them
var BAYS = {
  small: [8, 17, 26].map(function (x) {
    return { x: x, y: 20, z: 1.2, headings: ["y+", "y-"] };
  }),
  big: [9, 18, 27]
    .map(function (x) {
      return { x: x, y: 9, z: 1.2, headings: ["y+", "y-"] };
    })
    .concat(
      [9, 18, 27].map(function (x) {
        return { x: x, y: 24, z: 1.2, headings: ["y+", "y-"] };
      }),
    ),
};

/**
 * What the sign on a pole in a car park shows, by its name: the firm's
 * colours and emblem, as on the shop (shared/gen/brands).
 */
function pylonInk(name) {
  var kind = name.split("-")[0],
    which = name.split("-")[1];

  if (kind === "store")
    return { bg: STORE[which].sign, ink: panel(STORE[which].brand, 8, 5) };
  if (kind === "bigbox") {
    var S = BIGBOX[which];

    return { bg: S.band, ink: panel(S.brand, 8, 5) };
  }
  if (kind === "mall")
    return {
      bg: MALL[which].band,
      ink: plainMark(MALL[which].band, WHITE, 8, 5),
    };

  return { bg: BRANDS.orchard.main, ink: panel("orchard", 8, 5) };
}

/**
 * A car park on a tile: asphalt with its bays marked - the cars are drawn
 * over it (BAYS) - and a curb along the back, and maybe a sign on a pole by
 * the road at its corner.
 */
function carPark(layout, pylon) {
  var b = [],
    bays = BAYS[layout];

  b.push(box(0, TILE, 0, TILE, 0, 1, GRASS));
  b.push(box(0.5, TILE - 0.5, 0.5, TILE - 1, 1, 1.2, ASPHALT));
  b.push(box(0, TILE, TILE - 1, TILE, 1, 1.4, CURB));

  bays.forEach(function (bay) {
    b.push(
      box(bay.x - 4.5, bay.x - 4, bay.y - 6.5, bay.y + 6.5, 1.2, 1.25, STRIPE),
    );
    b.push(
      box(bay.x + 4, bay.x + 4.5, bay.y - 6.5, bay.y + 6.5, 1.2, 1.25, STRIPE),
    );
  });

  if (pylon !== "none") {
    var sign = pylonInk(pylon),
      tall = pylon.indexOf("store") === 0 ? 14 : 20;

    b.push(box(2, 2.8, 2, 2.8, 1.2, tall, METAL));
    b.push(box(0.6, 9.4, 1.8, 3, tall, tall + 6.4, sign.bg, SIGN));
    picture(b, "y", 1.8, 1, tall + 0.7, 8, 5, sign.ink);
  }

  return b;
}

/* --- Parts ----------------------------------------------------------- */

/**
 * What every footprint can be: designs, each as likely as its weight, each
 * with the options it is put together with - axes, every one picked at
 * random - and its tiles, the names of their parts with {axis} where an
 * option goes (and an option may name another: "bigbox-{style}"). An option
 * listed twice comes up twice as often: red awnings, mostly.
 */
var FOOTPRINTS = {
  "1x1": [
    {
      design: "small",
      weight: 1,
      axes: {
        roof: ["flat", "gable", "shed"],
        pal: Object.keys(SMALL),
        front: ["center", "corner", "double"],
        //a firm's colours, or none (SMALL_BRANDS)
        awning: ["red", "green", "navy", "amber", "none"],
        sign: ["fascia", "board"],
      },
      tiles: [
        {
          x: 0,
          y: 0,
          parts: ["shops/small/{roof}/{pal}/{front}/{awning}/{sign}/0/0"],
        },
      ],
    },
  ],
  "1x2": [
    {
      design: "store",
      weight: 1,
      axes: {
        pal: Object.keys(STORE),
        front: ["glass", "piers"],
        awning: ["red", "red", "none", "green"],
        pylon: ["none", "store-{pal}"],
      },
      tiles: [
        { x: 0, y: 1, parts: ["shops/store/{pal}/{front}/{awning}/0/1"] },
        { x: 0, y: 0, parts: ["shops/parking/small/{pylon}"] },
      ],
    },
  ],
  "2x2": [
    {
      design: "bigbox",
      weight: 1,
      axes: {
        style: Object.keys(BIGBOX),
        roof: ["flat", "stepped"],
        pylon: ["none", "bigbox-{style}"],
      },
      tiles: [
        { x: 0, y: 1, parts: ["shops/bigbox/{style}/{roof}/0/1"] },
        { x: 1, y: 1, parts: ["shops/bigbox/{style}/{roof}/1/1"] },
        { x: 0, y: 0, parts: ["shops/parking/big/{pylon}"] },
        { x: 1, y: 0, parts: ["shops/parking/big/none"] },
      ],
    },
  ],
  "2x3": [
    {
      design: "mall",
      weight: 2,
      axes: { style: Object.keys(MALL), pylon: ["mall-{style}"] },
      tiles: [0, 1].reduce(
        function (all, x) {
          return all.concat(
            [1, 2].map(function (y) {
              return {
                x: x,
                y: y,
                parts: ["shops/mall/{style}/" + x + "/" + y],
              };
            }),
          );
        },
        [
          { x: 0, y: 0, parts: ["shops/parking/big/{pylon}"] },
          { x: 1, y: 0, parts: ["shops/parking/big/none"] },
        ],
      ),
    },
    {
      design: "market",
      weight: 1,
      axes: { roof: ["barrel", "sawtooth"], pylon: ["none", "market"] },
      tiles: [0, 1].reduce(
        function (all, x) {
          return all.concat(
            [1, 2].map(function (y) {
              return {
                x: x,
                y: y,
                parts: ["shops/market/{roof}/" + x + "/" + y],
              };
            }),
          );
        },
        [
          { x: 0, y: 0, parts: ["shops/parking/big/{pylon}"] },
          { x: 1, y: 0, parts: ["shops/parking/big/none"] },
        ],
      ),
    },
  ],
};

//a part's name with its options, as OPTIONS has them, still to be filled in
function template(design) {
  return (
    "shops/" +
    design +
    "/" +
    OPTIONS[design]
      .map(function (axis) {
        return "{" + axis + "}";
      })
      .join("/")
  );
}

//the car parks over the first rows of tiles of a footprint W across - the
//sign on its pole, if any, on the first of them
function carParks(W, rows, layout) {
  var tiles = [];

  for (var y = 0; y < rows; y++)
    for (var x = 0; x < W; x++)
      tiles.push({
        x: x,
        y: y,
        parts: [
          "shops/parking/" +
            (typeof layout === "function" ? layout(y) : layout) +
            "/" +
            (x === 0 && y === 0 ? "{pylon}" : "none"),
        ],
      });

  return tiles;
}

/**
 * A design whose building takes the whole of a footprint W by D but for the
 * car parks over its first `rows` rows.
 */
function wholeOn(design, W, D, rows, axes, pylons) {
  var tiles = carParks(W, rows, "big"),
    all = Object.assign({}, axes);

  if (rows > 0) all.pylon = pylons || ["none"];
  for (var y = rows; y < D; y++)
    for (var x = 0; x < W; x++)
      tiles.push({
        x: x,
        y: y,
        parts: [template(design) + "/" + x + "/" + y],
      });

  return { design: design, weight: 1, axes: all, tiles: tiles };
}

/**
 * Shops of a design side by side behind `rows` rows of car park - n of them,
 * each a tile across, its building's tile the one at cy of its own: a
 * parade of corner shops, a row of shops with car parks. Each has options
 * of its own but those `shared` names: the second one's pal is {pal2}.
 */
function along(design, n, rows, cy, axes, shared, pylons) {
  var all = {},
    tiles = carParks(n, rows, function (y) {
      return y === rows - 1 ? "small" : "big";
    }),
    i;

  Object.keys(axes).forEach(function (axis) {
    for (i = 0; i < n; i++)
      if (i === 0 || shared.indexOf(axis) === -1)
        all[axis + (i > 0 ? i + 1 : "")] = axes[axis];
  });
  if (rows > 0) all.pylon = pylons || ["none"];

  for (i = 0; i < n; i++)
    tiles.push({
      x: i,
      y: rows,
      parts: [
        template(design).replace(/\{(\w+)\}/g, function (m, axis) {
          return i > 0 && shared.indexOf(axis) === -1
            ? "{" + axis + (i + 1) + "}"
            : m;
        }) +
          "/0/" +
          cy,
      ],
    });

  return { design: design, weight: 1, axes: all, tiles: tiles };
}

var SMALL_AXES = FOOTPRINTS["1x1"][0].axes,
  STORE_AXES = {
    pal: Object.keys(STORE),
    front: ["glass", "piers"],
    awning: ["red", "red", "none", "green"],
  },
  DEPT_AXES = {
    style: Object.keys(MALL),
    awning: ["none", "red", "green"],
  };

//the small shops' tier: corner shops in a parade, shops with car parks
//side by side
Object.assign(FOOTPRINTS, {
  "small-2x1": [along("small", 2, 0, 0, SMALL_AXES, ["roof"])],
  "small-3x1": [along("small", 3, 0, 0, SMALL_AXES, ["roof"])],
  "small-1x3": [
    along("store", 1, 2, 1, STORE_AXES, [], ["none", "store-{pal}"]),
    along("small", 1, 2, 0, SMALL_AXES, []),
  ],
  "small-2x2": [
    along("small", 2, 1, 0, SMALL_AXES, ["roof"]),
    along("store", 2, 1, 1, STORE_AXES, ["front"], ["none", "store-{pal}"]),
  ],
  "small-2x3": [
    along("store", 2, 2, 1, STORE_AXES, ["front"], ["none", "store-{pal}"]),
    along("small", 2, 2, 0, SMALL_AXES, ["roof"]),
  ],
  "small-3x2": [
    along("small", 3, 1, 0, SMALL_AXES, ["roof"]),
    along("store", 3, 1, 1, STORE_AXES, ["front"], ["none", "store-{pal}"]),
  ],
});

//the stores' tier: superstores and department stores
FOOTPRINTS["2x2"].push(
  wholeOn("dept22", 2, 2, 1, DEPT_AXES, ["none", "mall-{style}"]),
);
Object.assign(FOOTPRINTS, {
  "mall-2x1": [
    wholeOn("bigbox21", 2, 1, 0, {
      style: Object.keys(BIGBOX),
      roof: ["flat"],
    }),
    wholeOn("dept21", 2, 1, 0, DEPT_AXES),
  ],
  "mall-3x1": [
    wholeOn("bigbox31", 3, 1, 0, {
      style: Object.keys(BIGBOX),
      roof: ["flat"],
    }),
    wholeOn("dept31", 3, 1, 0, DEPT_AXES),
  ],
  "mall-1x2": [wholeOn("dept12", 1, 2, 0, DEPT_AXES)],
  "mall-1x3": [wholeOn("dept13", 1, 3, 1, DEPT_AXES, ["none", "mall-{style}"])],
  "mall-3x2": [
    wholeOn(
      "bigbox32",
      3,
      2,
      1,
      { style: Object.keys(BIGBOX), roof: ["flat", "stepped"] },
      ["none", "bigbox-{style}"],
    ),
    wholeOn("dept32", 3, 2, 1, DEPT_AXES, ["mall-{style}"]),
  ],
});

//the farmers' markets: in the open, under a timber roof, or a hall
MARKET_FOOTPRINTS.forEach(function (fp) {
  var W = +fp[0],
    D = +fp[2],
    id = fp[0] + fp[2],
    designs = [
      wholeOn("openmkt" + id, W, D, 0, {
        scheme: Object.keys(CANOPIES),
        ground: ["cobbles", "slabs"],
        layout: W > 1 && D > 1 ? ["rows", "ring"] : ["rows"],
      }),
      wholeOn("covmkt" + id, W, D, 0, { roof: ["tiles", "slate", "sheet"] }),
    ];

  if (W > 1 && D > 1)
    designs.push(
      wholeOn("mkthall" + id, W, D, 0, {
        roof: ["barrel", "sawtooth"],
        scheme: Object.keys(CANOPIES),
      }),
    );

  FOOTPRINTS["market-" + fp] = designs;
});

/**
 * Every part there is, by name without its turn - every footprint's every
 * design with every option, the frames they go up in, and the car parks.
 */
var PARTS = (function () {
  var out = {};

  Object.keys(FOOTPRINTS).forEach(function (fp) {
    FOOTPRINTS[fp].forEach(function (d) {
      d.tiles.forEach(function (t) {
        t.parts.forEach(function (p) {
          namesOf(p, d.axes).forEach(function (name) {
            var q = name.split("/");

            out[name] = true;

            //the frame it goes up in, by the tile's place in its own
            //building - which a shop in a parade (along) has where it is
            //in its own
            if (q[1] !== "parking")
              out[
                ["shops/frame", q[1], q[q.length - 2], q[q.length - 1]].join(
                  "/",
                )
              ] = true;
          });
        });
      });
    });
  });

  return out;
})();

//the boxes of a design's whole building, by the options it was painted with
var whole = {};

/**
 * The boxes of a part by its name without its turn, as it is painted: for a
 * tile of a building, the whole of it, so far off as the tile is from the
 * corner of the footprint - onTile cuts out the tile.
 */
export function partBoxes(key) {
  if (PARTS[key] === undefined) throw new Error("no such part: " + key);

  var p = key.split("/"),
    kind = p[1];

  if (kind === "parking") return carPark(p[2], p[3]);

  var cx = +p[p.length - 2],
    cy = +p[p.length - 1],
    id = p.slice(1, p.length - 2).join("/"),
    boxes = whole[id];

  if (boxes === undefined) {
    if (kind === "frame") boxes = frame(p[2]);
    else {
      var o = {};

      OPTIONS[kind].forEach(function (axis, k) {
        o[axis] = p[2 + k];
      });

      boxes = DESIGNS[kind](o, random(id));
    }

    whole[id] = boxes;
  }

  return boxes.map(function (c) {
    return iso.moved(c, -cx * TILE, -cy * TILE, 0);
  });
}

/**
 * Every part, by sprite name - "gen/shops/bigbox/blue/flat/1/1/r2" - with its
 * size and pivot, without painting it; what every footprint can be, for
 * whoever puts a shop together; and the bays of the car parks.
 */
export function describe() {
  var sizes = {},
    over = {};

  Object.keys(PARTS).forEach(function (key) {
    TURNS.forEach(function (turns) {
      sizes["gen/" + key + "/r" + turns] = measureOnTile(
        iso.rotate(partBoxes(key), 1, 1, turns),
      );

      if (key.indexOf("shops/parking/") === 0)
        over[key + "/r" + turns] = [
          baysOverlay(BAYS[key.split("/")[2]], turns),
        ];
    });
  });

  return {
    sizes: sizes,
    data: {
      storey: STOREY,
      footprints: FOOTPRINTS,
      turns: TURNS,
      overlays: over,
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

export {
  PARTS,
  STOREY,
  slopedRoof,
  stall,
  farmTrailer,
  GOODS,
  CANOPIES,
  COBBLES,
};
