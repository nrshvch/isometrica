/**
 * Paints the game's logo, public/logo.png: a little town out of the game's
 * own pieces - a slab of ground, a house, a tree, a water tower - painted
 * the way the game paints them (isometrica's shared/gen), in a ring, as if
 * the town were seen through a round window. The tower is too tall for it
 * and breaks out through the top of the ring.
 *
 * The picture is SIZE pixels square, transparent round the ring, and shown
 * at half that (ui/world/Hud.jsx), so that every pixel of it is sharp on a
 * screen of two pixels a point. What is in it, and where, is SCENE below;
 * the ring's colours are the game's (ui/app.css).
 *
 * Usage:
 *   npm run generate:logo        (in city-sim/)
 *   node tools/genlogo.js [out.png]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import * as iso from "isometrica/shared/gen/isobox";
import * as Houses from "isometrica/shared/gen/houses";
import * as Utilities from "isometrica/shared/gen/utilities";
import * as Trees from "isometrica/shared/gen/trees";
import { DIRT, GRASS } from "isometrica/shared/gen/blocks";

var here = path.dirname(fileURLToPath(import.meta.url)),
  OUT = process.argv[2] || path.join(here, "../public/logo.png");

var TILE = iso.TILE;

//how big the picture is, and the ring in it: its middle, how far out it
//reaches, how thick it is
var SIZE = 128,
  MIDDLE = [64, 72],
  OUTER = 54,
  BAND = 6;

//the ring, a block of the game's lit from the top left: its outline, its
//face, its lit and its shaded edge
var OUTLINE = [22, 40, 40],
  RING = [78, 186, 186],
  RING_LIT = [151, 215, 215],
  RING_SHADE = [45, 117, 117];

//the sky behind the town, from the top of the window down to the ground
var SKY = [
  [120, 196, 226],
  [146, 210, 232],
  [176, 224, 236],
  [206, 238, 236],
];

/**
 * The town, in the game's units - a tile is TILE each way - and where on
 * the picture the corner of the ground nearest the eye stands.
 */
var SCENE = {
  //the slab of ground the town is on, this many units each way, this deep
  ground: 52,
  depth: 6,
  //a house, by its part (shared/gen/houses), on its tile at x, y
  house: { part: "houses/cottage/std/white/tile/flowers/0/0", x: 2, y: 2 },
  //the water tower (shared/gen/utilities), behind it
  tower: { part: "utilities/watertower/std/0/0", x: 20, y: 20 },
  //and a tree (shared/gen/trees) in front of the house, at x, y
  tree: { name: "gen/trees/pine-2", x: 44, y: 8 },
  //where the ground's middle lands on the picture
  at: [64, 84],
};

//the boxes of a part on its tile, moved to x, y
function placed(boxes, x, y) {
  return iso
    .snapAll(boxes)
    .map(function (b) {
      return iso.clip(b, 0, TILE, 0, TILE);
    })
    .filter(Boolean)
    .map(function (b) {
      return iso.moved(b, x, y, 0);
    });
}

function ground() {
  var s = SCENE.ground;

  return [
    iso.box(0, s, 0, s, -SCENE.depth, -1, DIRT),
    iso.box(0, s, 0, s, -1, 0, GRASS),
  ];
}

function house() {
  return placed(
    Houses.partBoxes(SCENE.house.part),
    SCENE.house.x,
    SCENE.house.y,
  );
}

function tower() {
  return placed(
    Utilities.partBoxes(SCENE.tower.part),
    SCENE.tower.x,
    SCENE.tower.y,
  );
}

/**
 * The boxes painted, as RGBA on a picture SIZE square - the world's origin
 * where it puts the ground's middle.
 */
function painted(boxes) {
  var pic = iso.render(boxes),
    img = iso.toImage(pic),
    mid = iso.project(SCENE.ground / 2, SCENE.ground / 2, 0),
    ox = SCENE.at[0] - Math.round(mid[0]) - pic.pivotX,
    oy = SCENE.at[1] - Math.round(mid[1]) - pic.pivotY,
    out = new Uint8ClampedArray(SIZE * SIZE * 4);

  for (var j = 0; j < img.height; j++)
    for (var i = 0; i < img.width; i++) {
      var x = ox + i,
        y = oy + j,
        k = (j * img.width + i) * 4;

      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || img.data[k + 3] === 0)
        continue;

      out.set(img.data.subarray(k, k + 4), (y * SIZE + x) * 4);
    }

  return out;
}

//the tree, a picture of its own, over what is painted, its foot at x, y
function plantTree(into) {
  var tree = Trees.paint(SCENE.tree.name),
    mid = iso.project(SCENE.ground / 2, SCENE.ground / 2, 0),
    foot = iso.project(SCENE.tree.x, SCENE.tree.y, 0),
    ox = SCENE.at[0] + Math.round(foot[0] - mid[0]) - Trees.PIVOT_X,
    oy = SCENE.at[1] + Math.round(foot[1] - mid[1]) - Trees.PIVOT_Y,
    mask = new Uint8Array(SIZE * SIZE);

  for (var j = 0; j < tree.height; j++)
    for (var i = 0; i < tree.width; i++) {
      var x = ox + i,
        y = oy + j,
        k = (j * tree.width + i) * 4;

      if (x < 0 || y < 0 || x >= SIZE || y >= SIZE || tree.data[k + 3] < 128)
        continue;

      into.set(tree.data.subarray(k, k + 3), (y * SIZE + x) * 4);
      into[(y * SIZE + x) * 4 + 3] = 255;
      mask[y * SIZE + x] = 1;
    }

  return mask;
}

//the sky at a row of the window, its bands dithered into each other
function sky(x, y) {
  var top = MIDDLE[1] - OUTER + BAND,
    span = SCENE.at[1] - top,
    t = Math.max(0, Math.min(0.999, (y - top) / span)) * SKY.length,
    band = Math.floor(t),
    //the last row or two of a band, every other pixel the next one's
    next = t - band > 0.75 && (x + y) % 2 === 0;

  return SKY[Math.min(SKY.length - 1, band + (next ? 1 : 0))];
}

//what of the ring a pixel is at a distance from the middle, as seen from
//its angle: its outlines, its lit edge to the top left, its shaded one
function ring(d, dx, dy) {
  var inner = OUTER - BAND;

  if (d > OUTER || d < inner - 1) return null;
  if (d > OUTER - 1 || d < inner) return OUTLINE;

  var lit = -(dx + dy) / Math.SQRT2 / d;

  if (d > OUTER - 2)
    return lit > 0.3 ? RING_LIT : lit < -0.3 ? RING_SHADE : RING;
  if (d < inner + 1)
    return lit > 0.3 ? RING_SHADE : lit < -0.3 ? RING_LIT : RING;

  return RING;
}

function main() {
  var town = painted(ground().concat(house(), tower())),
    //what of it breaks out of the window: the tower, painted alone
    out = painted(tower()),
    png = new PNG({ width: SIZE, height: SIZE }),
    treeMask = plantTree(town);

  for (var y = 0; y < SIZE; y++)
    for (var x = 0; x < SIZE; x++) {
      var k = (y * SIZE + x) * 4,
        dx = x + 0.5 - MIDDLE[0],
        dy = y + 0.5 - MIDDLE[1],
        d = Math.hypot(dx, dy),
        inside = d < OUTER - BAND,
        r = ring(d, dx, dy),
        //the tower, over the ring and beyond it, in the upper half only -
        //and the tree where it leans over the ring
        over =
          (out[k + 3] !== 0 && dy < 0) ||
          (treeMask[y * SIZE + x] === 1 && !inside),
        c = null;

      if (over && town[k + 3] !== 0) c = town.subarray(k, k + 3);
      else if (r !== null) c = r;
      else if (inside)
        c = town[k + 3] !== 0 ? town.subarray(k, k + 3) : sky(x, y);

      if (c === null) continue;

      png.data[k] = c[0];
      png.data[k + 1] = c[1];
      png.data[k + 2] = c[2];
      png.data[k + 3] = 255;
    }

  outline(png);
  fs.writeFileSync(OUT, PNG.sync.write(png));
  console.log("logo -> " + path.relative(process.cwd(), OUT));
}

//a dark pixel round what breaks out of the ring, so it reads against
//whatever the logo is on
function outline(png) {
  var a = png.data,
    edge = [];

  for (var y = 0; y < SIZE; y++)
    for (var x = 0; x < SIZE; x++) {
      if (a[(y * SIZE + x) * 4 + 3] !== 0) continue;

      var near = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ].some(function (o) {
        var nx = x + o[0],
          ny = y + o[1];

        return (
          nx >= 0 &&
          ny >= 0 &&
          nx < SIZE &&
          ny < SIZE &&
          a[(ny * SIZE + nx) * 4 + 3] !== 0
        );
      });

      if (near) edge.push((y * SIZE + x) * 4);
    }

  edge.forEach(function (k) {
    a[k] = OUTLINE[0];
    a[k + 1] = OUTLINE[1];
    a[k + 2] = OUTLINE[2];
    a[k + 3] = 255;
  });
}

main();
