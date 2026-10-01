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

//the bare earth of a building site, and what is poured on it
export var DIRT = [152, 124, 92],
  CONCRETE = [168, 166, 160];

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

/* --- Light ----------------------------------------------------------- */

//where the light comes from, for what is shaded by its own surface: above,
//and from the side the faces looking towards -x are lit from (see iso shade)
var LIGHT = (function () {
  var l = [-0.45, 0.35, 1],
    n = Math.sqrt(l[0] * l[0] + l[1] * l[1] + l[2] * l[2]);

  return [l[0] / n, l[1] / n, l[2] / n];
})();

//how much light falls on a face looking up, towards -x and towards -y - and
//how much lighter or darker iso shade paints each of them
var LIT_UP = LIGHT[2],
  LIT_LEFT = -LIGHT[0],
  LIT_RIGHT = -LIGHT[1];

//painted the colour it is, see iso finish
export var LIT = { lit: true };

/**
 * The colour of something round where its surface looks along nx, ny, nz -
 * lit the way iso shade lights a box's faces, so a round thing sits among
 * the boxes as if it were lit by the same sun: as light as a box's top where
 * it looks straight up, as dark as its right side where it looks that way.
 */
export function shaded(color, nx, ny, nz) {
  var n = Math.sqrt(nx * nx + ny * ny + nz * nz),
    lit = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / n,
    k;

  if (lit >= LIT_LEFT)
    k = -0.1 + ((lit - LIT_LEFT) / (LIT_UP - LIT_LEFT)) * 0.32;
  else k = -0.3 + ((lit - LIT_RIGHT) / (LIT_LEFT - LIT_RIGHT)) * 0.2;

  return k > 0 ? lighter(color, k) : darker(color, -k);
}

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

//where a section stands in its wall: alone, or at its start or end
var ENDS = { both: [true, true], start: [true, false], end: [false, true] };

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
 *        anything (MATTE) - flat colour otherwise
 * @returns {{describe, paint, partBoxes, PARTS}}
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
