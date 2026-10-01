/**
 * Writes out the blocks src/shared/gen/flats and src/shared/gen/offices paint
 * the parts of - the same parts the game puts its blocks together out of - to
 * look at, and to try a change to the painting on before the game gets it.
 *
 * buildings.png has every block standing on grass, put together from its
 * parts tile by tile the way the game draws it - back to front - a row per
 * kind and height, its palettes across, each from all four sides. The
 * details - storeys, roofs, yards - are a fixed pick for each palette; in the
 * game they are picked at random for every block built.
 *
 * sites.png has every kind going up: a row per kind, its stages across
 * (shared/gen/stacking stageOf) and the finished block last, each as it is
 * and turned a quarter turn.
 *
 * Usage:
 *   node tools/genbuildings.js [outDir]
 *
 * outDir is assets/previews unless given.
 */

var fs = require("fs");
var path = require("path");
var PNG = require("pngjs").PNG;
var iso = require("../src/shared/gen/isobox.js");
var stacking = require("../src/shared/gen/stacking.js");

var GENERATORS = {
  flats: require("../src/shared/gen/flats.js"),
  offices: require("../src/shared/gen/offices.js"),
};

var ROOT = path.resolve(__dirname, "..");
var DEFAULT_OUT = path.join(ROOT, "assets/previews");

//as in data/flats and data/offices: which generator, how many sections side
//by side, whether there is a row of yard in front and which yards
var KINDS = [
  { gen: "flats", cells: 1, yard: false, storeys: [2, 3, 4] },
  { gen: "flats", cells: 1, yard: true, storeys: [2, 3, 4] },
  { gen: "flats", cells: 2, yard: false, storeys: [2, 3, 4] },
  { gen: "flats", cells: 2, yard: true, storeys: [2, 3, 4] },
  { gen: "offices", cells: 1, yard: true, storeys: [3], yards: ["parking"] },
  {
    gen: "offices",
    cells: 2,
    yard: true,
    storeys: [4],
    yards: ["parking", "plaza"],
  },
];
var GRASS = [112, 158, 84];
var CELL_W = 200,
  CELL_H = 230;

/**
 * What stands on each tile of a block, as client/compoundbuilding picks it -
 * here the same pick every time for a palette.
 */
function plan(kind, storeys, palette, n) {
  var data = GENERATORS[kind.gen].describe().data,
    yards = kind.yards || data.yards,
    detail = data.details[n % data.details.length],
    tiles = [];

  for (var c = 0; c < kind.cells; c++) {
    var ends = kind.cells === 1 ? "both" : c === 0 ? "start" : "end",
      section = palette + "/" + ends + "/",
      gen = kind.gen,
      parts = [gen + "/ground/" + section + (kind.yard ? "yard" : "street")];

    for (var k = 1; k < storeys; k++)
      parts.push(gen + "/upper/" + section + detail);

    parts.push(gen + "/roof/" + section + ((n + c) % data.roofs));
    tiles.push({ x: c, y: kind.yard ? 1 : 0, parts: parts });

    if (kind.yard)
      tiles.push({
        x: c,
        y: 0,
        parts: [gen + "/yard/" + yards[(n + c) % yards.length] + "/" + (c % 2)],
      });
  }

  return { tiles: tiles, sizeX: kind.cells, sizeY: kind.yard ? 2 : 1 };
}

function canvas(cols, rows) {
  var png = new PNG({ width: cols * CELL_W, height: rows * CELL_H });

  for (var i = 0; i < png.data.length; i += 4) {
    png.data[i] = png.data[i + 1] = png.data[i + 2] = 40;
    png.data[i + 3] = 255;
  }

  return png;
}

//a grass tile's diamond, lit from above
var ground = { w: 64, h: 32, pixels: [] };

for (var j = 0; j < 32; j++)
  for (var i = 0; i < 64; i++)
    ground.pixels.push(
      Math.abs(i + 0.5 - 32) / 2 + Math.abs(j + 0.5 - 16) <= 16
        ? iso.lighter(GRASS, 0.22)
        : null,
    );

/**
 * Draws the block on tiles, turned, in the cell at col, row: on the grass
 * around it, its tiles back to front.
 */
function draw(png, gen, tiles, p, turns, col, row) {
  var sizeX = turns % 2 ? p.sizeY : p.sizeX,
    sizeY = turns % 2 ? p.sizeX : p.sizeY,
    pieces = iso.paintTiles(
      GENERATORS[gen].model(tiles, p.sizeX, p.sizeY, turns),
      sizeX,
      sizeY,
    ),
    ox = col * CELL_W + CELL_W / 2,
    oy = row * CELL_H + CELL_H - 50,
    gx,
    gy;

  for (gx = -1; gx <= 2; gx++)
    for (gy = -1; gy <= 2; gy++)
      iso.blit(png, ground, ox + (gx - gy) * 32 - 32, oy - (gx + gy) * 16 - 16);

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
}

function write(png, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
  console.log("Wrote " + path.relative(process.cwd(), file));
}

function main() {
  var out = path.resolve(process.argv[2] || DEFAULT_OUT),
    stages = stacking.STAGES.length + 1,
    rows = [],
    cols = 0;

  KINDS.forEach(function (kind) {
    var palettes = GENERATORS[kind.gen].describe().data.palettes;

    kind.storeys.forEach(function (storeys) {
      rows.push({ kind: kind, storeys: storeys, palettes: palettes });
      cols = Math.max(cols, palettes.length * 4);
    });
  });

  var blocks = canvas(cols, rows.length),
    sites = canvas((stages + 1) * 2, rows.length);

  rows.forEach(function (r, row) {
    r.palettes.forEach(function (palette, n) {
      var p = plan(r.kind, r.storeys, palette, n);

      [0, 1, 2, 3].forEach(function (turns) {
        draw(blocks, r.kind.gen, p.tiles, p, turns, n * 4 + turns, row);
      });
    });

    var p = plan(r.kind, r.storeys, r.palettes[0], 0);

    for (var stage = 0; stage <= stages; stage++)
      [0, 1].forEach(function (turns) {
        draw(
          sites,
          r.kind.gen,
          stage < stages ? stacking.siteTiles(p.tiles, stage) : p.tiles,
          p,
          turns,
          stage * 2 + turns,
          row,
        );
      });
  });

  write(blocks, path.join(out, "buildings.png"));
  write(sites, path.join(out, "sites.png"));
}

main();
