/**
 * Generates cities headless and checks them (lab/cities/check.js); exits 1
 * on any failure.
 *
 *   node tools/citytest.mjs [--size=town,city,metropolis] [--seed=N]
 *                           [--seeds=N] [--at=x,y] [--map]
 *
 * See .claude/skills/citygen.
 */
import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

//the modules only look for a window to hang a namespace on
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
  sizes = flag("size", ""),
  at = flag("at", "31979,27187").split(",").map(Number),
  showMap = args.indexOf("--map") !== -1;

var server = await createServer({
  root: path.join(here, ".."),
  configFile: false,
  logLevel: "error",
  appType: "custom",
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
  resolve: {
    alias: [
      {
        //the engine's "events", not node's
        find: /^events$/,
        replacement: path.join(here, "../../engine/events/dist/events.js"),
      },
    ],
  },
});

var failures = 0;

try {
  var Gen = await server.ssrLoadModule("/src/citygen/index.js"),
    Check = await server.ssrLoadModule("/lab/cities/check.js");

  var all = sizes ? sizes.split(",") : Object.keys(Gen.SIZES),
    runs = [];

  all.forEach(function (size) {
    for (var k = 0; k < seeds; k++) runs.push({ size: size, seed: seed + k });
  });

  for (var run of runs) {
    var started = performance.now(),
      out = Gen.default({ size: run.size, seed: run.seed, near: at }),
      took = performance.now() - started,
      report = Check.check(out);

    if (showMap) console.log(Check.map(out.plan));

    console.log(
      (report.ok ? "ok   " : "FAIL ") +
        run.size +
        " seed " +
        run.seed +
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
