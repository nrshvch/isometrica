/**
 * Generates cities headless (src/citygen) and says how they came out: a map
 * of each, in letters, and whatever about it is not the way the game wants
 * it - opened in the game's own world (isometrica core), every building
 * asked what it goes without, as the game asks it over the world
 * (isometrica client/worth wantOf).
 *
 *   node tools/gencity.js [--seed=N] [--seeds=N] [--size=city]
 *                         [--at=x,y] [--map] [--quiet]
 *
 * Exits 1 if any city has something wrong with it that should never be.
 */
import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

//the modules it loads only ever look for a window to hang a namespace on
globalThis.window = globalThis;

var here = path.dirname(fileURLToPath(import.meta.url)),
  args = process.argv.slice(2),
  flag = function (name, dflt) {
    var a = args.find(function (x) {
      return x.indexOf("--" + name + "=") === 0;
    });

    return a ? a.split("=")[1] : dflt;
  },
  seed = +flag("seed", 1),
  seeds = +flag("seeds", 1),
  size = flag("size", "city"),
  at = flag("at", "31979,27187").split(",").map(Number),
  showMap = args.indexOf("--map") !== -1;

var server = await createServer({
  root: path.join(here, ".."),
  configFile: false,
  logLevel: "error",
  appType: "custom",
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  //the engine's own "events", not node's, which goes by the same name
  resolve: {
    alias: [
      {
        find: /^events$/,
        replacement: path.join(here, "../../engine/events/dist/events.js"),
      },
    ],
  },
});

var failures = 0;

try {
  var Gen = await server.ssrLoadModule("/src/citygen/index.js"),
    Check = await server.ssrLoadModule("/tools/citycheck.js");

  for (var k = 0; k < seeds; k++) {
    var started = performance.now(),
      out = Gen.default({ size: size, seed: seed + k, near: at }),
      took = performance.now() - started,
      report = Check.check(out);

    if (showMap) console.log(Check.map(out.plan));

    console.log(
      (report.ok ? "ok   " : "FAIL ") +
        "seed " +
        (seed + k) +
        "  " +
        Math.round(took) +
        " ms  " +
        report.line,
    );

    if (report.opened)
      console.log(
        "       in the game: " +
          report.opened.population +
          " people of " +
          report.opened.capacity +
          ", " +
          report.opened.jobs +
          " jobs, net $" +
          Math.round(report.opened.budget.net) +
          " a tick" +
          Object.keys(report.wants)
            .map(function (w) {
              return ", " + report.wants[w].length + " " + w;
            })
            .join(""),
      );

    report.problems.forEach(function (p) {
      console.log("       " + p);
    });

    if (!report.ok) failures++;
  }
} finally {
  await server.close();
}

process.exit(failures > 0 ? 1 : 0);
