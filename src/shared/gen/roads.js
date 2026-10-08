/**
 * Roads, painted out of boxes the way the buildings are (shared/gen/isobox):
 * a piece for every way a tile of road joins up with the ones next to it,
 * and a ramp for every way the ground can slope under a straight one.
 *
 * Each comes four ways:
 *
 *   - plain: the asphalt and nothing else, a strip of gravel along its
 *     edges, a dashed line down the middle - a road out in the country;
 *   - paved: the same asphalt between kerbs, with a pavement along both sides
 *     and round the corners, and zebra crossings over a junction - a street
 *     with buildings on it (which piece a road gets is client/road's to say);
 *   - gravel: a track of gravel, packed paler where the wheels go, its edges
 *     darker - what the village's lanes are laid in;
 *   - cobble: setts of stone between a gutter of darker stone either side -
 *     the old town's streets.
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
  TRACK = [184, 168, 134],
  TRACK_EDGE = [146, 130, 100],
  SETTS = [154, 146, 136],
  GUTTER = [110, 104, 98],
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
  STONES = { material: "gravel", base: 0, storey: 12 },
  COBBLED = { material: "setts", base: 0, storey: 12 };

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

  //a bend, or a lone end: no line - and on a ramp the dashes are stamped on
  //the picture (see stamps)
  if (alongX === alongY || ramp) return;

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

  if (paved === "gravel" || paved === "cobble") return laid(joins, ramp, paved);

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
 * A piece of a gravel track or a cobbled street: what it is laid in over
 * the asphalt's width, a strip of something darker along its edges - the
 * track's churned edges, the street's gutter - and on the track a paler
 * crown where the wheels have packed it down.
 */
function laid(joins, ramp, kind) {
  var b = [],
    g = ramp ? 2 : 1,
    gravel = kind === "gravel",
    edge = gravel ? TRACK_EDGE : GUTTER,
    fill = gravel ? TRACK : SETTS,
    finish = gravel ? STONES : COBBLED,
    alongX = joins["-x"] || joins["+x"],
    alongY = joins["-y"] || joins["+y"];

  function lay(x0, x1, y0, y1, color, crown) {
    patch(b, ramp, x0, x1, y0, y1, SKIN, SKIN, color, crown || finish);
  }

  //the edges, then what it is laid in inside them - in from them across
  //the way it goes, never across a join
  asphaltRects(joins).forEach(function (r) {
    lay(
      Math.max(0, r[0] - g),
      Math.min(TILE, r[1] + g),
      Math.max(0, r[2] - g),
      Math.min(TILE, r[3] + g),
      edge,
    );
  });

  var i = gravel ? 0 : 1;

  //the middle, in from its sides with no join
  lay(
    A0 + (joins["-x"] ? 0 : i),
    A1 - (joins["+x"] ? 0 : i),
    A0 + (joins["-y"] ? 0 : i),
    A1 - (joins["+y"] ? 0 : i),
    fill,
  );
  //and the arms, in from their sides
  if (joins["-x"]) lay(0, A0, A0 + i, A1 - i, fill);
  if (joins["+x"]) lay(A1, TILE, A0 + i, A1 - i, fill);
  if (joins["-y"]) lay(A0 + i, A1 - i, 0, A0, fill);
  if (joins["+y"]) lay(A0 + i, A1 - i, A1, TILE, fill);

  //the crown of a track, paler down the middle of each way it goes
  if (gravel) {
    var m = (A0 + A1) / 2,
      crown = lighter(TRACK, 0.08);

    if (alongX || !alongY)
      lay(
        joins["-x"] ? 0 : A0 + 2,
        joins["+x"] ? TILE : A1 - 2,
        m - 3,
        m + 3,
        crown,
        STONES,
      );
    if (alongY)
      lay(
        m - 3,
        m + 3,
        joins["-y"] ? 0 : A0 + 2,
        joins["+y"] ? TILE : A1 - 2,
        crown,
        STONES,
      );
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
      GLOWS,
    ),
  );

  return b;
}

//a street light's lamp: its own colour on every face, and what shines at
//night (shared/gen/isobox shine)
var GLOWS = Object.assign({}, LIT, { glow: true });

/**
 * Where a street light's lamp hangs over the ground, on its tile as it is
 * painted (streetLight): x, y - for the pool of light it casts at night to
 * be laid round the spot under it (client/roadview).
 */
function lampAt(at) {
  var x = at === "y" ? 3 : at === "x" ? 16 : 3,
    y = at === "x" ? 3 : at === "y" ? 16 : 3;

  return [x + (at === "y" ? 6 : 0) + 0.5, y + (at === "y" ? 0 : 6) + 0.5];
}

/**
 * Where a street light's pole stands, on its tile as it is painted
 * (streetLight): x, y - for it to be sorted among the cars by where it
 * stands rather than by the middle of its tile (client/roadview).
 */
function poleAt(at) {
  var x = at === "y" ? 3 : at === "x" ? 16 : 3,
    y = at === "x" ? 3 : at === "y" ? 16 : 3;

  return [x + 0.5, y + 0.5];
}

/**
 * Every sprite, by name: "gen/roads/plain/1010" - plain, paved, gravel or
 * cobble - the joins in the order
 * client/road reads its neighbours, -x, -y, +x, +y - "gen/roads/paved/ramp3",
 * and "gen/roads/light/x" - the street light beside a road along x, along y,
 * or at a corner.
 */
function sprites() {
  var out = {};

  ["plain", "paved", "gravel", "cobble"].forEach(function (kind) {
    var paved = kind === "plain" ? false : kind === "paved" ? true : kind;

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

  return {
    sizes: sizes,
    data: {
      ramps: RAMPS,
      //where each street light's lamp hangs, x, y on its tile
      lamps: { x: lampAt("x"), y: lampAt("y"), corner: lampAt("corner") },
      //and where its pole stands
      poles: { x: poleAt("x"), y: poleAt("y"), corner: poleAt("corner") },
    },
  };
}

/**
 * One sprite, by name.
 *
 * @returns {{width, height, data}}
 */
export function paint(name) {
  var s = SPRITES[name],
    picture = free(boxesOf(name));

  //the dashes down the middle of an asphalt ramp
  if (s.ramp && (s.paved === true || s.paved === false))
    stamps(picture, s.ramp);

  return iso.toImage(picture);
}

/**
 * The dashes down the middle of a ramp, stamped on its picture the way they
 * are drawn by hand on the ramps of old (assets/sprites/road/elevation*):
 * each the same few pixels in a line the way the road goes across the
 * screen - three level ones up a gentle slope, four in a step up a steep one
 * - wherever its middle lands, never a dash laid on the slope and cut up by
 * the pixels it crosses.
 */
function stamps(picture, up) {
  var p = rampPlane(up),
    alongY = up === "-y" || up === "+y",
    //where the world's origin is in the picture (free puts the pivot on the
    //middle of the tile)
    middle = iso.project(TILE / 2, TILE / 2, 0),
    ox = picture.pivotX - middle[0],
    oy = picture.pivotY - middle[1],
    color = iso.lit(STRIPE, -p.gx, -p.gy, 1),
    //painted for the light to be worked out as it is drawn (isobox
    //setMode), the stripe goes onto each face's picture as much as it
    //looks that way, or its colour and the way it looks onto theirs - and
    //at night shines no more than the road does
    n = iso.sections(),
    w = picture.w / n,
    faces =
      iso.getMode() === "faces"
        ? iso.facesOf(STRIPE, [-p.gx, -p.gy, 1])
        : iso.getMode() === "deferred"
          ? [iso.shade(STRIPE, 2), iso.normalOf([-p.gx, -p.gy, 1])]
          : null;

  if (iso.getMode() === "night") return;

  function at(a) {
    var x = alongY ? 15.5 : a,
      y = alongY ? a : 15.5,
      q = iso.project(x, y, p.h + p.gx * x + p.gy * y);

    return [Math.floor(q[0] + ox), Math.floor(q[1] + oy)];
  }

  function put(i, j) {
    if (i < 0 || j < 0 || i >= w || j >= picture.h) return;

    if (faces === null) picture.pixels[j * picture.w + i] = color;
    else
      for (var k = 0; k < n; k++)
        picture.pixels[j * picture.w + i + k * w] = faces[k];
  }

  //a dash every eight, as on the flat, from a half to three and a half
  for (var a = 2; a < TILE; a += 8) {
    var p0 = at(a + 0.5),
      p1 = at(a + 3.5),
      dx = p1[0] - p0[0],
      dy = p1[1] - p0[1],
      len = Math.max(Math.abs(dx), Math.abs(dy));

    //up a gentle slope the road runs nearly level across the screen: three
    //pixels in a row, where its middle is
    if (Math.abs(dx) >= 3 * Math.abs(dy)) {
      var mi = Math.round((p0[0] + p1[0]) / 2),
        mj = Math.round((p0[1] + p1[1]) / 2);

      put(mi - 1, mj);
      put(mi, mj);
      put(mi + 1, mj);
      continue;
    }

    for (var k = 0; k <= len; k++)
      put(
        p0[0] + Math.round((dx * k) / (len || 1)),
        p0[1] + Math.round((dy * k) / (len || 1)),
      );
  }
}

export { SPRITES };
