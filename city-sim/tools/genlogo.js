/**
 * Paints the logo, public/logo.png (SIZE square, SCENE), and the home-screen
 * icons in public/icons/.
 * Usage: npm run generate:logo, or node tools/genlogo.js [out.png]
 * See city-sim/.claude/skills/ui/icons-and-logo.md.
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
  OUT = process.argv[2] || path.join(here, "../public/logo.png"),
  ICONS = path.join(path.dirname(OUT), "icons");

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

//the logo bigger: how many pixels square - and the logo alone, on nothing,
//or on a square of navy, inside a round this much of it across: a phone
//may cut all but the middle eight tenths away (maskable), an iPhone only
//rounds the corners
var ICON_SIZES = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "maskable-192.png", size: 192, across: 0.8 },
  { name: "maskable-512.png", size: 512, across: 0.8 },
  { name: "apple-touch-icon.png", size: 180, across: 0.88 },
];

//the navy behind a maskable icon, as behind the splash: lighter in the
//middle, darker out to the edges - from the middle to this much of it out
var NAVY = [27, 35, 64],
  NAVY_MIDDLE = [54, 59, 108],
  NAVY_SPREAD = 0.75;

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

  fs.mkdirSync(ICONS, { recursive: true });
  ICON_SIZES.forEach(function (icon) {
    var out = path.join(ICONS, icon.name);

    fs.writeFileSync(
      out,
      PNG.sync.write(
        icon.across
          ? onNavy(png, icon.size, icon.across)
          : scaled(png, icon.size / SIZE, icon.size),
      ),
    );
    console.log("icon -> " + path.relative(process.cwd(), out));
  });
}

/**
 * How much of each pixel along one side of the logo a pixel of it k times
 * as big takes in: for every one of them, [pixel, how much of it] - and a
 * whole times bigger, one pixel each, as they are.
 */
function spans(k, length) {
  var out = [];

  for (var i = 0; i < length; i++) {
    var from = i / k,
      to = (i + 1) / k,
      took = [];

    for (var p = Math.floor(from); p < Math.min(Math.ceil(to), SIZE); p++) {
      var w = Math.min(to, p + 1) - Math.max(from, p);

      if (w > 1e-9) took.push([p, w * k]);
    }
    out.push(took);
  }

  return out;
}

/**
 * The logo k times as big, its top left corner at x, y on a picture size
 * square - over what is already on it, if given (RGBA, 0-255): every pixel
 * as much of each of the logo's as it covers, so that at a whole times
 * bigger its pixels stay square and sharp.
 */
function scaled(logo, k, size, under, x, y) {
  var png = new PNG({ width: size, height: size }),
    w = Math.round(SIZE * k),
    across = spans(k, w),
    a = logo.data;

  if (under) under.copy(png.data);

  for (var j = 0; j < w; j++)
    for (var i = 0; i < w; i++) {
      var tx = (x || 0) + i,
        ty = (y || 0) + j;

      if (tx < 0 || ty < 0 || tx >= size || ty >= size) continue;

      //added up as if the colour were as strong as the pixel is there
      var r = 0,
        g = 0,
        b = 0,
        al = 0;

      across[j].forEach(function (row) {
        across[i].forEach(function (col) {
          var k4 = (row[0] * SIZE + col[0]) * 4,
            wt = (row[1] * col[1] * a[k4 + 3]) / 255;

          r += a[k4] * wt;
          g += a[k4 + 1] * wt;
          b += a[k4 + 2] * wt;
          al += wt;
        });
      });

      if (al <= 0) continue;

      var t = (ty * size + tx) * 4,
        d = png.data,
        left = 1 - al;

      d[t] = Math.round(r + d[t] * left);
      d[t + 1] = Math.round(g + d[t + 1] * left);
      d[t + 2] = Math.round(b + d[t + 2] * left);
      d[t + 3] = Math.round(al * 255 + d[t + 3] * left);
    }

  return png;
}

/**
 * The logo on navy, size square, as big as it can be and still be all in
 * a round in the middle, across that much of it - a whole times bigger, if
 * at least twice, so that it is sharp.
 */
function onNavy(logo, size, across) {
  var bg = Buffer.alloc(size * size * 4),
    box = bounds(logo),
    cx = (box.x0 + box.x1) / 2,
    cy = (box.y0 + box.y1) / 2,
    k = (size * across) / 2 / farthest(logo, cx, cy);

  if (k >= 2) k = Math.floor(k);

  for (var y = 0; y < size; y++)
    for (var x = 0; x < size; x++) {
      var t = Math.min(
          1,
          Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) /
            ((size / 2) * NAVY_SPREAD),
        ),
        o = (y * size + x) * 4;

      for (var c = 0; c < 3; c++)
        bg[o + c] = Math.round(NAVY_MIDDLE[c] + (NAVY[c] - NAVY_MIDDLE[c]) * t);
      bg[o + 3] = 255;
    }

  return scaled(
    logo,
    k,
    size,
    bg,
    Math.round(size / 2 - cx * k),
    Math.round(size / 2 - cy * k),
  );
}

//the box round everything drawn on the logo, x1 and y1 past its edges
function bounds(logo) {
  var box = { x0: SIZE, y0: SIZE, x1: 0, y1: 0 };

  for (var y = 0; y < SIZE; y++)
    for (var x = 0; x < SIZE; x++)
      if (logo.data[(y * SIZE + x) * 4 + 3] !== 0) {
        box.x0 = Math.min(box.x0, x);
        box.y0 = Math.min(box.y0, y);
        box.x1 = Math.max(box.x1, x + 1);
        box.y1 = Math.max(box.y1, y + 1);
      }

  return box;
}

//how far from cx, cy the farthest corner of anything drawn on the logo is
function farthest(logo, cx, cy) {
  var far = 0;

  for (var y = 0; y < SIZE; y++)
    for (var x = 0; x < SIZE; x++)
      if (logo.data[(y * SIZE + x) * 4 + 3] !== 0)
        far = Math.max(
          far,
          Math.hypot(
            Math.max(x + 1 - cx, cx - x),
            Math.max(y + 1 - cy, cy - y),
          ),
        );

  return far;
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
