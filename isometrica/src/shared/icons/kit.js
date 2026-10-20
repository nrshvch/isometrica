/**
 * The games' icon kit: every icon they show - their buttons over the
 * world, what a road is laid in and which ways it goes (client/buildman), a
 * menu's, the screens' - drawn on a 24 by 24 grid in one colour,
 * currentColor, to be used like any icon set and coloured, outlined and
 * lit by the page that shows it.
 *
 * Two kinds of icon, one look:
 *
 * - what stands in the world - a house, a road, a plot of land, the
 *   bulldozer, a die, a stack of coins - is drawn the way the game draws
 *   the world, from the side, two across for one up (draw.js iso): built
 *   out of boxes and faces, fitted to the grid's margin, its faces apart by
 *   a gap and its details - windows, markings, pips - cut out of them;
 * - what is only a sign - close, done, the menu, the sound, the clock - is
 *   drawn flat on the grid, lines 2 to 2.5 wide, square-ended, corners
 *   mitred rather than rounded.
 *
 * Drawn here, in the page or not: the lab shows them as they are drawn
 * (lab/icons), and tools/genicons.mjs writes them out - an SVG to an icon,
 * and index.js, every icon's path, for a game to show them without drawing
 * them (city-sim ui/kit Icon).
 */
import { Drawing, SIZE, arc, iso, rect, stroke } from "./draw.js";

export { SIZE };

//points in the world, as the game sees them
function at(points) {
  return points.map(function (p) {
    return iso(p[0], p[1], p[2] || 0);
  });
}

//a circle in the world, about c, radius r, on the plane across the axis
//given - "z" for one lying on the ground
function circle(axis, c, r, a0, a1, n) {
  return arc(0, 0, r, r, a0, a1, n || 40).map(function (p) {
    var u = p[0],
      v = -p[1];

    return axis === "z"
      ? iso(c[0] + u, c[1] + v, c[2])
      : axis === "x"
        ? iso(c[0], c[1] + u, c[2] + v)
        : iso(c[0] + u, c[1], c[2] + v);
  });
}

//a rectangle on a plane across an axis, u and v along it - for a window
function pane(axis, at0, u0, u1, v0, v1) {
  var corners = [
    [u0, v0],
    [u1, v0],
    [u1, v1],
    [u0, v1],
  ];

  return corners.map(function (c) {
    return axis === "x"
      ? iso(at0, c[0], c[1])
      : axis === "y"
        ? iso(c[0], at0, c[1])
        : iso(c[0], c[1], at0);
  });
}

/**
 * A dollar sign, its middle at u, v on a plane - the plane's points made by
 * place(u, v) - h tall, as the outline of its strokes: an S of two loops,
 * and the bar showing above and below it.
 */
function dollar(place, cu, cv, h, w) {
  var r = h / 4.6,
    top = arc(cu, cv + r, r, r, -0.35, Math.PI * 1.5, 28),
    bottom = arc(cu, cv - r, r, r, Math.PI / 2, -Math.PI - 0.35, 28),
    s = top.concat(bottom.slice(1)).map(function (p) {
      return place(p[0], p[1]);
    });

  return [
    stroke(s, w, "butt"),
    stroke(
      [place(cu, cv + 2 * r + w * 0.2), place(cu, cv + h / 2)],
      w * 0.9,
      "butt",
    ),
    stroke(
      [place(cu, cv - 2 * r - w * 0.2), place(cu, cv - h / 2)],
      w * 0.9,
      "butt",
    ),
  ];
}

/* --- in the world ------------------------------------------------------ */

/**
 * A cottage: walls, a gabled roof down the length of it, a door and a round
 * window in the gable end, windows of two panes along the side, a chimney.
 * At dx, dy, scaled by k - for a smaller one beside something else.
 */
function cottage(d, dx, dy, k) {
  dx = dx || 0;
  dy = dy || 0;
  k = k || 1;

  function P(x, y, z) {
    return iso(dx + x * k, dy + y * k, z * k);
  }

  var L = 10,
    W = 7,
    wall = 6,
    ridge = 10.2,
    gable = d.face([
      P(0, 0, 0),
      P(0, W, 0),
      P(0, W, wall),
      P(0, W / 2, ridge),
      P(0, 0, wall),
    ]),
    side = d.face([P(0, 0, 0), P(L, 0, 0), P(L, 0, wall), P(0, 0, wall)]),
    roof = d.face([
      P(0, 0, wall),
      P(L, 0, wall),
      P(L, W / 2, ridge),
      P(0, W / 2, ridge),
    ]);

  //the door, and the round window over it
  d.hole(gable, [P(0, 2.6, 0), P(0, 4.4, 0), P(0, 4.4, 3.6), P(0, 2.6, 3.6)]);
  if (k >= 1)
    d.hole(
      gable,
      arc(0, 0, 0.8, 0.8).map(function (p) {
        return P(0, W / 2 + p[0], 7.4 - p[1]);
      }),
    );

  //the windows along the side, two panes each
  [1.4, 6.4].forEach(function (x) {
    [0, 1.15].forEach(function (pane0) {
      d.hole(side, [
        P(x + pane0, 0, 2.2),
        P(x + pane0 + 1, 0, 2.2),
        P(x + pane0 + 1, 0, 4.4),
        P(x + pane0, 0, 4.4),
      ]);
    });
  });

  //and a chimney through the roof, standing on its slope
  if (k >= 1) {
    var x0 = 6.6,
      x1 = 8.1,
      y0 = 1,
      y1 = 2.5,
      top = 11.6,
      //how high the roof is that far across
      on = function (y) {
        return wall + ((ridge - wall) * y) / (W / 2);
      };

    d.front([
      P(x0, y0, on(y0)),
      P(x1, y0, on(y0)),
      P(x0, y1, on(y1)),
      P(x0, y0, top),
      P(x1, y0, top),
      P(x0, y1, top),
      P(x1, y1, top),
    ]);
    d.face([P(x0, y0, top), P(x1, y0, top), P(x1, y1, top), P(x0, y1, top)]);
    d.face([
      P(x0, y0, on(y0)),
      P(x0, y1, on(y1)),
      P(x0, y1, top),
      P(x0, y0, top),
    ]);
    d.face([
      P(x0, y0, on(y0)),
      P(x1, y0, on(y0)),
      P(x1, y0, top),
      P(x0, y0, top),
    ]);
  }

  return roof;
}

function house() {
  var d = new Drawing(true);

  cottage(d);

  return d;
}

/**
 * The bulldozer, its blade to the front: the tracks with their wheels, the
 * cab behind and the engine before it, flush with the tracks - a seam
 * between, rather than slivers of the tracks' top - its grille, the
 * exhaust, and the blade.
 */
function bulldozer() {
  var d = new Drawing(true),
    track = d.box(0, 10, 0, 6.4, 0, 2.4);

  [1.4, 3.8, 6.2, 8.6].forEach(function (x) {
    d.hole(track.right, circle("y", [x, 0, 1.2], 0.72));
  });

  var cab = d.box(6, 10, 0, 6.4, 2.4, 9.4);

  d.hole(cab.left, pane("x", 6, 1.7, 4.7, 6.5, 8.4));
  d.hole(cab.right, pane("y", 0, 6.8, 9.2, 5.8, 8.4));

  var engine = d.box(0, 6, 0, 6.4, 2.4, 5.4);

  [3.4, 4.4].forEach(function (z) {
    d.hole(engine.left, pane("x", 0, 1.2, 5.2, z - 0.3, z + 0.2));
  });

  d.box(2, 2.8, 3.6, 4.4, 5.4, 8);

  //the blade, low in front
  d.box(-1.8, -0.8, -0.8, 7.2, 0, 3.2);

  return d;
}

/**
 * A plot of land for sale: a slab of ground, its edges marked out in
 * dashes, and a sign on a post with the dollar on it.
 */
function land() {
  var d = new Drawing(true),
    S = 12,
    slab = d.box(0, S, 0, S, 0, 1.6),
    m = 1.2,
    t = 0.5;

  //the plot marked out along its edges
  for (var a = m; a < S - m - 0.5; a += 3.2) {
    var b = Math.min(a + 2, S - m);

    d.hole(slab.top, pane("z", 1.6, a, b, m, m + t));
    d.hole(slab.top, pane("z", 1.6, a, b, S - m - t, S - m));
    if (a > m)
      [m, S - m - t].forEach(function (x) {
        d.hole(slab.top, pane("z", 1.6, x, x + t, a, b));
      });
  }

  d.box(7, 7.8, 5.4, 6.2, 1.6, 9);

  var board = d.box(3, 11, 4.6, 5.4, 4.6, 11.4);

  dollar(
    function (u, v) {
      return iso(u, 4.6, v);
    },
    7,
    8,
    5.6,
    0.95,
  ).forEach(function (h) {
    d.hole(board.right, h);
  });

  return d;
}

/**
 * A die: a cube, one pip on top, two to the left, three to the right.
 */
function dice() {
  var d = new Drawing(true),
    c = d.box(0, 10, 0, 10, 0, 10);

  d.hole(c.top, circle("z", [5, 5, 10], 1.45));
  [
    [2.8, 7.2],
    [7.2, 2.8],
  ].forEach(function (p) {
    d.hole(c.left, circle("x", [0, p[0], p[1]], 1.15));
  });
  [
    [2.6, 7.4],
    [5, 5],
    [7.4, 2.6],
  ].forEach(function (p) {
    d.hole(c.right, circle("y", [p[0], 0, p[1]], 1.15));
  });

  return d;
}

//an arrow standing upright in the world over x, y - pointing up, or down -
//from z0 to z1, seen face on
function upright(d, x, y, z0, z1, up) {
  function P(u, z) {
    return iso(x + u / 2, y - u / 2, z);
  }

  var head = 3.2,
    half = 2.8,
    shaft = 0.95,
    tip = up ? z1 : z0,
    base = up ? z1 - head : z0 + head,
    tail = up ? z0 : z1,
    points = [
      P(-shaft, tail),
      P(-shaft, base),
      P(-half, base),
      P(0, tip),
      P(half, base),
      P(shaft, base),
      P(shaft, tail),
    ];

  d.front(points);
  d.shape(points);
}

//the ground raised: a block up out of a slab, an arrow up over it
function raise() {
  var d = new Drawing(true);

  d.box(0, 12, 0, 12, 0, 1.8);
  d.box(3.5, 8.5, 3.5, 8.5, 1.8, 4.8);
  upright(d, 6, 6, 7, 14, true);

  return d;
}

//the ground lowered: a pit in a slab, an arrow down into it
function lower() {
  var d = new Drawing(true),
    slab = d.box(0, 12, 0, 12, 0, 2.6),
    a = 3.5,
    b = 8.5,
    floor = 0.8,
    mouth = pane("z", 2.6, a, b, a, b);

  d.hole(slab.top, mouth);
  //the pit's floor and its far walls, as much as the mouth shows of them
  d.face(pane("z", floor, a, b, a, b)).within = mouth;
  d.face(pane("x", b, a, b, floor, 2.6)).within = mouth;
  d.face(pane("y", b, a, b, floor, 2.6)).within = mouth;
  upright(d, 6, 6, 6.5, 14, false);

  return d;
}

//turning round: a small house, and an arrow going round it on the ground
function rotate() {
  var d = new Drawing(true),
    c = [5, 3.5, 0],
    r = 8,
    a0 = (100 * Math.PI) / 180,
    a1 = (340 * Math.PI) / 180;

  cottage(d, 0, 0, 0.78);

  var path = [];

  for (var i = 0; i <= 40; i++) {
    var t = a0 + ((a1 - a0) * i) / 40;

    path.push([c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r]);
  }

  //the band on the ground, and its head at the end, along the way round
  var flat = stroke(path, 1.5, "butt"),
    end = path[path.length - 1],
    dir = [-Math.sin(a1), Math.cos(a1)],
    nrm = [Math.cos(a1), Math.sin(a1)],
    head = [
      [end[0] + nrm[0] * 2.1, end[1] + nrm[1] * 2.1],
      [end[0] + dir[0] * 3.2, end[1] + dir[1] * 3.2],
      [end[0] - nrm[0] * 2.1, end[1] - nrm[1] * 2.1],
    ];

  d.shape(at(flat));
  d.shape(at(head));

  return d;
}

/**
 * Coins in a pile, three high, a little off one another, the top one with
 * its rim.
 */
function coins() {
  var d = new Drawing(true),
    r = 5,
    h = 1.7,
    pile = [
      [0, 0],
      [0.8, -0.6],
      [-0.2, 0.5],
    ];

  //a point on the coin's round edge, t round from +x towards +y
  function on(c, t, z) {
    return iso(c[0] + Math.cos(t) * r, c[1] + Math.sin(t) * r, z);
  }

  pile.forEach(function (o, i) {
    var z = i * h,
      c = [5 + o[0], 5 + o[1]],
      edge = [],
      k;

    //the front of its edge: from its left round the front to its right,
    //along the top and back along the bottom
    for (k = 0; k <= 24; k++)
      edge.push(on(c, (3 * Math.PI) / 4 + (Math.PI * k) / 24, z + h - 0.5));
    for (k = 24; k >= 0; k--)
      edge.push(on(c, (3 * Math.PI) / 4 + (Math.PI * k) / 24, z));

    d.front(circle("z", [c[0], c[1], z + h], r).concat(edge));
    d.shape(edge);

    var top = d.face(circle("z", [c[0], c[1], z + h], r, 0, Math.PI * 2, 48));

    //the rim round the top of the last
    if (i === pile.length - 1) {
      d.hole(
        top,
        circle("z", [c[0], c[1], z + h], r - 1.1, 0, Math.PI * 2, 48),
      );
      d.shape(circle("z", [c[0], c[1], z + h], r - 1.9, 0, Math.PI * 2, 48));
    }
  });

  return d;
}

/* --- roads ------------------------------------------------------------- */

//a length of road, along x, with its markings or its stones, and the ways
//it is driven shown on it
var ROAD = { L: 11, W: 7, H: 2.4 };

//an arrow on the road along x, pointing +x (dir 1) or -x, its middle across
//at y, from x0 to x1, the shaft and the head this wide
function laneArrow(y, x0, x1, dir, shaft, head, len) {
  var tip = dir > 0 ? x1 : x0,
    base = tip - dir * len,
    tail = dir > 0 ? x0 : x1;

  return [
    [tail, y - shaft / 2],
    [base, y - shaft / 2],
    [base, y - head / 2],
    [tip, y],
    [base, y + head / 2],
    [base, y + shaft / 2],
    [tail, y + shaft / 2],
  ];
}

var WAYS = {
  none: function () {
    return [];
  },
  two: function () {
    var L = ROAD.L,
      W = ROAD.W;

    return [
      laneArrow(W * 0.25, L * 0.5, L * 0.92, 1, 1, 2.6, 2.2),
      laneArrow(W * 0.75, L * 0.08, L * 0.5, -1, 1, 2.6, 2.2),
    ];
  },
  one: function () {
    return [
      laneArrow(ROAD.W / 2, ROAD.L * 0.12, ROAD.L * 0.9, 1, 1.6, 4.4, 3.2),
    ];
  },
  back: function () {
    return [
      laneArrow(ROAD.W / 2, ROAD.L * 0.1, ROAD.L * 0.88, -1, 1.6, 4.4, 3.2),
    ];
  },
};

//whether a mark at x, y keeps clear of the arrows
function clear(arrows, x0, x1, y0, y1) {
  return arrows.every(function (a) {
    var xs = a.map(function (p) {
        return p[0];
      }),
      ys = a.map(function (p) {
        return p[1];
      });

    return (
      x1 < Math.min.apply(null, xs) - 0.8 ||
      x0 > Math.max.apply(null, xs) + 0.8 ||
      y1 < Math.min.apply(null, ys) - 0.8 ||
      y0 > Math.max.apply(null, ys) + 0.8
    );
  });
}

var SURFACES = {
  //asphalt: lines along its edges, dashes down its middle
  asphalt: function (d, top, arrows, way) {
    var L = ROAD.L,
      W = ROAD.W,
      H = ROAD.H;

    if (way !== "two")
      [0.8, W - 1.25].forEach(function (y) {
        d.hole(top, pane("z", H, 0.6, L - 0.6, y, y + 0.45));
      });
    if (way === "none")
      for (var x = 0.8; x < L; x += 3.2)
        if (clear(arrows, x, x + 1.8, W / 2 - 0.3, W / 2 + 0.3))
          d.hole(
            top,
            pane(
              "z",
              H,
              x,
              Math.min(x + 1.8, L - 0.6),
              W / 2 - 0.28,
              W / 2 + 0.28,
            ),
          );
  },
  //gravel: stones strewn over it
  gravel: function (d, top, arrows) {
    var L = ROAD.L,
      W = ROAD.W,
      H = ROAD.H,
      k = 0;

    for (var y = 0.9; y < W - 0.9; y += 1.15)
      for (var x = 0.7 + (k++ % 2) * 0.7; x < L - 0.9; x += 1.6) {
        var jx = ((x * 7.3 + y * 3.1) % 1) * 0.5,
          jy = ((x * 2.9 + y * 5.7) % 1) * 0.35,
          s = 0.42 + ((x + y * 3) % 1) * 0.2;

        if (clear(arrows, x + jx, x + jx + s, y + jy, y + jy + s))
          d.hole(top, pane("z", H, x + jx, x + jx + s, y + jy, y + jy + s));
      }
  },
  //cobbles: set stones, in rows across, each row along from the one before
  cobble: function (d, top, arrows) {
    var L = ROAD.L,
      W = ROAD.W,
      H = ROAD.H,
      g = 0.36,
      row = (W - 0.8) / 4,
      stone = 1.7;

    for (var r = 0; r < 4; r++) {
      var y0 = 0.4 + r * row;

      if (r > 0 && clear(arrows, 0.4, L - 0.4, y0 - g / 2, y0 + g / 2))
        d.hole(top, pane("z", H, 0.4, L - 0.4, y0 - g / 2, y0 + g / 2));
      else if (r > 0)
        for (var x = 0.4; x < L - 0.4; x += 0.9)
          if (clear(arrows, x, x + 0.6, y0 - g / 2, y0 + g / 2))
            d.hole(top, pane("z", H, x, x + 0.6, y0 - g / 2, y0 + g / 2));

      for (
        var x2 = 0.4 + (r % 2) * (stone / 2) + stone;
        x2 < L - 0.6;
        x2 += stone
      )
        if (clear(arrows, x2 - g / 2, x2 + g / 2, y0 + g / 2, y0 + row - g / 2))
          d.hole(
            top,
            pane(
              "z",
              H,
              x2 - g / 2,
              x2 + g / 2,
              y0 + (r > 0 ? g / 2 : 0),
              y0 + row - (r < 3 ? g / 2 : 0),
            ),
          );
    }
  },
};

function road(surface, way) {
  var d = new Drawing(true),
    slab = d.box(0, ROAD.L, 0, ROAD.W, 0, ROAD.H),
    arrows = WAYS[way]();

  SURFACES[surface](d, slab.top, arrows, way);
  arrows.forEach(function (a) {
    d.hole(
      slab.top,
      a.map(function (p) {
        return iso(p[0], p[1], ROAD.H);
      }),
    );
  });

  return d;
}

/* --- signs, on the grid ------------------------------------------------ */

function close() {
  var d = new Drawing();

  d.shape(
    stroke(
      [
        [5.5, 5.5],
        [18.5, 18.5],
      ],
      2.6,
      "square",
    ),
  );
  d.shape(
    stroke(
      [
        [18.5, 5.5],
        [5.5, 18.5],
      ],
      2.6,
      "square",
    ),
  );

  return d;
}

function check() {
  var d = new Drawing();

  d.shape(
    stroke(
      [
        [3.8, 12.6],
        [9.2, 18],
        [20.2, 6.4],
      ],
      2.8,
      "butt",
    ),
  );

  return d;
}

//back where it was: an arrow back to the left, round a square corner
function back() {
  var d = new Drawing();

  d.shape(
    stroke(
      [
        [19, 20],
        [19, 9.4],
        [8, 9.4],
      ],
      2.4,
      "butt",
    ),
  );
  d.shape([
    [2.8, 9.4],
    [9, 3.6],
    [9, 15.2],
  ]);

  return d;
}

function menu() {
  var d = new Drawing();

  d.shape(rect(3.5, 5.2, 17, 2.4));
  d.shape(rect(3.5, 10.8, 17, 2.4));
  d.shape(rect(3.5, 16.4, 11, 2.4));

  return d;
}

//the speaker: its box, and its cone apart from it
function speaker(d) {
  d.face(rect(2.2, 8.6, 4.6, 6.8));
  d.face([
    [6.8, 8.6],
    [12.4, 4],
    [12.4, 20],
    [6.8, 15.4],
  ]);
}

function soundOn() {
  var d = new Drawing();

  speaker(d);
  [4.4, 8].forEach(function (r) {
    d.shape(stroke(arc(12.4, 12, r, r, -0.85, 0.85, 20), 2, "butt"));
  });

  return d;
}

function soundOff() {
  var d = new Drawing();

  speaker(d);
  d.shape(
    stroke(
      [
        [15.2, 8.8],
        [21.6, 15.2],
      ],
      2.2,
      "square",
    ),
  );
  d.shape(
    stroke(
      [
        [21.6, 8.8],
        [15.2, 15.2],
      ],
      2.2,
      "square",
    ),
  );

  return d;
}

/**
 * The day and the night going by: the sun with its rays, and the moon in
 * front of it, cutting a gap round itself.
 */
function dayNight() {
  var d = new Drawing(),
    sun = [8.6, 8.6],
    moonA = { c: [15, 15], r: 7 },
    moonB = { c: [19.6, 10.8], r: 5.6 },
    moon = [];

  d.face(arc(sun[0], sun[1], 4, 4));
  for (var k = 0; k < 8; k++) {
    var t = (k * Math.PI) / 4;

    //the rays the moon would cover go
    if (k === 0 || k === 1 || k === 2) continue;
    d.shape(
      stroke(
        [
          [sun[0] + Math.cos(t) * 5.6, sun[1] + Math.sin(t) * 5.6],
          [sun[0] + Math.cos(t) * 7.6, sun[1] + Math.sin(t) * 7.6],
        ],
        1.9,
        "butt",
      ),
    );
  }

  //the crescent: what of the one circle is outside the other
  arc(moonA.c[0], moonA.c[1], moonA.r, moonA.r, 0, Math.PI * 2, 96).forEach(
    function (p) {
      if (Math.hypot(p[0] - moonB.c[0], p[1] - moonB.c[1]) >= moonB.r)
        moon.push(p);
    },
  );

  var start = moon.findIndex(function (p, i) {
    var q = moon[(i + moon.length - 1) % moon.length];

    return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1;
  });

  moon = moon.slice(start).concat(moon.slice(0, start));

  var a = moon[moon.length - 1],
    b = moon[0],
    ta = Math.atan2(a[1] - moonB.c[1], a[0] - moonB.c[0]),
    tb = Math.atan2(b[1] - moonB.c[1], b[0] - moonB.c[0]);

  while (tb > ta) tb -= Math.PI * 2;
  arc(moonB.c[0], moonB.c[1], moonB.r, moonB.r, ta, tb, 40).forEach(
    function (p) {
      moon.push(p);
    },
  );

  d.front(moon);
  d.shape(moon);

  return d;
}

/**
 * The view from above: a map folded in three, a way marked across it and a
 * pin where it goes.
 */
function topView() {
  var d = new Drawing(),
    panels = [
      [
        [2.2, 5.8],
        [8.4, 3.4],
        [8.4, 18.4],
        [2.2, 20.8],
      ],
      [
        [8.4, 3.4],
        [15.6, 5.8],
        [15.6, 20.8],
        [8.4, 18.4],
      ],
      [
        [15.6, 5.8],
        [21.8, 3.4],
        [21.8, 18.4],
        [15.6, 20.8],
      ],
    ].map(function (p) {
      return d.face(p);
    });

  //the way, dashed across the panels
  [
    [
      0,
      [
        [3.4, 17.6],
        [5.4, 16.2],
      ],
    ],
    [
      0,
      [
        [6.4, 15.4],
        [7.6, 14.4],
      ],
    ],
    [
      1,
      [
        [9.6, 13.4],
        [11.4, 12],
      ],
    ],
  ].forEach(function (w) {
    d.hole(panels[w[0]], stroke(w[1], 1.2, "butt"));
  });

  //the pin: a drop, point down, a dot in it
  var pin = arc(13, 8.6, 2.6, 2.6, Math.PI * 0.82, Math.PI * 2.18, 24);

  pin.push([13, 14]);
  d.hole(panels[1], pin);
  d.shape(arc(13, 8.6, 0.95, 0.95));

  return d;
}

function locate() {
  var d = new Drawing();

  d.shape(arc(12, 12, 7.2, 7.2));
  d.cutout(arc(12, 12, 5.2, 5.2));
  d.shape(arc(12, 12, 2.1, 2.1));
  [
    [
      [12, 1.6],
      [12, 5.4],
    ],
    [
      [12, 18.6],
      [12, 22.4],
    ],
    [
      [1.6, 12],
      [5.4, 12],
    ],
    [
      [18.6, 12],
      [22.4, 12],
    ],
  ].forEach(function (l) {
    d.shape(stroke(l, 2.2, "butt"));
  });

  return d;
}

function clock() {
  var d = new Drawing();

  d.shape(arc(12, 12, 10, 10));
  d.cutout(arc(12, 12, 7.8, 7.8));
  [0, 1, 2, 3].forEach(function (k) {
    var t = (k * Math.PI) / 2;

    d.shape(
      stroke(
        [
          [12 + Math.cos(t) * 5.4, 12 + Math.sin(t) * 5.4],
          [12 + Math.cos(t) * 6.8, 12 + Math.sin(t) * 6.8],
        ],
        1.6,
        "butt",
      ),
    );
  });
  d.shape(
    stroke(
      [
        [12, 6.6],
        [12, 12],
        [15.8, 14.2],
      ],
      2,
      "square",
    ),
  );

  return d;
}

function zoom() {
  var d = new Drawing();

  d.shape(arc(10.2, 10.2, 7.6, 7.6));
  d.cutout(arc(10.2, 10.2, 5.4, 5.4));
  d.shape(
    stroke(
      [
        [15.4, 15.4],
        [21, 21],
      ],
      3.4,
      "butt",
    ),
  );
  d.shape(
    stroke(
      [
        [10.2, 7.2],
        [10.2, 13.2],
      ],
      2,
      "butt",
    ),
  );
  d.shape(
    stroke(
      [
        [7.2, 10.2],
        [13.2, 10.2],
      ],
      2,
      "butt",
    ),
  );

  return d;
}

function download() {
  var d = new Drawing();

  d.shape(
    stroke(
      [
        [12, 2.6],
        [12, 11.4],
      ],
      2.4,
      "butt",
    ),
  );
  d.shape([
    [6.4, 10],
    [17.6, 10],
    [12, 16],
  ]);
  d.shape(
    stroke(
      [
        [3.6, 14.2],
        [3.6, 20.4],
        [20.4, 20.4],
        [20.4, 14.2],
      ],
      2.4,
      "butt",
    ),
  );

  return d;
}

/* --- the kit ----------------------------------------------------------- */

var ICONS = {
  close: close,
  check: check,
  back: back,
  menu: menu,
  "sound-on": soundOn,
  "sound-off": soundOff,
  "day-night": dayNight,
  "top-view": topView,
  locate: locate,
  clock: clock,
  zoom: zoom,
  download: download,
  house: house,
  bulldozer: bulldozer,
  land: land,
  dice: dice,
  raise: raise,
  lower: lower,
  rotate: rotate,
  coin: coins,
};

//the roads: what each is laid in, and which ways it is driven - its name
//as the games ask for it
Object.keys(SURFACES).forEach(function (surface) {
  Object.keys(WAYS).forEach(function (way) {
    var name =
      (surface === "asphalt" ? "road" : surface) +
      (way === "none"
        ? ""
        : way === "back"
          ? "-one-way-back"
          : "-" + way + "-way");

    ICONS[name] = function () {
      return road(surface, way);
    };
  });
});

//every icon there is, by name
export var NAMES = Object.keys(ICONS).sort();

/**
 * An icon drawn: its path on the grid.
 */
export function draw(name) {
  if (ICONS[name] === undefined) throw new Error("no such icon: " + name);

  return ICONS[name]().path();
}

//the icon written out as SVG
export function svg(path) {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
    SIZE +
    " " +
    SIZE +
    '" fill="currentColor"><path d="' +
    path +
    '"/></svg>\n'
  );
}
