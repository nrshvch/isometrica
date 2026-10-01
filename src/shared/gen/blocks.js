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
  CONCRETE = [168, 166, 160],
  MACHINE = [236, 178, 36],
  TRACK = [44, 44, 48],
  CAB_GLASS = [112, 156, 186],
  BRICK = [176, 84, 64],
  HOARDING = [214, 214, 206],
  CABIN = [236, 236, 228],
  CABIN_TRIM = [70, 110, 160];

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
 * A digger standing on ground z, its tracks along x from x, y, its arm
 * reaching out towards -y and down into the ground.
 */
function digger(b, x, y, z) {
  var dark = darker(MACHINE, 0.25);

  b.push(box(x, x + 11, y, y + 2.5, z, z + 2.5, TRACK));
  b.push(box(x, x + 11, y + 5.5, y + 8, z, z + 2.5, TRACK));
  b.push(box(x + 1, x + 10, y + 0.5, y + 7.5, z + 2.5, z + 5, MACHINE));
  b.push(box(x + 0.5, x + 3, y + 0.5, y + 7.5, z + 5, z + 7.5, dark));
  b.push(box(x + 6, x + 10, y + 3.5, y + 7.5, z + 5, z + 10, MACHINE));
  b.push(box(x + 6.2, x + 10.2, y + 3.3, y + 7.3, z + 7, z + 9.5, CAB_GLASS));
  //the boom up and out over the front, the stick down, the bucket
  b.push(box(x + 3.5, x + 5.5, y - 1, y + 5, z + 8, z + 10, MACHINE));
  b.push(box(x + 3.5, x + 5.5, y - 5, y - 1, z + 4, z + 10, MACHINE));
  b.push(box(x + 3, x + 6, y - 7.5, y - 4, z, z + 4, METAL));
}

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

/**
 * A heap of gravel with its middle at x, y on ground z.
 */
function heap(b, x, y, z, r) {
  [1.6, 1.2, 0.8, 0.4].forEach(function (k, i) {
    var w = r * k;

    b.push(
      box(x - w, x + w, y - w, y + w, z + i * 1.5, z + (i + 1) * 1.5, GRAVEL),
    );
  });
}

/**
 * The ground of a building site under a section: bare earth, the plinth
 * poured where the block will stand - and on it the diggers, and a truck in
 * front, while it is dug (dig). Once the structure goes up on it (build)
 * nothing else stands on the tile: the structure is laid over this, and
 * would be drawn over whatever should hide its foot, whichever side it is
 * seen from - what it is built of waits on the yard (SITE_YARDS).
 */
function siteBase(b, s, kind, rnd) {
  var x = ends(s, 0.3);

  b.push(box(0, TILE, 0, TILE, 0, 1, DIRT));
  b.push(box(x[0], x[1], s.front - 0.3, s.back + 0.3, 1, PLINTH, CONCRETE));

  if (kind !== "dig") return;

  digger(b, s.x0 + 3, s.front + 8, PLINTH);
  vehicle(
    b,
    "truck",
    pick(rnd, ["orange", "yellow", "white"]),
    TILE / 2 + 2,
    s.front / 2,
    1,
    rnd() < 0.5 ? "x+" : "x-",
  );
}

/**
 * The tower crane over a building site, its mast at x, y: as tall as a
 * block of five storeys, its jib along x across the tile.
 */
function crane(b, x, y) {
  var top = PLINTH + 5 * STOREY + 6,
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
  //the cab under the jib, the jib, its counterweight, the hook
  b.push(box(x - 1.5, x + 2, y - 2.5, y + 1.5, top - 4, top, CABIN));
  b.push(box(x - 1.8, x + 2.2, y - 2.7, y - 2.4, top - 3, top - 1, CAB_GLASS));
  b.push(box(1, TILE - 1, y - 0.8, y + 0.8, top, top + 1.5, MACHINE));
  b.push(box(x - 1, x + 1, y - 1, y + 1, top + 1.5, top + 6, MACHINE));
  b.push(box(1, 5, y - 1.2, y + 1.2, top - 3, top, CONCRETE));
  b.push(box(TILE - 6, TILE - 5.6, y - 0.2, y + 0.2, top - 26, top, METAL));
  b.push(box(TILE - 7, TILE - 4.6, y - 1, y + 1, top - 28, top - 26, dark));
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
  //a truck come with gravel, the heap it tipped
  trucks: function (b, rnd) {
    vehicle(
      b,
      "truck",
      pick(rnd, ["orange", "yellow", "white"]),
      10,
      TILE / 2 + 1,
      1,
      rnd() < 0.5 ? "y+" : "y-",
    );
    heap(b, 23, 18, 1, 4);
  },
  crane: function (b) {
    crane(b, 9, 18);
    pallet(b, 20, 20, 1);
    pallet(b, 22, 11, 1);
  },
  materials: function (b) {
    cabin(b, 4, 20, 1);
    bars(b, 6, 26, 9, 1);
    pallet(b, 22, 18, 1);
  },
};

/* --- Parts ----------------------------------------------------------- */

//where a section stands in its wall: alone, or at its start or end
var ENDS = { both: [true, true], start: [true, false], end: [false, true] };

//the ways a part is painted: as it is, and turned one, two and three
//quarter turns - so that a block shows whichever side faces the camera
var TURNS = [0, 1, 2, 3];

//what a building site under a section is at: digging, or building
var SITE_KINDS = ["dig", "build"];

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
 *        frame(b, s, z, rnd): the bare structure of a storey from z
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
      return b;
    }

    if (p.kind === "siteyard") {
      b.push(box(0, TILE, 0, TILE, 0, 1, DIRT));
      SITE_YARDS[p.yard](b, rnd);
      return b;
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
    else if (p.kind === "site") siteBase(b, s, p.site, rnd);
    else style.frame(b, s, PLINTH + STOREY, rnd);

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
    var sizes = {};

    Object.keys(PARTS).forEach(function (key) {
      TURNS.forEach(function (turns) {
        var boxes = iso.rotate(partBoxes(key, PARTS[key]), 1, 1, turns);

        sizes["gen/" + key + "/r" + turns] = measureOnTile(boxes);
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
            ),
          );
        });
      });
    });

    return iso.rotate(b, sizeX, sizeY, turns);
  }

  return { describe: describe, paint: paint, model: model, PARTS: PARTS };
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
