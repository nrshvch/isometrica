/**
 * Writes out the stones src/shared/gen/stones.js paints out of the pictures
 * in assets/sprites/scenery/stones - the same ones the game paints for itself
 * as it starts - to look at, and to try a change to the painting on before
 * the game gets it.
 *
 * Writes <name>.png and <name>-m.png for every painted picture, as the game
 * gets them, and preview.png: all of them in a row, each on the grass tile
 * the stones were painted on, the way they lie in the game.
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

var ROOT = path.resolve(__dirname, "..");
var SOURCE = path.join(ROOT, "assets/sprites/scenery/stones");
var GROUND = path.join(ROOT, "assets/sprites/terrain/grass/2222.png");
var DEFAULT_OUT = path.join(ROOT, "assets/previews/stones");

var GAP = 2;

function read(file) {
  return PNG.sync.read(fs.readFileSync(file));
}

function main() {
  var out = path.resolve(process.argv[2] || DEFAULT_OUT),
    ground = read(GROUND),
    pictures = {};

  fs.readdirSync(SOURCE)
    .filter(function (f) {
      return /\.png$/.test(f);
    })
    .sort()
    .forEach(function (f) {
      pictures[f.replace(/\.png$/, "")] = read(path.join(SOURCE, f));
    });

  var painted = stones.generate(pictures, ground),
    names = Object.keys(painted),
    preview = new PNG({
      width: GAP + names.length * (ground.width + GAP),
      height: ground.height + 2 * GAP,
    });

  fs.mkdirSync(out, { recursive: true });

  names.forEach(function (name, i) {
    var image = painted[name],
      png = new PNG({ width: image.width, height: image.height }),
      x = GAP + i * (ground.width + GAP);

    png.data = Buffer.from(image.data);
    fs.writeFileSync(path.join(out, name + ".png"), PNG.sync.write(png));

    over(ground, preview, x, GAP);
    over(image, preview, x, GAP);
  });

  fs.writeFileSync(path.join(out, "preview.png"), PNG.sync.write(preview));

  console.log(
    "Wrote " +
      names.join(", ") +
      " and preview.png to " +
      path.relative(process.cwd(), out),
  );
}

//src laid over what is on dst already, at x0, y0
function over(src, dst, x0, y0) {
  for (var y = 0; y < src.height; y++) {
    for (var x = 0; x < src.width; x++) {
      var s = (y * src.width + x) * 4,
        d = ((y0 + y) * dst.width + x0 + x) * 4,
        a = src.data[s + 3] / 255,
        b = (dst.data[d + 3] / 255) * (1 - a),
        alpha = a + b;

      if (alpha === 0) continue;

      for (var c = 0; c < 3; c++)
        dst.data[d + c] = Math.round(
          (src.data[s + c] * a + dst.data[d + c] * b) / alpha,
        );
      dst.data[d + 3] = Math.round(alpha * 255);
    }
  }
}

main();
