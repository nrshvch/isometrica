/**
 * The catalogue's picture of each generated block of flats.
 *
 * The catalogue shows a building as ui/img/buildings/<code>.png, one picture
 * of the whole thing rather than the tile-sized pieces the game draws it from,
 * so this puts the pieces back together the way client/buildingview lays them
 * out and trims the result to what it painted. Run it after tools/genbuildings.
 *
 * Usage:
 *   node tools/genbuildingthumbs.js
 */

var fs = require("fs");
var path = require("path");
var PNG = require("pngjs").PNG;

var ROOT = path.resolve(__dirname, "..");
var GFX = path.join(ROOT, "src/public/gfx");
var OUT_DIR = path.join(ROOT, "src/public/ui/img/buildings");

//the same picture the catalogue's card is sized for
var W = 128,
  H = 128;

main();

function main() {
  //the data modules are ES modules and this is not, so they come in by hand
  Promise.all([
    import(url(path.join(ROOT, "src/data/genbuildings.js"))),
    import(url(path.join(ROOT, "src/data/genbuildingcode.js"))),
  ])
    .then(function (modules) {
      var buildings = modules[0].default,
        genBuildingCode = modules[1].default,
        names = Object.keys(buildings);

      names.forEach(function (name) {
        var file = path.join(OUT_DIR, genBuildingCode(name).code + ".png");
        fs.writeFileSync(
          file,
          PNG.sync.write(thumb(buildings[name].rotations[0])),
        );
      });

      console.log(
        "wrote " +
          names.length +
          " pictures to " +
          path.relative(ROOT, OUT_DIR),
      );
    })
    .catch(function (e) {
      console.error(e);
      process.exit(1);
    });
}

function url(file) {
  return "file://" + file;
}

/**
 * One picture of a building, its pieces laid out around the middle of the tile
 * it stands on and the lot trimmed to what was painted.
 *
 * @param sprites {Array} the building's sprites entries, as genbuildings wrote them
 * @returns {PNG}
 */
function thumb(sprites) {
  var png = new PNG({ width: W, height: H }),
    ox = W / 2,
    //low enough that a four storey block still has its roof on the picture
    oy = H - 28,
    i;

  for (i = 0; i < png.data.length; i++) png.data[i] = 0;

  //back to front, the way the game stacks them
  sprites
    .slice()
    .sort(function (a, b) {
      return b.x + b.z - (a.x + a.z);
    })
    .forEach(function (s) {
      var piece = PNG.sync.read(fs.readFileSync(path.join(GFX, s.path)));

      blit(
        png,
        piece,
        Math.round(ox + (s.x - s.z) * 32 - s.pivotX),
        Math.round(oy - (s.x + s.z) * 16 - s.pivotY),
      );
    });

  return crop(png);
}

//over the top, keeping what is already there where the piece is see-through
function blit(png, piece, x, y) {
  var i, j, from, to;

  for (j = 0; j < piece.height; j++) {
    for (i = 0; i < piece.width; i++) {
      if (x + i < 0 || y + j < 0 || x + i >= png.width || y + j >= png.height)
        continue;

      from = (j * piece.width + i) * 4;
      if (piece.data[from + 3] === 0) continue;

      to = ((y + j) * png.width + x + i) * 4;
      png.data[to] = piece.data[from];
      png.data[to + 1] = piece.data[from + 1];
      png.data[to + 2] = piece.data[from + 2];
      png.data[to + 3] = piece.data[from + 3];
    }
  }
}

//the smallest picture with everything that was painted still on it
function crop(png) {
  var x0 = png.width,
    y0 = png.height,
    x1 = -1,
    y1 = -1,
    i,
    j,
    out;

  for (j = 0; j < png.height; j++) {
    for (i = 0; i < png.width; i++) {
      if (png.data[(j * png.width + i) * 4 + 3] === 0) continue;

      if (i < x0) x0 = i;
      if (i > x1) x1 = i;
      if (j < y0) y0 = j;
      if (j > y1) y1 = j;
    }
  }

  if (x1 < 0) throw new Error("nothing was painted");

  out = new PNG({ width: x1 - x0 + 1, height: y1 - y0 + 1 });
  PNG.bitblt(png, out, x0, y0, out.width, out.height, 0, 0);
  return out;
}
