/**
 * Office blocks, put together out of parts the way shared/gen/blocks puts
 * every block together - the same sections as the flats, a little deeper,
 * and all glass:
 *
 *   - ground: the lobby on its plinth, glass all round, with a wide way in
 *     under a canopy and the company's sign over it;
 *   - upper: a storey of curtain wall - a grid of glass panes, or ribbons of
 *     glass between bands of spandrel - with no balconies;
 *   - roof: a flat roof behind its parapet, with the lift's machine room and
 *     either a row of air conditioning units or a telecom mast;
 *   - frame: a storey going up - a steel frame on a concrete floor round the
 *     lift shaft, poured first;
 *
 * and in front of it, a yard tile: a car park, or a plaza with a fountain or
 * a sculpture among planted trees.
 */
import {
  blocks,
  box,
  darker,
  lighter,
  ends,
  pick,
  tree,
  bench,
  parking,
  STOREY,
  PLINTH,
  METAL,
  VENT,
} from "./blocks.js";

var CONCRETE = [168, 166, 160],
  STEEL = [70, 84, 104],
  STONE = [200, 196, 186],
  WATER = [96, 160, 210],
  PLANTER = [140, 132, 122],
  FAN = [60, 62, 66],
  BRONZE = [150, 116, 70];

//what a block is built of: its panes, the frames and spandrels between them,
//its plinth, its canopy and sign, and its roof
var PALETTES = {
  azure: {
    glass: [92, 146, 196],
    frame: [200, 206, 214],
    spandrel: [62, 84, 112],
    plinth: [96, 100, 108],
    accent: [232, 234, 238],
    roof: [132, 136, 142],
  },
  teal: {
    glass: [84, 158, 160],
    frame: [214, 218, 216],
    spandrel: [46, 92, 98],
    plinth: [104, 108, 106],
    accent: [238, 196, 72],
    roof: [128, 134, 132],
  },
  bronze: {
    glass: [146, 128, 104],
    frame: [72, 68, 66],
    spandrel: [94, 78, 64],
    plinth: [86, 82, 80],
    accent: [210, 90, 60],
    roof: [120, 116, 112],
  },
};

//a little deeper than the flats, and nearer the street
var SECTION = {
  front: 9,
  depth: 20,
  inset: 2,
};

/**
 * Glass round a section from z0 to z1: the box of it, and the mullions
 * every `step` along its long sides and across its ends, standing out of
 * the glass.
 */
function curtain(b, s, z0, z1, glass, frame, step) {
  var x;

  b.push(box(s.x0, s.x1, s.front, s.back, z0, z1, glass));

  for (x = s.cell + step / 2; x < s.cell + 32; x += step) {
    if (x < s.x0 || x + 0.5 > s.x1) continue;

    b.push(box(x, x + 0.5, s.front - 0.3, s.front, z0, z1, frame));
    b.push(box(x, x + 0.5, s.back, s.back + 0.3, z0, z1, frame));
  }

  [s.start && s.x0 - 0.3, s.end && s.x1].forEach(function (ex) {
    if (ex === false) return;

    for (var y = s.front + step / 2; y < s.back; y += step)
      b.push(box(ex, ex + 0.3, y, y + 0.5, z0, z1, frame));
  });
}

/**
 * A band round a section from z0 to z1, standing a little out of the glass.
 */
function band(b, s, z0, z1, color) {
  var x = ends(s, 0.3);

  b.push(box(x[0], x[1], s.front - 0.3, s.back + 0.3, z0, z1, color));
}

//the lobby: glass all round on a plinth, the wide way in under a canopy at
//the front, the sign on the canopy
function groundStorey(b, s, pal) {
  var x = ends(s, 0.3),
    top = PLINTH + STOREY;

  b.push(box(x[0], x[1], s.front - 0.3, s.back + 0.3, 1, PLINTH, pal.plinth));
  curtain(b, s, PLINTH, top - 2, lighter(pal.glass, 0.15), pal.frame, 4);
  band(b, s, top - 2, top, pal.frame);

  //steps up to the doors, the doors, the canopy and the sign
  b.push(box(s.mid - 7, s.mid + 7, s.front - 3, s.front, 1, 2, pal.plinth));
  b.push(
    box(
      s.mid - 6,
      s.mid + 6,
      s.front - 0.5,
      s.front,
      PLINTH,
      PLINTH + 7,
      darker(pal.glass, 0.3),
    ),
  );
  b.push(
    box(
      s.mid - 0.3,
      s.mid + 0.3,
      s.front - 0.7,
      s.front,
      PLINTH,
      PLINTH + 7,
      pal.frame,
    ),
  );
  b.push(
    box(
      s.mid - 7,
      s.mid + 7,
      s.front - 5,
      s.front,
      PLINTH + 7.5,
      PLINTH + 8.5,
      pal.frame,
    ),
  );
  b.push(
    box(
      s.mid - 5,
      s.mid + 5,
      s.front - 5.2,
      s.front - 4.8,
      PLINTH + 8.5,
      PLINTH + 10,
      pal.accent,
    ),
  );
}

/**
 * A storey of curtain wall from z, its floor behind a band of spandrel.
 *
 * @param detail {string} "grid": panes a storey high between mullions close
 *        together; "ribbon": a ribbon of glass along the storey between deep
 *        bands, the mullions far apart
 */
function upperStorey(b, s, z, pal, detail) {
  if (detail === "ribbon") {
    curtain(b, s, z, z + STOREY, pal.glass, pal.frame, 8);
    band(b, s, z, z + 4, pal.spandrel);
  } else {
    curtain(b, s, z, z + STOREY, pal.glass, pal.frame, 4);
    band(b, s, z, z + 1.5, pal.spandrel);
  }
}

/**
 * A unit of air conditioning at x, y on the roof at z: a box with its fan
 * on top.
 */
function airConditioner(b, x, y, z) {
  b.push(box(x, x + 5, y, y + 4, z, z + 3, VENT));
  b.push(box(x + 1, x + 4, y + 0.5, y + 3.5, z + 3, z + 3.3, FAN));
}

/**
 * The roof on top of a section at z: its parapet, which runs round the edge
 * of the whole roof as the flats' does, the lift's machine room at the back,
 * and on the rest of it either air conditioning units (variant 0) or a
 * telecom mast and a dish (1).
 */
function roof(b, s, z, pal, rnd, variant) {
  var x0 = s.x0 + 3,
    x1 = s.x1 - 3,
    n,
    i;

  b.push(box(s.x0, s.x1, s.front, s.back, z, z + 0.4, pal.roof));
  b.push(box(s.x0, s.x1, s.front, s.front + 1, z, z + 2, pal.frame));
  b.push(box(s.x0, s.x1, s.back - 1, s.back, z, z + 2, pal.frame));
  if (s.start)
    b.push(box(s.x0, s.x0 + 1, s.front, s.back, z, z + 2, pal.frame));
  if (s.end) b.push(box(s.x1 - 1, s.x1, s.front, s.back, z, z + 2, pal.frame));

  b.push(
    box(s.mid - 4, s.mid + 4, s.back - 8, s.back - 2, z, z + 5, pal.plinth),
  );
  b.push(
    box(
      s.mid - 4.3,
      s.mid + 4.3,
      s.back - 8.3,
      s.back - 1.7,
      z + 5,
      z + 5.6,
      pal.frame,
    ),
  );

  if (variant === 0) {
    n = 2 + Math.floor(rnd() * 2);
    for (i = 0; i < n; i++)
      airConditioner(
        b,
        x0 + Math.floor(rnd() * Math.max(1, x1 - x0 - 5)),
        s.front + 2 + (i % 2) * 5,
        z + 0.4,
      );
  } else {
    var mx = pick(rnd, [x0 + 2, x1 - 3]),
      my = s.front + 5;

    //the mast, its antennas near the top, and a dish beside it
    b.push(box(mx - 1.5, mx + 1.5, my - 1.5, my + 1.5, z, z + 1, CONCRETE));
    b.push(box(mx - 0.4, mx + 0.4, my - 0.4, my + 0.4, z + 1, z + 22, METAL));
    [
      [-1.4, -0.4, -0.6, 0.6],
      [0.4, 1.4, -0.6, 0.6],
      [-0.6, 0.6, -1.4, -0.4],
    ].forEach(function (a) {
      b.push(
        box(
          mx + a[0],
          mx + a[1],
          my + a[2],
          my + a[3],
          z + 15,
          z + 20,
          lighter(VENT, 0.3),
        ),
      );
    });
    var dx = mx < s.mid ? mx + 6 : mx - 9;
    b.push(box(dx + 1, dx + 2, my + 1, my + 2, z, z + 3, METAL));
    b.push(box(dx, dx + 3, my, my + 0.6, z + 2, z + 5, lighter(VENT, 0.4)));
  }
}

/**
 * A storey going up, from its floor at z: the concrete floor, steel columns
 * along the front and back and up the ends, the beams along the top that
 * will carry the next floor, and the lift shaft in the middle at the back,
 * poured first.
 */
function frame(b, s, z) {
  var x = ends(s, 0.3),
    top = z + STOREY,
    cx;

  b.push(
    box(x[0], x[1], s.front - 0.3, s.back + 0.3, z - 0.5, z + 0.5, CONCRETE),
  );

  for (cx = s.cell; cx <= s.cell + 32; cx += 8) {
    var c = Math.min(Math.max(cx, s.x0), s.x1 - 0.8);

    //the column where two sections meet is the second one's
    if (cx === s.cell + 32 && !s.end) continue;

    [s.front, s.back - 0.8].forEach(function (cy) {
      b.push(box(c, c + 0.8, cy, cy + 0.8, z + 0.5, top, STEEL));
    });
  }

  b.push(box(s.x0, s.x1, s.front, s.front + 0.8, top - 1, top, STEEL));
  b.push(box(s.x0, s.x1, s.back - 0.8, s.back, top - 1, top, STEEL));
  if (s.start)
    b.push(box(s.x0, s.x0 + 0.8, s.front, s.back, top - 1, top, STEEL));
  if (s.end)
    b.push(box(s.x1 - 0.8, s.x1, s.front, s.back, top - 1, top, STEEL));

  b.push(
    box(
      s.mid - 4,
      s.mid + 4,
      s.back - 8,
      s.back - 2,
      z + 0.5,
      top + 1,
      darker(CONCRETE, 0.1),
    ),
  );
}

/**
 * A planter with a young tree in it, at x, y.
 */
function planter(b, x, y) {
  b.push(box(x - 3, x + 3, y - 3, y + 3, 1, 3, PLANTER));
  tree(b, x, y, 3);
}

var YARDS = {
  parking: parking,
  //paved in squares, planters round the edge, and in the middle a fountain
  //or a sculpture
  plaza: function (b, cx, rnd) {
    var i;

    b.push(box(cx + 1, cx + 31, 1, 31, 1, 1.2, STONE));
    for (i = 1; i < 4; i++) {
      b.push(
        box(
          cx + 1,
          cx + 31,
          i * 8 - 0.2,
          i * 8 + 0.2,
          1.2,
          1.25,
          darker(STONE, 0.12),
        ),
      );
      b.push(
        box(
          cx + i * 8 - 0.2,
          cx + i * 8 + 0.2,
          1,
          31,
          1.2,
          1.25,
          darker(STONE, 0.12),
        ),
      );
    }

    planter(b, cx + 5, 5);
    planter(b, cx + 27, 27);
    bench(b, cx + 21, 4);
    bench(b, cx + 4, 26);

    if (rnd() < 0.5) {
      //a fountain: a basin, the water in it, a spout
      b.push(box(cx + 10, cx + 22, 10, 22, 1.2, 3, STONE));
      b.push(box(cx + 11, cx + 21, 11, 21, 1.2, 2.6, WATER));
      b.push(box(cx + 15, cx + 17, 15, 17, 2.6, 6, STONE));
      b.push(box(cx + 15.5, cx + 16.5, 15.5, 16.5, 6, 8, lighter(WATER, 0.4)));
    } else {
      //a sculpture on a plinth
      b.push(box(cx + 13, cx + 19, 13, 19, 1.2, 4, STONE));
      b.push(box(cx + 14.5, cx + 16, 14.5, 16, 4, 13, BRONZE));
      b.push(box(cx + 16, cx + 17.5, 15.5, 17, 4, 9, darker(BRONZE, 0.15)));
      b.push(box(cx + 14, cx + 18, 15, 16, 11, 12, BRONZE));
    }
  },
};

var offices = blocks({
  name: "offices",
  palettes: PALETTES,
  shape: SECTION,
  details: ["grid", "ribbon"],
  //which is which is the variant: air conditioning, or a telecom mast
  roofs: 2,
  yards: YARDS,
  yardVariants: 2,
  ground: groundStorey,
  upper: upperStorey,
  roof: roof,
  frame: frame,
});

export var describe = offices.describe,
  paint = offices.paint,
  model = offices.model,
  PARTS = offices.PARTS;

export { STOREY };
