/**
 * Writes out the blocks of flats src/shared/gen/flats paints the parts of -
 * the same parts the game puts its blocks together out of - to look at, and
 * to try a change to the painting on before the game gets it.
 *
 * buildings.png has every block standing on grass, put together from its
 * parts tile by tile the way the game draws it - back to front - a row per
 * layout and height, its palettes across, each from all four sides.
 * The details - balconies, roofs, yards - are a fixed pick for each palette;
 * in the game they are picked at random for every block built.
 *
 * Usage:
 *   node tools/genbuildings.js [outFile]
 *
 * outFile is assets/previews/buildings.png unless given.
 */

var fs = require("fs");
var path = require("path");
var PNG = require("pngjs").PNG;
var flats = require("../src/shared/gen/flats.js");
var iso = require("../src/shared/gen/isobox.js");

var ROOT = path.resolve(__dirname, "..");
var DEFAULT_OUT = path.join(ROOT, "assets/previews/buildings.png");

//as in data/flats: how many sections side by side, and a yard in front
var LAYOUTS = {
  tower: { cells: 1, yard: false },
  toweryard: { cells: 1, yard: true },
  wall: { cells: 2, yard: false },
  wallyard: { cells: 2, yard: true },
};
var STOREYS = [2, 3, 4];
var GRASS = [112, 158, 84];

/**
 * What stands on each tile of a block, as client/compoundbuilding picks it -
 * here the same pick every time for a palette.
 */
function plan(layout, storeys, palette, n) {
  var l = LAYOUTS[layout],
    yards = ["playground", "lawn", "parking"],
    tiles = [];

  for (var c = 0; c < l.cells; c++) {
    var ends = l.cells === 1 ? "both" : c === 0 ? "start" : "end",
      section = palette + "/" + ends + "/",
      parts = ["flats/ground/" + section + (l.yard ? "yard" : "street")];

    for (var k = 1; k < storeys; k++)
      parts.push("flats/upper/" + section + (n % 2) + ((n + 1) % 2));

    parts.push("flats/roof/" + section + (n % 2));
    tiles.push({ x: c, y: l.yard ? 1 : 0, parts: parts });

    if (l.yard)
      tiles.push({
        x: c,
        y: 0,
        parts: ["flats/yard/" + yards[(n + c) % 3] + "/" + (c % 2)],
      });
  }

  return { tiles: tiles, sizeX: l.cells, sizeY: l.yard ? 2 : 1 };
}

function main() {
  var out = path.resolve(process.argv[2] || DEFAULT_OUT),
    palettes = flats.describe().data.palettes,
    cellW = 200,
    cellH = 230,
    cols = palettes.length * 4,
    rows = Object.keys(LAYOUTS).length * STOREYS.length,
    png = new PNG({ width: cols * cellW, height: rows * cellH }),
    ground = { w: 64, h: 32, pixels: [] },
    row = 0,
    i,
    j;

  for (i = 0; i < png.data.length; i += 4) {
    png.data[i] = png.data[i + 1] = png.data[i + 2] = 40;
    png.data[i + 3] = 255;
  }

  //a grass tile's diamond, lit from above
  for (j = 0; j < 32; j++)
    for (i = 0; i < 64; i++)
      ground.pixels.push(
        Math.abs(i + 0.5 - 32) / 2 + Math.abs(j + 0.5 - 16) <= 16
          ? iso.lighter(GRASS, 0.22)
          : null,
      );

  Object.keys(LAYOUTS).forEach(function (layout) {
    STOREYS.forEach(function (storeys) {
      palettes.forEach(function (palette, n) {
        var p = plan(layout, storeys, palette, n);

        [0, 1, 2, 3].forEach(function (turns) {
          var sizeX = turns % 2 ? p.sizeY : p.sizeX,
            sizeY = turns % 2 ? p.sizeX : p.sizeY,
            pieces = iso.paintTiles(
              flats.model(p.tiles, p.sizeX, p.sizeY, turns),
              sizeX,
              sizeY,
            ),
            ox = (n * 4 + turns) * cellW + cellW / 2,
            oy = row * cellH + cellH - 50,
            gx,
            gy;

          //the tiles around it, so it can be seen standing among them
          for (gx = -1; gx <= 2; gx++)
            for (gy = -1; gy <= 2; gy++)
              iso.blit(
                png,
                ground,
                ox + (gx - gy) * 32 - 32,
                oy - (gx + gy) * 16 - 16,
              );

          pieces
            .sort(function (a, b) {
              return b.x + b.y - (a.x + a.y);
            })
            .forEach(function (piece) {
              iso.blit(
                png,
                piece,
                ox + (piece.x - piece.y) * 32 - piece.pivotX,
                oy - (piece.x + piece.y) * 16 - piece.pivotY,
              );
            });
        });
      });

      row++;
    });
  });

  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, PNG.sync.write(png));
  console.log("Wrote " + path.relative(process.cwd(), out));
}

main();
