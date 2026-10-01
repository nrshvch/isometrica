/**
 * Paints blocks out of parts, the way shared/gen/vehicles paints cars out of
 * boxes: flat colours, one light for everything, no noise. What is in a
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
import { lifts } from "./stacking.js";

export var box = iso.box,
  darker = iso.darker,
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

//on a building site
var DIRT = [152, 124, 92],
  GRAVEL = [170, 162, 150],
  SAND = [196, 164, 112],
  CONCRETE = [168, 166, 160],
  MACHINE = [236, 178, 36],
  TRACK = [44, 44, 48],
  CAB_GLASS = [112, 156, 186],
  BRICK = [176, 84, 64],
  HOARDING = [214, 214, 206],
  CABIN = [236, 236, 228],
  CABIN_TRIM = [70, 110, 160];

//what a surface is like, for the boxes of a style that has it (see iso
//finish): concrete, stone and painted metal with a faint grain to them, and
//glass with the sky in it - laid out by storey, so that a storey looks the
//same whichever one it is
export var MATTE = { noise: 0.035, base: PLINTH, storey: STOREY },
  GLASSY = { noise: 0.012, sheen: true, base: PLINTH, storey: STOREY };

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

export function tree(b, x, y, size) {
  var z = 4;

  b.push(box(x - 0.5, x + 0.5, y - 0.5, y + 0.5, 1, z + 1, TRUNK));
  [
    [size - 1, 2],
    [size, size + 1],
    [size - 1, 2],
    [size - 2, 1.5],
  ].forEach(function (tier) {
    var r = tier[0];
    b.push(box(x - r, x + r, y - r, y + r, z, z + tier[1], LEAF));
    z += tier[1];
  });
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
//the front
export function parking(b, cx, rnd) {
  var i, x;

  b.push(box(cx + 1, cx + 31, 2, 30, 1, 1.2, ASPHALT));
  for (i = 0; i < 4; i++) {
    x = cx + 3 + i * 9;
    b.push(box(x, x + 0.6, 14, 30, 1.2, 1.25, STRIPE));
  }
  for (i = 0; i < 3; i++) {
    if (rnd() < 0.75) parkedCar(b, cx + 7.8 + i * 9, 22, 1.2, rnd);
  }
}

/* --- Building sites -------------------------------------------------- */

/**
 * A pallet of bricks at x, y on ground z.
 */
function pallet(b, x, y, z) {
  b.push(box(x, x + 5, y, y + 4, z, z + 1, WOOD));
  b.push(box(x + 0.3, x + 4.7, y + 0.3, y + 3.7, z + 1, z + 4, BRICK));
}

/**
 * A stack of steel bars or pipes along x, from x to x1, at y on ground z.
 */
function bars(b, x, x1, y, z) {
  b.push(box(x + 1, x + 2, y - 0.5, y + 3.5, z, z + 1, WOOD));
  b.push(box(x1 - 2, x1 - 1, y - 0.5, y + 3.5, z, z + 1, WOOD));
  b.push(box(x, x1, y, y + 3, z + 1, z + 2.5, METAL));
}

//where the light comes from, for what is shaded by its own surface: above,
//and from the side the faces looking towards -x are lit from (see iso shade)
var LIGHT = (function () {
  var l = [-0.45, 0.35, 1],
    n = Math.sqrt(l[0] * l[0] + l[1] * l[1] + l[2] * l[2]);

  return [l[0] / n, l[1] / n, l[2] / n];
})();

/**
 * A heap of sand with its middle at x, y on ground z, r across and h high: a
 * mound, round and low at its foot. It is built of columns half a pixel
 * across, each lit by which way the mound's surface faces where it stands -
 * not by its own flat faces, which would draw rings round it - and each
 * grain a little lighter or darker than the next.
 */
function heap(b, x, y, z, r, h, rnd) {
  var step = 0.5,
    i,
    j;

  function height(u, v) {
    var d = Math.sqrt(u * u + v * v) / r;

    return d >= 1 ? 0 : h * Math.pow(1 - d * d, 0.75);
  }

  for (i = -r; i < r; i += step)
    for (j = -r; j < r; j += step) {
      var u = i + step / 2,
        v = j + step / 2,
        top = height(u, v);

      if (top <= 0) continue;

      //the surface's slope there, and how much of the light falls on it
      var gx = (height(u + 0.25, v) - height(u - 0.25, v)) / 0.5,
        gy = (height(u, v + 0.25) - height(u, v - 0.25)) / 0.5,
        n = Math.sqrt(gx * gx + gy * gy + 1),
        lit = (-gx * LIGHT[0] - gy * LIGHT[1] + LIGHT[2]) / n,
        color =
          lit > 0.9
            ? lighter(SAND, (lit - 0.9) * 2.2)
            : darker(SAND, (0.9 - lit) * 0.6),
        grain = (rnd() - 0.5) * 0.08;

      b.push(
        box(
          x + i,
          x + i + step,
          y + j,
          y + j + step,
          z,
          z + Math.max(top, 0.3),
          grain > 0 ? lighter(color, grain) : darker(color, -grain),
          LIT,
        ),
      );
    }
}

//painted the colour it is, see iso finish
var LIT = { lit: true };

/**
 * The ground of a building site under a section: bare earth, the plinth
 * poured where the block will stand. Whatever works on it - the digger, the
 * lorry - is drawn over it (SITE_MACHINES). Once the structure goes up on it
 * (build) nothing else stands on the tile: the structure is laid over this,
 * and would be drawn over whatever should hide its foot, whichever side it
 * is seen from - what it is built of waits on the yard (SITE_YARDS).
 */
function siteBase(b, s) {
  var x = ends(s, 0.3);

  b.push(box(0, TILE, 0, TILE, 0, 1, DIRT));
  b.push(box(x[0], x[1], s.front - 0.3, s.back + 0.3, 1, PLINTH, CONCRETE));
}

//where on its tile a tower crane's mast stands, and how high its jib turns:
//over a block of five storeys
var CRANE = { x: 9, y: 18, top: PLINTH + 5 * STOREY + 6 };

//which ways the jib points as it turns back and forth, in degrees off x
var JIB_ANGLES = [-45, -30, -15, 0, 15, 30, 45];

/**
 * The tower crane's mast, with its cab at the top, as far as the jib: the
 * jib turns, and is painted on its own (jib).
 */
function crane(b) {
  var x = CRANE.x,
    y = CRANE.y,
    top = CRANE.top,
    dark = darker(MACHINE, 0.2),
    z;

  b.push(box(x - 3, x + 3, y - 3, y + 3, 1, 2, CONCRETE));
  //the mast, its lattice in bands
  for (z = 2; z < top; z += 4)
    b.push(
      box(
        x - 1.5,
        x + 1.5,
        y - 1.5,
        y + 1.5,
        z,
        Math.min(z + 4, top),
        z % 8 < 4 ? MACHINE : dark,
      ),
    );
  b.push(box(x - 1.5, x + 2, y - 2.5, y + 1.5, top - 4, top, CABIN));
  b.push(box(x - 1.8, x + 2.2, y - 2.7, y - 2.4, top - 3, top - 1, CAB_GLASS));
}

/**
 * The part of the tower crane that turns, pointing `angle` degrees off x:
 * the jib out over the site, the counter-jib behind with its weights, the
 * peak over the mast, the hook hanging near the end - in steps along the
 * way it points, each a little box, the way the ground is drawn in pixels.
 */
function jib(angle) {
  var b = [],
    a = (angle * Math.PI) / 180,
    dx = Math.cos(a),
    dy = Math.sin(a),
    top = CRANE.top,
    s,
    px,
    py;

  function at(d) {
    return [CRANE.x + d * dx, CRANE.y + d * dy];
  }

  for (s = -8; s <= 22; s += 0.75) {
    var p = at(s);

    b.push(
      box(
        p[0] - 0.7,
        p[0] + 0.7,
        p[1] - 0.7,
        p[1] + 0.7,
        top,
        top + 1.5,
        MACHINE,
      ),
    );
  }

  for (s = -7.5; s <= -4.5; s += 0.75) {
    var w = at(s);

    b.push(
      box(
        w[0] - 1.1,
        w[0] + 1.1,
        w[1] - 1.1,
        w[1] + 1.1,
        top - 3,
        top,
        CONCRETE,
      ),
    );
  }

  b.push(
    box(
      CRANE.x - 1,
      CRANE.x + 1,
      CRANE.y - 1,
      CRANE.y + 1,
      top + 1.5,
      top + 6,
      MACHINE,
    ),
  );

  var hook = at(17);

  px = hook[0];
  py = hook[1];
  b.push(box(px - 0.2, px + 0.2, py - 0.2, py + 0.2, top - 24, top, METAL));
  b.push(
    box(
      px - 1.2,
      px + 1.2,
      py - 1,
      py + 1,
      top - 26,
      top - 24,
      darker(MACHINE, 0.2),
    ),
  );

  return b;
}

/**
 * The site office: a cabin, with its door and window, at x, y on ground z.
 */
function cabin(b, x, y, z) {
  b.push(box(x, x + 14, y, y + 6, z, z + 7, CABIN));
  b.push(box(x - 0.2, x + 14.2, y - 0.2, y + 6.2, z + 7, z + 7.6, CABIN_TRIM));
  b.push(box(x + 2, x + 4, y - 0.2, y, z, z + 5.5, CABIN_TRIM));
  b.push(box(x + 6, x + 12, y - 0.2, y, z + 3, z + 5.5, CAB_GLASS));
}

//where the yard will be, while the block goes up
var SITE_YARDS = {
  //the heap of gravel a lorry tipped, and room for it beside (SITE_MACHINES)
  trucks: function (b, rnd) {
    heap(b, 23, 17, 1, 7, 5.5, rnd);
  },
  crane: function (b) {
    crane(b);
    pallet(b, 20, 20, 1);
    pallet(b, 22, 11, 1);
  },
  materials: function (b) {
    cabin(b, 4, 20, 1);
    bars(b, 6, 26, 9, 1);
    pallet(b, 22, 18, 1);
  },
};

/**
 * What works on a building site, by the part it works on: one machine to a
 * tile, from the vehicle generator's pictures - which is where the game
 * draws them from - with its middle at x, y on ground z of the part's own
 * tile, facing heading, and going back and forth by move along it.
 *
 * @param s {Object} the section the part is under, for the site's parts
 */
function siteMachines(kind, s) {
  if (kind === "dig")
    return [
      {
        vehicle: "excavator",
        x: 12,
        y: s.front + 9.5,
        z: PLINTH,
        heading: "x+",
        move: 1.5,
      },
    ];

  if (kind === "haul")
    return [
      {
        vehicle: "lorry",
        x: TILE / 2,
        y: s.front / 2,
        z: 1,
        heading: "x-",
        move: 3,
      },
    ];

  if (kind === "trucks")
    return [{ vehicle: "lorry", x: 10, y: 16, z: 1, heading: "y-", move: 3 }];

  return [];
}

/* --- Parts ----------------------------------------------------------- */

//where a section stands in its wall: alone, or at its start or end
var ENDS = { both: [true, true], start: [true, false], end: [false, true] };

//the ways a part is painted: as it is, and turned one, two and three
//quarter turns - so that a block shows whichever side faces the camera
var TURNS = [0, 1, 2, 3];

//what a building site under a section is at: digging, carting the earth away,
//or building
var SITE_KINDS = ["dig", "haul", "build"];

//how a heading turns with the part, a quarter turn at a time: what faced +x
//faces -y (see iso.rotate)
var HEADING_TURN = { "x+": "y-", "y-": "x-", "x-": "y+", "y+": "x+" };

var HEADING = { "x+": [1, 0], "x-": [-1, 0], "y+": [0, 1], "y-": [0, -1] };

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
 *        anything (MATTE) - flat colour otherwise
 * @returns {{describe, paint, model, PARTS}}
 */
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
      SITE_KINDS.forEach(function (site) {
        out[gen + "/site/" + ends + "/" + site] = {
          kind: "site",
          ends: ends,
          site: site,
        };
      });

      out[gen + "/frame/" + ends] = { kind: "frame", ends: ends };
    });

    Object.keys(SITE_YARDS).forEach(function (yard) {
      out[gen + "/siteyard/" + yard] = { kind: "siteyard", yard: yard };
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
      return finished(b);
    }

    if (p.kind === "siteyard") {
      b.push(box(0, TILE, 0, TILE, 0, 1, DIRT));
      SITE_YARDS[p.yard](b, rnd);
      return finished(b);
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
    } else if (p.kind === "upper")
      style.upper(b, s, PLINTH + STOREY, pal, p.detail, rnd);
    else if (p.kind === "roof")
      style.roof(b, s, PLINTH + STOREY, pal, rnd, p.variant);
    else if (p.kind === "site") siteBase(b, s);
    else style.frame(b, s, PLINTH + STOREY, rnd);

    return finished(b);
  }

  //the style's finish on every box that has none of its own
  function finished(b) {
    if (style.finish !== undefined)
      b.forEach(function (c) {
        if (c.finish === undefined) c.finish = style.finish;
      });

    return b;
  }

  /**
   * What is drawn over a part as the game draws it, rather than painted
   * into it - what moves: the machines working on a building site, the jib
   * of a tower crane turning. Each where it is on the screen from the
   * middle of the part's tile, the part turned `turns` times:
   *
   *   - {vehicle, color, heading, x, y, move}: a picture of the vehicle
   *     generator's (gfx/generated/vehicles.json), its middle at x, y, going
   *     back and forth from there by as far as move, [x, y] on the screen;
   *   - {frames}: pictures to go through and back, the jib from one side to
   *     the other, each with its pivot where the tile's middle is.
   */
  function overlays(key, p, turns) {
    var rnd = random(key + "/machines"),
      machines =
        p.kind === "site"
          ? siteMachines(p.site, tileSection(p.ends))
          : p.kind === "siteyard"
            ? siteMachines(p.yard)
            : [],
      out = machines.map(function (m) {
        var at = turnPoint(m.x, m.y, turns),
          heading = m.heading,
          t;

        for (t = 0; t < turns; t++) heading = HEADING_TURN[heading];

        var v = HEADING[heading],
          screen = iso.project(at[0] - TILE / 2, at[1] - TILE / 2, m.z),
          move = iso.project(v[0] * m.move, v[1] * m.move, 0);

        return {
          vehicle: m.vehicle,
          color: pick(rnd, Vehicles.TYPES[m.vehicle].colors),
          heading: heading,
          x: screen[0],
          y: screen[1],
          move: move,
        };
      });

    if (p.kind === "siteyard" && p.yard === "crane")
      out.push({
        frames: JIB_ANGLES.map(function (a, i) {
          return "gen/" + gen + "/jib/" + i + "/r" + turns;
        }),
      });

    return out;
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
   * The boxes of a frame of the crane's jib by its name - "flats/jib/3/r1",
   * the fourth way it points, turned once - or null for a name that is not.
   */
  function jibOf(name) {
    var m = /^[a-z]+\/jib\/(\d+)\/r(\d)$/.exec(name);

    if (
      m === null ||
      JIB_ANGLES[+m[1]] === undefined ||
      TURNS.indexOf(+m[2]) === -1
    )
      return null;

    return iso.rotate(jib(JIB_ANGLES[+m[1]]), 1, 1, +m[2]);
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
        var boxes = iso.rotate(partBoxes(key, PARTS[key]), 1, 1, turns),
          drawn = overlays(key, PARTS[key], turns);

        sizes["gen/" + key + "/r" + turns] = measureOnTile(boxes);

        if (drawn.length > 0) over[key + "/r" + turns] = drawn;
      });
    });

    JIB_ANGLES.forEach(function (a, i) {
      TURNS.forEach(function (turns) {
        var name = gen + "/jib/" + i + "/r" + turns;

        sizes["gen/" + name] = measureFree(jibOf(name));
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
        sites: SITE_KINDS,
        siteYards: Object.keys(SITE_YARDS),
        turns: TURNS,
        //what is drawn over a part, by its sprite name without gen/: see
        //overlays
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
    var key = name.replace(/^gen\//, ""),
      boxes = jibOf(key);

    return iso.toImage(boxes !== null ? free(boxes) : onTile(boxesOf(key)));
  }

  /**
   * A whole block in one, every box of it in place - to look at, and to hold
   * the parts against: what the game draws out of the parts has to come out
   * the same as this, painted tile by tile.
   *
   * @param plan {Object[]} what stands on each tile: {x, y, parts}, x along
   *        the wall, y from the front, parts the names of what is laid there
   *        bottom first, without their turns - as client/compoundbuilding
   *        keeps them
   * @param sizeX {number}
   * @param sizeY {number}
   * @param turns {number}
   */
  function model(plan, sizeX, sizeY, turns) {
    var b = [];

    plan.forEach(function (tile) {
      var up = lifts(
        tile.parts.map(function (key) {
          return PARTS[key].kind;
        }),
        STOREY,
      );

      tile.parts.forEach(function (key, i) {
        partBoxes(key, PARTS[key]).forEach(function (c) {
          b.push(
            iso.box(
              c.x0 + tile.x * TILE,
              c.x1 + tile.x * TILE,
              c.y0 + tile.y * TILE,
              c.y1 + tile.y * TILE,
              c.z0 + up[i],
              c.z1 + up[i],
              c.color,
              c.finish,
            ),
          );
        });
      });
    });

    return iso.rotate(b, sizeX, sizeY, turns);
  }

  return {
    describe: describe,
    paint: paint,
    model: model,
    PARTS: PARTS,
  };
}

/**
 * Where a point on a tile goes, the tile turned a quarter turn at a time on
 * the spot - the way iso.rotate turns the boxes on it.
 */
function turnPoint(x, y, turns) {
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
function free(boxes) {
  var picture = iso.render(boxes),
    middle = iso.project(TILE / 2, TILE / 2, 0);

  picture.pivotX += middle[0];
  picture.pivotY += middle[1];

  return picture;
}

//the size and pivot free would paint the boxes with
function measureFree(boxes) {
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
function onTile(boxes) {
  return iso.paintTiles(boxes, 1, 1)[0];
}

/**
 * The size and pivot onTile would paint the boxes with, without painting.
 */
function measureOnTile(boxes) {
  var clipped = [];

  boxes.forEach(function (b) {
    var c = iso.box(
      Math.max(b.x0, 0),
      Math.min(b.x1, TILE),
      Math.max(b.y0, 0),
      Math.min(b.y1, TILE),
      b.z0,
      b.z1,
      b.color,
    );

    if (c.x0 < c.x1 && c.y0 < c.y1) clipped.push(c);
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
