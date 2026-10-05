/**
 * Paints blocks out of parts, the way shared/gen/vehicles paints cars out of
 * boxes: one light for everything, each surface made of what it is (iso
 * MATERIALS) rather than speckled at random. What is in a
 * block - flats (shared/gen/flats), offices (shared/gen/offices) - is a
 * style: its colours, its storeys, its roofs and yards. How a block is put
 * together out of them is the same for all of them, and is here.
 *
 * A block is put together like toy bricks, out of sections that each take one
 * tile, the same sections for every block of a style whatever its size: a
 * 1x1 tower is one section with both its ends, a two tile wall two sections
 * side by side. A section is built up of parts, each painted on its own:
 *
 *   - ground: the ground storey on its plinth, with the way in at the front,
 *     and the pavement in front of it;
 *   - upper: a storey stacked on that;
 *   - roof: the roof on top;
 *
 * and in front of the wall, for a block with one, a yard tile.
 *
 * While it goes up a block is a building site, put together out of parts of
 * the same shape:
 *
 *   - site: the plinth poured on bare earth, with the diggers and trucks
 *     that are at it (dig) or the materials stacked by it (build);
 *   - frame: one storey of bare structure, the section's own size - stacked
 *     on the site, or on the storeys finished under it;
 *   - siteyard: what stands where the yard will be - trucks and a heap of
 *     gravel, a tower crane, or the site office and stacked materials.
 *
 * Every part comes in every palette of its style, and its details in a few
 * variants. A part is painted standing on a tile of its own, its pivot the
 * middle of that tile on the ground, and the parts of one tile are put
 * together by laying them one over another (shared/gen/stacking) - which is
 * what whoever draws a block does (client/compoundbuilding), picking the parts
 * at random for every block built. Each is painted four ways: as it is, its
 * front looking towards -y, and turned one, two and three quarter turns.
 *
 * Units as in the vehicles: a tile is 32 along the ground each way, heights in
 * pixels. Colours are kept to 16 bits.
 */
import * as iso from "./isobox.js";
import * as Vehicles from "./vehicles.js";

export var darker = iso.darker,
  lighter = iso.lighter,
  TILE = iso.TILE;

//how high a storey is, and the plinth under the ground floor
export var STOREY = 12,
  PLINTH = 3;

export var GRASS = [112, 158, 84],
  PAVING = [178, 176, 168],
  ASPHALT = [96, 98, 104],
  STRIPE = [232, 232, 226],
  WOOD = [150, 104, 68],
  METAL = [92, 96, 104],
  TRUNK = [112, 84, 60],
  LEAF = [70, 128, 66],
  HEDGE = [84, 136, 70],
  DOOR = [86, 72, 64],
  VENT = [150, 152, 156];

//the bare earth of a building site, and what is poured on it
export var DIRT = [152, 124, 92],
  CONCRETE = [168, 166, 160];

//what a surface is made of (see iso MATERIALS), laid out by storey, so that
//a storey looks the same whichever one it is: render, the panels of a block
//of flats, brick and the rest - and glass with the sky in it
export function made(material) {
  return { material: material, base: PLINTH, storey: STOREY };
}

export var MATTE = made("render"),
  GLASSY = { sheen: true, base: PLINTH, storey: STOREY };

//what a box of a colour is made of, when it is given no finish of its own:
//the grass, the paving, the asphalt everywhere are each what they look like
var MADE = new Map();

/**
 * Every box of that colour - that very colour, not one like it - made of
 * the material, unless it is given a finish of its own (see box).
 */
export function madeOf(color, material) {
  MADE.set(color, made(material));

  return color;
}

//what a box of the colour is made of (madeOf), or else `otherwise`
export function finishOf(color, otherwise) {
  return MADE.get(color) || otherwise;
}

/**
 * A box (iso box), made of whatever its colour is made of (madeOf) if it is
 * given no finish.
 */
export function box(x0, x1, y0, y1, z0, z1, color, finish) {
  return iso.box(
    x0,
    x1,
    y0,
    y1,
    z0,
    z1,
    color,
    finish !== undefined ? finish : MADE.get(color),
  );
}

madeOf(GRASS, "grass");
madeOf(PAVING, "slabs");
madeOf(ASPHALT, "asphalt");
madeOf(WOOD, "wood");
madeOf(DIRT, "dirt");
madeOf(CONCRETE, "concrete");

//a random number generator that gives the same numbers for the same seed, so
//running this again paints the same pictures
export function random(seed) {
  var s = 0,
    i;

  for (i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) | 0;

  return function () {
    s = (s + 0x6d2b79f5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(rnd, list) {
  return list[Math.floor(rnd() * list.length)];
}

/**
 * Where section c of a wall `cells` tiles long stands, its front on row: the
 * same for every storey stacked on it and the roof on top. start and end say
 * whether it ends the wall that way - both, for a wall of one.
 *
 * @param shape {{front, depth, inset}} the style's section: how far the wall
 *        stands back from the front of its tile, how deep it is, and how far
 *        a section that ends the wall stops short of its tile's edge
 */
export function section(shape, c, cells, row) {
  var start = c === 0,
    end = c === cells - 1,
    cell = c * TILE;

  return {
    cell: cell,
    mid: cell + TILE / 2,
    x0: start ? cell + shape.inset : cell,
    x1: end ? cell + TILE - shape.inset : cell + TILE,
    front: row + shape.front,
    back: row + shape.front + shape.depth,
    start: start,
    end: end,
  };
}

//how far the plinth and the floor lines stand out of a section's ends
export function ends(s, e) {
  return [s.x0 - (s.start ? e : 0), s.x1 + (s.end ? e : 0)];
}

/* --- Light ----------------------------------------------------------- */

//painted the colour it is, see iso finish
export var LIT = { lit: true };

/**
 * The colour of something round where its surface looks along nx, ny, nz -
 * lit the way iso shade lights a box's faces (iso lit).
 */
export var shaded = iso.lit;

//0..1, the same for the same whole numbers every time
function speckle(i, j) {
  var h = Math.imul(i | 0, 374761393) ^ Math.imul(j | 0, 668265263);

  h = Math.imul(h ^ (h >>> 13), 1274126177);

  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Something round laid out in columns half a pixel across, as far as `top`
 * says it reaches at each spot - each column the colour of the surface
 * there (shaded), so it comes out round rather than in steps.
 *
 * @param at {function(u, v): Array|null} for the spot u, v off x, y: [z0, z1,
 *        nx, ny, nz] - from where to where the column goes, and which way
 *        the surface looks at its top - or null where there is nothing
 * @param grain {number} how far a column is lighter or darker than the next
 */
export function round(b, x, y, r, color, grain, at) {
  var step = 0.5,
    i,
    j;

  for (i = -r; i < r; i += step)
    for (j = -r; j < r; j += step) {
      var c = at(i + step / 2, j + step / 2);

      if (c === null) continue;

      var g = (speckle((x + i) * 2, (y + j) * 2) - 0.5) * 2 * grain,
        col = shaded(color, c[2], c[3], c[4]);

      b.push(
        box(
          x + i,
          x + i + step,
          y + j,
          y + j + step,
          c[0],
          c[1],
          g > 0 ? lighter(col, g) : darker(col, -g),
          LIT,
        ),
      );
    }
}

/**
 * A small tree: its trunk, and its crown round over it - wider than it is
 * tall, flatter underneath.
 */
export function tree(b, x, y, size) {
  var trunk = 4,
    r = size + 0.5,
    up = size * 1.05 + 1,
    down = size * 0.6,
    mid = trunk + down + 0.5;

  b.push(box(x - 0.5, x + 0.5, y - 0.5, y + 0.5, 1, trunk + 1, TRUNK));

  round(b, x, y, r, LEAF, 0.07, function (u, v) {
    var d = (u * u + v * v) / (r * r);

    if (d >= 1) return null;

    var k = Math.sqrt(1 - d);

    return [mid - down * k, mid + up * k, u / (r * r), v / (r * r), k / up];
  });
}

/**
 * A hedge along x from x0 to x1, from y0 to y1 deep and h high, its top
 * rounded across, a little higher here and lower there along it.
 */
export function hedge(b, x0, x1, y0, y1, z, h) {
  var mid = (y0 + y1) / 2,
    half = (y1 - y0) / 2,
    x,
    y;

  for (x = x0; x < x1; x += 1)
    for (y = y0; y < y1; y += 0.5) {
      var v = (y + 0.25 - mid) / half,
        k = Math.sqrt(Math.max(0, 1 - v * v)),
        top = z + h * (0.7 + 0.3 * k) - speckle(x, 7) * 0.5,
        col = shaded(HEDGE, 0, v / half, k / (h * 0.3)),
        g = (speckle(x * 2, y * 2) - 0.5) * 0.12;

      b.push(
        box(
          x,
          x + 1,
          y,
          y + 0.5,
          z,
          top,
          g > 0 ? lighter(col, g) : darker(col, -g),
          LIT,
        ),
      );
    }
}

export function bench(b, x, y) {
  b.push(box(x, x + 5, y, y + 2, 2, 2.6, WOOD));
  b.push(box(x, x + 5, y + 1.6, y + 2, 2.6, 4, WOOD));
  b.push(box(x + 0.5, x + 1, y + 0.5, y + 1.5, 1, 2, METAL));
  b.push(box(x + 4, x + 4.5, y + 0.5, y + 1.5, 1, 2, METAL));
}

//the cars that park at home - no trucks or buses - each as often as it turns
//up on the roads
var PARKED = ["sedan", "hatchback", "pickup", "van"];

/**
 * A vehicle from shared/gen/vehicles - the same boxes the driving ones are
 * painted from - with its middle at x, y on ground z high, going dir.
 */
function vehicle(b, type, color, x, y, z, dir) {
  var t = Vehicles.TYPES[type];

  Vehicles.place(
    t.build(Vehicles.COLORS[color]),
    t.length,
    t.width,
    Vehicles.DIRECTIONS[dir],
  ).forEach(function (c) {
    b.push(
      box(c.x0 + x, c.x1 + x, c.y0 + y, c.y1 + y, c.z0 + z, c.z1 + z, c.color),
    );
  });
}

/**
 * A car parked with its middle at x, y on ground z high, nose in towards +y
 * or backed in.
 */
export function parkedCar(b, x, y, z, rnd) {
  var total = 0,
    roll,
    type,
    colors = Object.keys(Vehicles.COLORS);

  PARKED.forEach(function (name) {
    total += Vehicles.TYPES[name].weight;
  });
  roll = rnd() * total;
  for (type = 0; roll >= Vehicles.TYPES[PARKED[type]].weight; type++)
    roll -= Vehicles.TYPES[PARKED[type]].weight;

  vehicle(
    b,
    PARKED[type],
    pick(rnd, colors),
    x,
    y,
    z,
    rnd() < 0.7 ? "y+" : "y-",
  );
}

//a yard tile at cell x = cx: three bays against the block, the way in along
//the front - empty: what is parked in them is drawn over it, different for
//every block (PARKING_BAYS)
export function parking(b, cx) {
  var i, x;

  b.push(box(cx + 1, cx + 31, 2, 30, 1, 1.2, ASPHALT));
  for (i = 0; i < 4; i++) {
    x = cx + 3 + i * 9;
    b.push(box(x, x + 0.6, 14, 30, 1.2, 1.25, STRIPE));
  }
}

//the bays of parking: where a car's middle is, on the ground how high, and
//which ways it may stand in it - nose in or backed in
export var PARKING_BAYS = [0, 1, 2].map(function (i) {
  return { x: 7.8 + i * 9, y: 22, z: 1.2, headings: ["y+", "y-"] };
});

//how a heading turns with a part, a quarter turn at a time: what faced +x
//faces -y (see iso.rotate)
var HEADING_TURN = { "x+": "y-", "y-": "x-", "x-": "y+", "y+": "x+" };

export function turnHeading(heading, turns) {
  for (var t = 0; t < turns; t++) heading = HEADING_TURN[heading];

  return heading;
}

/**
 * Bays to park in, drawn over a part (client/compoundbuilding overlays): each
 * where its car's middle is on the screen from the middle of the part's
 * tile, the part turned `turns` times, and which ways a car may stand in it
 * then. Which cars are parked there, if any, is up to each building.
 *
 * @param bays {{x, y, z, headings}[]} on the part's tile as it is painted
 */
export function baysOverlay(bays, turns) {
  return {
    bays: bays.map(function (bay) {
      var at = turnPoint(bay.x, bay.y, turns),
        screen = iso.project(at[0] - TILE / 2, at[1] - TILE / 2, bay.z);

      return {
        x: screen[0],
        y: screen[1],
        headings: bay.headings.map(function (h) {
          return turnHeading(h, turns);
        }),
      };
    }),
  };
}

/* --- The backs of buildings ------------------------------------------- */

//what the back of a building has about it: the bins, a steel door, the air
//conditioning's units on the wall, a service fence
var BIN = [52, 116, 64],
  BIN_LID = [38, 88, 48],
  DUMPSTER = [40, 92, 120],
  STEEL = [118, 124, 132],
  SPRAY = [
    [232, 58, 92],
    [250, 196, 40],
    [60, 170, 230],
    [130, 220, 70],
    [170, 80, 210],
    [250, 120, 40],
  ];

/**
 * Something on a face of the walls r - {x0, x1, y0, y1} - looking towards
 * -y, +y, -x or +x: from a0 to a1 along it (x for a face looking along y, y
 * for one looking along x), z0 to z1 high, standing d0 to d1 out of it.
 */
export function onFace(r, f, a0, a1, z0, z1, d0, d1, color, finish) {
  if (f === "-y")
    return box(a0, a1, r.y0 - d1, r.y0 - d0, z0, z1, color, finish);
  if (f === "+y")
    return box(a0, a1, r.y1 + d0, r.y1 + d1, z0, z1, color, finish);
  if (f === "-x")
    return box(r.x0 - d1, r.x0 - d0, a0, a1, z0, z1, color, finish);

  return box(r.x1 + d0, r.x1 + d1, a0, a1, z0, z1, color, finish);
}

/**
 * A steel door at a along the face, from z: its frame, a light over it, a
 * step before it.
 */
export function backDoor(b, r, f, a, z, trim) {
  b.push(onFace(r, f, a - 0.4, a + 3.9, z, z + 8.8, 0, 0.2, trim || STEEL));
  b.push(onFace(r, f, a, a + 3.5, z, z + 8.4, 0.2, 0.3, darker(STEEL, 0.25)));
  b.push(onFace(r, f, a + 2.6, a + 3.1, z + 4, z + 4.6, 0.3, 0.45, METAL));
  b.push(
    onFace(r, f, a + 1.2, a + 2.3, z + 9.4, z + 10.2, 0, 0.6, [250, 236, 180]),
  );
  b.push(onFace(r, f, a - 0.8, a + 4.3, 1, z, 0, 1.4, darker(STEEL, 0.1)));
}

/**
 * The outside unit of an air conditioner on its brackets at a along the
 * face, z up: its fan behind a grille, a pipe down the wall into it - and
 * the stain the drip has left down the wall under it.
 */
export function wallUnit(b, r, f, a, z, wall) {
  b.push(onFace(r, f, a, a + 4.2, z, z + 3.2, 0, 1.8, [212, 214, 210]));
  b.push(
    onFace(r, f, a + 0.5, a + 2.9, z + 0.4, z + 2.8, 1.8, 1.9, [96, 100, 104]),
  );
  b.push(
    onFace(r, f, a + 3.2, a + 3.8, z + 0.6, z + 2.6, 1.8, 1.9, [150, 152, 150]),
  );
  b.push(onFace(r, f, a + 0.4, a + 0.8, z - 0.6, z, 0, 1.6, METAL));
  b.push(onFace(r, f, a + 3.4, a + 3.8, z - 0.6, z, 0, 1.6, METAL));
  b.push(onFace(r, f, a + 4.2, a + 4.6, z + 1, z + 5, 0, 0.4, [236, 236, 230]));
  if (wall && z > 3)
    b.push(
      onFace(
        r,
        f,
        a + 1.2,
        a + 2.2,
        Math.max(1.5, z - 5),
        z,
        0,
        0.04,
        darker(wall, 0.14),
      ),
    );
}

/**
 * Streaks down the face from z1 - rain off the roof, rust off a pipe - here
 * and there along it from a0 to a1.
 */
export function smears(b, r, f, a0, a1, z0, z1, wall, rnd) {
  for (var a = a0 + 1 + rnd() * 4; a < a1 - 1.5; a += 3 + rnd() * 7) {
    var w = 0.5 + rnd() * 1.2,
      long = (z1 - z0) * (0.25 + rnd() * 0.6);

    b.push(
      onFace(
        r,
        f,
        a,
        a + w,
        z1 - long,
        z1,
        0,
        0.03,
        darker(wall, 0.08 + rnd() * 0.08),
      ),
    );
  }
}

/**
 * A tag sprayed on the face from a, z up: w by h of bubbly letters in one
 * colour, outlined in another, the odd drip under them.
 */
export function graffiti(b, r, f, a, z, w, h, rnd) {
  var fill = SPRAY[Math.floor(rnd() * SPRAY.length)],
    line = rnd() < 0.5 ? [30, 30, 36] : SPRAY[Math.floor(rnd() * SPRAY.length)],
    seed = Math.floor(rnd() * 1e6),
    cells = [],
    i,
    j;

  function on(i, j) {
    if (i < 0 || j < 0 || i >= w || j >= h) return false;

    var k = i % 4;

    if (k === 3) return false;

    var hh =
      Math.imul(Math.floor(i / 4) + seed, 73856093) ^
      Math.imul(k * 7 + j, 19349663);

    hh = Math.imul(hh ^ (hh >>> 13), 0x5bd1e995);

    return ((hh ^ (hh >>> 15)) >>> 0) / 4294967296 < 0.7 || j === 1;
  }

  for (i = -1; i <= w; i++)
    for (j = -1; j <= h; j++) {
      var inside = on(i, j),
        edge =
          !inside &&
          (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1));

      if (inside) cells.push([i, j, fill]);
      else if (edge) cells.push([i, j, line]);
    }

  cells.forEach(function (c) {
    var u = a + c[0] * 0.5,
      v = z + c[1] * 0.5;

    b.push(onFace(r, f, u, u + 0.5, v, v + 0.5, 0, 0.05, c[2]));
  });

  for (i = 0; i < 3; i++) {
    var d = a + rnd() * w * 0.5;

    b.push(onFace(r, f, d, d + 0.4, z - 0.6 - rnd() * 1.5, z, 0, 0.05, fill));
  }
}

/**
 * Wheelie bins in a row from x, y along x (axis "x") or y, n of them, green
 * with their lids darker - or for a big building, a skip of a bin with its
 * lid up.
 */
export function bins(b, x, y, n, axis) {
  for (var i = 0; i < n; i++) {
    var bx = axis === "y" ? x : x + i * 1.9,
      by = axis === "y" ? y + i * 1.9 : y;

    b.push(box(bx, bx + 1.5, by, by + 1.5, 1, 3.6, BIN));
    b.push(box(bx - 0.1, bx + 1.6, by - 0.1, by + 1.6, 3.6, 4, BIN_LID));
  }
}

export function dumpster(b, x, y, axis) {
  var l = 6,
    d = 3,
    x1 = axis === "y" ? x + d : x + l,
    y1 = axis === "y" ? y + l : y + d;

  b.push(box(x, x1, y, y1, 1.4, 5, DUMPSTER));
  b.push(
    box(x - 0.1, x1 + 0.1, y - 0.1, y1 + 0.1, 5, 5.4, darker(DUMPSTER, 0.25)),
  );
  b.push(box(x + 0.3, x + 0.8, y + 0.3, y + 0.8, 1, 1.4, METAL));
  b.push(box(x1 - 0.8, x1 - 0.3, y1 - 0.8, y1 - 0.3, 1, 1.4, METAL));
}

/**
 * A chain-link fence along x at y (axis "x") or along y at x from a0 to a1:
 * posts, a rail along the top and wires strung between - leaving the
 * gaps out.
 */
export function wireFence(b, axis, at, a0, a1, gaps) {
  var runs = [[a0, a1]];

  (gaps || []).forEach(function (g) {
    var next = [];

    runs.forEach(function (q) {
      if (g[1] <= q[0] || g[0] >= q[1]) next.push(q);
      else {
        if (g[0] > q[0]) next.push([q[0], g[0]]);
        if (g[1] < q[1]) next.push([g[1], q[1]]);
      }
    });
    runs = next;
  });

  runs.forEach(function (q) {
    function bx(l0, l1, c0, c1, z0, z1, col) {
      return axis === "x"
        ? box(l0, l1, at + c0, at + c1, z0, z1, col)
        : box(at + c0, at + c1, l0, l1, z0, z1, col);
    }

    //posts a unit square every six, a rail along their tops and wires
    //between, each a pixel high (iso snap)
    for (var p = q[0]; p <= q[1] - 1; p += 6)
      b.push(bx(p, p + 1, 0, 1, 1, 7, METAL));
    b.push(bx(q[1] - 1, q[1], 0, 1, 1, 7, METAL));
    b.push(bx(q[0], q[1], 0, 1, 6, 7, METAL));
    [2, 4].forEach(function (z) {
      b.push(bx(q[0], q[1], 0, 0.2, z, z + 1, [176, 180, 184]));
    });
  });
}

/* --- Building sites -------------------------------------------------- */

/**
 * The ground under a section once its structure goes up (build): bare earth
 * and the plinth poured where the block will stand. Nothing else stands on
 * the tile: the structure is laid over this, and would be drawn over
 * whatever should hide its foot, whichever side it is seen from. What a site
 * is before that, and what stands about it, is the same for every building
 * there is (shared/gen/sites).
 */
function siteBase(b, s) {
  var x = ends(s, 0.3);

  b.push(box(0, TILE, 0, TILE, 0, 1, DIRT));
  b.push(box(x[0], x[1], s.front - 0.3, s.back + 0.3, 1, PLINTH, CONCRETE));
}

/* --- Parts ----------------------------------------------------------- */

//where a section stands in its wall: alone, at its start or end, or in the
//middle of a wall of three, neither end of it
var ENDS = {
  both: [true, true],
  start: [true, false],
  end: [false, true],
  mid: [false, false],
};

//the ways a part is painted: as it is, and turned one, two and three
//quarter turns - so that a block shows whichever side faces the camera
export var TURNS = [0, 1, 2, 3];

/**
 * A generator of blocks in a style.
 *
 * @param style {Object} what the blocks are like:
 *        name: what the parts' names start with, "flats";
 *        palettes: {name: palette} - what a palette holds is the style's;
 *        shape: {front, depth, inset}, the section (see section);
 *        details: the variants of an upper storey, by name - every one of
 *        them comes in every palette;
 *        roofs: how many variants of roof there are;
 *        yards: {name: function (b, cx, rnd)}, the yard tiles - the ones
 *        most plainly a yard first, which is the order a catalogue picture
 *        takes them in (client/compoundbuilding);
 *        yardVariants: how many of each;
 *        ground(b, s, pal, rnd): the ground storey, on its plinth;
 *        upper(b, s, z, pal, detail, rnd): a storey from z;
 *        roof(b, s, z, pal, rnd, variant): the roof at z;
 *        frame(b, s, z, rnd): the bare structure of a storey from z;
 *        finish: what every box without a finish of its own is like, if
 *        anything (MATTE) - flat colour otherwise;
 *        wallsMadeOf, roofsMadeOf: what the boxes of the palette's wall and roof colours
 *        are made of, if not that (iso MATERIALS)
 * @returns {{describe, paint, partBoxes, PARTS}}
 */
/**
 * The blank end of a block of a style with walls - not all glass - on a
 * storey from z: the air conditioning's unit on it, now and then, and rain
 * streaks down it.
 */
function backs(b, s, z, pal, rnd) {
  if (pal.wall === undefined) return;

  var r = { x0: s.x0, x1: s.x1, y0: s.front, y1: s.back };

  [s.start ? "-x" : null, s.end ? "+x" : null].forEach(function (f) {
    if (f === null) return;

    if (rnd() < 0.6)
      wallUnit(b, r, f, s.front + 4 + Math.floor(rnd() * 8), z + 3, pal.wall);
    smears(b, r, f, s.front, s.back, z, z + STOREY, pal.wall, rnd);
  });
}

export function blocks(style) {
  var gen = style.name,
    PARTS = parts();

  /**
   * Every part there is, by name without its turn: "flats/upper/sand/start/01"
   * - and what it is: kind, palette, ends, detail, variant, yard and whether
   * its pavement runs up to a yard.
   */
  function parts() {
    var out = {};

    Object.keys(style.palettes).forEach(function (pal) {
      Object.keys(ENDS).forEach(function (ends) {
        ["street", "yard"].forEach(function (pavement) {
          out[gen + "/ground/" + pal + "/" + ends + "/" + pavement] = {
            kind: "ground",
            palette: pal,
            ends: ends,
            pavement: pavement,
          };
        });

        style.details.forEach(function (detail) {
          out[gen + "/upper/" + pal + "/" + ends + "/" + detail] = {
            kind: "upper",
            palette: pal,
            ends: ends,
            detail: detail,
          };
        });

        for (var v = 0; v < style.roofs; v++)
          out[gen + "/roof/" + pal + "/" + ends + "/" + v] = {
            kind: "roof",
            palette: pal,
            ends: ends,
            variant: v,
          };
      });
    });

    Object.keys(style.yards).forEach(function (yard) {
      for (var v = 0; v < style.yardVariants; v++)
        out[gen + "/yard/" + yard + "/" + v] = {
          kind: "yard",
          yard: yard,
          variant: v,
        };
    });

    Object.keys(ENDS).forEach(function (ends) {
      out[gen + "/site/" + ends + "/build"] = { kind: "site", ends: ends };
      out[gen + "/frame/" + ends] = { kind: "frame", ends: ends };
    });

    return out;
  }

  /**
   * A section standing alone on a tile, its front on the tile's front row.
   */
  function tileSection(ends) {
    var e = ENDS[ends],
      s = section(style.shape, 0, 1, 0);

    s.start = e[0];
    s.end = e[1];
    s.x0 = e[0] ? style.shape.inset : 0;
    s.x1 = e[1] ? TILE - style.shape.inset : TILE;

    return s;
  }

  /**
   * The boxes of a part, standing on a tile of its own - storeys and roofs
   * at the height of the first upper storey and of a roof on one storey: the
   * rest are the same pictures, laid higher.
   */
  function partBoxes(name, p) {
    var b = [],
      pal = style.palettes[p.palette],
      rnd = random(name),
      s;

    if (p.kind === "yard") {
      b.push(box(0, TILE, 0, TILE, 0, 1, GRASS));
      style.yards[p.yard](b, 0, rnd);
      return finished(b, null);
    }

    s = tileSection(p.ends);

    if (p.kind === "ground") {
      //the lot, and the pavement in front of the block - up to the yard, or
      //short of the street
      b.push(box(0, TILE, 0, TILE, 0, 1, GRASS));
      b.push(
        box(
          s.start ? 1 : 0,
          s.end ? TILE - 1 : TILE,
          p.pavement === "yard" ? 0 : 1,
          style.shape.front,
          1,
          1.2,
          PAVING,
        ),
      );
      style.ground(b, s, pal, rnd);
      //the bins out at the back
      bins(b, s.x1 - 6, s.back + 0.6, 2, "x");
    } else if (p.kind === "upper") {
      style.upper(b, s, PLINTH + STOREY, pal, p.detail, rnd);
      backs(b, s, PLINTH + STOREY, pal, rnd);
    } else if (p.kind === "roof")
      style.roof(b, s, PLINTH + STOREY, pal, rnd, p.variant);
    else if (p.kind === "site") siteBase(b, s);
    else style.frame(b, s, PLINTH + STOREY, rnd);

    return finished(b, pal);
  }

  //the style's walls and roofs on the boxes of the palette's wall and roof
  //colours, and its finish on every other box that has none of its own
  function finished(b, pal) {
    var walls = style.wallsMadeOf && made(style.wallsMadeOf),
      roofs = style.roofsMadeOf && made(style.roofsMadeOf);

    b.forEach(function (c) {
      if (c.finish !== undefined) return;

      if (pal && walls && c.color === pal.wall) c.finish = walls;
      else if (pal && roofs && c.color === pal.roof) c.finish = roofs;
      else c.finish = style.finish;
    });

    return b;
  }

  /**
   * The boxes of a part by its full name, turned the way the name says: what
   * the part is called, then /r and its turns - "flats/roof/slate/end/1/r1".
   */
  function boxesOf(name) {
    var at = name.lastIndexOf("/r"),
      key = name.slice(0, at),
      turns = parseInt(name.slice(at + 2), 10),
      p = PARTS[key];

    if (p === undefined || TURNS.indexOf(turns) === -1)
      throw new Error("no such part: " + name);

    return iso.rotate(partBoxes(key, p), 1, 1, turns);
  }

  /**
   * Every part, by sprite name - "gen/flats/upper/sand/start/01/r0" - with
   * its size and pivot, without painting it; and what whoever puts a block
   * together needs to know of them.
   */
  function describe() {
    var sizes = {},
      over = {};

    Object.keys(PARTS).forEach(function (key) {
      TURNS.forEach(function (turns) {
        var boxes = iso.rotate(partBoxes(key, PARTS[key]), 1, 1, turns);

        sizes["gen/" + key + "/r" + turns] = measureOnTile(boxes);

        //a car park's bays
        if (
          PARTS[key].kind === "yard" &&
          style.yards[PARTS[key].yard] === parking
        )
          over[key + "/r" + turns] = [baysOverlay(PARKING_BAYS, turns)];
      });
    });

    return {
      sizes: sizes,
      data: {
        storey: STOREY,
        palettes: Object.keys(style.palettes),
        details: style.details,
        roofs: style.roofs,
        yards: Object.keys(style.yards),
        yardVariants: style.yardVariants,
        turns: TURNS,
        //what is drawn over a part, by its sprite name without gen/: see
        //baysOverlay
        overlays: over,
      },
    };
  }

  /**
   * One part, by sprite name.
   *
   * @returns {{width, height, data}}
   */
  function paint(name) {
    return iso.toImage(onTile(boxesOf(name.replace(/^gen\//, ""))));
  }

  return {
    describe: describe,
    paint: paint,
    //the boxes of a part by its name without its turn, as it is painted
    partBoxes: function (key) {
      if (PARTS[key] === undefined) throw new Error("no such part: " + key);

      return partBoxes(key, PARTS[key]);
    },
    PARTS: PARTS,
  };
}

/**
 * Where a point on a tile goes, the tile turned a quarter turn at a time on
 * the spot - the way iso.rotate turns the boxes on it.
 */
export function turnPoint(x, y, turns) {
  switch (turns % 4) {
    case 1:
      return [y, TILE - x];
    case 2:
      return [TILE - x, TILE - y];
    case 3:
      return [TILE - y, x];
    default:
      return [x, y];
  }
}

/**
 * Boxes painted whole, not cut to a tile - for what is drawn over a tile and
 * may reach past it - the pivot where the tile's middle is.
 */
export function free(boxes) {
  var picture = iso.render(boxes),
    middle = iso.project(TILE / 2, TILE / 2, 0);

  picture.pivotX += middle[0];
  picture.pivotY += middle[1];

  return picture;
}

//the size and pivot free would paint the boxes with
export function measureFree(boxes) {
  var m = iso.measure(boxes),
    middle = iso.project(TILE / 2, TILE / 2, 0);

  return {
    w: m.w,
    h: m.h,
    pivotX: m.pivotX + middle[0],
    pivotY: m.pivotY + middle[1],
  };
}

/**
 * What its tile shows of the boxes - everything clipped to the tile, the
 * way iso.paintTiles cuts a building up.
 */
export function onTile(boxes) {
  return iso.paintTiles(boxes, 1, 1)[0];
}

/**
 * The size and pivot onTile would paint the boxes with, without painting.
 */
export function measureOnTile(boxes) {
  var clipped = [];

  //snapped before it is cut to the tile, as iso.paintTiles does
  iso.snapAll(boxes).forEach(function (b) {
    var c = iso.clip(b, 0, TILE, 0, TILE);

    //a box off the tile altogether is not on it
    if (c !== null) clipped.push(c);
  });

  var m = iso.measure(clipped),
    middle = iso.project(TILE / 2, TILE / 2, 0);

  return {
    w: m.w,
    h: m.h,
    pivotX: m.pivotX + middle[0],
    pivotY: m.pivotY + middle[1],
  };
}
