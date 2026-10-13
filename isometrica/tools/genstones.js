/**
 * Writes out the stones src/shared/gen/stones.js paints, and the puffs of
 * smoke src/shared/gen/smoke.js does - the same ones the game paints for
 * itself as it starts - to look at, and to try a change to the painting on
 * before the game gets it.
 *
 * Writes <name>.png for every picture, as the game gets it, and preview.png:
 * the stones in a row on a plain grass tile, and under them the smoke, each
 * kind growing the way a puff does as it rises, four times the size.
 *
 * Usage:
 *   node tools/genstones.js [outDir]
 *
 * outDir is assets/previews/stones unless given.
 */

var fs = require("fs");
var path = require("path");
var PNG = require("pngjs").PNG;
var stones = require("../src/shared/gen/stones.js");
var smoke = require("../src/shared/gen/smoke.js");

var ROOT = path.resolve(__dirname, "..");
var DEFAULT_OUT = path.join(ROOT, "assets/previews/stones");

var GAP = 4,
  ZOOM = 4,
  GRASS = [92, 140, 70];

function write(file, picture) {
  var png = new PNG({ width: picture.width, height: picture.height });

  png.data = Buffer.from(picture.data);
  fs.writeFileSync(file, PNG.sync.write(png));
}

//a pixel of picture over the one of out at x, y, as see-through as it is
function over(out, x, y, picture, px, py) {
  var i = (py * picture.width + px) * 4,
    o = (y * out.width + x) * 4,
    a = picture.data[i + 3] / 255;

  for (var c = 0; c < 3; c++)
    out.data[o + c] = out.data[o + c] * (1 - a) + picture.data[i + c] * a;
  out.data[o + 3] = 255;
}

function main() {
  var out = path.resolve(process.argv[2] || DEFAULT_OUT),
    stoneNames = Object.keys(stones.describe()),
    smokeNames = Object.keys(smoke.describe()),
    pictures = {};

  fs.mkdirSync(out, { recursive: true });

  stoneNames.concat(smokeNames).forEach(function (name) {
    pictures[name] =
      stoneNames.indexOf(name) !== -1 ? stones.paint(name) : smoke.paint(name);
    write(path.join(out, name + ".png"), pictures[name]);
  });

  //the stones on a grass tile each, and the smoke under them
  var tileW = 64,
    tileH = 47,
    w = (stoneNames.length * (tileW + GAP) + GAP) * ZOOM,
    h = (tileH + GAP * 2 + 12 * 2 + GAP) * ZOOM,
    preview = { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) },
    i,
    x,
    y;

  for (i = 0; i < w * h; i++) {
    preview.data[i * 4] = 40;
    preview.data[i * 4 + 1] = 44;
    preview.data[i * 4 + 2] = 52;
    preview.data[i * 4 + 3] = 255;
  }

  function put(picture, ox, oy, ground) {
    for (y = 0; y < picture.height; y++)
      for (x = 0; x < picture.width; x++)
        for (var zy = 0; zy < ZOOM; zy++)
          for (var zx = 0; zx < ZOOM; zx++) {
            var X = (ox + x) * ZOOM + zx,
              Y = (oy + y) * ZOOM + zy,
              o = (Y * w + X) * 4,
              //the diamond of the tile, in grass
              onTile =
                ground &&
                Math.abs(x + 0.5 - 32) / 32 + Math.abs(y + 0.5 - 24) / 16 <= 1;

            if (onTile) {
              preview.data[o] = GRASS[0];
              preview.data[o + 1] = GRASS[1];
              preview.data[o + 2] = GRASS[2];
            }
            over(preview, X, Y, picture, x, y);
          }
  }

  stoneNames.forEach(function (name, k) {
    put(pictures[name], GAP + k * (tileW + GAP), GAP, true);
  });

  ["steam", "soot"].forEach(function (kind, row) {
    var at = GAP;

    for (var f = 0; f < smoke.FRAMES; f++) {
      var p = pictures[kind + f];

      put(p, at, GAP * 2 + tileH + row * 12 + (10 - p.height) / 2, false);
      at += p.width + GAP;
    }
  });

  write(path.join(out, "preview.png"), preview);
  console.log(
    "wrote " +
      (stoneNames.length + smokeNames.length) +
      " pictures and preview.png to " +
      out,
  );
}

main();
