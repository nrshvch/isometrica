/**
 * What is done to the world, drawn isometric (lab/directions): the same
 * samples as the turned ones (art.js), but on the game's own grid - two
 * across for one up, the faces that look up, to the left and to the right -
 * as stickers the same way: outlined in ink, the light from the top left,
 * so the left faces lit, the right ones in shade and the tops between.
 *
 * Drawn in the world's units with a few helpers - a point, a box, a circle
 * lying in a plane - and fitted to the 64 artboard; rendered as the colour
 * ones are (render.js).
 */
import { C, plusBadge } from "./art.js";

//a point in the world, on the screen: +x up to the right, +y up to the
//left, z straight up
function P(x, y, z) {
  return [x - y, -(x + y) / 2 - (z || 0)];
}

//points round a circle about c, radius r, across the axis given
function ring(axis, c, r, n) {
  var out = [];

  for (var i = 0; i < (n || 28); i++) {
    var t = (i / (n || 28)) * Math.PI * 2,
      u = Math.cos(t) * r,
      v = Math.sin(t) * r;

    out.push(
      axis === "z"
        ? P(c[0] + u, c[1] + v, c[2])
        : axis === "x"
          ? P(c[0], c[1] + u, c[2] + v)
          : P(c[0] + u, c[1], c[2] + v),
    );
  }

  return out;
}

//a round thing - a bush, a ball - about a point in the world, round on the
//screen whichever way it is seen
function blob(c, r, n) {
  var o = P(c[0], c[1], c[2]),
    out = [];

  for (var i = 0; i < (n || 28); i++) {
    var t = (i / (n || 28)) * Math.PI * 2;

    out.push([o[0] + Math.cos(t) * r, o[1] + Math.sin(t) * r]);
  }

  return out;
}

/**
 * A drawing in the world: layers of pieces, tones, lines and marks, as
 * screen points until it is fitted (done).
 */
function Scene() {
  this.layers = [];
  this.layer();
}

Scene.prototype.layer = function () {
  this.at = { pieces: [], shade: [], lines: [], marks: [] };
  this.layers.push(this.at);

  return this;
};

Scene.prototype.piece = function (points, fill, flag) {
  this.at.pieces.push([points, fill, flag]);

  return this;
};

Scene.prototype.shade = function (points, fill) {
  this.at.shade.push([points, fill]);

  return this;
};

//a line through the points, its width on the artboard
Scene.prototype.line = function (points, width, colour, dash, open) {
  this.at.lines.push([points, width, colour, dash, open !== false]);

  return this;
};

Scene.prototype.mark = function (points, fill) {
  this.at.marks.push([points, fill]);

  return this;
};

/**
 * A box: its top, its face to the left (x0) and its face to the right
 * (y0), coloured as asked - the top and the left lit, the right in shade.
 */
Scene.prototype.box = function (x0, x1, y0, y1, z0, z1, top, left, right) {
  this.piece(
    [P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)],
    left,
  );
  this.piece(
    [P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)],
    right,
  );
  this.piece([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], top);

  return this;
};

function n(v) {
  return Math.round(v * 100) / 100;
}

/**
 * The drawing fitted to the artboard's 56 by 56 middle, its points as
 * paths - and whatever goes over it, already on the artboard, after.
 */
Scene.prototype.done = function (after) {
  var all = [];

  this.layers.forEach(function (l) {
    l.pieces.forEach(function (p) {
      all = all.concat(p[0]);
    });
  });

  var xs = all.map(function (p) {
      return p[0];
    }),
    ys = all.map(function (p) {
      return p[1];
    }),
    x0 = Math.min.apply(null, xs),
    x1 = Math.max.apply(null, xs),
    y0 = Math.min.apply(null, ys),
    y1 = Math.max.apply(null, ys),
    s = Math.min(54 / (x1 - x0), 54 / (y1 - y0)),
    cx = (x0 + x1) / 2,
    cy = (y0 + y1) / 2;

  function d(points, open) {
    return (
      "M" +
      points
        .map(function (p) {
          return n(32 + (p[0] - cx) * s) + " " + n(32 + (p[1] - cy) * s);
        })
        .join("L") +
      (open ? "" : "Z")
    );
  }

  return this.layers
    .map(function (l) {
      return {
        pieces: l.pieces.map(function (p) {
          return [d(p[0]), p[1], p[2]];
        }),
        shade: l.shade.map(function (p) {
          return [d(p[0]), p[1]];
        }),
        lines: l.lines.map(function (p) {
          return [d(p[0], p[4]), p[1], p[2], p[3]];
        }),
        marks: l.marks.map(function (p) {
          return [d(p[0]), p[1]];
        }),
      };
    })
    .concat(after || []);
};

/* --- the samples ------------------------------------------------------- */

function house() {
  var s = new Scene(),
    L = 10,
    W = 7,
    wall = 6,
    ridge = 10.4,
    //how high the roof is that far across, from the front eave
    roof = function (y) {
      return 5.4 + ((y + 0.9) / (W / 2 + 0.9)) * (ridge - 5.4);
    };

  s.piece([P(0, 0, 0), P(L, 0, 0), P(L, 0, wall), P(0, 0, wall)], C.creamDark);
  s.piece(
    [P(0, 0, 0), P(0, W, 0), P(0, W, wall), P(0, W / 2, ridge), P(0, 0, wall)],
    C.cream,
  );
  s.piece(
    [P(0, 2.6, 0), P(0, 4.4, 0), P(0, 4.4, 3.6), P(0, 2.6, 3.6)],
    C.brown,
    "hole",
  );
  s.piece(ring("x", [0, W / 2, 7.3], 0.9), C.glass, "hole");
  [1.4, 6.2].forEach(function (x) {
    s.piece(
      [P(x, 0, 2.2), P(x + 1.9, 0, 2.2), P(x + 1.9, 0, 4.4), P(x, 0, 4.4)],
      C.glass,
      "hole",
    );
  });
  s.piece(
    [
      P(-0.7, -0.9, 5.4),
      P(L + 0.7, -0.9, 5.4),
      P(L + 0.7, W / 2, ridge),
      P(-0.7, W / 2, ridge),
    ],
    C.red,
  );
  s.shade(
    [
      P(-0.7, -0.9, 5.4),
      P(L + 0.7, -0.9, 5.4),
      P(L + 0.7, -0.2, 6.2),
      P(-0.7, -0.2, 6.2),
    ],
    C.redDark,
  );
  s.shade(
    [
      P(-0.7, 2.9, 9.7),
      P(L + 0.7, 2.9, 9.7),
      P(L + 0.7, W / 2, ridge),
      P(-0.7, W / 2, ridge),
    ],
    C.redLight,
  );
  //the roof's edge over the gable
  s.piece(
    [
      P(-0.7, -0.9, 5.4),
      P(-0.7, W / 2, ridge),
      P(-0.7, W + 0.9, 5.4),
      P(-0.7, W + 0.9, 4.5),
      P(-0.7, W / 2, ridge - 0.9),
      P(-0.7, -0.9, 4.5),
    ],
    C.redDark,
  );

  //a chimney through the roof
  var cx0 = 6.6,
    cx1 = 8.1,
    cy0 = 0.9,
    cy1 = 2.4,
    top = 11.8;

  s.piece(
    [
      P(cx0, cy0, roof(cy0)),
      P(cx0, cy1, roof(cy1)),
      P(cx0, cy1, top),
      P(cx0, cy0, top),
    ],
    "#c87556",
  );
  s.piece(
    [
      P(cx0, cy0, roof(cy0)),
      P(cx1, cy0, roof(cy0)),
      P(cx1, cy0, top),
      P(cx0, cy0, top),
    ],
    "#a35a3e",
  );
  s.piece(
    [P(cx0, cy0, top), P(cx1, cy0, top), P(cx1, cy1, top), P(cx0, cy1, top)],
    "#7a4430",
  );

  return s.done([plusBadge()]);
}

//a slab of ground, its top and its sides to the left and right
function slab(s, size, h) {
  s.piece([P(0, 0, 0), P(0, size, 0), P(0, size, h), P(0, 0, h)], C.dirt);
  s.piece([P(0, 0, 0), P(size, 0, 0), P(size, 0, h), P(0, 0, h)], C.dirtDark);
  s.piece(
    [P(0, 0, h), P(size, 0, h), P(size, size, h), P(0, size, h)],
    C.grass,
  );
  s.shade(
    [
      P(0, 0, h),
      P(size, 0, h),
      P(size, 0.7, h),
      P(0.7, 0.7, h),
      P(0.7, size, h),
      P(0, size, h),
    ],
    C.grassLight,
  );
}

function road() {
  var s = new Scene(),
    T = 10,
    h = 2.2,
    a = 2.6,
    b = 7.4;

  slab(s, T, h);

  //straight across, along x: in at the left face, its middle line dashed
  s.piece([P(0, a, h), P(T, a, h), P(T, b, h), P(0, b, h)], C.asphalt);
  s.piece([P(0, a, 0), P(0, b, 0), P(0, b, h), P(0, a, h)], C.asphaltDark);
  s.shade(
    [P(0, a, h), P(T, a, h), P(T, a + 0.5, h), P(0, a + 0.5, h)],
    C.asphaltDark,
  );
  s.line([P(0.4, T / 2, h), P(T - 0.2, T / 2, h)], 2.4, C.line, "4.5 3.6");
  s.layer();
  s.piece(blob([8.6, 1.2, h + 1.6], 2), C.grassDark);
  s.shade(blob([8.1, 1.7, h + 2], 0.9), C.grass);

  return s.done();
}

function bulldozer() {
  var s = new Scene();

  //the tracks, low and long, their wheels showing on the right
  s.box(0, 11, 0, 6, 0, 2.2, "#4b5262", C.track, "#2f3441");
  [1.4, 3.9, 6.4, 8.9].forEach(function (x) {
    s.mark(ring("y", [x + 0.4, 0, 1.1], 0.55), C.steel);
  });
  //the cab at the back, then the engine in front of it
  s.box(
    6.6,
    10.6,
    0.6,
    5.4,
    2.2,
    8.4,
    C.machineLight,
    C.machine,
    C.machineDark,
  );
  s.piece(
    [P(6.6, 1.6, 5.4), P(6.6, 4.4, 5.4), P(6.6, 4.4, 7.6), P(6.6, 1.6, 7.6)],
    C.glass,
    "hole",
  );
  s.box(1, 6.6, 0.6, 5.4, 2.2, 4.6, C.machineLight, C.machine, C.machineDark);
  s.box(2.6, 3.2, 3.6, 4.2, 4.6, 6.8, C.steelLight, C.steelDark, C.steelDark);
  //and the blade before it all
  s.box(-2.2, -1, -0.8, 6.8, 0, 3.8, C.steelLight, C.steel, C.steelDark);

  return s.done();
}

function land() {
  var s = new Scene(),
    T = 12,
    h = 1.8;

  slab(s, T, h);
  s.line(
    [P(1.5, 1.5, h), P(10.5, 1.5, h), P(10.5, 10.5, h), P(1.5, 10.5, h)],
    2,
    C.white,
    "3.6 3",
    false,
  );
  s.layer();
  s.box(7, 7.7, 5.5, 6.2, h, 9, C.woodLight, C.wood, C.woodDark);
  s.box(3.4, 10.6, 5, 5.5, 5, 10.8, C.wood, C.woodLight, C.woodLight);

  //the dollar on the board: an S of two loops, and its bar
  var sCurve = [],
    cu = 7,
    cv = 7.9,
    r = 1.05;

  for (var k = 0; k <= 16; k++) {
    var t = -0.35 + ((Math.PI * 1.5 + 0.35) * k) / 16;

    sCurve.push(P(cu + Math.cos(t) * r, 5, cv + r + Math.sin(t) * r));
  }
  for (k = 1; k <= 16; k++) {
    t = Math.PI / 2 - ((Math.PI * 1.5 + 0.35) * k) / 16;
    sCurve.push(P(cu + Math.cos(t) * r, 5, cv - r + Math.sin(t) * r));
  }

  s.line(sCurve, 2.4, "#2f7d32");
  s.line([P(cu, 5, cv - 2.5 * r), P(cu, 5, cv + 2.5 * r)], 1.8, "#2f7d32");

  return s.done();
}

function found() {
  var s = new Scene(),
    T = 10,
    h = 1.6,
    mound = [],
    k;

  slab(s, T, h);

  //a mound in the middle: the front of its foot, and over the top of it
  for (k = 0; k <= 20; k++) {
    var t = (3 * Math.PI) / 4 + (Math.PI * k) / 20;

    mound.push(P(5 + Math.cos(t) * 3.6, 5 + Math.sin(t) * 3.6, h));
  }
  for (k = 0; k <= 20; k++) {
    t = -Math.PI / 4 + (Math.PI * k) / 20;
    mound.push(
      P(
        5 + Math.cos(t) * 3.6,
        5 + Math.sin(t) * 3.6,
        h + 2.2 * Math.sin((Math.PI * k) / 20) + 1.2,
      ),
    );
  }

  s.piece(mound, C.dirt);
  s.layer();
  s.box(
    4.75,
    5.25,
    4.75,
    5.25,
    h + 2,
    12,
    C.steelLight,
    C.steelDark,
    C.steelDark,
  );
  s.piece(blob([5, 5, 12.5], 0.75), C.gold);

  //the flag, waving out to the right
  var flag = [],
    under = [];

  for (k = 0; k <= 12; k++) {
    var x = 5.25 + (5.2 * k) / 12,
      w = Math.sin((k / 12) * Math.PI * 1.6) * 0.5;

    flag.push(P(x, 5, 11.8 + w));
    under.push(P(x, 5, 8.4 + w - 0.15 * k * 0.1));
  }

  s.piece(flag.concat(under.reverse()), C.red);

  return s.done();
}

export var ISO = {
  build: house(),
  road: road(),
  clear: bulldozer(),
  land: land(),
  found: found(),
};
