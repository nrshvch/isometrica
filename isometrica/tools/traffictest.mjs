/**
 * Runs every scenario of the traffic testbed (lab/trafficbed) headless and
 * says which hold and which do not - the game's own traffic, on the roads
 * and with the cars each scenario puts down (npm run test:traffic here).
 *
 *   node tools/traffictest.js [name ...] [--seed=N] [--seeds=N] [--verbose]
 *
 * Exits 1 if any does not hold.
 */
import { createServer } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

//the modules it loads only ever look for a window to hang a namespace on
globalThis.window = globalThis;

var here = path.dirname(fileURLToPath(import.meta.url)),
  args = process.argv.slice(2),
  names = args.filter(function (a) {
    return a[0] !== "-";
  }),
  flag = function (name, dflt) {
    var a = args.find(function (x) {
      return x.indexOf("--" + name + "=") === 0;
    });

    return a ? +a.split("=")[1] : dflt;
  },
  verbose = args.indexOf("--verbose") !== -1,
  seed = flag("seed", 1),
  seeds = flag("seeds", 1);

var server = await createServer({
  root: path.join(here, ".."),
  configFile: false,
  logLevel: "error",
  appType: "custom",
  server: { middlewareMode: true, hmr: false, watch: null },
  optimizeDeps: { noDiscovery: true, include: [] },
});

var failures = 0;

try {
  var S = await server.ssrLoadModule("/lab/trafficbed/scenarios.js");

  for (var scenario of S.SCENARIOS) {
    if (names.length && names.indexOf(scenario.name) === -1) continue;

    for (var k = 0; k < seeds; k++) {
      var started = Date.now(),
        r = S.check(scenario, seed + k),
        rep = r.report;

      if (!r.ok) failures++;

      console.log(
        (r.ok ? "ok   " : "FAIL ") +
          scenario.name.padEnd(20) +
          (seeds > 1 ? " seed " + (seed + k) : "") +
          "  " +
          rep.seconds +
          " s, " +
          rep.cars +
          " cars, " +
          rep.arrived +
          " got there, turned round " +
          rep.uturns.junction +
          "/" +
          rep.uturns.deadEnd +
          "/" +
          rep.uturns.road +
          " (junction/dead end/mid-road), stood at most " +
          rep.mostStood +
          " s" +
          "  [" +
          (Date.now() - started) +
          " ms]",
      );

      if (!r.ok) console.log("       " + r.failed.join("; "));
      if (!r.ok || verbose) {
        if (rep.badTurns.length)
          console.log(
            "       mid-road turns:",
            JSON.stringify(rep.badTurns.slice(0, 6)),
          );
        if (rep.mostStoodBy && rep.mostStood > 10)
          console.log("       stood longest:", JSON.stringify(rep.mostStoodBy));
        if (rep.locks.length)
          console.log("       locked:", JSON.stringify(rep.locks.slice(0, 4)));
        if (rep.overlaps.length)
          console.log(
            "       on top of each other:",
            JSON.stringify(rep.overlaps.slice(0, 4)),
          );
        if (rep.noRoute.length)
          console.log(
            "       no way:",
            JSON.stringify(rep.noRoute.slice(0, 4)),
          );
      }
    }
  }
} finally {
  await server.close();
}

process.exit(failures ? 1 : 0);
