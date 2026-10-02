/**
 * Writes out every vehicle src/shared/gen/vehicles.js paints - the same
 * pictures the game paints for itself as it starts - to look at, and to try a
 * change to the painting on before the game gets it.
 *
 * vehicles.png has a row for every body type: each colour it comes in, each
 * way it drives (x+, x-, y+, y-), and then the lit bits laid over it, one
 * picture per flash. vehicles.json is everything else the painting worked
 * out - speeds, pivots, where the smoke comes out - as the game gets it.
 *
 * Usage:
 *   node tools/genvehicles.js [outDir]
 *
 * outDir is assets/previews/vehicles unless given.
 */

var fs = require("fs");
var path = require("path");
var PNG = require("pngjs").PNG;
var vehicles = require("../src/shared/gen/vehicles.js");

var ROOT = path.resolve(__dirname, "..");
var DEFAULT_OUT = path.join(ROOT, "assets/previews/vehicles");

//between two pictures, and round the edge of the sheet
var GAP = 2;

function main() {
  var out = path.resolve(process.argv[2] || DEFAULT_OUT),
    painted = vehicles.generate(),
    rows = [];

  Object.keys(painted.types).forEach(function (type) {
    var t = painted.types[type],
      row = [];

    Object.keys(t.colors).forEach(function (color) {
      Object.keys(t.colors[color]).forEach(function (d) {
        row.push(t.colors[color][d].sprite);
      });
    });

    (t.lamps || []).forEach(function (phase) {
      Object.keys(phase).forEach(function (d) {
        row.push(phase[d].sprite);
      });
    });

    rows.push(row);
  });

  var width = 0,
    height = GAP;

  rows.forEach(function (row) {
    var w = GAP,
      h = 0;

    row.forEach(function (name) {
      w += painted.images[name].width + GAP;
      h = Math.max(h, painted.images[name].height);
    });

    width = Math.max(width, w);
    height += h + GAP;
  });

  var sheet = new PNG({ width: width, height: height }),
    y = GAP;

  rows.forEach(function (row) {
    var x = GAP,
      h = 0;

    row.forEach(function (name) {
      var image = painted.images[name];

      blit(image, sheet, x, y);
      x += image.width + GAP;
      h = Math.max(h, image.height);
    });

    y += h + GAP;
  });

  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "vehicles.png"), PNG.sync.write(sheet));
  fs.writeFileSync(
    path.join(out, "vehicles.json"),
    JSON.stringify(painted.types, null, 2) + "\n",
  );

  console.log(
    "Wrote " +
      Object.keys(painted.images).length +
      " pictures of " +
      rows.length +
      " body types to " +
      path.relative(process.cwd(), out),
  );
}

function blit(image, sheet, x0, y0) {
  for (var y = 0; y < image.height; y++)
    for (var x = 0; x < image.width; x++)
      for (var c = 0; c < 4; c++)
        sheet.data[((y0 + y) * sheet.width + x0 + x) * 4 + c] =
          image.data[(y * image.width + x) * 4 + c];
}

main();
