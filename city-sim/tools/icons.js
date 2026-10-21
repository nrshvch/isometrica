/**
 * The city builder's icons, drawn: every one the game shows - its HUD, the
 * bar along the bottom, what a road is laid in and which ways it goes
 * (isometrica client/buildman), the ground's tools (client/terrainman), the
 * menu, the screens. tools/genicons.js writes them out, an SVG each and
 * src/ui/icons/index.js for the game to show them by name.
 *
 * Lines, one colour - currentColor - to be coloured by the page: on a 24
 * grid, within 2 of its edge, 1.5 wide, square at their ends and mitred at
 * their joins, to go with the world's pixels. What is of the world - a plot
 * of land, a road - is a flat tile of it, as the world has its tiles: twice
 * as wide as it is high. A road is nothing but its tile, so it is drawn on
 * a grid as wide but only 18 high, shown that much wider than the others -
 * and finer, its lines ROAD_LINE wide as the others' are 1.5, to have room
 * for what it is laid with.
 *
 * Each icon is {w, h, stroke, body}: its grid, how wide its lines are on it,
 * and what is drawn on it, SVG.
 */

export var LINE = 1.5;

var ROAD_W = 24,
  ROAD_H = 18,
  //as wide as 1.25 on a grid 24 high, the road's 18 high being shown as
  //high as another icon's 24
  ROAD_LINE = (1.25 * ROAD_H) / 24;

function n(v) {
  return Math.round(v * 100) / 100;
}

function xy(p) {
  return n(p[0]) + " " + n(p[1]);
}

function path(d) {
  return '<path d="' + d + '"/>';
}

//a line through the points
function line() {
  return path("M" + Array.prototype.map.call(arguments, xy).join("L"));
}

//a shape round the points
function shape(points) {
  return path("M" + points.map(xy).join("L") + "Z");
}

function ring(cx, cy, r) {
  return '<circle cx="' + n(cx) + '" cy="' + n(cy) + '" r="' + n(r) + '"/>';
}

//a dot, filled
function dot(cx, cy, r) {
  return (
    '<circle cx="' +
    n(cx) +
    '" cy="' +
    n(cy) +
    '" r="' +
    n(r) +
    '" fill="currentColor" stroke="none"/>'
  );
}

/* --- the world's tiles -------------------------------------------------- */

/**
 * A flat tile of the world, w wide and half as high, round cx, cy: a point
 * of it, u along it from its front left edge to its back right one, v
 * across it from its back left edge to its front right one, 0 to 1.
 */
function tile(cx, cy, w) {
  var x0 = cx - w / 2,
    s = w / 2;

  return function (u, v) {
    return [x0 + s * u + s * v, cy - (s / 2) * u + (s / 2) * v];
  };
}

function edges(at) {
  return shape([at(0, 0), at(1, 0), at(1, 1), at(0, 1)]);
}

//the plot of land the world's things are done to, along the bottom of the
//grid: whatever is put up on it stands in its middle, at 12, 17 - its back
//corner, right behind that, hidden by it: gap of each of its back edges
//either side, GAP unless what stands there hides more
var PLOT = tile(12, 17, 20),
  GAP = 0.34;

function plot(gap) {
  var g = gap || GAP;

  return [line(PLOT(1 - g, 0), PLOT(0, 0), PLOT(0, 1), PLOT(1, 1), PLOT(1, g))];
}

//an arrow straight up or down, from tail to tip: its head 4 back from its
//tip and 4 out either side, its shaft ending inside it
function vertical(tail, tip) {
  var dir = tip > tail ? 1 : -1;

  return [
    line([12, tail], [12, tip - dir]),
    line([8, tip - 4 * dir], [12, tip], [16, tip - 4 * dir]),
  ];
}

/* --- signs -------------------------------------------------------------- */

var SIGNS = {
  close: [line([6, 6], [18, 18]), line([18, 6], [6, 18])],

  check: [line([4.5, 12.5], [9.5, 17.5], [19.5, 6.5])],

  back: [line([10, 5], [3, 12], [10, 19]), line([3, 12], [21, 12])],

  menu: [
    line([4, 6.5], [20, 6.5]),
    line([4, 12], [20, 12]),
    line([4, 17.5], [20, 17.5]),
  ],

  plus: [line([12, 5], [12, 19]), line([5, 12], [19, 12])],

  minus: [line([5, 12], [19, 12])],

  "chevron-right": [line([9, 5], [16, 12], [9, 19])],

  //a speaker, its sound going out of it - or crossed off
  "sound-on": [
    shape([
      [3, 9],
      [7, 9],
      [12, 4.5],
      [12, 19.5],
      [7, 15],
      [3, 15],
    ]),
    path("M15.5 9a4.2 4.2 0 0 1 0 6"),
    path("M18.5 6a8.5 8.5 0 0 1 0 12"),
  ],

  "sound-off": [
    shape([
      [3, 9],
      [7, 9],
      [12, 4.5],
      [12, 19.5],
      [7, 15],
      [3, 15],
    ]),
    line([16, 9.5], [21, 14.5]),
    line([21, 9.5], [16, 14.5]),
  ],

  sun: [ring(12, 12, 4)].concat(
    [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) {
      var a = (i * Math.PI) / 4,
        c = Math.cos(a),
        s = Math.sin(a);

      return line([12 + 7 * c, 12 + 7 * s], [12 + 9.5 * c, 12 + 9.5 * s]);
    }),
  ),

  moon: [path("M12.5 3.5a6.5 6.5 0 0 0 8 8A8.5 8.5 0 1 1 12.5 3.5Z")],

  //a map, folded in three - the world seen from above
  map: [
    shape([
      [3, 6],
      [9, 3.5],
      [15, 6],
      [21, 3.5],
      [21, 18],
      [15, 20.5],
      [9, 18],
      [3, 20.5],
    ]),
    line([9, 3.5], [9, 18]),
    line([15, 6], [15, 20.5]),
  ],

  //a house, its door - back to the city
  home: [
    shape([
      [4, 10.5],
      [12, 4],
      [20, 10.5],
      [20, 20],
      [4, 20],
    ]),
    line([10, 20], [10, 15], [14, 15], [14, 20]),
  ],

  clock: [ring(12, 12, 9), line([12, 7], [12, 12], [15.5, 14])],

  dollar: [
    line([12, 3], [12, 21]),
    path("M16.5 7.5H10a2.75 2.75 0 0 0 0 5.5h4a2.75 2.75 0 0 1 0 5.5H7.5"),
  ],

  //two people, one behind the other
  people: [
    ring(9, 8, 3.25),
    path("M3 20v-1.5a4.5 4.5 0 0 1 4.5-4.5h3a4.5 4.5 0 0 1 4.5 4.5V20"),
    path("M15.5 4.9a3.25 3.25 0 0 1 0 6.2"),
    path("M18 14.2a4.5 4.5 0 0 1 3 4.3V20"),
  ],

  "trend-up": [
    line([3, 17], [9, 11], [13, 15], [21, 7]),
    line([15, 7], [21, 7], [21, 13]),
  ],

  "trend-down": [
    line([3, 7], [9, 13], [13, 9], [21, 17]),
    line([15, 17], [21, 17], [21, 11]),
  ],

  alert: [
    shape([
      [12, 3.5],
      [21.5, 20],
      [2.5, 20],
    ]),
    line([12, 9.5], [12, 14]),
    dot(12, 17, 1),
  ],

  info: [ring(12, 12, 9), line([12, 11], [12, 16.5]), dot(12, 7.75, 1)],

  download: [
    line([12, 3], [12, 15]),
    line([7, 10], [12, 15], [17, 10]),
    line([4, 17], [4, 20], [20, 20], [20, 17]),
  ],

  //turned round, most of the way, the arrow's head where it has got to
  rotate: [
    path("M20 12a8 8 0 1 1-2.34-5.66L20 8"),
    line([20, 3.5], [20, 8], [15.5, 8]),
  ],

  //a die, five up
  dice: [
    shape([
      [4, 4],
      [20, 4],
      [20, 20],
      [4, 20],
    ]),
    dot(8.5, 8.5, 1.25),
    dot(15.5, 8.5, 1.25),
    dot(12, 12, 1.25),
    dot(8.5, 15.5, 1.25),
    dot(15.5, 15.5, 1.25),
  ],
};

/* --- the city and what is done to the world ----------------------------- */

var WORLD = {
  //the town hall: its roof, its columns, its steps
  city: [
    shape([
      [3, 9],
      [12, 4],
      [21, 9],
    ]),
    line([6, 12], [6, 17]),
    line([10, 12], [10, 17]),
    line([14, 12], [14, 17]),
    line([18, 12], [18, 17]),
    line([3, 20], [21, 20]),
  ],

  //a house, a plus by it - something new built
  build: [
    line([3, 11], [11, 4], [19, 11]),
    line([5, 9.5], [5, 20], [12, 20]),
    line([17.5, 13.5], [17.5, 21]),
    line([13.75, 17.25], [21.25, 17.25]),
  ],

  //a flag put up on a plot - a city founded
  found: plot().concat([
    line([12, 17], [12, 3]),
    shape([
      [12, 3.5],
      [19.5, 3.5],
      [17.5, 6.25],
      [19.5, 9],
      [12, 9],
    ]),
  ]),

  //a board put up on a plot - for sale
  land: plot().concat([
    line([12, 17], [12, 10]),
    shape([
      [5, 3.5],
      [19, 3.5],
      [19, 10],
      [5, 10],
    ]),
    line([8.5, 6.75], [15.5, 6.75]),
  ]),

  //the ground of a plot raised, or lowered
  raise: plot().concat(vertical(17, 3)),

  //its head pressed into the plot, over more of its back
  lower: plot(0.6).concat(vertical(3, 17)),

  //the grid over the ground: a stretch of it, its tiles marked out
  grid: (function () {
    var at = tile(12, 12, 21),
      out = [edges(at)];

    [1 / 3, 2 / 3].forEach(function (k) {
      out.push(line(at(k, 0), at(k, 1)), line(at(0, k), at(1, k)));
    });

    return out;
  })(),

  //a bulldozer from the side, going right: its tracks round two wheels, the
  //cab over the back of them, the blade held out ahead, its edge on the
  //ground - the ground cleared
  clear: [
    ring(4.5, 18, 1.75),
    ring(13.5, 18, 1.75),
    line([4.5, 16.25], [13.5, 16.25]),
    line([4.5, 19.75], [13.5, 19.75]),
    line([5, 16.25], [5, 12], [15, 12], [15, 16.25]),
    line([7, 12], [7, 5], [11.5, 5], [13.5, 12]),
    line([15.25, 18], [19, 18]),
    path("M19 11v6a3 3 0 0 0 3 3"),
  ],
};

/* --- the roads ---------------------------------------------------------- */

/*
 * A tile of road, as wide as the grid: the road along it between its kerbs,
 * told apart by what it is laid with - and which ways it goes, an arrow
 * down its middle: both ways, one way along it, or the other way round.
 */
var ROAD = tile(12, 9, 22),
  KERB = 0.2;

function road(at) {
  return [
    edges(at),
    line(at(0, KERB), at(1, KERB)),
    line(at(0, 1 - KERB), at(1, 1 - KERB)),
  ];
}

//a shape of the road, filled
function painted(points) {
  return '<path d="M' + points.map(xy).join("L") + 'Z" fill="currentColor"/>';
}

//an arrow painted down the middle of the road, from one end of it to the
//other: its head at the far end if ahead, at the near end if back
function arrow(at, ahead, back) {
  var u0 = 0.08,
    u1 = 0.92,
    //how long a head is along the road, how wide across it either way
    a = 0.2,
    b = 0.15,
    out = [line(at(back ? u0 + a : u0, 0.5), at(ahead ? u1 - a : u1, 0.5))];

  if (ahead)
    out.push(painted([at(u1, 0.5), at(u1 - a, 0.5 - b), at(u1 - a, 0.5 + b)]));
  if (back)
    out.push(painted([at(u0, 0.5), at(u0 + a, 0.5 - b), at(u0 + a, 0.5 + b)]));

  return out;
}

//which ways: both, one way - the way the road is dragged, away up the tile
//- or the other way round
var WAYS = {
  two: function (at) {
    return arrow(at, true, true);
  },
  one: function (at) {
    return arrow(at, true, false);
  },
  back: function (at) {
    return arrow(at, false, true);
  },
};

var SURFACES = {
  //its middle line dashed - or the arrow in its place
  asphalt: function (at, way) {
    return way
      ? WAYS[way](at)
      : [0.1, 0.4, 0.7].map(function (u) {
          return line(at(u, 0.5), at(u + 0.2, 0.5));
        });
  },

  //stones scattered over it - along its sides, clear of the arrow's heads
  gravel: function (at, way) {
    var stones = way
      ? [
          [0.36, 0.3, 0.55],
          [0.52, 0.29, 0.5],
          [0.68, 0.3, 0.55],
          [0.32, 0.71, 0.5],
          [0.48, 0.7, 0.55],
          [0.64, 0.71, 0.5],
        ]
      : [
          [0.08, 0.38, 0.85],
          [0.2, 0.62, 0.75],
          [0.34, 0.39, 0.9],
          [0.48, 0.62, 0.8],
          [0.62, 0.38, 0.75],
          [0.76, 0.62, 0.9],
          [0.9, 0.39, 0.75],
        ];

    return stones
      .map(function (s) {
        var p = at(s[0], s[1]);

        return dot(p[0], p[1], s[2]);
      })
      .concat(way ? WAYS[way](at) : []);
  },

  //two rows of stones, their joints apart - or only the joints along its
  //sides, clear of the arrow's heads
  cobble: function (at, way) {
    if (way)
      return [0.4, 0.62]
        .map(function (u) {
          return line(at(u, KERB), at(u, 0.31));
        })
        .concat(
          [0.38, 0.6].map(function (u) {
            return line(at(u, 0.69), at(u, 1 - KERB));
          }),
        )
        .concat(WAYS[way](at));

    return [
      line(at(0, 0.5), at(1, 0.5)),
      line(at(0.25, KERB), at(0.25, 0.5)),
      line(at(0.58, KERB), at(0.58, 0.5)),
      line(at(0.42, 0.5), at(0.42, 1 - KERB)),
      line(at(0.75, 0.5), at(0.75, 1 - KERB)),
    ];
  },
};

function roads() {
  var out = {};

  Object.keys(SURFACES).forEach(function (s) {
    [null, "two", "one", "back"].forEach(function (way) {
      out[s + (way ? "-" + way : "")] = {
        w: ROAD_W,
        h: ROAD_H,
        stroke: ROAD_LINE,
        body: road(ROAD).concat(SURFACES[s](ROAD, way)),
      };
    });
  });

  return out;
}

/* --- all of them -------------------------------------------------------- */

function icons() {
  var out = {};

  [SIGNS, WORLD].forEach(function (set) {
    Object.keys(set).forEach(function (name) {
      out[name] = { w: 24, h: 24, stroke: LINE, body: set[name] };
    });
  });

  return Object.assign(out, roads());
}

export var ICONS = icons();

/**
 * An icon as an SVG of its own: currentColor, its lines as wide as it
 * says, square-ended and mitred.
 */
export function svg(icon) {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
    icon.w +
    " " +
    icon.h +
    '" fill="none" stroke="currentColor" stroke-width="' +
    n(icon.stroke) +
    '" stroke-linecap="square" stroke-linejoin="miter">' +
    icon.body.join("") +
    "</svg>"
  );
}
