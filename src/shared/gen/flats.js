/**
 * Paints blocks of flats out of parts, the way shared/gen/vehicles paints cars
 * out of boxes: flat colours, one light for everything, no noise.
 *
 * A block is put together like toy bricks, out of sections that each take one
 * tile, the same sections for every block whatever its size: a 1x1 tower is
 * one section with both its ends, a two tile wall two sections side by side.
 * A section is built up of parts, each painted on its own:
 *
 *   - ground: the ground storey on its plinth, with the way in under a canopy
 *     at the front, and the pavement in front of it;
 *   - upper: a storey stacked on that, with windows and balconies;
 *   - roof: the roof on top, with its parapet, the way out onto it and vents;
 *
 * and in front of the wall, for a block with one, a yard tile: a playground,
 * a lawn with trees, or a car park with the same cars in it that drive the
 * roads.
 *
 * Every part comes in every palette, and its details in a few variants: which
 * windows of a storey have balconies, front and back; where a roof's vents
 * are; how a yard is laid out. A part is painted standing on a tile of its
 * own, its pivot the middle of that tile on the ground, and the parts of one
 * tile are put together by laying each upper storey STOREY pixels higher than
 * the one under it and the roof on top - which is what whoever draws a block
 * does (client/compoundbuilding), picking the parts at random for every block
 * built. It is painted twice: as it is, its front looking towards -y, and
 * turned a quarter turn, its front looking towards -x.
 *
 * Units as in the vehicles: a tile is 32 along the ground each way, heights in
 * pixels. Colours are kept to 16 bits.
 */
import * as iso from "./isobox.js";
import * as Vehicles from "./vehicles.js";

var box = iso.box,
  darker = iso.darker,
  lighter = iso.lighter,
  TILE = iso.TILE;

//how high a storey is, and the plinth under the ground floor
var STOREY = 12,
  PLINTH = 3;

var GRASS = [112, 158, 84],
  PAVING = [178, 176, 168],
  ASPHALT = [96, 98, 104],
  STRIPE = [232, 232, 226],
  RUBBER = [184, 108, 88],
  SAND = [226, 204, 142],
  WOOD = [150, 104, 68],
  METAL = [92, 96, 104],
  TRUNK = [112, 84, 60],
  LEAF = [70, 128, 66],
  HEDGE = [84, 136, 70],
  GLASS = [88, 124, 156],
  DOOR = [86, 72, 64],
  VENT = [150, 152, 156];

//what a block is built of: its walls, the plinth under them, the stairwells
//up the front, the balconies and canopies, and the roof
var PALETTES = {
  panel: {
    wall: [214, 208, 196],
    plinth: [128, 124, 120],
    accent: [204, 112, 72],
    trim: [238, 236, 230],
    roof: [120, 114, 110],
  },
  sand: {
    wall: [226, 200, 158],
    plinth: [134, 118, 104],
    accent: [96, 134, 164],
    trim: [244, 238, 224],
    roof: [126, 112, 100],
  },
  slate: {
    wall: [170, 184, 194],
    plinth: [104, 110, 118],
    accent: [230, 194, 98],
    trim: [238, 240, 240],
    roof: [104, 108, 116],
  },
};

//a random number generator that gives the same numbers for the same seed, so
//running this again paints the same pictures
function random(seed) {
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

function pick(rnd, list) {
  return list[Math.floor(rnd() * list.length)];
}

/**
 * The one section every block is built of. It is a tile wide along the wall,
 * so the next one carries straight on, and less than a tile deep, which leaves
 * room inside the tile for the entrance and canopy in front and balconies on
 * both long sides.
 *
 * Every block has the same sections - a 1x1 tower is a single one of them, a
 * two tile wall two of them side by side - so they all look like the same
 * block, only longer or taller.
 */
var SECTION = {
  //how far the wall stands back from the front of its tile, and how deep
  front: 10,
  depth: 19,
  //how far a section that ends the wall stops short of its tile's edge
  inset: 2,
  //the windows either side of the stairwell in the middle, along the tile
  windows: [
    [3, 7],
    [8, 12],
    [20, 24],
    [25, 29],
  ],
  //which of those have balconies: one of these for each long side
  balconies: [
    [1, 2],
    [0, 3],
  ],
};

/**
 * Where section c of a wall `cells` tiles long stands, its front on row: the
 * same for every storey stacked on it and the roof on top. start and end say
 * whether it ends the wall that way - both, for a wall of one.
 */
function section(c, cells, row, balconies, backBalconies) {
  var start = c === 0,
    end = c === cells - 1,
    cell = c * TILE;

  return {
    cell: cell,
    mid: cell + TILE / 2,
    x0: start ? cell + SECTION.inset : cell,
    x1: end ? cell + TILE - SECTION.inset : cell + TILE,
    front: row + SECTION.front,
    back: row + SECTION.front + SECTION.depth,
    start: start,
    end: end,
    balconies: balconies,
    backBalconies: backBalconies,
  };
}

/**
 * One storey of a section, its wall from z0 up to z1 and its floor at zf: the
 * windows and balconies along both long sides, and its piece of the stairwell
 * up the middle of the front - a strip of colour with a window on the landing
 * halfway up the storey, which shows through at the back too. The ends are
 * blank. On the ground storey (upper false) there are no balconies, and the
 * way in is where the landing window would be.
 */
function storey(b, s, z0, z1, zf, upper, pal) {
  var landing = zf + STOREY / 2;

  b.push(box(s.x0, s.x1, s.front, s.back, z0, z1, pal.wall));

  facade(b, s.cell, upper ? s.balconies : [], s.front, -1, zf, pal);
  facade(b, s.cell, upper ? s.backBalconies : [], s.back, 1, zf, pal);

  b.push(box(s.mid - 2, s.mid + 2, s.front - 0.5, s.front, zf, z1, pal.accent));
  if (upper)
    b.push(
      box(
        s.mid - 1,
        s.mid + 1,
        s.front - 0.7,
        s.front,
        landing - 2,
        landing + 2,
        GLASS,
      ),
    );
  b.push(
    box(
      s.mid - 1,
      s.mid + 1,
      s.back,
      s.back + 0.2,
      landing - 2,
      landing + 2,
      GLASS,
    ),
  );
}

//how far the plinth and the floor lines stand out of a section's ends
function ends(s, e) {
  return [s.x0 - (s.start ? e : 0), s.x1 + (s.end ? e : 0)];
}

//the ground storey: on a plinth, with the way in under a canopy at the front
function groundStorey(b, s, pal) {
  var x = ends(s, 0.3);

  storey(b, s, 1, PLINTH + STOREY, PLINTH, false, pal);
  b.push(box(x[0], x[1], s.front - 0.3, s.back + 0.3, 1, PLINTH, pal.plinth));

  b.push(box(s.mid - 3, s.mid + 3, s.front - 4, s.front, 1, 1.6, pal.plinth));
  b.push(
    box(
      s.mid - 1.5,
      s.mid + 1.5,
      s.front - 0.7,
      s.front,
      1.6,
      PLINTH + 6,
      DOOR,
    ),
  );
  b.push(
    box(
      s.mid - 3.5,
      s.mid + 3.5,
      s.front - 4,
      s.front,
      PLINTH + 6.5,
      PLINTH + 7.5,
      pal.trim,
    ),
  );
}

//a storey stacked on the one under it, from z: a line where its floor is
function upperStorey(b, s, z, pal) {
  var x = ends(s, 0.2);

  storey(b, s, z, z + STOREY, z, true, pal);
  b.push(
    box(
      x[0],
      x[1],
      s.front - 0.2,
      s.back + 0.2,
      z - 0.5,
      z + 0.5,
      darker(pal.wall, 0.08),
    ),
  );
}

/**
 * The roof on top of a section at z. The parapet runs round the edge of the
 * whole roof - along the front and back of every section, across the end only
 * on the end ones - so no seam shows where two sections meet. On it, the way
 * out over the stairs and a vent or two.
 */
function roof(b, s, z, pal, rnd) {
  var vents = 1 + Math.floor(rnd() * 2),
    v,
    vx,
    vy;

  b.push(box(s.x0, s.x1, s.front, s.back, z, z + 0.4, pal.roof));
  b.push(box(s.x0, s.x1, s.front, s.front + 1.5, z, z + 2, pal.wall));
  b.push(box(s.x0, s.x1, s.back - 1.5, s.back, z, z + 2, pal.wall));
  if (s.start)
    b.push(box(s.x0, s.x0 + 1.5, s.front, s.back, z, z + 2, pal.wall));
  if (s.end) b.push(box(s.x1 - 1.5, s.x1, s.front, s.back, z, z + 2, pal.wall));

  b.push(box(s.mid - 3, s.mid + 3, s.back - 9, s.back - 3, z, z + 6, pal.wall));
  b.push(
    box(
      s.mid - 3.3,
      s.mid + 3.3,
      s.back - 9.3,
      s.back - 2.7,
      z + 6,
      z + 6.8,
      pal.plinth,
    ),
  );
  b.push(
    box(
      s.mid - 1.2,
      s.mid + 1.2,
      s.back - 9.2,
      s.back - 9,
      z + 0.4,
      z + 4.5,
      DOOR,
    ),
  );

  for (v = 0; v < vents; v++) {
    vx = pick(rnd, [s.x0 + 4, s.x1 - 7]);
    vy = s.front + 3 + Math.floor(rnd() * (s.back - s.front - 9));
    b.push(box(vx, vx + 3, vy, vy + 3, z, z + 2.5, VENT));
  }
}

/**
 * One storey of windows along a long side of a section: the wall's face is at
 * y, looking towards -y (out = -1) or +y (out = 1), the storey's floor at zf.
 * The windows listed in balconies get a glass door and a balcony instead.
 */
function facade(b, cell, balconies, y, out, zf, pal) {
  SECTION.windows.forEach(function (w, i) {
    var w0 = cell + w[0],
      w1 = cell + w[1];

    if (balconies.indexOf(i) >= 0) balcony(b, w0, w1, y, out, zf, pal);
    else b.push(box(w0, w1, y, y + out * 0.2, zf + 3, zf + 9, GLASS));
  });
}

//a balcony outside a glass door from w0 to w1 in the face at y, on the floor
//at zf
function balcony(b, w0, w1, y, out, zf, pal) {
  var a0 = w0 - 1,
    a1 = w1 + 1,
    d = y + out * 3;

  b.push(box(w0, w1, y, y + out * 0.2, zf + 1, zf + 9, GLASS));
  b.push(box(a0, a1, y, d, zf, zf + 1, pal.plinth));
  b.push(box(a0, a1, d, d - out * 0.5, zf + 1, zf + 4.5, pal.trim));
  b.push(box(a0, a0 + 0.5, y, d, zf + 1, zf + 4.5, pal.trim));
  b.push(box(a1 - 0.5, a1, y, d, zf + 1, zf + 4.5, pal.trim));
}

function tree(b, x, y, size) {
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

function bench(b, x, y) {
  b.push(box(x, x + 5, y, y + 2, 2, 2.6, WOOD));
  b.push(box(x, x + 5, y + 1.6, y + 2, 2.6, 4, WOOD));
  b.push(box(x + 0.5, x + 1, y + 0.5, y + 1.5, 1, 2, METAL));
  b.push(box(x + 4, x + 4.5, y + 0.5, y + 1.5, 1, 2, METAL));
}

//the cars that park at home - no trucks or buses - each as often as it turns
//up on the roads
var PARKED = ["sedan", "hatchback", "pickup", "van"];

/**
 * A car from shared/gen/vehicles - the same boxes the driving ones are
 * painted from - parked with its middle at x, y on ground z high, nose in
 * towards +y or backed in.
 */
function parkedCar(b, x, y, z, rnd) {
  var total = 0,
    roll,
    type,
    t,
    colors = Object.keys(Vehicles.COLORS);

  PARKED.forEach(function (name) {
    total += Vehicles.TYPES[name].weight;
  });
  roll = rnd() * total;
  for (type = 0; roll >= Vehicles.TYPES[PARKED[type]].weight; type++)
    roll -= Vehicles.TYPES[PARKED[type]].weight;
  t = Vehicles.TYPES[PARKED[type]];

  Vehicles.place(
    t.build(Vehicles.COLORS[pick(rnd, colors)]),
    t.length,
    t.width,
    Vehicles.DIRECTIONS[rnd() < 0.7 ? "y+" : "y-"],
  ).forEach(function (c) {
    b.push(
      box(c.x0 + x, c.x1 + x, c.y0 + y, c.y1 + y, c.z0 + z, c.z1 + z, c.color),
    );
  });
}

//the ground of one yard tile at cell x = cx (the yard is always the front row)
var YARDS = {
  playground: function (b, cx, rnd) {
    var sx = cx + 4 + Math.floor(rnd() * 4),
      sy = 5;

    b.push(box(cx + 3, cx + 29, 3, 29, 1, 1.2, RUBBER));
    //a sandpit with a wooden rim
    b.push(box(sx, sx + 9, sy, sy + 9, 1, 1.8, SAND));
    b.push(box(sx, sx + 9, sy, sy + 1, 1, 2.2, WOOD));
    b.push(box(sx, sx + 9, sy + 8, sy + 9, 1, 2.2, WOOD));
    b.push(box(sx, sx + 1, sy, sy + 9, 1, 2.2, WOOD));
    b.push(box(sx + 8, sx + 9, sy, sy + 9, 1, 2.2, WOOD));
    //a swing: two posts, a bar, two seats on chains
    var wx = cx + 16,
      wy = 20;
    b.push(box(wx, wx + 1, wy, wy + 1, 1, 11, METAL));
    b.push(box(wx + 11, wx + 12, wy, wy + 1, 1, 11, METAL));
    b.push(box(wx, wx + 12, wy, wy + 1, 10, 11, METAL));
    [wx + 3, wx + 7.5].forEach(function (x) {
      b.push(box(x, x + 0.4, wy + 0.3, wy + 0.7, 4, 10, METAL));
      b.push(box(x + 1.1, x + 1.5, wy + 0.3, wy + 0.7, 4, 10, METAL));
      b.push(box(x - 0.3, x + 1.8, wy - 0.5, wy + 1.5, 3.5, 4.2, RUBBER));
    });
    bench(b, cx + 5, 22);
    tree(b, cx + 25, 7, 3);
  },
  lawn: function (b, cx, rnd) {
    var n = 2 + Math.floor(rnd() * 2),
      i,
      spots = [
        [8, 8],
        [22, 10],
        [12, 21],
        [24, 22],
      ];

    //a hedge round the front
    b.push(box(cx + 1, cx + 31, 1, 3, 1, 3.5, HEDGE));
    spots.sort(function () {
      return rnd() - 0.5;
    });
    for (i = 0; i < n; i++)
      tree(b, cx + spots[i][0], spots[i][1], 3 + Math.floor(rnd() * 2));
    bench(b, cx + 12, 27);
  },
  //three bays against the block, the way in along the front
  parking: function (b, cx, rnd) {
    var i, x;

    b.push(box(cx + 1, cx + 31, 2, 30, 1, 1.2, ASPHALT));
    for (i = 0; i < 4; i++) {
      x = cx + 3 + i * 9;
      b.push(box(x, x + 0.6, 14, 30, 1.2, 1.25, STRIPE));
    }
    for (i = 0; i < 3; i++) {
      if (rnd() < 0.75) parkedCar(b, cx + 7.8 + i * 9, 22, 1.2, rnd);
    }
  },
};

/* --- Parts ----------------------------------------------------------- */

//how many variants of the details there are: roofs and yards are painted from
//a seed of their own each
var ROOF_VARIANTS = 2,
  YARD_VARIANTS = 2;

//where a section stands in its wall: alone, or at its start or end
var ENDS = { both: [true, true], start: [true, false], end: [false, true] };

//the two ways a part is painted: as it is, and turned a quarter turn
var TURNS = [0, 1];

/**
 * Every part there is, by name without its turn: "flats/upper/sand/start/01"
 * - and what it is: kind, palette, ends, front and back balconies, variant,
 * yard and whether its pavement runs up to a yard.
 */
function parts() {
  var out = {};

  Object.keys(PALETTES).forEach(function (pal) {
    Object.keys(ENDS).forEach(function (ends) {
      ["street", "yard"].forEach(function (pavement) {
        out["flats/ground/" + pal + "/" + ends + "/" + pavement] = {
          kind: "ground",
          palette: pal,
          ends: ends,
          pavement: pavement,
        };
      });

      SECTION.balconies.forEach(function (f, front) {
        SECTION.balconies.forEach(function (b, back) {
          out["flats/upper/" + pal + "/" + ends + "/" + front + back] = {
            kind: "upper",
            palette: pal,
            ends: ends,
            front: front,
            back: back,
          };
        });
      });

      for (var v = 0; v < ROOF_VARIANTS; v++)
        out["flats/roof/" + pal + "/" + ends + "/" + v] = {
          kind: "roof",
          palette: pal,
          ends: ends,
          variant: v,
        };
    });
  });

  Object.keys(YARDS).forEach(function (yard) {
    for (var v = 0; v < YARD_VARIANTS; v++)
      out["flats/yard/" + yard + "/" + v] = {
        kind: "yard",
        yard: yard,
        variant: v,
      };
  });

  return out;
}

/**
 * A section standing alone on a tile, its front on the tile's front row.
 */
function tileSection(ends, front, back) {
  var e = ENDS[ends],
    s = section(
      0,
      1,
      0,
      SECTION.balconies[front || 0],
      SECTION.balconies[back || 0],
    );

  s.start = e[0];
  s.end = e[1];
  s.x0 = e[0] ? SECTION.inset : 0;
  s.x1 = e[1] ? TILE - SECTION.inset : TILE;

  return s;
}

/**
 * The boxes of a part, standing on a tile of its own - storeys and roofs at
 * the height of the first upper storey and of a roof on one storey: the rest
 * are the same pictures, laid higher.
 */
function partBoxes(name, p) {
  var b = [],
    pal = PALETTES[p.palette],
    rnd = random(name),
    s;

  if (p.kind === "yard") {
    b.push(box(0, TILE, 0, TILE, 0, 1, GRASS));
    YARDS[p.yard](b, 0, rnd);
    return b;
  }

  s = tileSection(p.ends, p.front, p.back);

  if (p.kind === "ground") {
    //the lot, and the pavement in front of the block - up to the yard, or
    //short of the street
    b.push(box(0, TILE, 0, TILE, 0, 1, GRASS));
    b.push(
      box(
        s.start ? 1 : 0,
        s.end ? TILE - 1 : TILE,
        p.pavement === "yard" ? 0 : 1,
        SECTION.front,
        1,
        1.2,
        PAVING,
      ),
    );
    groundStorey(b, s, pal);
  } else if (p.kind === "upper") upperStorey(b, s, PLINTH + STOREY, pal);
  else roof(b, s, PLINTH + STOREY, pal, rnd);

  return b;
}

var PARTS = parts();

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
 * What its tile shows of the boxes - everything clipped to the tile, the
 * way iso.paintTiles cuts a building up.
 */
function onTile(boxes) {
  return iso.paintTiles(boxes, 1, 1)[0];
}

/**
 * Every part, by sprite name - "gen/flats/upper/sand/start/01/r0" - with its
 * size and pivot, without painting it; and what whoever puts a block
 * together needs to know of them.
 */
export function describe() {
  var sizes = {};

  Object.keys(PARTS).forEach(function (key) {
    TURNS.forEach(function (turns) {
      var name = key + "/r" + turns,
        boxes = iso.rotate(partBoxes(key, PARTS[key]), 1, 1, turns),
        m = measureOnTile(boxes);

      sizes["gen/" + name] = m;
    });
  });

  return {
    sizes: sizes,
    data: {
      storey: STOREY,
      palettes: Object.keys(PALETTES),
      balconies: SECTION.balconies.length,
      roofs: ROOF_VARIANTS,
      yards: Object.keys(YARDS),
      yardVariants: YARD_VARIANTS,
      turns: TURNS,
    },
  };
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

/**
 * One part, by sprite name.
 *
 * @returns {{width, height, data}}
 */
export function paint(name) {
  return iso.toImage(onTile(boxesOf(name.replace(/^gen\//, ""))));
}

/**
 * A whole block in one, every box of it in place - to look at, and to hold
 * the parts against: what the game draws out of the parts has to come out
 * the same as this, painted tile by tile.
 *
 * @param plan {Object[]} what stands on each tile: {x, y, parts}, x along the
 *        wall, y from the front, parts the names of what is laid there bottom
 *        first, without their turns - as client/compoundbuilding keeps them
 * @param sizeX {number}
 * @param sizeY {number}
 * @param turns {number}
 */
export function model(plan, sizeX, sizeY, turns) {
  var b = [];

  plan.forEach(function (tile) {
    var level = 0;

    tile.parts.forEach(function (key) {
      var p = PARTS[key],
        lift = 0;

      //the first storey up is painted where it stands, the roof where it
      //would on one storey; the rest stand a storey higher each
      if (p.kind === "ground") level = 1;
      else if (p.kind === "upper") lift = Math.max(level++ - 1, 0) * STOREY;
      else if (p.kind === "roof") lift = Math.max(level - 1, 0) * STOREY;

      partBoxes(key, p).forEach(function (c) {
        b.push(
          iso.box(
            c.x0 + tile.x * TILE,
            c.x1 + tile.x * TILE,
            c.y0 + tile.y * TILE,
            c.y1 + tile.y * TILE,
            c.z0 + lift,
            c.z1 + lift,
            c.color,
          ),
        );
      });
    });
  });

  return iso.rotate(b, sizeX, sizeY, turns);
}

export { PARTS, STOREY };
