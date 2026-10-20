/**
 * The woods map, drawn: the world's trees from straight above, a few pixels
 * a tile, the way core/ambient grows them - which kind on every tile
 * (core/woods treeAt), or which wood every tile is in (woodAt), on the ground
 * of core/terrain: the sea, the shore, and the land lighter the higher it is.
 *
 * As in the game, nothing grows on the shore or in the water. What the map
 * leaves out is the stones the world strews about, which keep a tree off
 * the odd tile in the game, and whatever a city built.
 */
import Terrain from "../../src/core/terrain.js";
import Woods from "../../src/core/woods.js";
import Trees from "../../src/data/trees.js";

//the kinds, each as it shows on the map
export var KIND_COLOURS = {
  oak: [150, 90, 20],
  beech: [230, 150, 40],
  ash: [240, 220, 90],
  alder: [130, 50, 170],
  birch: [255, 255, 255],
  pine: [220, 60, 50],
  spruce: [10, 70, 36],
  snag: [150, 150, 150],
  stump: [40, 30, 25],
};

//the woods, in the order core/woods has them
export var WOOD_COLOURS = [
  [150, 190, 110],
  [20, 70, 40],
  [200, 90, 80],
  [220, 170, 60],
  [130, 70, 170],
  [235, 235, 235],
];

export var SEA = [52, 92, 150],
  SHORE = [200, 184, 130];

//round about the city a new player starts on (data/initialcity)
export var HOME = [22110, 22110];

export var KINDS = Trees.KINDS,
  WOODS = Woods.WOODS;

var terrain = new Terrain(null),
  kindOf = {};

Trees.TREES.forEach(function (tree) {
  kindOf[tree.code] = tree.kind;
});

export function rgb(c) {
  return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")";
}

//the land, lighter the higher it is
function ground(low) {
  var l = Math.min(low, 10) / 10;

  return [92 + 50 * l, 118 + 50 * l, 70 + 40 * l];
}

/**
 * The map about centre into the canvas, scale pixels a tile, of the trees
 * or the woods (view). Says what it drew - { x0, y0, w, h, heights }, for
 * what is under the pointer (at) - and how many trees of each kind there
 * are in sight, how many tiles of land, and how long it took.
 */
export function draw(canvas, centre, scale, view) {
  var started = performance.now(),
    cw = (canvas.width = Math.max(1, Math.floor(canvas.clientWidth / scale))),
    ch = (canvas.height = Math.max(1, Math.floor(canvas.clientHeight / scale))),
    x0 = Math.round(centre[0] - cw / 2),
    y0 = Math.round(centre[1] - ch / 2),
    g = canvas.getContext("2d"),
    img = g.createImageData(cw, ch),
    //every grid point's height, once
    heights = new Int16Array((cw + 1) * (ch + 1)),
    count = {},
    trees = 0,
    land = 0,
    x,
    y,
    i;

  for (y = 0; y <= ch; y++)
    for (x = 0; x <= cw; x++)
      heights[y * (cw + 1) + x] = terrain.getGridPointHeight(x0 + x, y0 + y);

  for (y = 0; y < ch; y++)
    for (x = 0; x < cw; x++) {
      var at = y * (cw + 1) + x,
        a = heights[at],
        b = heights[at + 1],
        c = heights[at + cw + 1],
        d = heights[at + cw + 2],
        low = Math.min(a, b, c, d),
        colour;

      if (Math.max(a, b, c, d) <= 0) colour = SEA;
      else if (low <= 0) colour = SHORE;
      else {
        land++;

        if (view === "woods")
          colour = WOOD_COLOURS[Woods.woodAt(x0 + x, y0 + y, low)];
        else {
          var code = Woods.treeAt(x0 + x, y0 + y, low);

          if (code === null) colour = ground(low);
          else {
            trees++;
            count[kindOf[code]] = (count[kindOf[code]] || 0) + 1;
            colour = KIND_COLOURS[kindOf[code]];
          }
        }
      }

      i = (y * cw + x) * 4;
      img.data[i] = colour[0];
      img.data[i + 1] = colour[1];
      img.data[i + 2] = colour[2];
      img.data[i + 3] = 255;
    }

  g.putImageData(img, 0, 0);

  return {
    drawn: { x0: x0, y0: y0, w: cw, h: ch, heights: heights },
    count: count,
    trees: trees,
    land: land,
    ms: performance.now() - started,
  };
}

//what is on the tile at x, y of what was drawn
export function at(drawn, x, y) {
  var i = y * (drawn.w + 1) + x,
    h = drawn.heights,
    low = Math.min(h[i], h[i + 1], h[i + drawn.w + 1], h[i + drawn.w + 2]),
    tx = drawn.x0 + x,
    ty = drawn.y0 + y,
    text = "tile " + tx + ", " + ty + " - height " + low;

  if (low > 0) {
    var code = Woods.treeAt(tx, ty, low);

    text +=
      " - " +
      Woods.WOODS[Woods.woodAt(tx, ty, low)].name +
      " - " +
      (code === null ? "no tree" : kindOf[code]);
  }

  return text;
}
