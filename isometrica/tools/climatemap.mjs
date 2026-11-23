/**
 * Draws the climate's zones over the world's land and sea as a picture, and
 * says how much land each zone has.
 *
 * Usage: node tools/climatemap.mjs [--png file] [--temperature t] [--at x,y]
 *          [--size n] [--px n]
 * See isometrica/.claude/skills/generators/ground.md (Climate).
 */
import { createServer } from "vite";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

var require = createRequire(import.meta.url),
  PNG = require("pngjs").PNG;

//the modules it loads only ever look for a window to hang a namespace on
globalThis.window = globalThis;

var here = path.dirname(fileURLToPath(import.meta.url));

function options(argv) {
  var o = {
    png: "climate.png",
    temperature: undefined,
    at: [32768, 32768],
    size: 65536,
    px: 512,
  };

  for (var i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--png":
        o.png = argv[++i];
        break;
      case "--temperature":
        o.temperature = parseFloat(argv[++i]);
        break;
      case "--at":
        o.at = argv[++i].split(",").map(Number);
        break;
      case "--size":
        o.size = parseInt(argv[++i], 10);
        break;
      case "--px":
        o.px = parseInt(argv[++i], 10);
        break;
      default:
        throw new Error("unknown option " + argv[i]);
    }
  }

  if (
    isNaN(o.size) ||
    isNaN(o.px) ||
    o.at.length !== 2 ||
    o.at.some(isNaN) ||
    (o.temperature !== undefined && isNaN(o.temperature))
  )
    throw new Error("--size, --px, --at x,y and --temperature take numbers");

  return o;
}

//the colours of the land of each zone - and of its shore - and of the sea,
//open and frozen over, as the game's world map has them
var LANDS = {
    desert: {
      low: [236, 210, 150],
      high: [204, 164, 108],
      shore: [226, 204, 150],
    },
    savannah: {
      low: [204, 164, 92],
      high: [170, 112, 70],
      shore: [214, 190, 140],
    },
    temperate: {
      low: [96, 164, 72],
      high: [52, 110, 42],
      shore: [214, 200, 146],
    },
    arctic: {
      low: [210, 220, 222],
      high: [170, 186, 186],
      shore: [214, 224, 236],
    },
    polar: {
      low: [246, 248, 252],
      high: [214, 222, 236],
      shore: [230, 236, 244],
    },
  },
  SEA = [
    [74, 150, 214],
    [18, 46, 118],
  ],
  ICE = [
    [206, 226, 238],
    [170, 200, 222],
  ];

function mix(a, b, t) {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

function colour(h, zone) {
  var land = LANDS[zone.id] || LANDS.temperate;

  if (h <= 0)
    return mix.apply(
      null,
      (zone.water !== null ? ICE : SEA).concat([Math.min(1, -h / 10)]),
    );
  if (h <= 1) return land.shore;

  return mix(land.low, land.high, Math.min(1, (h - 2) / 6));
}

var o = options(process.argv.slice(2)),
  server = await createServer({
    root: path.join(here, ".."),
    configFile: false,
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });

try {
  var Climate = (await server.ssrLoadModule("/src/core/climate.js")).default,
    Terrain = (await server.ssrLoadModule("/src/core/terrain.js")).default,
    terrain = new Terrain(null),
    step = o.size / o.px,
    x0 = o.at[0] - o.size / 2,
    y0 = o.at[1] - o.size / 2,
    png = new PNG({ width: o.px, height: o.px }),
    land = {},
    lands = 0,
    frozen = 0,
    seas = 0;

  Climate.setTemperature(o.temperature);

  Climate.ZONES.forEach(function (zone) {
    land[zone.id] = 0;
  });

  //north up, as the game's map from above has it: y up
  for (var row = 0; row < o.px; row++)
    for (var i = 0; i < o.px; i++) {
      var x = Math.floor(x0 + (i + 0.5) * step),
        y = Math.floor(y0 + (o.px - row - 0.5) * step),
        c = [0, 0, 0];

      if (x >= 0 && y >= 0 && x < 65536 && y < 65536) {
        var h = terrain.getGridPointHeight(x, y),
          zone = Climate.zoneAt(x, y);

        c = colour(h, zone);

        if (h > 0) {
          land[zone.id]++;
          lands++;
        } else {
          seas++;
          if (zone.water !== null) frozen++;
        }
      }

      var p = (row * o.px + i) * 4;

      png.data[p] = Math.round(c[0]);
      png.data[p + 1] = Math.round(c[1]);
      png.data[p + 2] = Math.round(c[2]);
      png.data[p + 3] = 255;
    }

  fs.writeFileSync(o.png, PNG.sync.write(png));

  console.log(
    "temperature in the middle of the world: " +
      Climate.getTemperature() +
      "°, " +
      Math.round(1 / Climate.LAPSE) +
      " tiles a degree out from it",
  );
  Climate.ZONES.forEach(function (zone, i) {
    console.log(
      "  " +
        zone.name.padEnd(8) +
        (i === 0
          ? " in the middle"
          : " from " +
            Math.round(Climate.radius(zone.id)) +
            " tiles out, mixed with the one before it " +
            Math.round(Climate.BLEND / Climate.LAPSE) +
            " either way") +
        " - " +
        (lands ? Math.round((100 * land[zone.id]) / lands) : 0) +
        "% of the land in sight",
    );
  });
  console.log(
    "  " +
      (seas ? Math.round((100 * frozen) / seas) : 0) +
      "% of the water in sight frozen over",
  );
  console.log("wrote " + o.px + " x " + o.px + " to " + o.png);
} finally {
  await server.close();
}
