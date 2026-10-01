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
 * and turned a quarter turn - with what the game draws over a site, the
 * machines at rest and the crane's jib straight along its track. The last
 * row is the site of a building drawn by hand, 1x1, 2x1 and 2x2, each dealt
 * what stands on it two ways.
 *
 * shops.png has the shops of shared/gen/shops: a row for each footprint,
 * shops of it put together at random across - each as it is and turned a
 * quarter turn - and under each footprint's row the same shops going up.
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
var Vehicles = require("../src/shared/gen/vehicles.js");
var compose = require("../src/shared/gen/compose.js");

var GENERATORS = {
  flats: require("../src/shared/gen/flats.js"),
  offices: require("../src/shared/gen/offices.js"),
  sites: require("../src/shared/gen/sites.js"),
  shops: require("../src/shared/gen/shops.js"),
};

//what each generator describes, once
var DESCRIBED = {};

function described(gen) {
  return (DESCRIBED[gen] = DESCRIBED[gen] || GENERATORS[gen].describe());
}

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

//a painted picture, {width, height, data}, as iso.blit takes one
function picture(image, pivotX, pivotY) {
  var pixels = [];

  for (var k = 0; k < image.data.length; k += 4)
    pixels.push(
      image.data[k + 3] === 0
        ? null
        : [image.data[k], image.data[k + 1], image.data[k + 2]],
    );

  return {
    w: image.width,
    h: image.height,
    pixels: pixels,
    pivotX: pivotX,
    pivotY: pivotY,
  };
}

var vehicleTypes = Vehicles.describe().types;

//what parks in a car park
var PARKED = ["sedan", "hatchback", "pickup", "van"];

/**
 * What is drawn over a tile with these parts, turned - the pictures at rest,
 * each with its pivot where the tile's middle is.
 */
function overlays(parts, turns) {
  var up = stacking.lifts(parts.map(stacking.kindOf), 12),
    out = [];

  parts.forEach(function (part, i) {
    var gen = part.split("/")[0],
      g = GENERATORS[gen],
      data = described(gen),
      listed = (data.data.overlays || {})[part + "/r" + turns] || [];

    listed.forEach(function (o, k) {
      if (o.bays !== undefined) {
        //cars in the bays, some of them empty, as a shop or a block might
        //have them
        o.bays
          .map(function (bay, n) {
            return { bay: bay, n: n };
          })
          .sort(function (a, b) {
            return a.bay.y - b.bay.y;
          })
          .forEach(function (q) {
            var bay = q.bay,
              n = q.n;
            var r = (n * 7 + k * 3 + parts.length) % 8;

            if (r < 2) return;

            var type = PARKED[r % PARKED.length],
              colors = Object.keys(vehicleTypes[type].colors),
              look =
                vehicleTypes[type].colors[colors[(r * 5 + n) % colors.length]][
                  bay.headings[n % bay.headings.length]
                ];

            out.push(
              picture(
                Vehicles.paint(look.sprite),
                look.pivotX - bay.x,
                look.pivotY - bay.y + up[i],
              ),
            );
          });
      } else if (o.vehicle !== undefined) {
        var look = vehicleTypes[o.vehicle].colors[o.color][o.heading];

        out.push(
          picture(
            Vehicles.paint(look.sprite),
            look.pivotX - o.x,
            look.pivotY - o.y,
          ),
        );
      } else {
        //the jib straight along its track, halfway through its turn
        var name = o.frames[(o.frames.length - 1) / 2],
          size = data.sizes[name];

        out.push(picture(g.paint(name), size.pivotX, size.pivotY + up[i]));
      }
    });
  });

  return out;
}

//where tile x, y of a footprint sizeX by sizeY goes, turned
function turnTile(x, y, sizeX, sizeY, turns) {
  return [
    [x, y],
    [y, sizeX - 1 - x],
    [sizeX - 1 - x, sizeY - 1 - y],
    [sizeY - 1 - y, x],
  ][turns];
}

/**
 * Draws the block on tiles, turned, in the cell at col, row: on the grass
 * around it, its tiles back to front, each with what is drawn over it.
 */
function draw(png, gen, tiles, p, turns, col, row) {
  var sizeX = turns % 2 ? p.sizeY : p.sizeX,
    sizeY = turns % 2 ? p.sizeX : p.sizeY,
    pieces = iso.paintTiles(
      compose.model(tiles, p.sizeX, p.sizeY, turns),
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
      var mx = ox + (piece.x - piece.y) * 32,
        my = oy - (piece.x + piece.y) * 16;

      iso.blit(png, piece, mx - piece.pivotX, my - piece.pivotY);

      tiles.forEach(function (tile) {
        var at = turnTile(tile.x, tile.y, p.sizeX, p.sizeY, turns);

        if (at[0] !== piece.x || at[1] !== piece.y) return;

        overlays(tile.parts, turns).forEach(function (o) {
          iso.blit(
            png,
            o,
            Math.round(mx - o.pivotX),
            Math.round(my - o.pivotY),
          );
        });
      });
    });
}

function write(png, file) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, PNG.sync.write(png));
  console.log("Wrote " + path.relative(process.cwd(), file));
}

/**
 * A shop of a footprint put together the way client/compoundbuilding picks
 * one - a design by its weight, every option at random - with numbers that
 * are the same for the same seed.
 */
function shopLook(designs, seed) {
  var s = seed;

  function rnd() {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  }

  var total = designs.reduce(function (a, d) {
      return a + d.weight;
    }, 0),
    roll = rnd() * total,
    d = designs[0];

  for (var i = 0; i < designs.length; i++) {
    d = designs[i];
    if ((roll -= d.weight) < 0) break;
  }

  var options = {};

  Object.keys(d.axes).forEach(function (axis) {
    options[axis] = d.axes[axis][Math.floor(rnd() * d.axes[axis].length)];
  });

  return d.tiles.map(function (t) {
    return {
      x: t.x,
      y: t.y,
      parts: t.parts.map(function (p) {
        for (var pass = 0; pass < 2; pass++)
          p = p.replace(/\{(\w+)\}/g, function (m, a) {
            return options[a];
          });
        return p;
      }),
    };
  });
}

function shops() {
  var footprints = described("shops").data.footprints,
    names = Object.keys(footprints),
    per = 5,
    png = canvas(per * 2, names.length * 2);

  names.forEach(function (fp, row) {
    var size = fp.split("x").map(Number),
      p = { sizeX: size[0], sizeY: size[1] };

    for (var n = 0; n < per; n++) {
      var tiles = shopLook(footprints[fp], 7 + n * 101 + row * 13);

      [0, 1].forEach(function (turns) {
        draw(png, "shops", tiles, p, turns, n * 2 + turns, row * 2);
      });

      //going up, half the way there
      draw(
        png,
        "shops",
        stacking.siteTiles(tiles, 1 + (n % 2), 3 + n),
        p,
        0,
        n * 2,
        row * 2 + 1,
      );
    }
  });

  return png;
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
    sites = canvas((stages + 1) * 2, rows.length + 1);

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
          stage < stages ? stacking.siteTiles(p.tiles, stage, 7) : p.tiles,
          p,
          turns,
          stage * 2 + turns,
          row,
        );
      });
  });

  //the sites of buildings drawn by hand
  [
    [1, 1],
    [2, 1],
    [2, 2],
  ].forEach(function (size, n) {
    [3, 11].forEach(function (seed, k) {
      var footprint = { sizeX: size[0], sizeY: size[1] };

      draw(
        sites,
        "sites",
        stacking.lotTiles(size[0], size[1], seed),
        footprint,
        0,
        n * 2 + k,
        rows.length,
      );
    });
  });

  write(blocks, path.join(out, "buildings.png"));
  write(shops(), path.join(out, "shops.png"));
  write(sites, path.join(out, "sites.png"));
}

main();
