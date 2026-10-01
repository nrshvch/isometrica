/**
 * Roads, painted out of boxes the way the buildings are (shared/gen/isobox):
 * a piece for every way a tile of road joins up with the ones next to it,
 * and a ramp for every way the ground can slope under a straight one.
 *
 * Each comes two ways:
 *
 *   - plain: the asphalt and nothing else, a strip of gravel along its
 *     edges, a dashed line down the middle - a road out in the country;
 *   - paved: the same asphalt between kerbs, with a pavement along both sides
 *     and round the corners, and zebra crossings over a junction - a street
 *     with buildings on it (which piece a road gets is client/road's to say).
 *
 * And a street light, apart: a sprite of its own, for it is tall and has to
 * be drawn among the buildings and the cars rather than under them.
 *
 * Units as everywhere: a tile is 32 along the ground - about ten metres -
 * heights in pixels. The asphalt is 20 across, two lanes of the cars' width
 * and a bit, the way client/carman drives them; a step of the ground is 8
 * high.
 */
import * as iso from "./isobox.js";
import {
  box,
  darker,
  lighter,
  TILE,
  PAVING,
  ASPHALT,
  STRIPE,
  METAL,
  LIT,
  shaded,
  free,
  measureFree,
} from "./blocks.js";

var GRAVEL = [150, 140, 122],
  KERB = [204, 202, 196],
  JOINT = darker(PAVING, 0.12),
  LAMP = [252, 238, 180],
  POLE = [112, 120, 130];

//the asphalt's edges across the tile, and how high a pavement stands
var A0 = 6,
  A1 = 26,
  KERB_W = 0.8,
  KERB_H = 1.1,
  STEP = 8;

//the grain of asphalt and of paving slabs
var TARMAC = { noise: 0.05, base: 0, storey: 12 },
  SLABS = { noise: 0.03, base: 0, storey: 12 };

//which way each of a piece's four joins goes, in the order its name gives
//them - as client/road's profile reads its neighbours: -x, -y, +x, +y
var SIDES = ["-x", "-y", "+x", "+y"];

//the ground under a ramp, by the slope it is on - which edge is up (see core
//terrain SlopeType: A is the corner at x, y, B at x + 1, C at y + 1)
var RAMPS = {
  1: "-y", //AB, the edge where y is 0
  2: "-x", //AC, where x is 0
  3: "+y", //CD
  4: "+x", //BD
};

/**
 * How high the ground is at a spot on a ramp up towards `up`, the middle of
 * the tile at 0 - and which way it slopes there.
 */
function rampHeight(up, x, y) {
  var t =
    up === "-y"
      ? 1 - y / TILE
      : up === "+y"
        ? y / TILE
        : up === "-x"
          ? 1 - x / TILE
          : x / TILE;

  return STEP * t - STEP / 2;
}

function rampNormal(up) {
  var s = STEP / TILE;

  return up === "-y"
    ? [0, s, 1]
    : up === "+y"
      ? [0, -s, 1]
      : up === "-x"
        ? [s, 0, 1]
        : [-s, 0, 1];
}

/**
 * A flat rectangle of the surface from x0 to x1, y0 to y1, its top at z over
 * the ground, `thick` deep - or on a ramp, laid out in strips across the
 * slope, each at the height of the ground under it and lit the way it faces.
 */
function patch(b, ramp, x0, x1, y0, y1, z, thick, color, finish) {
  if (!(x0 < x1 && y0 < y1)) return;

  if (!ramp) {
    b.push(box(x0, x1, y0, y1, z - thick, z, color, finish));
    return;
  }

  var n = rampNormal(ramp),
    lit = shaded(color, n[0], n[1], n[2]),
    alongY = ramp === "-y" || ramp === "+y",
    a0 = alongY ? y0 : x0,
    a1 = alongY ? y1 : x1;

  for (var a = a0; a < a1 - 1e-6; a += 0.5) {
    var e = Math.min(a + 0.5, a1),
      //as high as its upper end, so that it meets the road where the ramp
      //comes out on top without a gap showing the edge of it
      h = alongY
        ? Math.max(rampHeight(ramp, 0, a), rampHeight(ramp, 0, e))
        : Math.max(rampHeight(ramp, a, 0), rampHeight(ramp, e, 0));

    b.push(
      alongY
        ? box(x0, x1, a, e, h + z - thick, h + z, lit, LIT)
        : box(a, e, y0, y1, h + z - thick, h + z, lit, LIT),
    );
  }
}

//the stretches of a tile's edge-to-edge strip from 0 to TILE along `along`,
//by the joins: [from, to] for the middle and each arm that is joined
function asphaltRects(joins) {
  var r = [[A0, A1, A0, A1]];

  if (joins["-x"]) r.push([0, A0, A0, A1]);
  if (joins["+x"]) r.push([A1, TILE, A0, A1]);
  if (joins["-y"]) r.push([A0, A1, 0, A0]);
  if (joins["+y"]) r.push([A0, A1, A1, TILE]);

  return r;
}

/**
 * The dashes down the middle of each arm of the road that runs straight on
 * - none over a junction, where there is nothing to keep to.
 */
function centreLines(b, joins, ramp, z) {
  var n = 0;

  SIDES.forEach(function (s) {
    if (joins[s]) n++;
  });

  if (n > 2) return;

  var alongX = joins["-x"] || joins["+x"],
    alongY = joins["-y"] || joins["+y"];

  //a bend, or a lone end: no line
  if (alongX === alongY) return;

  //a dash every eight, so that they keep the same step from one tile to
  //the next
  for (var a = 2; a < TILE; a += 8) {
    var from = alongX ? joins["-x"] : joins["-y"],
      to = alongX ? joins["+x"] : joins["+y"];

    //a dead end stops short of the end of its arm
    if ((!from && a < A0) || (!to && a + 4 > A1)) continue;

    if (alongX) patch(b, ramp, a, a + 4, 15.4, 16.6, z + 0.05, 0.1, STRIPE);
    else patch(b, ramp, 15.4, 16.6, a, a + 4, z + 0.05, 0.1, STRIPE);
  }
}

/**
 * Zebra crossings over every arm of a junction, just out from its middle.
 */
function crossings(b, joins, z) {
  var stripes = [7, 10, 13, 16, 19, 22];

  if (joins["-y"])
    stripes.forEach(function (x) {
      b.push(box(x, x + 1.6, 1.2, 4.8, z, z + 0.1, STRIPE));
    });
  if (joins["+y"])
    stripes.forEach(function (x) {
      b.push(box(x, x + 1.6, 27.2, 30.8, z, z + 0.1, STRIPE));
    });
  if (joins["-x"])
    stripes.forEach(function (y) {
      b.push(box(1.2, 4.8, y, y + 1.6, z, z + 0.1, STRIPE));
    });
  if (joins["+x"])
    stripes.forEach(function (y) {
      b.push(box(27.2, 30.8, y, y + 1.6, z, z + 0.1, STRIPE));
    });
}

/**
 * The pavement round the asphalt: every bit of the tile it does not cover,
 * raised a kerb's height, slabs a few units square - and the kerb along
 * every edge where the pavement meets the road.
 */
function pavement(b, joins, ramp) {
  var cells = [];

  //the tile in thirds: the corners are always pavement, the sides where no
  //road comes in, and the middle never
  [
    [0, A0],
    [A0, A1],
    [A1, TILE],
  ].forEach(function (xs, i) {
    [
      [0, A0],
      [A0, A1],
      [A1, TILE],
    ].forEach(function (ys, j) {
      var road =
        (i === 1 && j === 1) ||
        (i === 0 && j === 1 && joins["-x"]) ||
        (i === 2 && j === 1 && joins["+x"]) ||
        (i === 1 && j === 0 && joins["-y"]) ||
        (i === 1 && j === 2 && joins["+y"]);

      if (!road) cells.push([xs[0], xs[1], ys[0], ys[1]]);
    });
  });

  cells.forEach(function (c) {
    //the slabs, a joint every four units
    for (var x = c[0]; x < c[1] - 1e-6; x += 4)
      for (var y = c[2]; y < c[3] - 1e-6; y += 4) {
        var x1 = Math.min(x + 4, c[1]),
          y1 = Math.min(y + 4, c[3]),
          tint = ((x / 4 + y / 4) | 0) % 2 ? PAVING : lighter(PAVING, 0.04);

        patch(b, ramp, x, x1, y, y1, KERB_H, KERB_H, tint, SLABS);
        patch(b, ramp, x1 - 0.2, x1, y, y1, KERB_H + 0.02, 0.05, JOINT);
        patch(b, ramp, x, x1, y1 - 0.2, y1, KERB_H + 0.02, 0.05, JOINT);
      }
  });

  //the kerbs: along each side of the middle square with no road coming in,
  //and along both sides of every arm
  function kerb(x0, x1, y0, y1) {
    patch(b, ramp, x0, x1, y0, y1, KERB_H + 0.1, KERB_H + 0.1, KERB);
  }

  if (!joins["-y"]) kerb(A0, A1, A0 - KERB_W, A0);
  if (!joins["+y"]) kerb(A0, A1, A1, A1 + KERB_W);
  if (!joins["-x"]) kerb(A0 - KERB_W, A0, A0, A1);
  if (!joins["+x"]) kerb(A1, A1 + KERB_W, A0, A1);
  if (joins["-y"]) {
    kerb(A0 - KERB_W, A0, 0, A0);
    kerb(A1, A1 + KERB_W, 0, A0);
  }
  if (joins["+y"]) {
    kerb(A0 - KERB_W, A0, A1, TILE);
    kerb(A1, A1 + KERB_W, A1, TILE);
  }
  if (joins["-x"]) {
    kerb(0, A0, A0 - KERB_W, A0);
    kerb(0, A0, A1, A1 + KERB_W);
  }
  if (joins["+x"]) {
    kerb(A1, TILE, A0 - KERB_W, A0);
    kerb(A1, TILE, A1, A1 + KERB_W);
  }
}

/**
 * A piece of road: joins by side, on a ramp up towards `ramp` or flat, plain
 * or paved.
 */
function piece(joins, ramp, paved) {
  var b = [];

  if (!paved)
    //a strip of gravel along the edges of the asphalt - kept on the tile,
    //or it would lie across the next tile's asphalt where they meet
    asphaltRects(joins).forEach(function (r) {
      patch(
        b,
        ramp,
        Math.max(0, r[0] - 1),
        Math.min(TILE, r[1] + 1),
        Math.max(0, r[2] - 1),
        Math.min(TILE, r[3] + 1),
        0.15,
        0.15,
        GRAVEL,
      );
    });

  asphaltRects(joins).forEach(function (r) {
    patch(b, ramp, r[0], r[1], r[2], r[3], 0.3, 0.3, ASPHALT, TARMAC);
  });

  centreLines(b, joins, ramp, 0.3);

  if (paved) {
    pavement(b, joins, ramp);

    var n = 0;

    SIDES.forEach(function (s) {
      if (joins[s]) n++;
    });
    if (n > 2 && !ramp) crossings(b, joins, 0.3);
  }

  return b;
}

/**
 * A street light standing on the pavement on the side of the road nearest
 * the camera - in the middle of the tile beside a road along x (`at` "x"),
 * along y ("y"), or at the corner of a junction ("corner") - its arm
 * reaching out over the road, the lamp under the end of it.
 */
function streetLight(at) {
  var b = [],
    x = at === "y" ? 3 : at === "x" ? 16 : 3,
    y = at === "x" ? 3 : at === "y" ? 16 : 3,
    //which way the arm reaches: across the road
    dx = at === "y" ? 1 : 0,
    dy = at === "y" ? 0 : 1,
    top = 22,
    reach = 6;

  b.push(box(x - 0.8, x + 0.8, y - 0.8, y + 0.8, KERB_H, KERB_H + 1.4, POLE));
  b.push(box(x - 0.45, x + 0.45, y - 0.45, y + 0.45, KERB_H, top, POLE));

  for (var k = 0; k <= reach; k += 0.5)
    b.push(
      box(
        x + dx * k - 0.3,
        x + dx * k + 0.3,
        y + dy * k - 0.3,
        y + dy * k + 0.3,
        top - 0.6,
        top,
        POLE,
      ),
    );

  var lx = x + dx * reach,
    ly = y + dy * reach;

  b.push(
    box(
      lx - 1.6,
      lx + 1.6,
      ly - 1.1,
      ly + 1.1,
      top - 1,
      top + 0.3,
      lighter(POLE, 0.2),
    ),
  );
  b.push(
    box(lx - 1.2, lx + 1.2, ly - 0.8, ly + 0.8, top - 1.6, top - 1, LAMP, LIT),
  );

  return b;
}

/**
 * Every sprite, by name: "gen/roads/plain/1010" - the joins in the order
 * client/road reads its neighbours, -x, -y, +x, +y - "gen/roads/paved/ramp3",
 * and "gen/roads/light/x" - the street light beside a road along x, along y,
 * or at a corner.
 */
function sprites() {
  var out = {};

  ["plain", "paved"].forEach(function (kind) {
    var paved = kind === "paved";

    for (var m = 0; m < 16; m++) {
      var bits = [(m >> 3) & 1, (m >> 2) & 1, (m >> 1) & 1, m & 1],
        joins = {};

      SIDES.forEach(function (s, i) {
        joins[s] = bits[i] === 1;
      });

      out["gen/roads/" + kind + "/" + bits.join("")] = {
        joins: joins,
        paved: paved,
      };
    }

    Object.keys(RAMPS).forEach(function (n) {
      var up = RAMPS[n],
        joins = {};

      //a ramp runs straight up the slope
      joins["-x"] = joins["+x"] = up === "-x" || up === "+x";
      joins["-y"] = joins["+y"] = up === "-y" || up === "+y";

      out["gen/roads/" + kind + "/ramp" + n] = {
        joins: joins,
        ramp: up,
        paved: paved,
      };
    });
  });

  ["x", "y", "corner"].forEach(function (at) {
    out["gen/roads/light/" + at] = { light: at };
  });

  return out;
}

var SPRITES = sprites();

export function boxesOf(name) {
  var s = SPRITES[name];

  if (s === undefined) throw new Error("no such sprite: " + name);

  return s.light
    ? streetLight(s.light)
    : piece(s.joins, s.ramp || null, s.paved);
}

/**
 * Every sprite, by name, with its size and pivot - where the middle of its
 * tile is, on the ground - without painting it.
 */
export function describe() {
  var sizes = {};

  Object.keys(SPRITES).forEach(function (name) {
    sizes[name] = measureFree(boxesOf(name));
  });

  return { sizes: sizes, data: { ramps: RAMPS } };
}

/**
 * One sprite, by name.
 *
 * @returns {{width, height, data}}
 */
export function paint(name) {
  return iso.toImage(free(boxesOf(name)));
}

export { SPRITES };
