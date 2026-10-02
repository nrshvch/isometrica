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
 *
 * Nothing of it is quite flat colour: its glass has the sky in it, and
 * everything else a faint grain (blocks MATTE, GLASSY).
 */
import * as iso from "./isobox.js";
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
  MATTE,
  GLASSY,
  madeOf,
  METAL,
  VENT,
} from "./blocks.js";

var CONCRETE = madeOf([168, 166, 160], "concrete"),
  STEEL = [70, 84, 104],
  STONE = madeOf([200, 196, 186], "slabs"),
  WATER = [96, 160, 210],
  PLANTER = [140, 132, 122],
  FAN = [60, 62, 66],
  BRONZE = [150, 116, 70];

//what a block is built of: its panes, the frames and spandrels between them,
//its plinth, its canopy and sign, and its roof
var PALETTES = {
  azure: {
    glass: [58, 140, 222],
    frame: [214, 222, 232],
    spandrel: [32, 72, 140],
    plinth: [88, 96, 112],
    accent: [244, 246, 250],
    roof: [132, 138, 150],
  },
  teal: {
    glass: [36, 172, 172],
    frame: [226, 232, 228],
    spandrel: [20, 98, 106],
    plinth: [92, 106, 104],
    accent: [252, 196, 40],
    roof: [124, 138, 136],
  },
  bronze: {
    glass: [186, 132, 70],
    frame: [64, 54, 50],
    spandrel: [122, 76, 40],
    plinth: [82, 72, 68],
    accent: [232, 80, 44],
    roof: [128, 116, 108],
  },
  emerald: {
    glass: [44, 168, 104],
    frame: [232, 236, 230],
    spandrel: [18, 96, 64],
    plinth: [86, 100, 92],
    accent: [244, 108, 160],
    roof: [124, 136, 128],
  },
};

//what a billboard's picture is painted in: strong colours, to be seen
var INKS = [
  [232, 56, 64],
  [252, 188, 32],
  [36, 136, 232],
  [40, 176, 96],
  [236, 104, 188],
  [250, 132, 36],
];

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

  b.push(box(s.x0, s.x1, s.front, s.back, z0, z1, glass, GLASSY));

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
      GLASSY,
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
 * A billboard on the roof at z, across the front of the section: a picture
 * on a panel in a frame, up on legs, lit by a lamp at either end. The
 * picture, a pixel to a cell, is one of a few for the variant's seed: a sun
 * going down over the sea, a brand's round logo by its name, or bold
 * stripes.
 */
function billboard(b, s, z, pal, rnd) {
  var w = Math.min(20, s.x1 - s.x0 - 4),
    h = 9,
    x0 = Math.round(s.mid - w / 2),
    face = s.front + 2.5,
    z0 = z + 4.5,
    inks = INKS.slice().sort(function () {
      return rnd() - 0.5;
    }),
    design = Math.floor(rnd() * 3),
    i,
    j;

  //the legs behind it, the panel, the frame round it
  [x0 + 3, x0 + w - 4].forEach(function (x) {
    b.push(box(x, x + 1, face + 0.6, face + 1.6, z, z0, METAL));
    b.push(box(x, x + 1, face + 1.6, face + 5, z, z + 1, METAL));
  });
  b.push(box(x0, x0 + w, face, face + 0.6, z0, z0 + h, pal.frame));
  b.push(
    box(
      x0 - 0.5,
      x0 + w + 0.5,
      face - 0.2,
      face + 0.6,
      z0 - 0.5,
      z0,
      darker(pal.frame, 0.3),
    ),
  );
  b.push(
    box(
      x0 - 0.5,
      x0 + w + 0.5,
      face - 0.2,
      face + 0.6,
      z0 + h,
      z0 + h + 0.5,
      darker(pal.frame, 0.3),
    ),
  );
  b.push(
    box(
      x0 - 0.5,
      x0,
      face - 0.2,
      face + 0.6,
      z0,
      z0 + h,
      darker(pal.frame, 0.3),
    ),
  );
  b.push(
    box(
      x0 + w,
      x0 + w + 0.5,
      face - 0.2,
      face + 0.6,
      z0,
      z0 + h,
      darker(pal.frame, 0.3),
    ),
  );

  //the lamps over it, on arms
  [x0 + 2, x0 + w - 3].forEach(function (x) {
    b.push(
      box(
        x + 0.3,
        x + 0.7,
        face - 1.5,
        face,
        z0 + h + 0.5,
        z0 + h + 0.9,
        METAL,
      ),
    );
    b.push(
      box(x, x + 1, face - 2, face - 1.2, z0 + h, z0 + h + 1, [250, 240, 200]),
    );
  });

  function ink(u, v) {
    var aspect = w / h,
      du,
      dv;

    if (design === 0) {
      //the sun going down over the sea
      du = (u - 0.5) * aspect;
      dv = v - 0.38;
      if (v < 0.3)
        return Math.floor(v * h + u * w) % 3 === 0
          ? [96, 168, 232]
          : [32, 88, 168];
      if (du * du + dv * dv < 0.12) return [255, 236, 120];
      return iso.mix([250, 120, 60], [252, 196, 96], (v - 0.3) / 0.7);
    }

    if (design === 1) {
      //a round logo by the name, on white
      du = (u - 0.2) * aspect;
      dv = v - 0.5;
      if (du * du + dv * dv < 0.14)
        return du * du + dv * dv < 0.035 ? [250, 250, 250] : inks[0];
      if (u > 0.42 && u < 0.92 && v > 0.55 && v < 0.75) return [40, 44, 56];
      if (u > 0.42 && u < 0.78 && v > 0.28 && v < 0.42) return inks[1];
      return [246, 246, 240];
    }

    //bold stripes across it
    return inks[Math.floor((u * w + v * h * 1.5) / 3) % 3];
  }

  for (i = 0; i < w; i++)
    for (j = 0; j < h; j++)
      b.push(
        box(
          x0 + i,
          x0 + i + 1,
          face - 0.15,
          face,
          z0 + j,
          z0 + j + 1,
          ink((i + 0.5) / w, (j + 0.5) / h),
        ),
      );
}

/**
 * The roof on top of a section at z: its parapet, which runs round the edge
 * of the whole roof as the flats' does, the lift's machine room at the back,
 * and on the rest of it air conditioning units (variant 0), a telecom mast
 * and a dish (1), or a billboard (2).
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

  if (variant === 2) billboard(b, s, z, pal, rnd);
  else if (variant === 0) {
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
  //which is which is the variant: air conditioning, a telecom mast, or a
  //billboard
  roofs: 3,
  yards: YARDS,
  yardVariants: 2,
  ground: groundStorey,
  upper: upperStorey,
  roof: roof,
  frame: frame,
  finish: MATTE,
  roofsMadeOf: "felt",
});

export var describe = offices.describe,
  paint = offices.paint,
  partBoxes = offices.partBoxes,
  PARTS = offices.PARTS;

export { STOREY };
