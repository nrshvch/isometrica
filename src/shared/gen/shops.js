/**
 * Shops, put together out of parts the way the blocks are (shared/gen/blocks)
 * - only a shop does not grow storey by storey: it is one building, as big as
 * it is, cut up into the tiles it stands on. Every one is painted whole and
 * each of its tiles is what the whole shows on that tile (onTile), so a shop
 * three tiles long is still one roof.
 *
 * There are shops for four footprints, and for each of them a design or two,
 * each with options it is put together with at random for every shop built
 * (client/compoundbuilding picks them, see describe footprints):
 *
 *   - 1x1, a small-town shop: a flat roof behind a false front, a gable or a
 *     lean-to; a shop front with the door in the middle, at the corner or a
 *     door either side of the window; a firm's striped awning or none; a
 *     fascia over the windows or a board on its side, in the firm's colours
 *     and with its emblem (shared/gen/brands);
 *   - 1x2, a shop with a car park in front, a firm's: a flat roof with its
 *     emblem up on the parapet, a front all glass or between brick piers, awnings over
 *     the windows, a sign on a pole in the car park or not;
 *   - 2x2, a superstore over the two tiles at the back, a car park over the
 *     two in front: a firm's - the builders' merchant in orange, or white
 *     and orange; the bank in navy and gold; the grocer in white with green
 *     stripes along it; the burger chain in grey and red - a flat roof or one raised over the way in and
 *     at the back, air conditioning on it, banners down its front, its
 *     emblem over the doors and maybe on a pole by the road;
 *   - 2x3, a shopping centre over four tiles with a glass vault along its
 *     roof, or a market hall under green glass vaults or saw-tooth roofs,
 *     stalls out in front - and a car park over the two tiles in front.
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
  MATTE,
  GLASSY,
  LIT,
  made,
  madeOf,
  finishOf,
  shaded,
  random,
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

      if (axis === "y")
        b.push(box(a + i, a + i + 1, at - 0.15, at, z0 + j, z0 + j + 1, c));
      else
        b.push(
          box(at - 0.15, at, a + w - i - 1, a + w - i, z0 + j, z0 + j + 1, c),
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

  b.push(box(R.x0 + 1, R.x1 - 1, y - 0.6, y, 10, 13, sign));
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
  b.push(box(7, 25, R.y0, R.y0 + 0.8, h, h + 5, P.sign));
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
  b.push(box(22, 42, y - 4.6, y - 4, h - 1.5, h + 3.5, S.band));
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

var DESIGNS = {
  small: smallShop,
  store: store,
  bigbox: bigbox,
  mall: mall,
  market: market,
};

/**
 * The steel frame of a design's building going up, on its slab: posts
 * round it every eight, beams along the top, and across it.
 */
function frame(design) {
  var b = [],
    R = RECT[design],
    h = design === "market" ? R.h + 6 : R.h,
    x,
    y;

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
    b.push(box(0.6, 9.4, 1.8, 3, tall, tall + 6.4, sign.bg));
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

//an option's names filled in: twice over, for an option that names another
function fill(template, options) {
  var out = template;

  for (var pass = 0; pass < 2; pass++)
    out = out.replace(/\{(\w+)\}/g, function (m, axis) {
      return options[axis];
    });

  return out;
}

/**
 * Every part there is, by name without its turn - every footprint's every
 * design with every option, the frames they go up in, and the car parks.
 */
var PARTS = (function () {
  var out = {};

  Object.keys(FOOTPRINTS).forEach(function (fp) {
    FOOTPRINTS[fp].forEach(function (d) {
      var axes = Object.keys(d.axes),
        combos = [{}];

      axes.forEach(function (axis) {
        var next = [];

        combos.forEach(function (c) {
          d.axes[axis].forEach(function (v) {
            var n = Object.assign({}, c);

            n[axis] = v;
            next.push(n);
          });
        });
        combos = next;
      });

      combos.forEach(function (c) {
        d.tiles.forEach(function (t) {
          t.parts.forEach(function (p) {
            out[fill(p, c)] = true;
          });

          if (t.parts[0].indexOf("shops/parking") !== 0)
            out["shops/frame/" + d.design + "/" + t.x + "/" + t.y] = true;
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

      if (kind === "small") {
        o.roof = p[2];
        o.pal = p[3];
        o.front = p[4];
        o.awning = p[5];
        o.sign = p[6];
      } else if (kind === "store") {
        o.pal = p[2];
        o.front = p[3];
        o.awning = p[4];
      } else if (kind === "bigbox") {
        o.style = p[2];
        o.roof = p[3];
      } else if (kind === "mall") o.style = p[2];
      else o.roof = p[2];

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

export { PARTS, STOREY };
