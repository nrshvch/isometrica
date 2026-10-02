/**
 * Houses, put together out of parts the way the shops are (shared/gen/shops):
 * every house is painted whole - the house, its garden, its fences, what is
 * in the yard - and each of its tiles is what the whole shows on that tile
 * (onTile), so a house on two tiles is still one house.
 *
 * There are four kinds, each a building of its own for every footprint it
 * comes in, and every house of one picked at random among the designs and
 * options there are for it (client/compoundbuilding, see describe
 * footprints):
 *
 *   - village houses, for a village with no streets or water yet: a cottage
 *     on one tile - whitewashed under its beams, of logs, of stone or
 *     ochre, under thatch, red tiles or slate - with a vegetable patch and
 *     hens, an orchard and beehives, a well, a woodpile and a goat, or
 *     flowers; and a farmstead on two, its farmyard behind it a pasture with
 *     a barn and cows, a field of wheat or a flock of sheep. No fences: many
 *     of them together are a village;
 *   - town houses, with fences or hedges round them and a garden at best: a
 *     bungalow on two tiles along the street, with its garage; a two-storey
 *     house end on to the street on two tiles, its drive along its side to a
 *     garage at the back and a garden there; and one on three, room enough
 *     on its drive for the car, and a long garden;
 *   - semi-detached houses: a pair on four tiles, each half with its own
 *     parking space and gate and fence round it; and on six, two along the
 *     street and three deep, each half with its own back garden too;
 *   - villas: two storeys on a terrace up a flight of steps, behind a wrought
 *     iron gate between pillars in a high hedge or a wall, in a garden of
 *     lawns, cypresses and clipped box - in the middle of it with a fountain
 *     before it, or to one side of a pool.
 *
 * The cars on the drives are not painted: they are the vehicle generator's,
 * different for every house (blocks baysOverlay) - and what of the house
 * stands in front of them is drawn again over them (cover), so a car behind
 * a hedge is behind it whichever way the house is turned.
 *
 * While a house goes up its tiles are the same building site as anybody's
 * (shared/gen/sites), then its walls going up on their slab (site).
 *
 * The scale is the cars' and the roads': a car is 13 long and 6 wide, about
 * 4.5 by 2 metres, and a road with its two lanes 20 across - so a unit along
 * the ground is about a third of a metre, a tile about ten metres across,
 * and a storey of three metres 12 high. A house is as big as a house of
 * that size would be: what does not fit on a footprint is left for a
 * bigger one - no car on a drive too short for it, no cow on a cottage's
 * patch of yard.
 */
import * as iso from "./isobox.js";
import {
  box,
  darker,
  lighter,
  TILE,
  STOREY,
  GRASS,
  PAVING,
  WOOD,
  METAL,
  TRUNK,
  LEAF,
  DIRT,
  CONCRETE,
  MATTE,
  GLASSY,
  LIT,
  made as blocksMade,
  madeOf,
  finishOf,
  shaded,
  random,
  round,
  bench,
  baysOverlay,
  measureOnTile,
  TURNS,
} from "./blocks.js";

var GLASS = [92, 126, 160],
  WHITE = [246, 246, 242],
  IRON = [46, 46, 54],
  GOLD = [214, 178, 64],
  GRAVEL = madeOf([222, 212, 186], "gravel"),
  DRIVE = madeOf([198, 194, 184], "concrete"),
  SOIL = madeOf([122, 92, 64], "dirt"),
  PATH = madeOf([184, 166, 132], "sand"),
  STRAW = [218, 184, 96],
  WATER = [64, 160, 214],
  COPING = [232, 226, 212],
  LINER = [150, 212, 228],
  BLOCK = madeOf([186, 184, 178], "concrete"),
  TIMBER = madeOf([204, 168, 118], "wood"),
  BRICK = madeOf([176, 82, 60], "brick"),
  CYPRESS = [52, 104, 62],
  BOX = [70, 128, 64],
  LAWN = madeOf([118, 166, 86], "grass"),
  STRIPE_LAWN = madeOf([104, 152, 76], "grass");

//how high a storey of a house is: as high as a block's (blocks STOREY),
//about three metres the way the cars go - see the scale above
var SH = STOREY;

/* --- Colours ---------------------------------------------------------- */

//the village houses: walls, trim, the door, shutters and what the walls are
//like - beams over whitewash, logs, quoins at the corners of stone, plain
var VILLAGE = {
  white: {
    wall: [238, 234, 222],
    trim: [92, 62, 42],
    door: [104, 68, 44],
    shutter: [64, 112, 150],
    texture: "beams",
  },
  log: {
    wall: [156, 106, 66],
    trim: [236, 226, 200],
    door: [88, 60, 40],
    shutter: [178, 62, 50],
    texture: "logs",
    made: "logs",
  },
  stone: {
    wall: [170, 162, 150],
    trim: [242, 238, 228],
    door: [72, 98, 72],
    shutter: [70, 112, 82],
    texture: "quoins",
    made: "stone",
  },
  ochre: {
    wall: [230, 190, 112],
    trim: [250, 246, 236],
    door: [152, 62, 46],
    shutter: [62, 122, 92],
  },
};

//the village roofs: thatch, red tiles, slate
var VILLAGE_ROOF = {
  thatch: { color: [196, 160, 92], thatch: true },
  tile: { color: [178, 74, 52] },
  slate: { color: [98, 102, 112] },
};

//the town houses' colours, and their fences'; siding, boards along the walls
var CITY = {
  brick: {
    wall: [178, 86, 62],
    made: "brick",
    trim: [244, 240, 230],
    door: [40, 82, 62],
    roof: [96, 92, 100],
    picket: [232, 134, 66],
  },
  cream: {
    wall: [236, 222, 190],
    trim: [255, 255, 250],
    door: [152, 42, 46],
    roof: [172, 70, 52],
    picket: WHITE,
  },
  blue: {
    wall: [150, 184, 208],
    trim: [250, 250, 246],
    door: [214, 160, 60],
    roof: [80, 84, 98],
    texture: "siding",
    made: "siding",
    picket: WHITE,
  },
  yellow: {
    wall: [236, 204, 122],
    trim: [250, 248, 240],
    door: [60, 92, 142],
    roof: [160, 66, 48],
    picket: [232, 134, 66],
  },
};

//the villas: walls, stone trim, the roof - none, for a flat one - shutters,
//and the garden wall
var VILLA = {
  classic: {
    wall: [244, 242, 236],
    trim: [212, 206, 192],
    door: [52, 58, 70],
    roof: [76, 82, 94],
    gardenWall: [226, 220, 204],
  },
  tuscan: {
    wall: [232, 198, 148],
    trim: [250, 240, 220],
    door: [110, 70, 44],
    roof: [192, 98, 62],
    shutter: [74, 112, 82],
    gardenWall: [222, 186, 136],
  },
  modern: {
    wall: [240, 240, 238],
    trim: [52, 54, 60],
    door: [52, 54, 60],
    roof: null,
    wood: [172, 122, 80],
    gardenWall: [236, 236, 232],
  },
  brick: {
    wall: [166, 76, 58],
    made: "brick",
    trim: [244, 240, 230],
    door: [36, 52, 44],
    roof: [72, 76, 86],
    gardenWall: [166, 76, 58],
  },
};

//the walls of a palette that has a material of its own made of it
[VILLAGE, CITY, VILLA].forEach(function (set) {
  Object.keys(set).forEach(function (k) {
    if (set[k].made) madeOf(set[k].wall, set[k].made);
  });
});

/* --- Bits and pieces -------------------------------------------------- */

//0..1, the same for the same whole numbers every time
function hash(i, j, k) {
  var h =
    Math.imul(i | 0, 73856093) ^
    Math.imul(j | 0, 19349663) ^
    Math.imul(k | 0, 83492791);

  h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);

  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

function grain(c, g) {
  return g > 0 ? lighter(c, g) : darker(c, -g);
}

/**
 * Something on a face of the walls r: looking towards -y, +y, -x or +x, from
 * a0 to a1 along it (x for a face looking along y, y for one looking along
 * x), z0 to z1 high, standing d0 to d1 out of it.
 */
function face(r, f, a0, a1, z0, z1, d0, d1, color, finish) {
  if (f === "-y")
    return box(a0, a1, r.y0 - d1, r.y0 - d0, z0, z1, color, finish);
  if (f === "+y")
    return box(a0, a1, r.y1 + d0, r.y1 + d1, z0, z1, color, finish);
  if (f === "-x")
    return box(r.x0 - d1, r.x0 - d0, a0, a1, z0, z1, color, finish);

  return box(r.x1 + d0, r.x1 + d1, a0, a1, z0, z1, color, finish);
}

var FACES = ["-y", "+y", "-x", "+x"];

//where a face starts and ends along it
function span(r, f) {
  return f === "-y" || f === "+y" ? [r.x0, r.x1] : [r.y0, r.y1];
}

/**
 * A window at a along the face, w wide, from z up h: its frame, the glass, a
 * mullion down the middle of a wide one, the sill - and shutters, for walls
 * that have them.
 */
function windowOn(b, r, f, a, w, z, h, P) {
  b.push(
    face(r, f, a - 0.5, a + w + 0.5, z - 0.5, z + h + 0.5, 0, 0.25, P.trim),
  );
  b.push(face(r, f, a, a + w, z, z + h, 0.25, 0.35, GLASS, GLASSY));
  if (w > 2.5)
    b.push(
      face(
        r,
        f,
        a + w / 2 - 0.25,
        a + w / 2 + 0.25,
        z,
        z + h,
        0.25,
        0.45,
        P.trim,
      ),
    );
  b.push(face(r, f, a - 0.8, a + w + 0.8, z - 0.9, z - 0.4, 0, 0.6, P.trim));

  if (P.shutter) {
    b.push(
      face(r, f, a - 2, a - 0.6, z - 0.2, z + h + 0.2, 0, 0.35, P.shutter),
    );
    b.push(
      face(
        r,
        f,
        a + w + 0.6,
        a + w + 2,
        z - 0.2,
        z + h + 0.2,
        0,
        0.35,
        P.shutter,
      ),
    );
  }
}

//a door at a along the face, w wide and h high from z, its step before it
function doorOn(b, r, f, a, w, z, h, P) {
  b.push(face(r, f, a - 0.5, a + w + 0.5, z, z + h + 0.5, 0, 0.25, P.trim));
  b.push(face(r, f, a, a + w, z, z + h, 0.25, 0.35, P.door));
  if (w > 3)
    b.push(
      face(
        r,
        f,
        a + w / 2 - 0.2,
        a + w / 2 + 0.2,
        z,
        z + h,
        0.35,
        0.4,
        darker(P.door, 0.3),
      ),
    );
  b.push(face(r, f, a - 1, a + w + 1, 1, z + 0.1, 0, 1.4, CONCRETE));
}

//windows along a face, each at one of the places along it
function windowsOn(b, r, f, at, w, z, h, P) {
  at.forEach(function (a) {
    windowOn(b, r, f, a, w, z, h, P);
  });
}

/**
 * Windows spread along every face of the walls r, every storey - leaving out
 * the stretch of each face `skip` says, where a door or a porch is, or the
 * whole face.
 *
 * @param skip {Object} by face, [a0, a1] to leave clear, or "all"
 */
function windowsAround(b, r, z0, storeys, w, h, P, skip) {
  FACES.forEach(function (f) {
    var s = span(r, f),
      n = Math.max(1, Math.floor((s[1] - s[0]) / (w + 4.5))),
      gap = (s[1] - s[0] - n * w) / (n + 1),
      clear = skip && skip[f],
      k,
      st;

    if (clear === "all") return;

    for (st = 0; st < storeys; st++)
      for (k = 0; k < n; k++) {
        var a = s[0] + gap + k * (w + gap);

        if (clear && a + w > clear[0] - 1 && a < clear[1] + 1) continue;

        windowOn(b, r, f, a, w, z0 + st * SH + 3.5, h, P);
      }
  });
}

/**
 * The walls r of a house storeys high from z0: a plinth, the walls, a band
 * between storeys, and what the walls are like - brick, stone, boards or
 * logs (the palette's material, iso MATERIALS), beams over them, quoins at
 * the corners. A garage is lower than a storey:
 * height, for walls not a storey high.
 *
 * @returns {number} how high they go
 */
function walls(b, r, z0, storeys, P, color, height) {
  var wall = color || P.wall,
    z1 = z0 + (height || storeys * SH),
    k,
    z;

  b.push(
    box(
      r.x0 - 0.25,
      r.x1 + 0.25,
      r.y0 - 0.25,
      r.y1 + 0.25,
      z0,
      z0 + 0.8,
      darker(wall, 0.3),
    ),
  );
  b.push(
    box(r.x0, r.x1, r.y0, r.y1, z0 + 0.8, z1, wall, finishOf(wall, MATTE)),
  );

  for (k = 1; k < storeys; k++)
    b.push(
      box(
        r.x0 - 0.15,
        r.x1 + 0.15,
        r.y0 - 0.15,
        r.y1 + 0.15,
        z0 + k * SH - 0.3,
        z0 + k * SH + 0.3,
        P.trim,
      ),
    );

  if (P.texture === "beams")
    FACES.forEach(function (f) {
      var s = span(r, f),
        n = Math.max(2, Math.round((s[1] - s[0]) / 5)),
        step = (s[1] - s[0] - 0.7) / n;

      for (k = 0; k <= n; k++)
        b.push(
          face(
            r,
            f,
            s[0] + k * step,
            s[0] + k * step + 0.7,
            z0 + 0.8,
            z1,
            0,
            0.15,
            P.trim,
          ),
        );
      b.push(
        face(
          r,
          f,
          s[0],
          s[1],
          z0 + 0.8 + (z1 - z0) * 0.42,
          z0 + 1.5 + (z1 - z0) * 0.42,
          0,
          0.15,
          P.trim,
        ),
      );
      b.push(face(r, f, s[0], s[1], z1 - 0.7, z1, 0, 0.15, P.trim));
    });

  if (P.texture === "quoins")
    for (z = z0 + 0.8, k = 0; z < z1 - 0.5; z += 1.6, k++) {
      var l = k % 2 ? 2.2 : 1.2,
        m = k % 2 ? 1.2 : 2.2,
        c = lighter(wall, 0.25);

      b.push(box(r.x0 - 0.1, r.x0 + l, r.y0 - 0.1, r.y0 + m, z, z + 1.4, c));
      b.push(box(r.x1 - l, r.x1 + 0.1, r.y0 - 0.1, r.y0 + m, z, z + 1.4, c));
      b.push(box(r.x0 - 0.1, r.x0 + l, r.y1 - m, r.y1 + 0.1, z, z + 1.4, c));
      b.push(box(r.x1 - l, r.x1 + 0.1, r.y1 - m, r.y1 + 0.1, z, z + 1.4, c));
    }

  return z1;
}

//how steep a roof is: half a unit up for every one across, so that its edges
//at a gable end come out clean lines, a step up for every step across up
//the front and level down the back - steeper, they would come out two up
//for three across and look ragged
var SLOPE = 0.5;

/**
 * A plane through the eaves line through px, py at height h, rising gx for
 * every unit along x and gy along y - what of a box is under it kept (iso
 * cut) - and the one `thick` under it, what is over it kept.
 */
function slopeTop(gx, gy, px, py, h) {
  return iso.plane(-gx, -gy, 1, h - gx * px - gy * py);
}

function slopeUnder(gx, gy, px, py, h, thick) {
  return iso.plane(gx, gy, -1, -(h - thick) + gx * px + gy * py);
}

/**
 * A pitched roof over the walls r, its eaves at z: a gable with its ridge
 * along `axis`, a hip, or a lean-to high along the side of the axis at the
 * back - each slope a plane (iso cut), lit by which way it looks, tiled,
 * slated or thatched (iso MATERIALS); and under a gable or a lean-to its
 * gable ends, in the walls' colour. Its eaves stand out a whole number of
 * units, and it is as steep as SLOPE, so its edges are clean lines - however
 * high roof.rise would have it.
 *
 * @param roof {{kind, axis, rise, over, color, thatch}}
 * @returns {function(x, y): number} how high over z the roof is at a spot
 */
function pitched(b, r, z, roof, wall) {
  var o = Math.max(1, Math.round(roof.over)),
    X0 = r.x0 - o,
    X1 = r.x1 + o,
    Y0 = r.y0 - o,
    Y1 = r.y1 + o,
    alongX = roof.axis === "x",
    half = alongX ? (Y1 - Y0) / 2 : (X1 - X0) / 2,
    s = SLOPE,
    rise = roof.kind === "shed" ? s * 2 * half : s * half,
    thick = roof.thatch ? 2 : 1,
    grey =
      Math.max.apply(null, roof.color) - Math.min.apply(null, roof.color) < 30,
    made = blocksMade(roof.thatch ? "thatch" : grey ? "slate" : "tiles"),
    mid = alongX ? (Y0 + Y1) / 2 : (X0 + X1) / 2;

  //how high, and which way it slopes: [h, dh/dx, dh/dy]
  function at(x, y) {
    var dy = Math.min(y - Y0, Y1 - y),
      dx = Math.min(x - X0, X1 - x),
      across = alongX ? dy : dx;

    if (roof.kind === "shed") {
      var up = alongX ? y - Y0 : x - X0;

      return alongX ? [s * up, 0, s] : [s * up, s, 0];
    }

    if (roof.kind === "hip" && (alongX ? dx : dy) < across) {
      var d = alongX ? dx : dy,
        sign = alongX
          ? x < (X0 + X1) / 2
            ? 1
            : -1
          : y < (Y0 + Y1) / 2
            ? 1
            : -1;

      return alongX ? [s * d, s * sign, 0] : [s * d, 0, s * sign];
    }

    var g = alongX ? (y < mid ? 1 : -1) : x < mid ? 1 : -1;

    return alongX ? [s * across, 0, s * g] : [s * across, s * g, 0];
  }

  //the slopes: [gx, gy, px, py] - which way each rises, and a point on its
  //eaves
  var slopes =
    roof.kind === "shed"
      ? [alongX ? [0, s, X0, Y0] : [s, 0, X0, Y0]]
      : roof.kind === "hip"
        ? [
            [0, s, X0, Y0],
            [0, -s, X0, Y1],
            [s, 0, X0, Y0],
            [-s, 0, X1, Y0],
          ]
        : alongX
          ? [
              [0, s, X0, Y0],
              [0, -s, X0, Y1],
            ]
          : [
              [s, 0, X0, Y0],
              [-s, 0, X1, Y0],
            ];

  function tops(list, down) {
    return list.map(function (q) {
      return slopeTop(q[0], q[1], q[2], q[3], z - down);
    });
  }

  if (roof.kind === "hip")
    //one solid, under all four slopes, down to a fascia under the eaves
    b.push(
      iso.cut(
        box(X0, X1, Y0, Y1, z - thick, z + rise, roof.color, made),
        tops(slopes, 0),
      ),
    );
  else {
    //the gable ends, or the lean-to's ends and its high wall, in the
    //walls' colour under the roof
    b.push(
      iso.cut(
        box(r.x0, r.x1, r.y0, r.y1, z, z + rise, wall, finishOf(wall, MATTE)),
        tops(slopes, thick),
      ),
    );

    //each slope a slab `thick` deep, as far as it is the roof's top - over
    //the whole of it, so that the slopes meet at the ridge wherever it is
    slopes.forEach(function (q) {
      b.push(
        iso.cut(
          box(X0, X1, Y0, Y1, z - thick, z + rise, roof.color, made),
          tops(slopes, 0).concat([
            slopeUnder(q[0], q[1], q[2], q[3], z, thick),
          ]),
        ),
      );
    });
  }

  //the ridge: a unit across, standing a unit clear of the slopes where they
  //meet - a line a pixel thick along the top, its face another under it
  if (roof.kind === "gable") {
    var rc = darker(roof.color, 0.25),
      r1 = Math.ceil(z + rise) + 1,
      m0 = Math.floor(mid);

    b.push(
      alongX
        ? box(X0, X1, m0, m0 + 1, r1 - 2, r1, rc)
        : box(m0, m0 + 1, Y0, Y1, r1 - 2, r1, rc),
    );
  }

  return function (x, y) {
    return at(x, y)[0];
  };
}

//the tops of the chimneys of the house being painted, for its smoke to come
//out of (describe smoke) - null while no house is
var smoking = null;

//a chimney at x, y going up through the roof - height, the roof's there
function chimney(b, x, y, z, height, color) {
  if (smoking !== null) smoking.push([x + 1.2, y + 1.2, z + height + 3.6]);

  b.push(box(x, x + 2.4, y, y + 2.4, z, z + height + 3, color || BRICK, MATTE));
  b.push(
    box(
      x - 0.3,
      x + 2.7,
      y - 0.3,
      y + 2.7,
      z + height + 3,
      z + height + 3.6,
      darker(color || BRICK, 0.3),
    ),
  );
}

/**
 * A flat roof over r at z: its slab standing out over the walls, and a low
 * parapet round it, or a deep overhang for a modern one.
 */
function flatRoof(b, r, z, color, over) {
  b.push(
    box(r.x0 - over, r.x1 + over, r.y0 - over, r.y1 + over, z, z + 1, color),
  );
  b.push(
    box(
      r.x0 - over + 0.6,
      r.x1 + over - 0.6,
      r.y0 - over + 0.6,
      r.y1 + over - 0.6,
      z + 1,
      z + 1.2,
      [150, 150, 150],
    ),
  );
}

/* --- Gardens ---------------------------------------------------------- */

function lawn(b, x0, x1, y0, y1, color) {
  b.push(box(x0, x1, y0, y1, 0, 1, color || GRASS));
}

//what is left of the rectangle with the hole cut out of it, in rectangles
function around(x0, x1, y0, y1, hole) {
  if (!hole || hole.x0 >= x1 || hole.x1 <= x0 || hole.y0 >= y1 || hole.y1 <= y0)
    return [[x0, x1, y0, y1]];

  return [
    [x0, x1, y0, Math.max(y0, hole.y0)],
    [x0, x1, Math.min(y1, hole.y1), y1],
    [x0, Math.max(x0, hole.x0), Math.max(y0, hole.y0), Math.min(y1, hole.y1)],
    [Math.min(x1, hole.x1), x1, Math.max(y0, hole.y0), Math.min(y1, hole.y1)],
  ].filter(function (q) {
    return q[0] < q[1] && q[2] < q[3];
  });
}

//a lawn mown in stripes along y, but where the hole is - a pool's
function stripes(b, x0, x1, y0, y1, hole) {
  for (var x = x0, k = 0; x < x1; x += 4, k++)
    around(x, Math.min(x + 4, x1), y0, y1, hole).forEach(function (q) {
      b.push(box(q[0], q[1], q[2], q[3], 0, 1, k % 2 ? STRIPE_LAWN : LAWN));
    });
}

//paving round the hole, as high as paved has it
function ring(b, x0, x1, y0, y1, hole, color) {
  around(x0, x1, y0, y1, hole).forEach(function (q) {
    b.push(box(q[0], q[1], q[2], q[3], 1, 1.2, color));
  });
}

function paved(b, x0, x1, y0, y1, color) {
  b.push(box(x0, x1, y0, y1, 1, 1.2, color || PAVING));
}

//a bed of flowers, dug over, with a flower here and there
function flowers(b, x0, x1, y0, y1, rnd) {
  var colors = [
    [214, 56, 64],
    [236, 196, 60],
    [232, 132, 176],
    [248, 248, 244],
    [150, 96, 196],
  ];

  b.push(box(x0, x1, y0, y1, 1, 1.4, SOIL));
  for (var x = x0 + 0.3; x < x1 - 0.6; x += 1)
    for (var y = y0 + 0.3; y < y1 - 0.6; y += 1) {
      var r = rnd();

      if (r < 0.35)
        b.push(box(x, x + 0.7, y, y + 0.7, 1.4, 2.2, [70, 132, 60]));
      else if (r < 0.75)
        b.push(
          box(
            x,
            x + 0.7,
            y,
            y + 0.7,
            1.4,
            2.4,
            colors[Math.floor(rnd() * colors.length)],
          ),
        );
    }
}

//a bush, round, from the ground up
function bush(b, x, y, r, color) {
  round(b, x, y, r, color || LEAF, 0.08, function (u, v) {
    var d = (u * u + v * v) / (r * r);

    if (d >= 1) return null;

    var k = Math.sqrt(1 - d);

    return [1, 1 + r * 0.95 * k, u / (r * r), v / (r * r), k / r];
  });
}

//a ball of clipped box on a stem, or on the ground
function topiary(b, x, y, r, stem) {
  if (stem > 0)
    b.push(box(x - 0.3, x + 0.3, y - 0.3, y + 0.3, 1, 1 + stem + 0.5, TRUNK));
  round(b, x, y, r, BOX, 0.05, function (u, v) {
    var d = (u * u + v * v) / (r * r);

    if (d >= 1) return null;

    var k = Math.sqrt(1 - d),
      mid = 1 + stem + r;

    return [mid - r * k, mid + r * k, u / (r * r), v / (r * r), k / r];
  });
}

//an Italian cypress: tall and narrow, coming to a point
function cypress(b, x, y, h) {
  var r = 1.9;

  round(b, x, y, r, CYPRESS, 0.08, function (u, v) {
    var d = Math.sqrt(u * u + v * v) / r;

    if (d >= 1) return null;

    return [1, 1 + h * (1 - d * d * 0.7) * (1 - d * 0.35), u, v, 1.6];
  });
}

/**
 * A tree in a garden, h high, its crown r across from the middle: a trunk,
 * and a round crown over it, flatter underneath - as tall as a tree is
 * beside a house, where blocks tree is a sapling in a yard.
 *
 * @returns {{mid, up}} where the middle of its crown is, and how far it
 *          reaches up from there
 */
function gardenTree(b, x, y, r, h) {
  var up = r * 0.85,
    down = r * 0.7,
    mid = h - up;

  b.push(box(x - 0.6, x + 0.6, y - 0.6, y + 0.6, 1, mid, TRUNK));
  round(b, x, y, r, LEAF, 0.07, function (u, v) {
    var d = (u * u + v * v) / (r * r);

    if (d >= 1) return null;

    var k = Math.sqrt(1 - d);

    return [mid - down * k, mid + up * k, u / (r * r), v / (r * r), k / up];
  });

  return { mid: mid, up: up };
}

//a tree with fruit on it: a garden tree, the fruit dotted over its crown
function fruitTree(b, x, y, r, h, fruit, rnd) {
  var crown = gardenTree(b, x, y, r, h),
    up = crown.up,
    mid = crown.mid;

  for (var i = 0; i < 7; i++) {
    var u = (rnd() - 0.5) * r * 1.4,
      v = (rnd() - 0.5) * r * 1.4,
      d = (u * u + v * v) / (r * r);

    if (d >= 0.8) continue;

    var top = mid + up * Math.sqrt(1 - d);

    b.push(
      box(
        x + u - 0.35,
        x + u + 0.35,
        y + v - 0.35,
        y + v + 0.35,
        top - 0.5,
        top + 0.3,
        fruit,
      ),
    );
  }
}

/**
 * A hedge from x0 to x1 and y0 to y1, h high, its top rounded across it - the
 * way blocks hedge has it, along whichever way it is long.
 */
function hedgeRun(b, x0, x1, y0, y1, h) {
  var alongX = x1 - x0 >= y1 - y0,
    l0 = alongX ? x0 : y0,
    l1 = alongX ? x1 : y1,
    c0 = alongX ? y0 : x0,
    c1 = alongX ? y1 : x1,
    mid = (c0 + c1) / 2,
    half = (c1 - c0) / 2,
    l,
    c;

  for (l = l0; l < l1 - 1e-6; l += 1)
    for (c = c0; c < c1 - 1e-6; c += 0.5) {
      var v = (c + 0.25 - mid) / half,
        k = Math.sqrt(Math.max(0, 1 - v * v)),
        top = 1 + h * (0.75 + 0.25 * k) - hash(l * 2, 7, 1) * 0.5,
        col = alongX
          ? shaded(LEAF, 0, v / half, k / (h * 0.3))
          : shaded(LEAF, v / half, 0, k / (h * 0.3)),
        g = (hash(l * 2, c * 4, 3) - 0.5) * 0.12,
        e = Math.min(l + 1, l1);

      b.push(
        alongX
          ? box(l, e, c, c + 0.5, 1, top, grain(col, g), LIT)
          : box(c, c + 0.5, l, e, 1, top, grain(col, g), LIT),
      );
    }
}

//the stretches from a0 to a1 that are not in any of the gaps
function stretches(a0, a1, gaps) {
  var out = [[a0, a1]];

  (gaps || []).forEach(function (g) {
    var next = [];

    out.forEach(function (s) {
      if (g[1] <= s[0] || g[0] >= s[1]) next.push(s);
      else {
        if (g[0] > s[0]) next.push([s[0], g[0]]);
        if (g[1] < s[1]) next.push([g[1], s[1]]);
      }
    });
    out = next;
  });

  return out;
}

/**
 * A fence along x at y (axis "x") or along y at x (axis "y") from a0 to a1,
 * leaving the gaps out: pickets, a low wall with railings over it, a hedge,
 * a high garden wall, or a high hedge.
 */
function fence(b, kind, axis, at, a0, a1, gaps, color) {
  stretches(a0, a1, gaps).forEach(function (s) {
    var p, l;

    function bx(l0, l1, c0, c1, z0, z1, col, fin) {
      return axis === "x"
        ? box(l0, l1, at + c0, at + c1, z0, z1, col, fin)
        : box(at + c0, at + c1, l0, l1, z0, z1, col, fin);
    }

    if (kind === "picket") {
      var c = color || WHITE;

      //a picket a unit wide every two, the rails behind them showing
      //through the gaps - whole units, so that every gap is a pixel
      for (p = Math.ceil(s[0]); p < s[1] - 0.5; p += 2)
        b.push(bx(p, p + 1, -0.2, 0.2, 1, 5, c));
      b.push(bx(s[0], s[1], 0.8, 1.2, 2, 3, darker(c, 0.12)));
      b.push(bx(s[0], s[1], 0.8, 1.2, 4, 5, darker(c, 0.12)));
    } else if (kind === "railing") {
      b.push(bx(s[0], s[1], -0.5, 0.5, 1, 2.6, BRICK, MATTE));
      b.push(bx(s[0], s[1], -0.6, 0.6, 2.6, 3, COPING));
      for (p = Math.ceil(s[0]) + 1; p < s[1] - 0.5; p += 2)
        b.push(bx(p, p + 1, -0.15, 0.15, 3, 5.6, IRON));
      b.push(bx(s[0], s[1], -0.2, 0.2, 5.4, 5.8, IRON));
      for (p = s[0]; p <= s[1] - 1.6; p += 8) {
        l = Math.min(p, s[1] - 1.6);
        b.push(bx(l, l + 1.6, -0.8, 0.8, 1, 6.2, BRICK, MATTE));
        b.push(bx(l - 0.2, l + 1.8, -1, 1, 6.2, 6.7, COPING));
      }
      b.push(bx(s[1] - 1.6, s[1], -0.8, 0.8, 1, 6.2, BRICK, MATTE));
      b.push(bx(s[1] - 1.8, s[1] + 0.2, -1, 1, 6.2, 6.7, COPING));
    } else if (kind === "hedge") {
      if (axis === "x") hedgeRun(b, s[0], s[1], at - 1, at + 1, 3.5);
      else hedgeRun(b, at - 1, at + 1, s[0], s[1], 3.5);
    } else if (kind === "highhedge") {
      if (axis === "x") hedgeRun(b, s[0], s[1], at - 1.3, at + 1.3, 7);
      else hedgeRun(b, at - 1.3, at + 1.3, s[0], s[1], 7);
    } else {
      //a garden wall, its coping, and piers along it
      var w = color || BRICK;

      b.push(bx(s[0], s[1], -0.6, 0.6, 1, 6.4, w, MATTE));
      b.push(bx(s[0], s[1], -0.8, 0.8, 6.4, 7, COPING));
      for (p = s[0]; p <= s[1] - 2; p += 10) {
        l = Math.min(p, s[1] - 2);
        b.push(bx(l, l + 2, -1, 1, 1, 7.6, w, MATTE));
        b.push(bx(l - 0.2, l + 2.2, -1.2, 1.2, 7.6, 8.2, COPING));
      }
      b.push(bx(s[1] - 2, s[1], -1, 1, 1, 7.6, w, MATTE));
      b.push(bx(s[1] - 2.2, s[1] + 0.2, -1.2, 1.2, 7.6, 8.2, COPING));
    }
  });
}

/**
 * A wrought iron gate across x from a0 to a1 at y, between two pillars with
 * lamps on them: its bars rising to an arch, gilt tips on them.
 */
function grandGate(b, a0, a1, y, pillar) {
  [a0 - 3, a1].forEach(function (p) {
    b.push(box(p, p + 3, y - 1.5, y + 1.5, 1, 9.5, pillar, MATTE));
    b.push(box(p - 0.3, p + 3.3, y - 1.8, y + 1.8, 9.5, 10.2, COPING));
    b.push(box(p + 0.9, p + 2.1, y - 0.6, y + 0.6, 10.2, 12, [250, 236, 180]));
    b.push(box(p + 0.6, p + 2.4, y - 0.9, y + 0.9, 12, 12.4, IRON));
  });

  var w = a1 - a0;

  for (var p = Math.ceil(a0) + 1; p < a1 - 0.5; p += 2) {
    var top = 6.2 + 1.6 * Math.sin((Math.PI * (p + 0.25 - a0)) / w);

    b.push(box(p, p + 1, y - 0.15, y + 0.15, 1.3, top, IRON));
    b.push(box(p, p + 1, y - 0.25, y + 0.25, top, top + 0.6, GOLD));
  }
  b.push(box(a0, a1, y - 0.2, y + 0.2, 1.4, 1.8, IRON));
  b.push(box(a0, a1, y - 0.25, y + 0.25, 4.2, 4.7, GOLD));
  b.push(
    box(
      (a0 + a1) / 2 - 0.25,
      (a0 + a1) / 2 + 0.25,
      y - 0.3,
      y + 0.3,
      1.3,
      7.8,
      IRON,
    ),
  );
}

//gate posts either side of a drive from a0 to a1 at y, the gates swung open
//along it
function driveGate(b, a0, a1, y, kind, color) {
  var c = kind === "picket" ? color || WHITE : IRON;

  [a0 - 1, a1].forEach(function (p) {
    b.push(
      box(
        p,
        p + 1,
        y - 0.5,
        y + 0.5,
        1,
        5.4,
        kind === "picket" ? c : BRICK,
        MATTE,
      ),
    );
  });
  [a0 + 0.1, a1 - 0.5].forEach(function (p) {
    b.push(box(p, p + 0.4, y + 0.6, y + 4.6, 2, 4.4, c));
  });
}

//a small gate in a fence from a0 to a1 at y
function wicket(b, a0, a1, y, kind, color) {
  var c = kind === "picket" ? color || WHITE : IRON;

  [a0 - 0.8, a1].forEach(function (p) {
    b.push(
      box(p, p + 0.8, y - 0.4, y + 0.4, 1, 5.2, kind === "picket" ? c : BRICK),
    );
  });
  for (var p = Math.ceil(a0); p < a1 - 0.5; p += 2)
    b.push(box(p, p + 1, y - 0.15, y + 0.15, 1.4, 4.4, c));
  b.push(box(a0, a1, y - 0.2, y + 0.2, 3.2, 3.6, c));
}

/* --- Yards ------------------------------------------------------------ */

//rows of vegetables along x, dug over
function vegetables(b, x0, x1, y0, y1, rnd) {
  var greens = [
    [86, 150, 64],
    [130, 180, 90],
    [70, 120, 70],
  ];

  b.push(box(x0, x1, y0, y1, 1, 1.25, SOIL));
  for (var y = y0 + 0.5, k = 0; y < y1 - 1; y += 2.5, k++) {
    var g = greens[k % greens.length];

    b.push(box(x0 + 0.3, x1 - 0.3, y, y + 1.2, 1.25, 1.45, darker(SOIL, 0.15)));
    for (var x = x0 + 0.6; x < x1 - 1; x += 1.4)
      b.push(
        box(
          x,
          x + 0.9,
          y + 0.15,
          y + 1.05,
          1.45,
          2.2 + rnd() * 0.6,
          k % 3 === 2 && rnd() < 0.4 ? [204, 60, 50] : g,
        ),
      );
  }
}

//a field of wheat in rows along x
function wheat(b, x0, x1, y0, y1) {
  b.push(box(x0, x1, y0, y1, 0, 1, DIRT));
  for (var y = y0 + 0.5, k = 0; y < y1 - 1.5; y += 2.6, k++)
    for (var x = x0 + 0.5; x < x1 - 0.5; x += 1) {
      var c = shaded(STRAW, 0, -0.4, 1),
        top = 3 + hash(x * 2, k, 5) * 0.6;

      b.push(
        box(
          x,
          Math.min(x + 1, x1 - 0.5),
          y,
          y + 1.9,
          1,
          top,
          grain(c, (hash(x * 3, k, 9) - 0.5) * 0.12),
          LIT,
        ),
      );
    }
}

//a haystack, a rounded heap of hay
function haystack(b, x, y, r, h) {
  round(b, x, y, r, STRAW, 0.08, function (u, v) {
    var d = (u * u + v * v) / (r * r);

    if (d >= 1) return null;

    var k = Math.pow(1 - d, 0.7);

    return [1, 1 + h * k, (u * 2) / (r * r), (v * 2) / (r * r), 1 / h];
  });
}

//a cow standing along x (axis "x") or along y, its head at the + end,
//black and white or brown
function cow(b, x, y, axis, brown) {
  var body = brown ? [150, 92, 58] : [238, 234, 226],
    patch = brown ? [236, 226, 210] : [44, 40, 40],
    alongX = axis === "x";

  function bx(l0, l1, c0, c1, z0, z1, col) {
    return alongX
      ? box(x + l0, x + l1, y + c0, y + c1, z0, z1, col)
      : box(x + c0, x + c1, y + l0, y + l1, z0, z1, col);
  }

  [-2.4, 1.6].forEach(function (l) {
    [-1, 0.4].forEach(function (c) {
      b.push(bx(l, l + 0.7, c, c + 0.6, 1, 2.7, darker(body, 0.25)));
    });
  });
  b.push(bx(-3, 2.6, -1.3, 1.3, 2.6, 5.2, body));
  b.push(bx(-1.6, 0.4, -1.4, 0.2, 3.4, 5.3, patch));
  b.push(bx(0.9, 2.2, -0.4, 1.4, 2.8, 4.6, patch));
  b.push(bx(2.4, 4.3, -0.9, 0.9, 3.6, 5.6, body));
  b.push(bx(3.9, 4.6, -0.7, 0.7, 3.6, 4.6, [226, 150, 150]));
  b.push(bx(2.6, 3, -1.4, 1.4, 5.2, 5.7, [232, 226, 200]));
  b.push(bx(-3.4, -3, -0.2, 0.2, 2.6, 4.6, darker(body, 0.2)));
}

//a sheep: a round woolly back, a dark face
function sheep(b, x, y, dir) {
  round(b, x, y, 1.7, [242, 238, 226], 0.1, function (u, v) {
    var d = (u * u + v * v) / 2.9;

    if (d >= 1) return null;

    var k = Math.sqrt(1 - d);

    return [2.2, 2.6 + 1.6 * k, u, v, 1.4];
  });
  [-0.8, 0.5].forEach(function (a) {
    [-0.8, 0.5].forEach(function (c) {
      b.push(box(x + a, x + a + 0.4, y + c, y + c + 0.4, 1, 2.3, [52, 46, 44]));
    });
  });
  b.push(
    box(
      x + 1.4 * dir[0] - 0.6,
      x + 1.4 * dir[0] + 0.6,
      y + 1.4 * dir[1] - 0.6,
      y + 1.4 * dir[1] + 0.6,
      3,
      4.4,
      [52, 46, 44],
    ),
  );
}

//a goat, brown and boxy, horns on
function goat(b, x, y) {
  var c = [176, 140, 100];

  [-1.4, 0.9].forEach(function (a) {
    [-0.6, 0.3].forEach(function (d) {
      b.push(
        box(x + a, x + a + 0.4, y + d, y + d + 0.4, 1, 2.6, darker(c, 0.2)),
      );
    });
  });
  b.push(box(x - 1.6, x + 1.6, y - 0.8, y + 0.8, 2.6, 4.4, c));
  b.push(box(x + 1.4, x + 2.6, y - 0.5, y + 0.5, 3.6, 5.2, c));
  b.push(box(x + 1.6, x + 1.9, y - 0.4, y + 0.4, 5.2, 6, [70, 60, 50]));
}

//a hen: a dot of white or brown, a comb on it
function hen(b, x, y, brown) {
  b.push(
    box(x, x + 1, y, y + 0.7, 1, 1.9, brown ? [170, 100, 50] : [246, 244, 236]),
  );
  b.push(box(x + 0.7, x + 1, y + 0.2, y + 0.5, 1.9, 2.3, [214, 50, 44]));
}

//a henhouse on legs, its roof sloping back, a ramp up to it
function henhouse(b, x0, x1, y0, y1) {
  [x0, x1 - 0.5].forEach(function (x) {
    [y0, y1 - 0.5].forEach(function (y) {
      b.push(box(x, x + 0.5, y, y + 0.5, 1, 2.5, TRUNK));
    });
  });
  b.push(box(x0, x1, y0, y1, 2.5, 5.5, WOOD, MATTE));
  b.push(
    box(x0 - 0.5, x1 + 0.5, y0 - 0.5, y1 + 0.5, 5.5, 6.2, darker(WOOD, 0.35)),
  );
  b.push(box(x0 + 1, x0 + 2, y0 - 0.1, y0, 2.5, 4, [40, 30, 26]));
  b.push(box(x0 + 1, x0 + 2, y0 - 2.4, y0, 1, 1.3, WOOD));
}

//a stone well with its roof on two posts and the windlass under it
function well(b, x, y) {
  var stone = [160, 154, 146];

  b.push(box(x - 2, x + 2, y - 2, y + 2, 1, 3.6, stone, MATTE));
  b.push(box(x - 1.3, x + 1.3, y - 1.3, y + 1.3, 3.2, 3.62, [40, 60, 80]));
  [-1.8, 1.4].forEach(function (a) {
    b.push(box(x + a, x + a + 0.4, y - 0.2, y + 0.2, 3.6, 8, WOOD));
  });
  b.push(box(x - 1.6, x + 1.6, y - 0.15, y + 0.15, 6, 6.4, TRUNK));
  b.push(box(x - 2.6, x + 2.6, y - 1.6, y + 1.6, 8, 8.6, [150, 70, 50]));
  b.push(box(x - 2.2, x + 2.2, y - 0.6, y + 0.6, 8.6, 9.4, [150, 70, 50]));
}

//logs stacked along x or y, their ends lighter
function woodpile(b, x0, x1, y0, y1, h) {
  b.push(box(x0, x1, y0, y1, 1, 1 + h, [128, 90, 60]));
  for (var z = 1.3; z < h; z += 1)
    if (x1 - x0 > y1 - y0)
      b.push(
        box(
          x0 - 0.05,
          x1 + 0.05,
          y0 - 0.05,
          y1 + 0.05,
          z,
          z + 0.3,
          [96, 64, 44],
        ),
      );
    else
      b.push(
        box(
          x0 - 0.05,
          x1 + 0.05,
          y0 - 0.05,
          y1 + 0.05,
          z,
          z + 0.3,
          [96, 64, 44],
        ),
      );
  b.push(box(x0, x1, y0, y1, 1 + h, 1.3 + h, [196, 160, 116]));
}

//a water trough along x
function trough(b, x0, x1, y0, y1) {
  b.push(box(x0, x1, y0, y1, 1, 2.6, WOOD));
  b.push(box(x0 + 0.3, x1 - 0.3, y0 + 0.3, y1 - 0.3, 2.3, 2.62, WATER));
}

//beehives: white boxes on stands, their lids grey
function beehive(b, x, y) {
  b.push(box(x, x + 2, y, y + 2, 1, 1.6, WOOD));
  b.push(box(x + 0.1, x + 1.9, y + 0.1, y + 1.9, 1.6, 3.8, [244, 240, 226]));
  b.push(box(x - 0.1, x + 2.1, y - 0.1, y + 2.1, 3.8, 4.3, [150, 150, 150]));
}

//a scarecrow in an old coat and a hat
function scarecrow(b, x, y) {
  b.push(box(x - 0.2, x + 0.2, y - 0.2, y + 0.2, 1, 7, TRUNK));
  b.push(box(x - 2.2, x + 2.2, y - 0.2, y + 0.2, 5.4, 5.8, TRUNK));
  b.push(box(x - 0.9, x + 0.9, y - 0.5, y + 0.5, 3.6, 6.2, [70, 96, 130]));
  b.push(box(x - 0.6, x + 0.6, y - 0.6, y + 0.6, 6.2, 7.4, STRAW));
  b.push(box(x - 1.2, x + 1.2, y - 1.2, y + 1.2, 7.4, 7.7, [96, 70, 44]));
  b.push(box(x - 0.6, x + 0.6, y - 0.6, y + 0.6, 7.7, 8.6, [96, 70, 44]));
}

//a garden shed of boards, its roof sloping back
function shed(b, x0, x1, y0, y1, color) {
  var c = color || [120, 140, 104];

  b.push(box(x0, x1, y0, y1, 1, 9, c, MATTE));
  for (var x = x0 + 1; x < x1 - 0.5; x += 1.2)
    b.push(box(x, x + 0.2, y0 - 0.1, y0, 1, 9, darker(c, 0.15)));
  b.push(box(x0 + 1.2, x0 + 4, y0 - 0.2, y0, 1, 8, darker(c, 0.35)));
  b.push(box(x0 - 0.5, x1 + 0.5, y0 - 0.6, y1 + 0.4, 9, 9.7, [80, 80, 86]));
}

//a table under a parasol, chairs either side
function parasol(b, x, y, color) {
  b.push(box(x - 1.2, x + 1.2, y - 1.2, y + 1.2, 3, 3.4, WHITE));
  b.push(box(x - 0.3, x + 0.3, y - 0.3, y + 0.3, 1, 3, WHITE));
  b.push(box(x - 0.15, x + 0.15, y - 0.15, y + 0.15, 3.4, 8, [200, 200, 196]));
  [-2.6, 1.8].forEach(function (a) {
    b.push(box(x + a, x + a + 0.8, y - 0.5, y + 0.5, 1, 2.6, WHITE));
  });
  round(b, x, y, 3.2, color, 0.03, function (u, v) {
    var d = Math.sqrt(u * u + v * v) / 3.2;

    if (d >= 1) return null;

    return [7.4 - d * 1.8, 7.9 - d * 1.8, u, v, 3];
  });
}

//a trampoline, its mat black in a blue ring
function trampoline(b, x, y, r) {
  [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ].forEach(function (d) {
    b.push(
      box(
        x + d[0] * r * 0.6 - 0.2,
        x + d[0] * r * 0.6 + 0.2,
        y + d[1] * r * 0.6 - 0.2,
        y + d[1] * r * 0.6 + 0.2,
        1,
        3,
        METAL,
      ),
    );
  });
  round(b, x, y, r, [60, 110, 180], 0, function (u, v) {
    var d = Math.sqrt(u * u + v * v) / r;

    if (d >= 1) return null;

    return d > 0.78 ? [3, 3.5, 0, 0, 1] : [3, 3.3, 0, 0, 1];
  });
  round(b, x, y, r * 0.78, [40, 40, 44], 0, function (u, v) {
    return Math.sqrt(u * u + v * v) < r * 0.78 ? [3, 3.35, 0, 0, 1] : null;
  });
}

//a line strung between two posts with the washing out on it
function washing(b, x0, x1, y) {
  var colors = [
    [240, 240, 236],
    [90, 140, 200],
    [220, 90, 90],
    [240, 210, 90],
  ];

  [x0, x1 - 0.4].forEach(function (x) {
    b.push(box(x, x + 0.4, y - 0.2, y + 0.2, 1, 7, METAL));
  });
  b.push(box(x0, x1, y - 0.05, y + 0.05, 6.6, 6.75, [210, 210, 210]));
  for (var x = x0 + 1.2, k = 0; x < x1 - 2; x += 2.2, k++)
    b.push(
      box(
        x,
        x + 1.6,
        y - 0.1,
        y + 0.1,
        4.2 + (k % 2) * 0.8,
        6.6,
        colors[k % colors.length],
      ),
    );
}

//a greenhouse of glass on a low wall
function greenhouse(b, x0, x1, y0, y1) {
  b.push(box(x0, x1, y0, y1, 1, 2, BRICK));
  b.push(
    box(x0 + 0.1, x1 - 0.1, y0 + 0.1, y1 - 0.1, 2, 6, [170, 210, 196], GLASSY),
  );
  var mid = (y0 + y1) / 2;

  for (var y = y0; y < y1; y += 0.5) {
    var h = 6 + 2.2 * (1 - Math.abs(y + 0.25 - mid) / ((y1 - y0) / 2));

    b.push(
      box(
        x0,
        x1,
        y,
        y + 0.5,
        6,
        h,
        shaded([186, 222, 210], 0, y < mid ? -0.8 : 0.8, 1),
        LIT,
      ),
    );
  }
}

//wheelie bins
function bins(b, x, y) {
  [
    [60, 110, 70],
    [70, 74, 80],
  ].forEach(function (c, i) {
    b.push(box(x + i * 1.6, x + i * 1.6 + 1.3, y, y + 1.3, 1, 3.4, c));
  });
}

/**
 * A swimming pool sunk in the ground from x0 to x1, y0 to y1: its coping of
 * pale stone round it, tiled sides, and the water - with loungers along one
 * side, at y1 + 1 for one along x.
 */
function pool(b, x0, x1, y0, y1) {
  var c = 1.4;

  b.push(box(x0 - c, x1 + c, y0 - c, y0, 0, 1.3, COPING));
  b.push(box(x0 - c, x1 + c, y1, y1 + c, 0, 1.3, COPING));
  b.push(box(x0 - c, x0, y0, y1, 0, 1.3, COPING));
  b.push(box(x1, x1 + c, y0, y1, 0, 1.3, COPING));
  b.push(box(x0, x1, y0, y1, 0, 0.75, darker(WATER, 0.2)));
  b.push(box(x0, x1, y0, y0 + 0.4, 0.75, 1.1, LINER));
  b.push(box(x0, x1, y1 - 0.4, y1, 0.75, 1.1, LINER));
  b.push(box(x0, x0 + 0.4, y0, y1, 0.75, 1.1, LINER));
  b.push(box(x1 - 0.4, x1, y0, y1, 0.75, 1.1, LINER));

  //the water, light rippling over it
  for (var y = y0 + 0.4; y < y1 - 0.4; y += 0.5)
    b.push(
      box(
        x0 + 0.4,
        x1 - 0.4,
        y,
        Math.min(y + 0.5, y1 - 0.4),
        0.75,
        0.8,
        Math.floor((y - y0) * 2) % 5 === 1 ? lighter(WATER, 0.25) : WATER,
        LIT,
      ),
    );
}

//a lounger along y, its back raised at the + end
function lounger(b, x, y) {
  b.push(box(x, x + 1.8, y, y + 4.6, 1.3, 2.2, WHITE));
  b.push(box(x, x + 1.8, y + 3.4, y + 4.6, 2.2, 3.6, WHITE));
  b.push(box(x + 0.1, x + 1.7, y + 0.4, y + 3.4, 2.2, 2.4, [70, 130, 190]));
}

//a fountain: a round basin, its water, a column with a bowl on top
function fountain(b, x, y, r) {
  round(b, x, y, r, COPING, 0.02, function (u, v) {
    var d = Math.sqrt(u * u + v * v);

    if (d >= r) return null;

    return d > r - 1 ? [1, 2.8, u, v, 4] : [1, 2.2, 0, 0, 1];
  });
  round(b, x, y, r - 1, WATER, 0.04, function (u, v) {
    return Math.sqrt(u * u + v * v) < r - 1 ? [2.2, 2.4, 0, 0, 1] : null;
  });
  b.push(box(x - 0.6, x + 0.6, y - 0.6, y + 0.6, 2.2, 6, COPING));
  round(b, x, y, 1.8, COPING, 0.02, function (u, v) {
    return Math.sqrt(u * u + v * v) < 1.8 ? [6, 6.8, u, v, 3] : null;
  });
  b.push(
    box(x - 0.3, x + 0.3, y - 0.3, y + 0.3, 6.8, 7.8, lighter(WATER, 0.4)),
  );
}

/**
 * A flight of steps up the front of a terrace at y (looking towards -y) from
 * x0 to x1, up to z: n steps, each `tread` deep.
 */
function steps(b, x0, x1, y, z, n, tread, color) {
  for (var i = 0; i < n; i++)
    b.push(
      box(
        x0,
        x1,
        y - (n - i) * tread,
        y,
        1,
        1 + ((i + 1) * (z - 1)) / n,
        color,
      ),
    );
}

//a column from z0 to z1 at x, y, its base and its capital
function column(b, x, y, z0, z1, color) {
  b.push(box(x - 0.9, x + 0.9, y - 0.9, y + 0.9, z0, z0 + 0.6, color));
  b.push(box(x - 0.6, x + 0.6, y - 0.6, y + 0.6, z0 + 0.6, z1 - 0.6, color));
  b.push(box(x - 0.9, x + 0.9, y - 0.9, y + 0.9, z1 - 0.6, z1, color));
}

//a balustrade along x at y from x0 to x1, on z
function balustrade(b, x0, x1, y, z, color) {
  for (var x = x0 + 0.3; x < x1 - 0.3; x += 1)
    b.push(box(x, x + 0.45, y - 0.25, y + 0.25, z, z + 2.2, color));
  b.push(box(x0, x1, y - 0.4, y + 0.4, z + 2.2, z + 2.7, color));
}

/* --- Building sites --------------------------------------------------- */

/**
 * What the house's tiles are while it goes up: bare earth, a slab poured
 * where each building of it stands, its walls of block - up to its windows
 * (stage 1), or as high as they go with the openings left in them, joists
 * over them, scaffolding along the front (stage 2) - and what they are built
 * of stacked about.
 *
 * @param specs {{rect, z, storeys}[]} the buildings of the house
 */
function site(W, D, specs, stage, rnd) {
  var b = [box(0, W, 0, D, 0, 1, DIRT)],
    hole = [74, 70, 66];

  specs.forEach(function (s) {
    //kept clear of the site's fence along the edges (shared/gen/sites),
    //which is laid over the tile and would cut through it otherwise
    var r = {
        x0: Math.max(s.rect.x0, 2),
        x1: Math.min(s.rect.x1, W - 2),
        y0: Math.max(s.rect.y0, 2),
        y1: Math.min(s.rect.y1, D - 2),
      },
      z0 = (s.z || 1) + 0.6,
      full = s.storeys * SH,
      h = stage === 1 ? 4.5 : full,
      t = 0.9;

    b.push(
      box(r.x0 - 0.6, r.x1 + 0.6, r.y0 - 0.6, r.y1 + 0.6, 1, z0, CONCRETE),
    );
    b.push(box(r.x0, r.x1, r.y0, r.y0 + t, z0, z0 + h, BLOCK, MATTE));
    b.push(box(r.x0, r.x1, r.y1 - t, r.y1, z0, z0 + h, BLOCK, MATTE));
    b.push(box(r.x0, r.x0 + t, r.y0, r.y1, z0, z0 + h, BLOCK, MATTE));
    b.push(box(r.x1 - t, r.x1, r.y0, r.y1, z0, z0 + h, BLOCK, MATTE));

    if (stage === 1) return;

    //the openings, the joists over it all
    FACES.forEach(function (f) {
      var sp = span(r, f);

      for (var st = 0; st < s.storeys; st++)
        for (var a = sp[0] + 3; a < sp[1] - 5; a += 7)
          b.push(
            face(
              r,
              f,
              a,
              a + 3,
              z0 + st * SH + 3,
              z0 + st * SH + 7,
              0,
              0.05,
              hole,
            ),
          );
    });
    for (var x = r.x0; x < r.x1 - 0.5; x += 2.5)
      b.push(box(x, x + 0.6, r.y0, r.y1, z0 + h, z0 + h + 0.8, TIMBER));

    //scaffolding along the front: poles, and boards at every storey
    for (var px = r.x0 - 1; px <= r.x1 + 1; px += 6) {
      var q = Math.min(px, r.x1 + 0.6);

      b.push(box(q, q + 0.4, r.y0 - 3, r.y0 - 2.6, 1, z0 + h + 1.5, METAL));
      b.push(box(q, q + 0.4, r.y0 - 1, r.y0 - 0.6, 1, z0 + h + 1.5, METAL));
    }
    for (var st = 1; st <= s.storeys; st++)
      b.push(
        box(
          r.x0 - 1,
          r.x1 + 1,
          r.y0 - 3,
          r.y0 - 0.6,
          z0 + st * SH - 0.5,
          z0 + st * SH,
          WOOD,
        ),
      );
  });

  //pallets of blocks and stacks of timber where there is room for them
  var spots = [],
    x,
    y;

  for (y = 3; y < D - 6; y += 7)
    for (x = 3; x < W - 7; x += 9) {
      var free = specs.every(function (s) {
        var r = s.rect;

        return (
          x + 6 < r.x0 - 4 ||
          x > r.x1 + 1.5 ||
          y + 4 < r.y0 - 4.5 ||
          y > r.y1 + 1.5
        );
      });

      if (free) spots.push([x, y]);
    }

  for (var i = 0; i < Math.min(3, spots.length); i++) {
    var p = spots.splice(Math.floor(rnd() * spots.length), 1)[0];

    b.push(box(p[0], p[0] + 5, p[1], p[1] + 3.6, 1, 1.6, WOOD));
    if (i % 2 === 0)
      b.push(
        box(
          p[0] + 0.2,
          p[0] + 4.8,
          p[1] + 0.2,
          p[1] + 3.4,
          1.6,
          4,
          BLOCK,
          MATTE,
        ),
      );
    else
      b.push(
        box(p[0] + 0.2, p[0] + 4.8, p[1] + 0.2, p[1] + 3.4, 1.6, 3, TIMBER),
      );
  }

  return { boxes: b, bays: [] };
}

/* --- The designs ------------------------------------------------------ */

//windows and doors, the way the cars go: a door 3.5 wide (a metre and a
//bit) and 8.5 high, windows 3.5 or 4 wide and 5 high, sills 3.5 up
var DOOR = 8.5,
  SILL = 3.5,
  PANE = 5;

//the roof of a village house - thatch thicker and steeper
function villageRoof(o, axis) {
  var R = VILLAGE_ROOF[o.roof];

  return {
    kind: "gable",
    axis: axis,
    rise: R.thatch ? 10 : 8.5,
    over: R.thatch ? 1.6 : 1.2,
    color: R.color,
    thatch: R.thatch,
  };
}

/**
 * A village house on one tile, seven metres by five and a half: the house at
 * the back on the left, a path of beaten earth to its door, and in the strip
 * of yard round it what keeps it - a vegetable patch and hens, an orchard
 * and beehives, a well and a woodpile and a goat, or flowers.
 */
function cottage(o, rnd, stage) {
  var r = { x0: 3, x1: 24, y0: 12, y1: 29 };

  if (stage) return site(TILE, TILE, [{ rect: r, storeys: 1 }], stage, rnd);

  var b = [],
    P = VILLAGE[o.pal],
    roof = villageRoof(o, "x");

  lawn(b, 0, TILE, 0, TILE);
  paved(b, 11.5, 15, 0.5, r.y0, PATH);

  var top = walls(b, r, 1, 1, P);

  doorOn(b, r, "-y", 11.5, 3.5, 1.2, DOOR, P);
  windowsOn(b, r, "-y", [5, 18], 3.5, 1 + SILL, PANE, P);
  windowsOn(b, r, "+y", [6, 15], 3.5, 1 + SILL, PANE, P);
  windowsOn(b, r, "-x", [19], 3.5, 1 + SILL, PANE, P);
  windowsOn(b, r, "+x", [19], 3.5, 1 + SILL, PANE, P);

  var height = pitched(b, r, top, roof, P.wall);

  if (!roof.thatch) chimney(b, 18, 21.5, top, height(19.2, 22.7));

  //window boxes of flowers under the front windows
  [5, 18].forEach(function (a) {
    b.push(box(a - 0.3, a + 3.8, r.y0 - 1.2, r.y0, 3.4, 4, WOOD));
    for (var x = a; x < a + 3.5; x += 0.8)
      b.push(
        box(
          x,
          x + 0.6,
          r.y0 - 1,
          r.y0 - 0.2,
          4,
          4.6,
          rnd() < 0.5 ? [214, 56, 64] : [236, 196, 60],
        ),
      );
  });

  if (o.yard === "veg") {
    vegetables(b, 17, 31, 1.5, 10, rnd);
    henhouse(b, 26, 31, 15, 20);
    hen(b, 25.5, 11.5, false);
    hen(b, 28, 12, true);
    hen(b, 29.5, 24.5, false);
    hen(b, 26.5, 27, true);
  } else if (o.yard === "orchard") {
    fruitTree(b, 28, 6, 3.6, 13, [210, 40, 40], rnd);
    fruitTree(b, 28, 22, 3.6, 13, [240, 170, 40], rnd);
    beehive(b, 17, 2.5);
    beehive(b, 20.5, 2.5);
  } else if (o.yard === "well") {
    well(b, 27.5, 6.5);
    woodpile(b, 26, 28, 13, 20, 3.6);
    goat(b, 28.5, 25);
  } else {
    flowers(b, 17, 31, 2, 5, rnd);
    flowers(b, 26.5, 30.5, 13, 28, rnd);
    bench(b, 19, 7);
  }

  gardenTree(b, 4.5, 5, 3.4, 13);
  bench(b, 3, 9.5);

  return { boxes: b, bays: [] };
}

/**
 * A farmstead on two tiles: the farmhouse at the front, a woodpile and a
 * tree by it, and behind it the farmyard - a pasture with a barn and cows, a
 * field of wheat with a scarecrow in it, or sheep about a shed.
 */
function farm(o, rnd, stage) {
  var r = { x0: 3, x1: 25, y0: 7, y1: 24 },
    barn = { x0: 12, x1: 30, y0: 36, y1: 58 };

  if (stage)
    return site(
      TILE,
      2 * TILE,
      [{ rect: r, storeys: 1 }].concat(
        o.layout === "barn" ? [{ rect: barn, storeys: 1 }] : [],
      ),
      stage,
      rnd,
    );

  var b = [],
    P = VILLAGE[o.pal],
    roof = villageRoof(o, "x");

  lawn(b, 0, TILE, 0, 2 * TILE);
  paved(b, 12, 15.5, 0.5, r.y0, PATH);

  //a storey, and a knee wall over it for the rooms in the roof
  var top = walls(b, r, 1, 1, P, null, SH + 2);

  doorOn(b, r, "-y", 12, 3.5, 1.2, DOOR, P);
  windowsOn(b, r, "-y", [5, 19], 3.5, 1 + SILL, PANE, P);
  windowsOn(b, r, "+y", [5, 12, 19], 3.5, 1 + SILL, PANE, P);
  windowsOn(b, r, "-x", [14], 3.5, 1 + SILL, PANE, P);
  windowsOn(b, r, "+x", [14], 3.5, 1 + SILL, PANE, P);

  var height = pitched(b, r, top, roof, P.wall);

  if (!roof.thatch) chimney(b, 6.5, 17, top, height(7.7, 18.2));

  flowers(b, 4, 10.5, r.y0 - 2.2, r.y0 - 0.6, rnd);
  flowers(b, 17, 24, r.y0 - 2.2, r.y0 - 0.6, rnd);
  woodpile(b, 27.5, 29.5, 9, 22, 3.6);
  gardenTree(b, 28.5, 3.5, 3, 12);

  if (o.layout === "barn") {
    //a pasture, a red barn, cows on it and a haystack
    lawn(b, 0, TILE, 26, 2 * TILE, [124, 170, 88]);
    var red = {
        wall: [168, 62, 48],
        trim: [244, 240, 230],
        door: [130, 50, 40],
      },
      btop = walls(b, barn, 1, 1, red, null, 13);

    b.push(face(barn, "-y", 16.5, 25.5, 1, 11.5, 0, 0.25, red.trim));
    b.push(face(barn, "-y", 17, 25, 1, 11, 0.25, 0.35, [120, 46, 36]));
    b.push(face(barn, "-y", 17, 25, 5.8, 6.2, 0.35, 0.45, red.trim));
    b.push(
      face(barn, "-y", 19.5, 22.5, btop + 1, btop + 4.5, 0, 0.3, red.trim),
    );
    windowsOn(b, barn, "+x", [45], 3, 1 + SILL, 4, red);
    windowsOn(b, barn, "-x", [45], 3, 1 + SILL, 4, red);
    pitched(
      b,
      barn,
      btop,
      { kind: "gable", axis: "y", rise: 10, over: 1, color: [92, 90, 96] },
      red.wall,
    );
    cow(b, 6, 40, "y", false);
    cow(b, 5, 52.5, "y", rnd() < 0.5);
    haystack(b, 22, 30.5, 3.5, 5.5);
    trough(b, 2, 9, 60, 61.6);
  } else if (o.layout === "field") {
    wheat(b, 1, 31, 27, 63);
    b.push(box(15, 17.5, 27, 63, 0.9, 1.05, DIRT));
    scarecrow(b, 16.2, 45);
    b.push(box(27.5, 31, 24.5, 26.5, 1, 3, STRAW));
    b.push(box(28, 30.5, 24.9, 26.1, 3, 4.6, STRAW));
  } else {
    lawn(b, 0, TILE, 26, 2 * TILE, [124, 170, 88]);
    shed(b, 21, 30, 51, 61, WOOD);
    sheep(b, 7, 33, [1, 0]);
    sheep(b, 14, 40, [0, 1]);
    sheep(b, 6.5, 48, [1, 0]);
    sheep(b, 13, 55, [-1, 0]);
    sheep(b, 20, 44, [0, -1]);
    gardenTree(b, 26, 37, 3.6, 13);
  }

  return { boxes: b, bays: [] };
}

//the roof of a town house
function cityRoof(o, P, axis) {
  return {
    kind: o.roof,
    axis: axis,
    rise: o.roof === "hip" ? 8 : 9,
    over: 1.2,
    color: P.roof,
  };
}

//a bay for a car, its middle at x, y, standing along y
function bayAt(x, y) {
  return { x: x, y: y, z: 1.2, headings: ["y+", "y-"] };
}

/**
 * A bungalow on two tiles along the street, twelve metres by six, its garage
 * beside it and the drive up to the garage door - too short for a car to
 * stand on; in front a garden behind a hedge, a picket fence or a low wall
 * with railings.
 */
function wide(o, rnd, stage) {
  var r = { x0: 3, x1: 39, y0: 11, y1: 30 },
    g = { x0: 41, x1: 54, y0: 11, y1: 30 };

  if (stage)
    return site(
      2 * TILE,
      TILE,
      [
        { rect: r, storeys: 1 },
        { rect: g, storeys: 1 },
      ],
      stage,
      rnd,
    );

  var b = [],
    P = CITY[o.pal],
    kind = o.front;

  lawn(b, 0, 2 * TILE, 0, TILE);
  paved(b, 42, 53, 0.3, g.y0, DRIVE);
  paved(b, 18.5, 22, 0.5, r.y0, PAVING);

  var top = walls(b, r, 1, 1, P);

  doorOn(b, r, "-y", 18.5, 3.5, 1.2, DOOR, P);
  b.push(box(17, 23.5, r.y0 - 2.4, r.y0, 10, 10.6, P.trim));
  windowsOn(b, r, "-y", [5.5, 11.5, 25.5, 31.5], 3.5, 1 + SILL, PANE, P);
  windowsOn(b, r, "+y", [6, 13, 24, 31], 3.5, 1 + SILL, PANE, P);
  windowsOn(b, r, "-x", [18.5], 3.5, 1 + SILL, PANE, P);

  var height = pitched(b, r, top, cityRoof(o, P, "x"), P.wall);

  chimney(b, 8, 22, top, height(9.2, 23.2));

  //the garage: its door up and over, a flat roof
  var gtop = walls(b, g, 1, 1, P, null, 10);

  garageDoor(b, g, 43.5, 51.5);
  windowsOn(b, g, "+x", [18.5], 3, 1 + SILL, 4, P);
  flatRoof(b, g, gtop, P.trim, 0.5);

  flowers(b, 4, 16.5, 7.5, 9.5, rnd);
  flowers(b, 24, 38, 7.5, 9.5, rnd);
  gardenTree(b, 9, 4, 3.2, 12);
  bush(b, 31, 4.5, 2);

  fence(b, kind, "x", 1.4, 0.5, 40.5, [[18, 22.5]], P.picket);
  fence(b, kind, "y", 1.4, 2.8, 31, [], P.picket);
  fence(b, kind, "y", 62.6, 1.8, 31, [], P.picket);
  gardenTree(b, 58.5, 21, 3.6, 14);
  bins(b, 56, 3.5);

  return { boxes: b, bays: [] };
}

//a garage door, up and over, from a0 to a1 along the front of g
function garageDoor(b, g, a0, a1) {
  b.push(face(g, "-y", a0, a1, 1, DOOR + 0.5, 0, 0.25, WHITE));
  b.push(
    face(g, "-y", a0 + 0.5, a1 - 0.5, 1.1, DOOR, 0.25, 0.35, [226, 226, 222]),
  );
  for (var z = 2.5; z < DOOR; z += 1.5)
    b.push(
      face(
        g,
        "-y",
        a0 + 0.5,
        a1 - 0.5,
        z,
        z + 0.25,
        0.35,
        0.4,
        [196, 196, 192],
      ),
    );
}

/**
 * The front of a town house filling its plot from x 2 to 30, its front at
 * r.y0: the door with a canopy over it and a path up to it from the gate,
 * windows either side and four over them - and the front garden, a hard
 * standing in it for the car, behind a fence along the street.
 */
function frontGarden(b, r, P, kind, rnd) {
  paved(b, 8.5, 12, 0.5, r.y0, PAVING);
  paved(b, 18.5, 28.5, 0.3, r.y0 - 3, DRIVE);
  doorOn(b, r, "-y", 8.5, 3.5, 1.2, DOOR, P);
  b.push(box(7, 13.5, r.y0 - 2.4, r.y0, 10, 10.6, P.trim));
  windowsOn(b, r, "-y", [3.5], 3.5, 1 + SILL, PANE, P);
  windowsOn(b, r, "-y", [15, 21, 26], 3.5, 1 + SILL, PANE, P);
  windowsOn(b, r, "-y", [3.5, 9, 15, 21, 26], 3.5, 1 + SH + SILL, PANE, P);
  flowers(b, 2.5, 7.5, r.y0 - 4, r.y0 - 1.5, rnd);
  flowers(b, 13.5, 17.5, r.y0 - 4, r.y0 - 1.5, rnd);
  bush(b, 4.5, 6, 2.4);
  fence(
    b,
    kind,
    "x",
    1.2,
    0.5,
    31.5,
    [
      [8, 12.5],
      [18, 29],
    ],
    P.picket,
  );
}

/**
 * A two-storey house on two tiles end on to the street, as wide as its plot
 * lets it be - nine metres by eight: in front its garden and the car on the
 * hard standing in it; behind, the back garden, the house's own, out of its
 * back door - a lawn with a tree, a shed and the washing out, or a patio and
 * a trampoline.
 */
function deep(o, rnd, stage) {
  var r = { x0: 2, x1: 30, y0: 22, y1: 46 };

  if (stage) return site(TILE, 2 * TILE, [{ rect: r, storeys: 2 }], stage, rnd);

  var b = [],
    P = CITY[o.pal],
    kind = o.fence;

  lawn(b, 0, TILE, 0, 2 * TILE);

  var top = walls(b, r, 1, 2, P);

  frontGarden(b, r, P, kind, rnd);
  windowsAround(b, r, 1, 2, 3.5, PANE, P, { "-y": "all", "+y": [12, 18] });
  windowsOn(b, r, "+y", [13.2], 3.5, 1 + SH + SILL, PANE, P);
  doorOn(b, r, "+y", 13.2, 3.5, 1.2, DOOR, P);

  var height = pitched(b, r, top, cityRoof(o, P, "x"), P.wall);

  chimney(b, 22, 35, top, height(23.2, 36.2));

  fence(b, kind, "y", 1, 2, 63, [], P.picket);
  fence(b, kind, "y", 31, 2, 63, [], P.picket);
  fence(b, kind, "x", 63, 0.5, 31.5, [], P.picket);
  bins(b, 28.5, 18.2, 1, "x");

  if (o.back === "garden") {
    paved(b, 10, 19, 46, 50, PAVING);
    gardenTree(b, 6, 54, 4, 15);
    flowers(b, 2.5, 9, 47, 49, rnd);
    shed(b, 22, 30, 53, 61.5);
    washing(b, 11, 20, 58);
  } else {
    paved(b, 3, 22, 46, 53, PAVING);
    parasol(b, 9, 49.5, [214, 60, 60]);
    trampoline(b, 15, 58, 3.5);
    gardenTree(b, 26.5, 52, 3.6, 14);
    bush(b, 5, 59, 2.2);
  }

  return { boxes: b, bays: [bayAt(23.5, 9)] };
}

/**
 * A two-storey house on three tiles end on to the street, as wide as its
 * plot, a lower kitchen out at the back: in front its garden and the car on
 * the hard standing, behind it the long back garden, the house's own, out of
 * the kitchen door - a patio, trees, a shed, a greenhouse, vegetables and
 * the washing out.
 */
function long(o, rnd, stage) {
  var r = { x0: 2, x1: 30, y0: 22, y1: 49 },
    e = { x0: 2, x1: 17, y0: 49, y1: 59 };

  if (stage)
    return site(
      TILE,
      3 * TILE,
      [
        { rect: r, storeys: 2 },
        { rect: e, storeys: 1 },
      ],
      stage,
      rnd,
    );

  var b = [],
    P = CITY[o.pal],
    kind = o.fence;

  lawn(b, 0, TILE, 0, 3 * TILE);

  var top = walls(b, r, 1, 2, P);

  frontGarden(b, r, P, kind, rnd);
  windowsAround(b, r, 1, 2, 3.5, PANE, P, { "-y": "all", "+y": "all" });
  windowsOn(b, r, "+y", [20, 25.5], 3.5, 1 + SILL, PANE, P);
  windowsOn(b, r, "+y", [4, 10, 20, 25.5], 3.5, 1 + SH + SILL, PANE, P);

  var height = pitched(b, r, top, cityRoof(o, P, "x"), P.wall);

  chimney(b, 22, 37, top, height(23.2, 38.2));

  //the kitchen out at the back, its roof flat, the back door out of it and
  //a patio before it
  var etop = walls(b, e, 1, 1, P);

  windowsOn(b, e, "-x", [52], 4, 1 + SILL, PANE, P);
  windowsOn(b, e, "+y", [4, 10], 3.5, 1 + SILL, PANE, P);
  doorOn(b, e, "+x", 52, 3.5, 1.2, DOOR, P);
  flatRoof(b, e, etop, P.trim, 0.6);
  paved(b, 17, 30, 49, 61, PAVING);
  parasol(b, 24.5, 55, [214, 60, 60]);

  fence(b, kind, "y", 1, 2, 95.5, [], P.picket);
  fence(b, kind, "y", 31, 2, 95.5, [], P.picket);
  fence(b, kind, "x", 95, 0.5, 31.5, [], P.picket);
  bins(b, 28.5, 18.2, 1, "x");

  gardenTree(b, 8, 67, 4.5, 16);
  shed(b, 22, 30.5, 64, 73);
  gardenTree(b, 26, 89.5, 4, 15);
  greenhouse(b, 3, 11, 78, 90);
  vegetables(b, 13, 21, 76, 92, rnd);
  washing(b, 21, 30, 80);
  bench(b, 3, 61);

  return { boxes: b, bays: [bayAt(23.5, 9)] };
}

/**
 * The fence round one half of a pair, from x0 to x1: along the front - its
 * drive from d0 to d1 through gates swung open, the path from p0 to p1
 * through a gate of its own - down either side, where `sides` says, leaving
 * out the stretch the house stands on, as far as `back` - and along the
 * back there, for one with a back garden.
 *
 * @param sides {[boolean, boolean]} whether there is a fence on the left, on
 *        the right
 * @param house {[number, number]} from where to where along y the house is
 */
function plot(
  b,
  kind,
  x0,
  x1,
  d0,
  d1,
  p0,
  p1,
  sides,
  house,
  back,
  closed,
  color,
) {
  fence(
    b,
    kind,
    "x",
    1,
    x0 + 0.5,
    x1 - 0.5,
    [
      [d0 - 1, d1 + 1],
      [p0 - 0.8, p1 + 0.8],
    ],
    color,
  );
  driveGate(b, d0, d1, 1, kind, color);
  wicket(b, p0, p1, 1, kind, color);
  if (closed) fence(b, kind, "x", back + 0.5, x0 + 0.5, x1 - 0.5, [], color);
  if (sides[0]) fence(b, kind, "y", x0 + 0.8, 1.8, back, [house], color);
  if (sides[1]) fence(b, kind, "y", x1 - 0.8, 1.8, back, [house], color);
}

/**
 * Houses side by side under one roof, each `w` wide, their fronts at y0 and
 * backs at y1, mirrored every other one: the doors by the party walls, the
 * drives on the outside, each house's windows its own.
 */
function terrace(b, o, P, n, w, x0, y0, y1) {
  var r = { x0: x0, x1: x0 + n * w, y0: y0, y1: y1 },
    top = walls(b, r, 1, 2, P),
    u;

  for (u = 0; u < n; u++) {
    var a = x0 + u * w,
      flip = u % 2 === 1,
      door = flip ? a + 3 : a + w - 6.5;

    doorOn(b, r, "-y", door, 3.5, 1.2, DOOR, P);
    b.push(box(door - 1.5, door + 5, y0 - 2.4, y0, 10, 10.6, P.trim));
    windowsOn(b, r, "-y", [flip ? a + w - 12 : a + 4], 8, 1 + SILL, PANE, P);
    windowsOn(
      b,
      r,
      "-y",
      [a + 4, a + w / 2 - 2, a + w - 8],
      4,
      1 + SH + SILL,
      PANE,
      P,
    );
    windowsOn(b, r, "+y", [a + 4, a + w - 8], 4, 1 + SILL, PANE, P);
    windowsOn(b, r, "+y", [a + 4, a + w - 8], 4, 1 + SH + SILL, PANE, P);
    if (u > 0)
      b.push(
        box(
          a - 0.25,
          a + 0.25,
          y0 - 0.3,
          y1 + 0.3,
          1,
          top + 0.3,
          darker(P.wall, 0.15),
        ),
      );
  }

  ["-x", "+x"].forEach(function (f) {
    windowsOn(b, r, f, [y0 + 5, y1 - 9], 4, 1 + SILL, PANE, P);
    windowsOn(b, r, f, [y0 + 5, y1 - 9], 4, 1 + SH + SILL, PANE, P);
  });

  var height = pitched(b, r, top, cityRoof(o, P, "x"), P.wall),
    my = (y0 + y1) / 2;

  for (u = 1; u < n; u++)
    chimney(b, x0 + u * w - 1.2, my + 1.5, top, height(x0 + u * w, my + 2.7));
}

/**
 * The two halves of a pair on two tiles along the street, the house r a
 * storey or two back from it: each half's parking space on the outside with
 * a car on it, the path from its own gate to its door by the party wall, a
 * flower bed and a tree between - and the fence round it, as far back as
 * `back`, closed there for halves with a back garden of their own.
 */
function pairFronts(b, P, kind, r, back, closed, rnd) {
  [0, 1].forEach(function (u) {
    var flip = u === 1,
      x0 = u * 32,
      x1 = x0 + 32,
      d0 = flip ? x1 - 11.5 : x0 + 2,
      door = flip ? 35 : 25.5,
      mirror = function (x) {
        return flip ? 64 - x : x;
      };

    paved(b, d0, d0 + 9.5, 0.3, r.y0, DRIVE);
    paved(b, door, door + 3.5, 0.5, r.y0, PAVING);
    flowers(
      b,
      Math.min(mirror(13), mirror(23)),
      Math.max(mirror(13), mirror(23)),
      r.y0 - 5.5,
      r.y0 - 2.5,
      rnd,
    );
    if (r.y0 > 28) gardenTree(b, mirror(17), 10, 3.4, 13);
    else bush(b, mirror(17), 9, 2.4);
    plot(
      b,
      kind,
      x0,
      x1,
      d0,
      d0 + 9.5,
      door,
      door + 3.5,
      [!flip, true],
      [r.y0 - 1, r.y1 + 1],
      back,
      closed,
      P.picket,
    );
  });
}

/**
 * Semi-detached houses on four tiles: one pair under one roof at the back,
 * each half nine metres by nine, with its parking space in front on the
 * outside, a path from its own gate through its front garden, and a fence
 * round it.
 */
function semi(o, rnd, stage) {
  var r = { x0: 3, x1: 61, y0: 34, y1: 61 };

  if (stage)
    return site(2 * TILE, 2 * TILE, [{ rect: r, storeys: 2 }], stage, rnd);

  var b = [],
    P = CITY[o.pal];

  lawn(b, 0, 2 * TILE, 0, 2 * TILE);
  terrace(b, o, P, 2, 29, 3, r.y0, r.y1);
  pairFronts(b, P, o.fence, r, r.y0 - 0.5, false, rnd);

  return { boxes: b, bays: [bayAt(6.75, 15), bayAt(57.25, 15)] };
}

//a swing: two posts at each end, the bar over them, two seats hanging off it
function swing(b, x0, x1, y) {
  var rope = [200, 200, 200];

  [x0, x1 - 0.5].forEach(function (x) {
    b.push(box(x, x + 0.5, y - 1.6, y - 1.1, 1, 9, METAL));
    b.push(box(x, x + 0.5, y + 1.1, y + 1.6, 1, 9, METAL));
  });
  b.push(box(x0, x1, y - 0.3, y + 0.3, 8.6, 9.2, METAL));
  [x0 + (x1 - x0) * 0.25, x0 + (x1 - x0) * 0.6].forEach(function (x) {
    b.push(box(x, x + 0.15, y - 0.08, y + 0.08, 3.6, 8.6, rope));
    b.push(box(x + 1.4, x + 1.55, y - 0.08, y + 0.08, 3.6, 8.6, rope));
    b.push(box(x, x + 1.55, y - 0.5, y + 0.5, 3.2, 3.6, [210, 60, 50]));
  });
}

//a sandpit in a frame of boards
function sandpit(b, x0, x1, y0, y1) {
  b.push(box(x0, x1, y0, y1, 1, 2, WOOD));
  b.push(box(x0 + 0.5, x1 - 0.5, y0 + 0.5, y1 - 0.5, 1, 1.8, [230, 210, 150]));
}

/**
 * Semi-detached houses on six tiles, end on to the street: two tiles along
 * it and three deep. The pair stands in the middle under one roof, each half
 * nine metres by nine; in front its parking space, its gate and its path,
 * and behind it a back garden of its own, fourteen metres long - a patio, a
 * lawn and a shed, vegetables and a greenhouse; or a trampoline, a swing and
 * a sandpit for the children next door to a patio and a shed.
 */
function pair(o, rnd, stage) {
  var D = 3 * TILE,
    r = { x0: 3, x1: 61, y0: 24, y1: 52 };

  if (stage) return site(2 * TILE, D, [{ rect: r, storeys: 2 }], stage, rnd);

  var b = [],
    P = CITY[o.pal];

  lawn(b, 0, 2 * TILE, 0, D);
  terrace(b, o, P, 2, 29, 3, r.y0, r.y1);
  pairFronts(b, P, o.fence, r, D - 1.5, true, rnd);

  if (o.back === "garden") {
    paved(b, 4, 28, r.y1, r.y1 + 7, PAVING);
    parasol(b, 12, r.y1 + 3.5, [60, 120, 190]);
    gardenTree(b, 23, 74, 4.5, 16);
    flowers(b, 3, 15, 70, 73, rnd);
    shed(b, 3, 13, 84, 94);
    washing(b, 36, 47, 58);
    vegetables(b, 35, 49, 66, 80, rnd);
    greenhouse(b, 52, 61, 64, 76);
    gardenTree(b, 42, 88, 4, 15);
  } else {
    flowers(b, 3, 29, r.y1 + 1.5, r.y1 + 3.5, rnd);
    trampoline(b, 12, 66, 3.5);
    swing(b, 4, 14, 82);
    sandpit(b, 18, 26, 87, 93);
    gardenTree(b, 24, 72, 4.5, 16);
    paved(b, 36, 60, r.y1, r.y1 + 7, PAVING);
    parasol(b, 48, r.y1 + 3.5, [214, 60, 60]);
    gardenTree(b, 41, 76, 4.5, 16);
    shed(b, 51, 61, 84, 94);
    bench(b, 36, 90);
  }

  return { boxes: b, bays: [bayAt(6.75, 11), bayAt(57.25, 11)] };
}

/**
 * Where a villa stands on its footprint, by how it is laid out: the house,
 * its wings if it has them; the gate, a fountain or a pool and the side its
 * loungers are on, a pool house - and the bays on its court.
 */
var VILLAS = {
  "2x2": {
    center: {
      r: { x0: 13, x1: 51, y0: 34, y1: 55 },
      gate: [26, 38],
      fountain: [32, 16],
      bays: [bayAt(18.5, 15), bayAt(45.5, 15)],
    },
    side: {
      r: { x0: 5, x1: 37, y0: 32, y1: 55 },
      gate: [16, 26],
      pool: { x0: 47, x1: 56, y0: 27, y1: 52, loungers: "left" },
      bays: [bayAt(11.5, 14), bayAt(30.5, 14)],
    },
  },
  "3x2": {
    center: {
      r: { x0: 27, x1: 69, y0: 32, y1: 55 },
      wing: 6,
      gate: [42, 54],
      fountain: [48, 15],
      pool: { x0: 5, x1: 13, y0: 25, y1: 51, loungers: "right" },
      bays: [bayAt(28, 14), bayAt(68, 14)],
    },
    side: {
      r: { x0: 6, x1: 48, y0: 30, y1: 55 },
      gate: [21, 33],
      pool: { x0: 58, x1: 88, y0: 30, y1: 41, loungers: "below" },
      house: { x0: 78, x1: 90, y0: 51, y1: 60 },
      bays: [bayAt(12, 13), bayAt(42, 13)],
    },
  },
};

/**
 * A villa: two storeys up a flight of steps on a terrace, a porch of columns
 * with a balcony over it, a hipped roof - or a flat one, white, with wood
 * and glass, for a modern one; behind its gate a gravel court with the cars
 * on it, a fountain or a pool, lawns mown in stripes, cypresses and clipped
 * box, all inside a high hedge or a wall.
 */
function villa(size) {
  return function (o, rnd, stage) {
    var L = VILLAS[size][o.layout],
      W = size === "2x2" ? 2 * TILE : 3 * TILE,
      D = 2 * TILE,
      r = L.r,
      wings = L.wing
        ? [
            { x0: r.x0 - L.wing, x1: r.x0, y0: r.y0 + 4, y1: r.y1 - 1 },
            { x0: r.x1, x1: r.x1 + L.wing, y0: r.y0 + 4, y1: r.y1 - 1 },
          ]
        : [],
      z0 = 3.2;

    if (stage)
      return site(
        W,
        D,
        [{ rect: r, storeys: 2, z: z0 - 1 }]
          .concat(
            wings.map(function (w) {
              return { rect: w, storeys: 1, z: z0 - 1 };
            }),
          )
          .concat(L.house ? [{ rect: L.house, storeys: 1 }] : []),
        stage,
        rnd,
      );

    var b = [],
      P = VILLA[o.style],
      modern = P.roof === null,
      mid = (L.gate[0] + L.gate[1]) / 2,
      bound = o.bound === "hedge" ? "highhedge" : "wall",
      p = L.pool,
      deck = p
        ? { x0: p.x0 - 3.5, x1: p.x1 + 3.5, y0: p.y0 - 3.5, y1: p.y1 + 3.5 }
        : null,
      hole = p
        ? { x0: p.x0 - 1.4, x1: p.x1 + 1.4, y0: p.y0 - 1.4, y1: p.y1 + 1.4 }
        : null;

    stripes(b, 0, W, 0, D, hole);

    //the gravel court in front, the drive up to it from the gate
    var court = {
      x0: (wings.length ? wings[0].x0 : r.x0) + 1,
      x1: (wings.length ? wings[1].x1 : r.x1) - 1,
      y0: 5,
      y1: r.y0 - 7,
    };

    paved(b, court.x0, court.x1, court.y0, court.y1, GRAVEL);
    paved(b, L.gate[0], L.gate[1], 0.3, court.y0, GRAVEL);
    paved(b, mid - 7, mid + 7, court.y1, r.y0 - 3.5, GRAVEL);
    if (L.fountain) fountain(b, L.fountain[0], L.fountain[1], 4.5);

    //the terrace, the steps up to it, urns either side
    var t = {
      x0: (wings.length ? wings[0].x0 : r.x0) - 2,
      x1: (wings.length ? wings[1].x1 : r.x1) + 2,
      y0: r.y0 - 3.5,
      y1: r.y1 + 1.5,
    };

    b.push(box(t.x0, t.x1, t.y0, t.y1, 1, z0, P.trim, MATTE));
    steps(b, mid - 6, mid + 6, t.y0, z0, 3, 1.2, P.trim);
    [mid - 8.5, mid + 6.5].forEach(function (x) {
      b.push(box(x, x + 2, t.y0 - 0.5, t.y0 + 1.5, z0, z0 + 1.2, P.trim));
      topiary(b, x + 1, t.y0 + 0.5, 1.1, z0 + 0.2);
    });
    balustrade(b, t.x0 + 0.5, mid - 9, t.y0 + 0.4, z0, P.trim);
    balustrade(b, mid + 9, t.x1 - 0.5, t.y0 + 0.4, z0, P.trim);

    //the house
    var top = walls(b, r, z0, 2, P);

    if (modern) {
      //glass from floor to ceiling, timber over part of it
      b.push(
        face(
          r,
          "-y",
          r.x0 + 2,
          mid - 7,
          z0 + 1,
          z0 + SH - 1,
          0,
          0.3,
          GLASS,
          GLASSY,
        ),
      );
      b.push(
        face(
          r,
          "-y",
          mid + 7,
          r.x1 - 2,
          z0 + 1,
          z0 + SH - 1,
          0,
          0.3,
          GLASS,
          GLASSY,
        ),
      );
      b.push(
        face(
          r,
          "-y",
          mid + 7,
          r.x1 - 2,
          z0 + SH + 1,
          top - 1,
          0,
          0.3,
          GLASS,
          GLASSY,
        ),
      );
      b.push(face(r, "-y", r.x0, mid - 7, z0 + SH, top, 0, 0.4, P.wood, MATTE));
      ["+y", "-x", "+x"].forEach(function (f) {
        var sp = span(r, f);

        b.push(
          face(
            r,
            f,
            sp[0] + 2,
            sp[1] - 2,
            z0 + 1.5,
            z0 + SH - 1,
            0,
            0.3,
            GLASS,
            GLASSY,
          ),
        );
        b.push(
          face(
            r,
            f,
            sp[0] + 4,
            sp[1] - 9,
            z0 + SH + 2,
            top - 1.5,
            0,
            0.3,
            GLASS,
            GLASSY,
          ),
        );
        b.push(
          face(r, f, sp[1] - 7, sp[1], z0 + SH, top, 0, 0.4, P.wood, MATTE),
        );
      });
    } else
      windowsAround(b, r, z0, 2, 3.5, PANE + 1, P, {
        "-y": [mid - 7, mid + 7],
      });

    //the way in: double doors, a porch of columns, a balcony over it
    doorOn(b, r, "-y", mid - 2.5, 5, z0 + 0.1, DOOR + 1, P);
    if (modern) {
      b.push(
        box(mid - 7, mid + 7, r.y0 - 4, r.y0, z0 + SH, z0 + SH + 0.8, P.wall),
      );
      b.push(
        box(
          mid - 7,
          mid + 7,
          r.y0 - 4.2,
          r.y0 - 3.8,
          z0 + SH + 0.8,
          z0 + SH + 3,
          [180, 210, 220],
          GLASSY,
        ),
      );
      windowOn(b, r, "-y", mid - 5, 10, z0 + SH + 1.2, 8, P);
    } else {
      [mid - 6, mid - 2.5, mid + 2.5, mid + 6].forEach(function (x) {
        column(b, x, r.y0 - 3, z0, z0 + SH, WHITE);
      });
      b.push(
        box(
          mid - 7.5,
          mid + 7.5,
          r.y0 - 4.5,
          r.y0,
          z0 + SH,
          z0 + SH + 1,
          WHITE,
        ),
      );
      balustrade(b, mid - 7.3, mid + 7.3, r.y0 - 4, z0 + SH + 1, WHITE);
      windowOn(b, r, "-y", mid - 2, 4, z0 + SH + 1.2, 8, P);
    }

    if (modern) {
      flatRoof(b, r, top, WHITE, 1.8);
      b.push(
        box(
          r.x0 + 4,
          r.x0 + 14,
          r.y1 - 10,
          r.y1 - 3,
          top + 1.2,
          top + 1.6,
          P.wood,
        ),
      );
    } else {
      var height = pitched(
        b,
        r,
        top,
        { kind: "hip", axis: "x", rise: 8, over: 1.4, color: P.roof },
        P.wall,
      );

      chimney(
        b,
        r.x0 + 6,
        r.y1 - 7,
        top,
        height(r.x0 + 7.2, r.y1 - 5.8),
        P.wall,
      );
      chimney(
        b,
        r.x1 - 8.4,
        r.y1 - 7,
        top,
        height(r.x1 - 7.2, r.y1 - 5.8),
        P.wall,
      );
    }

    //the wings, a storey high, a balustrade round the terraces on them
    wings.forEach(function (w, i) {
      var wtop = walls(b, w, z0, 1, P);

      windowsAround(
        b,
        w,
        z0,
        1,
        3,
        PANE + 1,
        P,
        i === 0 ? { "+x": "all" } : { "-x": "all" },
      );
      b.push(
        box(
          w.x0 - 0.4,
          w.x1 + 0.4,
          w.y0 - 0.4,
          w.y1 + 0.4,
          wtop,
          wtop + 0.8,
          P.trim,
        ),
      );
      balustrade(b, w.x0, w.x1, w.y0 + 0.3, wtop + 0.8, P.trim);
    });

    //the pool, its deck, loungers by it and a parasol; a pool house
    if (p) {
      ring(b, deck.x0, deck.x1, deck.y0, deck.y1, hole, COPING);
      pool(b, p.x0, p.x1, p.y0, p.y1);
      if (p.loungers === "below") {
        [p.x0 + 3, p.x0 + 9, p.x0 + 15].forEach(function (x) {
          lounger(b, x, p.y1 + 1.6);
        });
        parasol(b, p.x0 + 22, p.y1 + 3.5, [240, 240, 236]);
      } else {
        var lx = p.loungers === "left" ? p.x0 - 3.3 : p.x1 + 1.5;

        [p.y0 + 2, p.y0 + 8, p.y0 + 14].forEach(function (y) {
          lounger(b, lx, y);
        });
        parasol(b, lx + 0.9, p.y1 - 1, [240, 240, 236]);
      }
    }
    if (L.house) {
      var h = L.house,
        htop = walls(b, h, 1, 1, P);

      b.push(
        face(h, "-y", h.x0 + 2, h.x1 - 2, 2, htop - 2, 0, 0.3, GLASS, GLASSY),
      );
      if (modern) flatRoof(b, h, htop, WHITE, 1.2);
      else
        pitched(
          b,
          h,
          htop,
          { kind: "hip", axis: "x", rise: 4, over: 1, color: P.roof },
          P.wall,
        );
    }

    //the garden: cypresses along the sides where there is room for them,
    //box along the front of the court, flower beds before the terrace
    var taken = [t].concat(deck ? [deck] : [], L.house ? [L.house] : []);

    [4.5, W - 4.5].forEach(function (x) {
      for (var y = 9; y < D - 4; y += 11) {
        var clear = taken.every(function (q) {
          return (
            x + 2.5 < q.x0 || x - 2.5 > q.x1 || y + 2.5 < q.y0 || y - 2.5 > q.y1
          );
        });

        if (clear) cypress(b, x, y, 21);
      }
    });
    //shrubs along the back
    for (var sx = 6; sx < W - 5; sx += 6) {
      var sy = D - 4.6,
        room = taken.every(function (q) {
          return (
            sx + 2 < q.x0 || sx - 2 > q.x1 || sy + 2 < q.y0 || sy - 2 > q.y1
          );
        });

      if (room) bush(b, sx, sy, 1.6 + rnd() * 0.6);
    }
    for (var x = court.x0 + 2; x < court.x1 - 1; x += 5) {
      if (x > L.gate[0] - 4 && x < L.gate[1] + 3) continue;
      topiary(b, x, 3.6, 1.3, 0);
    }
    flowers(b, t.x0 + 1, mid - 8, r.y0 - 7, r.y0 - 4.5, rnd);
    flowers(b, mid + 8, t.x1 - 1, r.y0 - 7, r.y0 - 4.5, rnd);
    if (!p || p.loungers === "left")
      gardenTree(b, r.x1 + (p ? -4 : 6.5), D - 6.5, 4.5, 18);

    //round it all, the gate in front
    fence(
      b,
      bound,
      "x",
      1.4,
      0.4,
      W - 0.4,
      [[L.gate[0] - 3, L.gate[1] + 3]],
      P.gardenWall,
    );
    fence(b, bound, "x", D - 1.4, 0.4, W - 0.4, [], P.gardenWall);
    fence(b, bound, "y", 1.4, 2.8, D - 2.8, [], P.gardenWall);
    fence(b, bound, "y", W - 1.4, 2.8, D - 2.8, [], P.gardenWall);
    grandGate(b, L.gate[0], L.gate[1], 1.4, P.gardenWall);

    return { boxes: b, bays: L.bays };
  };
}

var DESIGNS = {
  cottage: cottage,
  farm: farm,
  wide: wide,
  deep: deep,
  long: long,
  semi: semi,
  pair: pair,
  villa2: villa("2x2"),
  villa3: villa("3x2"),
};

/* --- Parts ------------------------------------------------------------ */

//the tiles of a footprint sizeX by sizeY, each the part named by the
//template with the tile at the end
function tilesOf(sizeX, sizeY, template) {
  var out = [];

  for (var y = 0; y < sizeY; y++)
    for (var x = 0; x < sizeX; x++)
      out.push({ x: x, y: y, parts: [template + "/" + x + "/" + y] });

  return out;
}

var CITY_AXES = {
  pal: Object.keys(CITY),
  roof: ["gable", "hip"],
};

/**
 * What every kind of house can be, by the kind and its footprint: designs,
 * each as likely as its weight, each with the options it is put together
 * with - axes, every one picked at random - and its tiles, the names of their
 * parts with {axis} where an option goes. A part's name is the design, its
 * layout - where its buildings stand - and its options, then the tile.
 */
var FOOTPRINTS = {
  "village-1x1": [
    {
      design: "cottage",
      weight: 1,
      axes: {
        pal: Object.keys(VILLAGE),
        roof: Object.keys(VILLAGE_ROOF),
        yard: ["veg", "orchard", "well", "flowers"],
      },
      tiles: tilesOf(1, 1, "houses/cottage/std/{pal}/{roof}/{yard}"),
    },
  ],
  "village-1x2": [
    {
      design: "farm",
      weight: 1,
      axes: {
        layout: ["barn", "field", "sheep"],
        pal: Object.keys(VILLAGE),
        roof: Object.keys(VILLAGE_ROOF),
      },
      tiles: tilesOf(1, 2, "houses/farm/{layout}/{pal}/{roof}"),
    },
  ],
  "city-2x1": [
    {
      design: "wide",
      weight: 1,
      axes: {
        pal: CITY_AXES.pal,
        roof: CITY_AXES.roof,
        front: ["hedge", "picket", "railing"],
      },
      tiles: tilesOf(2, 1, "houses/wide/std/{pal}/{roof}/{front}"),
    },
  ],
  "city-1x2": [
    {
      design: "deep",
      weight: 1,
      axes: {
        pal: CITY_AXES.pal,
        roof: CITY_AXES.roof,
        fence: ["picket", "hedge"],
        back: ["garden", "patio"],
      },
      tiles: tilesOf(1, 2, "houses/deep/std/{pal}/{roof}/{fence}/{back}"),
    },
  ],
  "city-1x3": [
    {
      design: "long",
      weight: 1,
      axes: {
        pal: CITY_AXES.pal,
        roof: CITY_AXES.roof,
        fence: ["picket", "hedge"],
      },
      tiles: tilesOf(1, 3, "houses/long/std/{pal}/{roof}/{fence}"),
    },
  ],
  "town-2x2": [
    {
      design: "semi",
      weight: 1,
      axes: {
        pal: CITY_AXES.pal,
        roof: CITY_AXES.roof,
        fence: ["picket", "railing"],
      },
      tiles: tilesOf(2, 2, "houses/semi/std/{pal}/{roof}/{fence}"),
    },
  ],
  "town-2x3": [
    {
      design: "pair",
      weight: 1,
      axes: {
        pal: CITY_AXES.pal,
        roof: CITY_AXES.roof,
        fence: ["picket", "railing"],
        back: ["garden", "play"],
      },
      tiles: tilesOf(2, 3, "houses/pair/std/{pal}/{roof}/{fence}/{back}"),
    },
  ],
  "villa-2x2": [
    {
      design: "villa2",
      weight: 1,
      axes: {
        layout: ["center", "side"],
        style: Object.keys(VILLA),
        bound: ["hedge", "wall"],
      },
      tiles: tilesOf(2, 2, "houses/villa2/{layout}/{style}/{bound}"),
    },
  ],
  "villa-3x2": [
    {
      design: "villa3",
      weight: 1,
      axes: {
        layout: ["center", "side"],
        style: Object.keys(VILLA),
        bound: ["hedge", "wall"],
      },
      tiles: tilesOf(3, 2, "houses/villa3/{layout}/{style}/{bound}"),
    },
  ],
};

//the options in a part's name after its design and layout, by design
var OPTIONS = {
  cottage: ["pal", "roof", "yard"],
  farm: ["pal", "roof"],
  wide: ["pal", "roof", "front"],
  deep: ["pal", "roof", "fence", "back"],
  long: ["pal", "roof", "fence"],
  semi: ["pal", "roof", "fence"],
  pair: ["pal", "roof", "fence", "back"],
  villa2: ["style", "bound"],
  villa3: ["style", "bound"],
};

//an option's names filled in
function fill(template, options) {
  return template.replace(/\{(\w+)\}/g, function (m, axis) {
    return options[axis];
  });
}

/**
 * Every part there is, by name without its turn - every footprint's every
 * design with every option, and the sites each goes up on, two stages of
 * them for every layout.
 */
var PARTS = (function () {
  var out = {};

  Object.keys(FOOTPRINTS).forEach(function (fp) {
    FOOTPRINTS[fp].forEach(function (d) {
      var combos = [{}];

      Object.keys(d.axes).forEach(function (axis) {
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
        });
      });

      (d.axes.layout || ["std"]).forEach(function (layout) {
        [1, 2].forEach(function (stage) {
          d.tiles.forEach(function (t) {
            out[["houses/frame", d.design, layout, stage, t.x, t.y].join("/")] =
              true;
          });
        });
      });
    });
  });

  return out;
})();

//the last few houses painted whole, by the options they were painted with -
//the tiles of one are painted one after another
var whole = [],
  KEEP = 6;

/**
 * A house painted whole, by its name without the tile: its boxes and its
 * bays, in the footprint's own place.
 */
function house(id) {
  for (var i = 0; i < whole.length; i++)
    if (whole[i].id === id) return whole[i].house;

  var p = id.split("/"),
    built,
    o = { layout: p[2] };

  if (p[1] === "frame")
    built = DESIGNS[p[2]]({ layout: p[3] }, random(id), +p[4]);
  else {
    OPTIONS[p[1]].forEach(function (axis, k) {
      o[axis] = p[3 + k];
    });
    smoking = [];
    built = DESIGNS[p[1]](o, random(id));
    built.chimneys = smoking;
    smoking = null;
  }

  //every edge on a grid of 1/1024, so that moving the house a tile over -
  //and turning it - is exact, and each tile comes out as the whole does
  built.boxes.forEach(function (c) {
    ["x0", "x1", "y0", "y1", "z0", "z1"].forEach(function (k) {
      c[k] = Math.round(c[k] * 1024) / 1024;
    });
  });

  whole.unshift({ id: id, house: built });
  if (whole.length > KEEP) whole.pop();

  return built;
}

/**
 * The boxes of a part by its name without its turn, as it is painted: the
 * whole house, so far off as the tile is from the corner of the footprint -
 * onTile cuts out the tile.
 */
export function partBoxes(key) {
  if (PARTS[key] === undefined) throw new Error("no such part: " + key);

  var p = key.split("/"),
    cx = +p[p.length - 2],
    cy = +p[p.length - 1];

  return house(p.slice(0, p.length - 2).join("/")).boxes.map(function (c) {
    return iso.moved(c, -cx * TILE, -cy * TILE, 0);
  });
}

/**
 * The bays on a part's tile, where they are on the tile.
 */
function tileBays(key) {
  var p = key.split("/"),
    cx = +p[p.length - 2],
    cy = +p[p.length - 1];

  return house(p.slice(0, p.length - 2).join("/"))
    .bays.filter(function (bay) {
      return Math.floor(bay.x / TILE) === cx && Math.floor(bay.y / TILE) === cy;
    })
    .map(function (bay) {
      return {
        x: bay.x - cx * TILE,
        y: bay.y - cy * TILE,
        z: bay.z,
        headings: bay.headings,
      };
    });
}

/**
 * Room for a car in each bay, any of the vehicle generator's that park, the
 * way they may stand in it - for what covers them (cover).
 */
function room(bays, color) {
  return bays.map(function (bay) {
    var alongY = bay.headings[0][0] === "y",
      hx = alongY ? 3.8 : 7,
      hy = alongY ? 7 : 3.8;

    return box(
      bay.x - hx,
      bay.x + hx,
      bay.y - hy,
      bay.y + hy,
      bay.z,
      bay.z + 9.5,
      color,
      LIT,
    );
  });
}

//the boxes clipped to the tile, the way iso paintTiles cuts them
function clip(boxes) {
  var out = [];

  iso.snapAll(boxes).forEach(function (b) {
    var c = iso.clip(b, 0, TILE, 0, TILE);

    if (c !== null) out.push(c);
  });

  return out;
}

//a picture's pixel at a spot on the screen, the world's origin at 0, 0
function pixelAt(picture, sx, sy) {
  var i = sx + picture.pivotX,
    j = sy + picture.pivotY;

  if (i < 0 || j < 0 || i >= picture.w || j >= picture.h) return null;

  return picture.pixels[j * picture.w + i];
}

/**
 * What of a tile stands in front of the cars in its bays, turned: the tile's
 * own picture, only where something of it is nearer than the room the cars
 * take - drawn over the cars, it hides what of them is behind it.
 */
function cover(key, turns) {
  var mark = [255, 0, 255],
    scene = clip(iso.rotate(partBoxes(key), 1, 1, turns)),
    cars = iso.rotate(room(tileBays(key), mark), 1, 1, turns),
    tile = iso.render(scene),
    both = iso.render(scene.concat(cars)),
    alone = iso.render(cars),
    pixels = [],
    middle = iso.project(TILE / 2, TILE / 2, 0);

  for (var j = 0; j < tile.h; j++)
    for (var i = 0; i < tile.w; i++) {
      var sx = i - tile.pivotX,
        sy = j - tile.pivotY,
        front = pixelAt(both, sx, sy);

      pixels.push(
        pixelAt(alone, sx, sy) !== null && front !== null && front !== mark
          ? tile.pixels[j * tile.w + i]
          : null,
      );
    }

  return iso.toImage({
    w: tile.w,
    h: tile.h,
    pixels: pixels,
    pivotX: tile.pivotX + middle[0],
    pivotY: tile.pivotY + middle[1],
  });
}

/**
 * Every part, by sprite name - "gen/houses/semi/std/brick/hip/picket/1/0/r2" -
 * with its size and pivot, without painting it; and for a tile with bays,
 * what of it covers the cars in them, the same size; what every kind of house
 * can be, for whoever puts one together; the bays with what covers them; and
 * the tops of every house's chimneys, for its smoke.
 */
export function describe() {
  var sizes = {},
    over = {},
    smoke = {};

  Object.keys(PARTS).forEach(function (key) {
    var frame = key.indexOf("houses/frame/") === 0,
      bays = frame ? [] : tileBays(key),
      id = key.split("/").slice(0, -2).join("/"),
      tops = frame ? [] : house(id).chimneys;

    //where the smoke comes out of a house, by the house - on its footprint
    //as it is painted, not turned: [x, y, how high]
    if (tops.length > 0)
      smoke[id] = tops.map(function (t) {
        return t.map(function (v) {
          return Math.round(v * 10) / 10;
        });
      });

    TURNS.forEach(function (turns) {
      var name = "gen/" + key + "/r" + turns,
        size = measureOnTile(iso.rotate(partBoxes(key), 1, 1, turns));

      sizes[name] = size;

      if (bays.length > 0) {
        sizes["gen/" + key + "/cover/r" + turns] = size;
        over[key + "/r" + turns] = [
          baysOverlay(bays, turns),
          { frames: ["gen/" + key + "/cover/r" + turns], cover: true },
        ];
      }
    });
  });

  return {
    sizes: sizes,
    data: {
      storey: STOREY,
      footprints: FOOTPRINTS,
      turns: TURNS,
      overlays: over,
      smoke: smoke,
    },
  };
}

/**
 * One part, or what of it covers its cars, by sprite name.
 *
 * @returns {{width, height, data}}
 */
export function paint(name) {
  var key = name.replace(/^gen\//, ""),
    at = key.lastIndexOf("/r"),
    turns = parseInt(key.slice(at + 2), 10),
    base = key.slice(0, at);

  if (TURNS.indexOf(turns) === -1) throw new Error("no such part: " + name);

  if (/\/cover$/.test(base))
    return cover(base.slice(0, -"/cover".length), turns);

  var boxes = iso.rotate(partBoxes(base), 1, 1, turns),
    picture = iso.render(clip(boxes)),
    middle = iso.project(TILE / 2, TILE / 2, 0);

  picture.pivotX += middle[0];
  picture.pivotY += middle[1];

  return iso.toImage(picture);
}

export { PARTS, STOREY, cover };
