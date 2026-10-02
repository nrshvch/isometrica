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
  lighter,
  TILE,
  PAVING,
  ASPHALT,
  STRIPE,
  LIT,
  free,
  measureFree,
} from "./blocks.js";

var GRAVEL = [150, 140, 122],
  KERB = [204, 202, 196],
  LAMP = [252, 238, 180],
  POLE = [112, 120, 130];

//the asphalt's edges across the tile, and how high a pavement stands - all
//whole units, so that every edge of a road comes out a clean step of two
//pixels across for one down (iso snap); a step of the ground is 8 high
var A0 = 6,
  A1 = 26,
  KERB_W = 1,
  KERB_H = 1,
  STEP = 8;

//how thick what is laid on the ground is: as good as nothing, so that the
//road lies on the ground, each layer over the one before it (iso snap)
var SKIN = 0.1;

//what the asphalt, the gravel and the paving slabs are made of
var TARMAC = { material: "asphalt", base: 0, storey: 12 },
  SLABS = { material: "slabs", base: 0, storey: 12 },
  STONES = { material: "gravel", base: 0, storey: 12 };

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
 * How high the ground under a ramp up towards `up` is: [g, h] - it rises
 * g.x along x and g.y along y for every unit, and is h high where x and y
 * are 0, the middle of the tile at 0.
 */
function rampPlane(up) {
  var s = STEP / TILE;

  return up === "-y"
    ? { gx: 0, gy: -s, h: STEP / 2 }
    : up === "+y"
      ? { gx: 0, gy: s, h: -STEP / 2 }
      : up === "-x"
        ? { gx: -s, gy: 0, h: STEP / 2 }
        : { gx: s, gy: 0, h: -STEP / 2 };
}

/**
 * A flat rectangle of the surface from x0 to x1, y0 to y1, its top at z over
 * the ground, `thick` deep - or on a ramp, a slab of the ramp's plane (iso
 * cut), lit the way the plane looks. Whatever is laid later lies over what
 * is laid before it.
 */
function patch(b, ramp, x0, x1, y0, y1, z, thick, color, finish) {
  if (!(x0 < x1 && y0 < y1)) return;

  if (!ramp) {
    b.push(box(x0, x1, y0, y1, z - thick, z, color, finish));
    return;
  }

  var p = rampPlane(ramp),
    lo = p.h + Math.min(0, p.gx * TILE, p.gy * TILE),
    hi = p.h + Math.max(0, p.gx * TILE, p.gy * TILE);

  b.push(
    iso.cut(box(x0, x1, y0, y1, lo + z - thick, hi + z, color, finish), [
      //under the plane z over the ground...
      iso.plane(-p.gx, -p.gy, 1, p.h + z),
      //...and over the one `thick` under that
      iso.plane(p.gx, p.gy, -1, -(p.h + z - thick)),
    ]),
  );
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
 * - none over a junction, where there is nothing to keep to. A dash is a
 * unit wide and four long: a line a pixel thick, two pixels across for one
 * down, the same on every tile.
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

    if (alongX) patch(b, ramp, a, a + 4, 15, 16, z, SKIN, STRIPE);
    else patch(b, ramp, 15, 16, a, a + 4, z, SKIN, STRIPE);
  }
}

/**
 * Zebra crossings over every arm of a junction, just out from its middle:
 * stripes two units wide with two between, four long.
 */
function crossings(b, joins, z) {
  var stripes = [7, 11, 15, 19, 23];

  if (joins["-y"])
    stripes.forEach(function (x) {
      b.push(box(x, x + 2, 1, 5, z, z + SKIN, STRIPE));
    });
  if (joins["+y"])
    stripes.forEach(function (x) {
      b.push(box(x, x + 2, 27, 31, z, z + SKIN, STRIPE));
    });
  if (joins["-x"])
    stripes.forEach(function (y) {
      b.push(box(1, 5, y, y + 2, z, z + SKIN, STRIPE));
    });
  if (joins["+x"])
    stripes.forEach(function (y) {
      b.push(box(27, 31, y, y + 2, z, z + SKIN, STRIPE));
    });
}

/**
 * The pavement round the asphalt: every bit of the tile it does not cover,
 * raised a kerb's height, paved in slabs (iso MATERIALS) - and the kerb along
 * every edge where the pavement meets the road.
 */
function pavement(b, joins, ramp) {
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

      if (!road)
        patch(
          b,
          ramp,
          xs[0],
          xs[1],
          ys[0],
          ys[1],
          KERB_H,
          KERB_H,
          PAVING,
          SLABS,
        );
    });
  });

  //the kerbs: along each side of the middle square with no road coming in,
  //and along both sides of every arm
  function kerb(x0, x1, y0, y1) {
    patch(b, ramp, x0, x1, y0, y1, KERB_H, KERB_H, KERB);
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
 * or paved. It lies on the ground, every layer of it a skin over the one
 * before (iso snap) - the gravel, the asphalt over it, the markings over
 * that - so that nothing of it stands up off the ground to show an edge.
 */
function piece(joins, ramp, paved) {
  var b = [];

  //a strip of gravel along the edges of the asphalt - kept on the tile, or
  //it would lie across the next tile's asphalt where they meet. On a ramp
  //it is two wide: a line on a slope drifts across the pixels as the slope
  //climbs, and one a unit wide would come out a pixel here and none there
  var g = ramp ? 2 : 1;

  if (!paved)
    asphaltRects(joins).forEach(function (r) {
      patch(
        b,
        ramp,
        Math.max(0, r[0] - g),
        Math.min(TILE, r[1] + g),
        Math.max(0, r[2] - g),
        Math.min(TILE, r[3] + g),
        SKIN,
        SKIN,
        GRAVEL,
        STONES,
      );
    });

  asphaltRects(joins).forEach(function (r) {
    patch(b, ramp, r[0], r[1], r[2], r[3], SKIN, SKIN, ASPHALT, TARMAC);
  });

  centreLines(b, joins, ramp, SKIN);

  if (paved) {
    pavement(b, joins, ramp);

    var n = 0;

    SIDES.forEach(function (s) {
      if (joins[s]) n++;
    });
    if (n > 2 && !ramp) crossings(b, joins, SKIN);
  }

  return b;
}

/**
 * A street light standing on the pavement on the side of the road nearest
 * the camera - in the middle of the tile beside a road along x (`at` "x"),
 * along y ("y"), or at the corner of a junction ("corner") - its arm
 * reaching out over the road, the lamp under the end of it. A unit thick,
 * the pole and the arm: two pixels across, lit on one and in shadow on the
 * other.
 */
function streetLight(at) {
  var b = [],
    x = at === "y" ? 3 : at === "x" ? 16 : 3,
    y = at === "x" ? 3 : at === "y" ? 16 : 3,
    //which way the arm reaches: across the road
    dx = at === "y" ? 1 : 0,
    dy = at === "y" ? 0 : 1,
    top = 22,
    reach = 6,
    lx = x + dx * reach,
    ly = y + dy * reach;

  b.push(box(x - 1, x + 1, y - 1, y + 1, KERB_H, KERB_H + 2, POLE));
  b.push(box(x, x + 1, y, y + 1, KERB_H, top, POLE));
  b.push(box(x, lx + 1, y, ly + 1, top - 1, top, POLE));
  b.push(
    box(
      lx - 1 - dy,
      lx + 2 + dy,
      ly - 1 - dx,
      ly + 2 + dx,
      top - 1,
      top,
      lighter(POLE, 0.2),
    ),
  );
  b.push(
    box(
      lx - dy,
      lx + 1 + dy,
      ly - dx,
      ly + 1 + dx,
      top - 2,
      top - 1,
      LAMP,
      LIT,
    ),
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
