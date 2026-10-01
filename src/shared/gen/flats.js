/**
 * Blocks of flats, put together out of parts the way shared/gen/blocks puts
 * every block together:
 *
 *   - ground: the ground storey on its plinth, with the way in under a canopy
 *     at the front, and the pavement in front of it;
 *   - upper: a storey stacked on that, with windows and balconies;
 *   - roof: the roof on top, with its parapet, the way out onto it and vents;
 *   - frame: a storey going up - concrete columns and floor, the stairwell
 *     poured first, scaffolding along the front;
 *
 * and in front of the wall, for a block with one, a yard tile: a playground,
 * a car park with the same cars in it that drive the roads, or a lawn with
 * trees.
 *
 * Its walls have a faint grain to them, and its windows the sky in them
 * (blocks MATTE, GLASSY).
 *
 * Every part comes in every palette, and its details in a few variants: which
 * windows of a storey have balconies, front and back; where a roof's vents
 * are; how a yard is laid out.
 */
import {
  blocks,
  box,
  darker,
  ends,
  pick,
  tree,
  bench,
  parking,
  STOREY,
  PLINTH,
  WOOD,
  METAL,
  hedge,
  MATTE,
  GLASSY,
  DOOR,
  VENT,
} from "./blocks.js";

var RUBBER = [184, 108, 88],
  SAND = [226, 204, 142],
  GLASS = [88, 124, 156],
  CONCRETE = [168, 166, 160],
  REBAR = [96, 74, 62];

//what a block is built of: its walls, the plinth under them, the stairwells
//up the front, the balconies and canopies, and the roof
var PALETTES = {
  panel: {
    wall: [240, 226, 204],
    plinth: [126, 116, 110],
    accent: [234, 92, 44],
    trim: [250, 246, 238],
    roof: [150, 92, 76],
  },
  sand: {
    wall: [246, 204, 128],
    plinth: [140, 112, 90],
    accent: [40, 128, 204],
    trim: [252, 244, 226],
    roof: [120, 84, 70],
  },
  slate: {
    wall: [150, 192, 226],
    plinth: [92, 106, 124],
    accent: [252, 196, 40],
    trim: [244, 248, 252],
    roof: [84, 96, 124],
  },
  mint: {
    wall: [168, 222, 188],
    plinth: [96, 122, 108],
    accent: [228, 76, 92],
    trim: [246, 252, 246],
    roof: [92, 120, 104],
  },
  coral: {
    wall: [244, 166, 142],
    plinth: [132, 96, 88],
    accent: [44, 120, 160],
    trim: [252, 240, 232],
    roof: [128, 80, 70],
  },
};

/**
 * The one section every block of flats is built of. It is a tile wide along
 * the wall, so the next one carries straight on, and less than a tile deep,
 * which leaves room inside the tile for the entrance and canopy in front and
 * balconies on both long sides.
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
 * One storey of a section, its wall from z0 up to z1 and its floor at zf: the
 * windows and balconies along both long sides, and its piece of the stairwell
 * up the middle of the front - a strip of colour with a window on the landing
 * halfway up the storey, which shows through at the back too. The ends are
 * blank. On the ground storey (upper false) there are no balconies, and the
 * way in is where the landing window would be.
 *
 * @param front {number[]} the windows with balconies at the front
 * @param back {number[]} and at the back
 */
function storey(b, s, z0, z1, zf, upper, pal, front, back) {
  var landing = zf + STOREY / 2;

  b.push(box(s.x0, s.x1, s.front, s.back, z0, z1, pal.wall));

  facade(b, s.cell, upper ? front : [], s.front, -1, zf, pal);
  facade(b, s.cell, upper ? back : [], s.back, 1, zf, pal);

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
        GLASSY,
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
      GLASSY,
    ),
  );
}

//the ground storey: on a plinth, with the way in under a canopy at the front
function groundStorey(b, s, pal) {
  var x = ends(s, 0.3);

  storey(b, s, 1, PLINTH + STOREY, PLINTH, false, pal, [], []);
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

/**
 * A storey stacked on the one under it, from z: a line where its floor is.
 *
 * @param detail {string} which of SECTION.balconies are at the front and at
 *        the back: "01" for the first at the front, the second at the back
 */
function upperStorey(b, s, z, pal, detail) {
  var x = ends(s, 0.2);

  storey(
    b,
    s,
    z,
    z + STOREY,
    z,
    true,
    pal,
    SECTION.balconies[+detail[0]],
    SECTION.balconies[+detail[1]],
  );
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
    else b.push(box(w0, w1, y, y + out * 0.2, zf + 3, zf + 9, GLASS, GLASSY));
  });
}

//a balcony outside a glass door from w0 to w1 in the face at y, on the floor
//at zf
function balcony(b, w0, w1, y, out, zf, pal) {
  var a0 = w0 - 1,
    a1 = w1 + 1,
    d = y + out * 3;

  b.push(box(w0, w1, y, y + out * 0.2, zf + 1, zf + 9, GLASS, GLASSY));
  b.push(box(a0, a1, y, d, zf, zf + 1, pal.plinth));
  b.push(box(a0, a1, d, d - out * 0.5, zf + 1, zf + 4.5, pal.trim));
  b.push(box(a0, a0 + 0.5, y, d, zf + 1, zf + 4.5, pal.trim));
  b.push(box(a1 - 0.5, a1, y, d, zf + 1, zf + 4.5, pal.trim));
}

/**
 * A storey of the block going up, from its floor at z: the floor slab, the
 * concrete columns between the windows-to-be, front and back, the stairwell
 * already up the middle, bars sticking out of the columns for the storey
 * over it, and scaffolding along the front.
 */
function frame(b, s, z) {
  var x = ends(s, 0.3),
    top = z + STOREY,
    columns = [s.x0, s.cell + 7.4, s.cell + 12.4, s.cell + 18.4, s.cell + 23.4];

  b.push(
    box(x[0], x[1], s.front - 0.3, s.back + 0.3, z - 0.5, z + 0.5, CONCRETE),
  );

  if (s.end) columns.push(s.x1 - 1.2);
  columns.forEach(function (cx) {
    if (cx < s.x0 || cx + 1.2 > s.x1) return;

    [s.front, s.back - 1.2].forEach(function (cy) {
      b.push(box(cx, cx + 1.2, cy, cy + 1.2, z + 0.5, top - 0.5, CONCRETE));
      b.push(
        box(
          cx + 0.4,
          cx + 0.8,
          cy + 0.4,
          cy + 0.8,
          top - 0.5,
          top + 1.5,
          REBAR,
        ),
      );
    });
  });

  //the stairwell, poured ahead of the rest
  b.push(
    box(
      s.mid - 3,
      s.mid + 3,
      s.front,
      s.front + 6,
      z + 0.5,
      top - 0.5,
      darker(CONCRETE, 0.1),
    ),
  );

  //scaffolding: poles, a board to stand on, a rail to hold
  for (var px = s.x0 + 1; px < s.x1; px += 7.5)
    b.push(box(px, px + 0.4, s.front - 3.4, s.front - 3, z, top, METAL));
  b.push(box(s.x0, s.x1, s.front - 3.6, s.front - 1, z + 0.5, z + 1, WOOD));
  b.push(box(s.x0, s.x1, s.front - 3.5, s.front - 3.1, z + 5, z + 5.4, METAL));
}

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
  parking: parking,
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
    hedge(b, cx + 1, cx + 31, 1, 3.5, 1, 3);
    spots.sort(function () {
      return rnd() - 0.5;
    });
    for (i = 0; i < n; i++)
      tree(b, cx + spots[i][0], spots[i][1], 3 + Math.floor(rnd() * 2));
    bench(b, cx + 12, 27);
  },
};

//which windows have balconies, front and back: every pairing of them
var DETAILS = [];

SECTION.balconies.forEach(function (f, front) {
  SECTION.balconies.forEach(function (k, back) {
    DETAILS.push("" + front + back);
  });
});

var flats = blocks({
  name: "flats",
  palettes: PALETTES,
  shape: SECTION,
  details: DETAILS,
  //roofs and yards are painted from a seed of their own each
  roofs: 2,
  yards: YARDS,
  yardVariants: 2,
  ground: groundStorey,
  upper: upperStorey,
  roof: roof,
  frame: frame,
  finish: MATTE,
});

export var describe = flats.describe,
  paint = flats.paint,
  partBoxes = flats.partBoxes,
  PARTS = flats.PARTS;

export { STOREY };
