/**
 * The game's icon kit: every icon the games show - their buttons over the
 * world, what a road is laid in and which ways it goes (client/buildman),
 * a menu's, the screens' - as pixel art on a 16 by 16 grid, the way the
 * world's pictures are, to be used like any icon set: one colour,
 * currentColor, any size, every pixel a crisp square.
 *
 * An icon is two tones: solid, and a shade of the same colour (SHADE) for
 * what is behind or between - the walls under a roof, the gravel of a road.
 * It is drawn as rows of text - "#" solid, "+" shade, "." nothing - or, for
 * what is easier worked out than drawn (circles, the roads and their
 * arrows), by a function given the grid (see Grid).
 *
 * Drawn here, in the page or not: the lab shows them as they are drawn
 * (lab/icons), and tools/genicons.mjs writes them out - an SVG to an icon,
 * and index.js, every icon's paths, for a game to show them by without
 * drawing them (city-sim ui/kit Icon).
 */

export var N = 16,
  //how strong the shade is
  SHADE = 0.45;

/* --- the grid ---------------------------------------------------------- */

/**
 * An icon's pixels, and what draws on them: 2 solid, 1 shade, 0 nothing.
 */
function Grid() {
  this.px = new Uint8Array(N * N);
}

var TONES = { "#": 2, "+": 1, ".": 0 };

Grid.prototype.set = function (x, y, tone) {
  if (x >= 0 && y >= 0 && x < N && y < N) this.px[y * N + x] = tone;
};

Grid.prototype.get = function (x, y) {
  return x >= 0 && y >= 0 && x < N && y < N ? this.px[y * N + x] : 0;
};

Grid.prototype.rect = function (x, y, w, h, tone) {
  for (var j = y; j < y + h; j++)
    for (var i = x; i < x + w; i++) this.set(i, j, tone);
};

//rows of text, from the top left - or from x, y
Grid.prototype.draw = function (rows, x, y) {
  var g = this;

  rows.forEach(function (row, j) {
    row.split("").forEach(function (c, i) {
      if (c !== " " && TONES[c] !== undefined && (c !== "." || x === undefined))
        g.set((x || 0) + i, (y || 0) + j, TONES[c]);
    });
  });
};

//every pixel whose middle is within r of cx, cy - and, for a ring, not
//within r - thick
Grid.prototype.disc = function (cx, cy, r, tone, thick) {
  for (var j = 0; j < N; j++)
    for (var i = 0; i < N; i++) {
      var d = Math.hypot(i + 0.5 - cx, j + 0.5 - cy);

      if (d <= r && (thick === undefined || d > r - thick))
        this.set(i, j, tone);
    }
};

/* --- the icons --------------------------------------------------------- */

var ICONS = {
  //leaving, closing, starting afresh
  close: [
    "................",
    "................",
    "..##........##..",
    "..###......###..",
    "...###....###...",
    "....###..###....",
    ".....######.....",
    "......####......",
    "......####......",
    ".....######.....",
    "....###..###....",
    "...###....###...",
    "..###......###..",
    "..##........##..",
    "................",
    "................",
  ],

  //done, confirmed
  check: [
    "................",
    "................",
    "................",
    ".............##.",
    "............###.",
    "...........###..",
    "..##......###...",
    "..###....###....",
    "...###..###.....",
    "....######......",
    ".....####.......",
    "......##........",
    "................",
    "................",
    "................",
    "................",
  ],

  //back to where it was
  back: [
    "................",
    "................",
    ".....#..........",
    "....##..........",
    "...##########...",
    "..###########...",
    "...##.......##..",
    "....#........##.",
    ".............##.",
    ".............##.",
    "............###.",
    "...###########..",
    "...##########...",
    "................",
    "................",
    "................",
  ],

  //what can be built, and founding a city
  house: [
    "................",
    ".......##.......",
    "......####......",
    ".....######.....",
    "....########....",
    "...##########...",
    "..############..",
    ".##############.",
    "..++++++++++++..",
    "..+##++++++##+..",
    "..+##++++++##+..",
    "..++++++++++++..",
    "..+++++##+++++..",
    "..+++++##+++++..",
    "..+++++##+++++..",
    "................",
  ],

  //shaping the ground: clearing it
  bulldozer: [
    "................",
    "................",
    "................",
    "...#####........",
    "...#+++#........",
    "...#+++#........",
    "...#+++######.#.",
    ".############.##",
    ".############.##",
    ".############.##",
    "................",
    ".##############.",
    "#++#++#++#++#++#",
    ".##############.",
    "................",
    "................",
  ],

  //raising it, and lowering it
  raise: [
    "................",
    ".......##.......",
    "......####......",
    ".....######.....",
    "....###..###....",
    "...###....###...",
    "..###......###..",
    "..##........##..",
    "................",
    "................",
    "................",
    ".++++++++++++++.",
    ".++++++++++++++.",
    "................",
    "................",
    "................",
  ],
  lower: [
    "................",
    "................",
    "................",
    ".++++++++++++++.",
    ".++++++++++++++.",
    "................",
    "................",
    "..##........##..",
    "..###......###..",
    "...###....###...",
    "....###..###....",
    ".....######.....",
    "......####......",
    ".......##.......",
    "................",
    "................",
  ],

  //buying land: a tile with a price on it
  land: [
    "......#.........",
    "....#####.......",
    "...##.#..#......",
    "...##.#.........",
    "....####........",
    "......#.##......",
    "...#..#.##......",
    "....#####.......",
    "......#.........",
    ".......##.......",
    ".....##++##.....",
    "...##++++++##...",
    ".##++++++++++##.",
    "...##++++++##...",
    ".....##++##.....",
    ".......##.......",
  ],

  //turning what is placed round
  rotate: [
    "................",
    ".....######.#...",
    "...##########...",
    "..###.....###...",
    "..##.....####...",
    ".##.............",
    ".##.............",
    ".##.............",
    ".##.............",
    ".##..........##.",
    "..##........###.",
    "..###......###..",
    "...##########...",
    ".....######.....",
    "................",
    "................",
  ],

  //another of the same, at random
  dice: [
    "................",
    "..############..",
    ".##############.",
    ".###..####..###.",
    ".###..####..###.",
    ".##############.",
    ".##############.",
    ".######..######.",
    ".######..######.",
    ".##############.",
    ".##############.",
    ".###..####..###.",
    ".###..####..###.",
    ".##############.",
    "..############..",
    "................",
  ],

  //the menu
  menu: [
    "................",
    "................",
    "................",
    "..############..",
    "..############..",
    "................",
    "................",
    "..############..",
    "..############..",
    "................",
    "................",
    "..############..",
    "..############..",
    "................",
    "................",
    "................",
  ],

  //the sounds on, and off
  "sound-on": [
    "................",
    "................",
    "......##........",
    ".....###...#....",
    "....####....#...",
    ".#######..#..#..",
    ".#######...#.#..",
    ".#######...#.#..",
    ".#######...#.#..",
    ".#######..#..#..",
    "....####....#...",
    ".....###...#....",
    "......##........",
    "................",
    "................",
    "................",
  ],
  "sound-off": [
    "................",
    "................",
    "......##........",
    ".....###........",
    "....####........",
    ".#######.##..##.",
    ".#######..####..",
    ".#######...##...",
    ".#######..####..",
    ".#######.##..##.",
    "....####........",
    ".....###........",
    "......##........",
    "................",
    "................",
    "................",
  ],

  //the day and the night going by: the sun half and half
  "day-night": function (g) {
    g.disc(8, 8, 6.5, 2);
    g.disc(8, 8, 5, 1);
    g.rect(3, 3, 5, 10, 2);
    g.disc(8, 8, 6.5, 2, 1.5);
  },

  //the world from straight above, as a map
  "top-view": function (g) {
    g.rect(1, 1, 14, 14, 2);
    [
      [3, 3],
      [8, 3],
      [3, 8],
      [8, 8],
    ].forEach(function (c, i) {
      g.rect(c[0], c[1], 5, 5, i === 1 || i === 2 ? 1 : 0);
    });
    g.rect(3, 3, 10, 10, 1);
    g.rect(7, 1, 2, 14, 2);
    g.rect(1, 7, 14, 2, 2);
  },

  //back to the city
  locate: function (g) {
    g.disc(8, 8, 6, 2, 2);
    g.rect(7, 0, 2, 4, 2);
    g.rect(7, 12, 2, 4, 2);
    g.rect(0, 7, 4, 2, 2);
    g.rect(12, 7, 4, 2, 2);
    g.rect(7, 7, 2, 2, 2);
  },

  //the time, and the money
  clock: function (g) {
    g.disc(8, 8, 7.5, 2, 2);
    g.disc(8, 8, 5.5, 1);
    g.rect(7, 4, 2, 5, 2);
    g.rect(9, 7, 3, 2, 2);
  },
  coin: function (g) {
    g.disc(8, 8, 7.5, 2);
    g.disc(8, 8, 5.5, 1);
    g.draw(
      [".###.", "#....", ".##..", "...#.", "###.."].map(function (r) {
        return r.replace(/\./g, " ");
      }),
      6,
      5,
    );
    g.rect(7, 4, 1, 1, 2);
    g.rect(7, 10, 1, 1, 2);
  },

  //how close the camera is
  zoom: function (g) {
    g.disc(6.5, 6.5, 5.5, 2, 2);
    g.disc(6.5, 6.5, 3.5, 1);
    for (var k = 0; k < 5; k++) g.rect(10 + k, 10 + k, 2, 2, 2);
  },

  //the city handed over, as a file
  download: [
    "................",
    ".......##.......",
    ".......##.......",
    ".......##.......",
    ".......##.......",
    "...##..##..##...",
    "....##.##.##....",
    ".....######.....",
    "......####......",
    ".......##.......",
    "................",
    ".##..........##.",
    ".##..........##.",
    ".##############.",
    ".##############.",
    "................",
  ],
};

/* --- the roads --------------------------------------------------------- */

//a road from above, top to bottom, from x 3 to 12 - laid in asphalt, gravel
//or cobbles - and the ways it goes on it: none, both, one, the other one
var ROAD = { x: 3, w: 10 };

var SURFACES = {
  //dark with a dashed line down the middle
  asphalt: function (g) {
    g.rect(ROAD.x, 0, ROAD.w, N, 2);
    [1, 6, 11].forEach(function (y) {
      g.rect(7, y, 2, 3, 0);
    });
  },
  //loose stones on a shaded bed
  gravel: function (g) {
    g.rect(ROAD.x, 0, ROAD.w, N, 1);
    for (var j = 0; j < N; j++)
      for (var i = 0; i < ROAD.w; i++)
        if ((i * 7 + j * 3 + ((i * j) % 5)) % 6 === 0) g.set(ROAD.x + i, j, 2);
  },
  //set stones, two by two, a row along from the one before
  cobble: function (g) {
    g.rect(ROAD.x, 0, ROAD.w, N, 1);
    for (var j = 0; j < N; j += 3)
      for (var i = (j / 3) % 2 === 0 ? 0 : -1; i < ROAD.w; i += 3)
        g.rect(ROAD.x + Math.max(0, i), j, i < 0 ? 1 : 2, 2, 2);
  },
};

//an arrow along the road, up or down, its middle at x - big for a road
//one way, small for each of its lanes
function arrow(g, x, up, big, tone, halo) {
  var head = big ? [1, 2, 3, 4] : [1, 2],
    pixels = [],
    top = big ? 2 : 3,
    length = big ? 12 : 10;

  //half-widths of the head's rows from its tip, and the shaft after them,
  //two pixels wide
  head.forEach(function (h, k) {
    for (var i = -h; i < h; i++) pixels.push([x + i, top + k]);
  });
  for (var j = top + head.length; j < top + length; j++)
    pixels.push([x - 1, j], [x, j]);

  if (!up)
    pixels = pixels.map(function (p) {
      return [p[0], N - 1 - p[1]];
    });

  //a margin round it, so that it reads on whatever the road is laid in
  if (halo !== null)
    pixels.forEach(function (p) {
      for (var dj = -1; dj <= 1; dj++)
        for (var di = -1; di <= 1; di++)
          if (p[0] + di >= ROAD.x && p[0] + di < ROAD.x + ROAD.w)
            g.set(p[0] + di, p[1] + dj, halo);
    });

  pixels.forEach(function (p) {
    g.set(p[0], p[1], tone);
  });
}

var WAYS = {
  none: function () {},
  //each lane four pixels wide, either side of the middle
  two: function (g, tone, halo) {
    arrow(g, 5, false, false, tone, halo);
    arrow(g, 11, true, false, tone, halo);
  },
  one: function (g, tone, halo) {
    arrow(g, 8, true, true, tone, halo);
  },
  back: function (g, tone, halo) {
    arrow(g, 8, false, true, tone, halo);
  },
};

Object.keys(SURFACES).forEach(function (surface) {
  Object.keys(WAYS).forEach(function (way) {
    var name =
      (surface === "asphalt" ? "road" : surface) +
      (way === "none"
        ? ""
        : way === "back"
          ? "-one-way-back"
          : "-" + way + "-way");

    ICONS[name] = function (g) {
      SURFACES[surface](g);
      //cut out of asphalt - its dashes gone, the arrows saying it all - and
      //on the others, solid on a cleared bed
      if (surface !== "asphalt") WAYS[way](g, 2, 1);
      else if (way !== "none") {
        g.rect(ROAD.x, 0, ROAD.w, N, 2);
        WAYS[way](g, 0, null);
      }
    };
  });
});

/* --- written out ------------------------------------------------------- */

//the pixels of a tone as rectangles - runs along a row, grown down while the
//rows under them have the same - in an SVG path
function pathOf(grid, tone) {
  var used = new Uint8Array(N * N),
    d = "";

  for (var y = 0; y < N; y++)
    for (var x = 0; x < N; x++) {
      if (used[y * N + x] || grid.get(x, y) !== tone) continue;

      var w = 1,
        h = 1;

      while (x + w < N && grid.get(x + w, y) === tone && !used[y * N + x + w])
        w++;

      grow: while (y + h < N) {
        for (var i = 0; i < w; i++)
          if (grid.get(x + i, y + h) !== tone || used[(y + h) * N + x + i])
            break grow;
        h++;
      }

      for (var j = 0; j < h; j++)
        for (var k = 0; k < w; k++) used[(y + j) * N + x + k] = 1;

      d += "M" + x + " " + y + "h" + w + "v" + h + "h-" + w + "z";
    }

  return d;
}

//the icon written out as SVG, its solid and its shaded paths in it
export function svg(icon) {
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
    N +
    " " +
    N +
    '" fill="currentColor" shape-rendering="crispEdges">' +
    (icon.solid ? '<path d="' + icon.solid + '"/>' : "") +
    (icon.shade
      ? '<path opacity="' + SHADE + '" d="' + icon.shade + '"/>'
      : "") +
    "</svg>\n"
  );
}

//every icon there is, by name
export var NAMES = Object.keys(ICONS).sort();

/**
 * An icon drawn: its grid, 2 solid, 1 shade, 0 nothing, a row at a time -
 * px[y * N + x] - and as SVG paths, { solid, shade }.
 */
export function draw(name) {
  var grid = new Grid(),
    icon = ICONS[name];

  if (icon === undefined) throw new Error("no such icon: " + name);

  if (typeof icon === "function") icon(grid);
  else grid.draw(icon);

  return { px: grid.px, solid: pathOf(grid, 2), shade: pathOf(grid, 1) };
}
