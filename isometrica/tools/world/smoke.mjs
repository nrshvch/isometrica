/**
 * What the smoke costs and whether it holds still in time: over a town with
 * chimneys and far out in the country, the game objects and tickers there
 * are for smoke, what it takes a frame (its tickers, or its section), how
 * many puffs are alive and on the screen (and drawn, their pictures painted); and, where the build works puffs out from
 * their source and the time (client/smoke sample), whether the same time
 * gives the same puffs - asked twice, and again after the camera has gone
 * twelve chunks away and come back. On a city generated from a fixed seed
 * (--city=town|city|metropolis, none for a new player's). Skill rendering,
 * smoke.md; isometrica/docs/world.md, Measuring.
 *
 *   node tools/world/smoke.mjs <url> [--city=town] [--away=12] [--far=60]
 */
/* global vkaria, Isometrica */
import { args, flag, launch, openWorld } from "./page.mjs";

var [url] = args(),
  away = +flag("away", 12),
  far = +flag("far", 60),
  size = flag("city", "town");

if (!url) {
  console.log(
    "node tools/world/smoke.mjs <url> [--city=town] [--away=12] [--far=60]",
  );
  process.exit(2);
}

var browser = await launch(),
  page = await openWorld(
    browser,
    url,
    15000,
    size === "none"
      ? null
      : { id: "smokes", size: size, seed: 7, near: [32768, 27000] },
  );

//the camera over (x, z) chunks from where it started
async function go(dx, dz) {
  await page.evaluate(
    function (a) {
      var C = Isometrica.Client.Config,
        step = C.chunkSize * C.tileSize,
        cam = vkaria.camera.cameraScript;

      if (!window.__start)
        window.__start = vkaria.camera.transform.getPosition([]).slice();
      cam.lookAt(
        window.__start[0] + a[0] * step,
        window.__start[2] + a[1] * step,
      );
    },
    [dx, dz],
  );
}

//what smoke costs over 60 frames, and what of it there is
async function cost() {
  await page.evaluate("Isometrica.Engine.Stats.enable(true, true)");
  await page.waitForFunction(
    "Isometrica.Engine.Stats.snapshot().frames >= 60",
    null,
    { timeout: 180000, polling: 500 },
  );

  var r = await page.evaluate(function () {
    var s = Isometrica.Engine.Stats.snapshot(),
      world = vkaria.game.logic.world,
      out = {
        tickMs: 0,
        tickers: 0,
        sectionMs: 0,
        frame: 0,
        alive: 0,
        drawn: 0,
        sources: 0,
        objects: 0,
        smokeObjects: 0,
      },
      counter = function (name) {
        var c = s.counters.find(function (x) {
          return x.name === name;
        });

        return c ? c.avg : -1;
      };

    s.tickers.forEach(function (t) {
      if (t.name === "chimneys" || t.name === "smoke") {
        out.tickMs += t.avg;
        out.tickers += t.calls;
      }
    });
    s.sections.forEach(function (x) {
      if (x.name === "frame") out.frame = x.avg;
      if (x.name === "smoke") out.sectionMs = x.avg;
    });

    //the game objects there are, and of them smoke's: a puff or a chimney
    var M = vkaria.lighting.M,
      W = vkaria.game.viewport ? vkaria.game.viewport.width : innerWidth,
      H = vkaria.game.viewport ? vkaria.game.viewport.height : innerHeight,
      p = [0, 0, 0];

    out.objects = world.gameObjectsCount;
    world.gameObjects.forEach(function (go) {
      if (!go || go.world === null) return;
      var smoke = false,
        puff = go.smoke !== undefined;

      for (var i = 0; i < go.componentsCount; i++) {
        var n = go.components[i].profileName;

        if (n === "chimneys" || n === "smoke") smoke = true;
      }
      if (!smoke && !puff) return;
      out.smokeObjects++;
      if (!puff) return;
      out.alive++;
      go.transform.getPosition(p);
      var sx = M[0] * p[0] + M[4] * p[1] + M[8] * p[2] + M[12],
        sy = M[1] * p[0] + M[5] * p[1] + M[9] * p[2] + M[13];

      if (sx > -16 && sx < W + 16 && sy > -16 && sy < H + 16) out.drawn++;
    });

    //puffs worked out, not kept: what the smoke says of itself
    if (vkaria.smoke) {
      out.alive = Math.round(counter("puffs"));
      out.drawn = Math.round(counter("puffs on screen"));
      out.painted = Math.round(counter("puffs drawn"));
      out.sources = Math.round(counter("smoke sources"));
      out.chimneys = vkaria.smoke.sources.count;
    }

    ["tickMs", "sectionMs", "frame"].forEach(function (k) {
      out[k] = +out[k].toFixed(3);
    });
    out.tickers = Math.round(out.tickers);

    return out;
  });

  await page.evaluate("Isometrica.Engine.Stats.enable(false)");

  return r;
}

//the puffs at time t, as rows of numbers (client/smoke sample) - none in a
//build that keeps them as game objects
function sample(t) {
  return page.evaluate(function (t) {
    return vkaria.smoke ? Array.from(vkaria.smoke.sample(t)) : null;
  }, t);
}

//the same puffs, in whatever order they were found
function same(a, b) {
  if (a === null || b === null || a.length !== b.length) return false;

  var rows = function (list) {
    var out = [];

    for (var i = 0; i < list.length; i += 8)
      out.push(list.slice(i, i + 8).join(","));

    return out.sort().join(";");
  };

  return rows(a) === rows(b);
}

var costs = [];

await go(0, 0);
await page.waitForTimeout(4000);
costs.push(["over the town", await cost()]);

var t = await page.evaluate("vkaria.game.time.now - 1000"),
  first = await sample(t),
  again = await sample(t);

await go(away, 0);
await page.waitForTimeout(12000);
costs.push([away + " chunks off", await cost()]);
await go(0, 0);
await page.waitForTimeout(6000);

var back = await sample(t);

await go(far, far);
await page.waitForTimeout(12000);
costs.push([far + " chunks off, the country", await cost()]);

console.log(
  "camera over".padEnd(28),
  "smoke ms (tickers / own)".padEnd(26),
  "frame ms".padEnd(10),
  "objects (smoke) / tickers".padEnd(27),
  "chimneys in reach".padEnd(18),
  "puffs alive / on screen",
);
costs.forEach(function (c) {
  var r = c[1];

  console.log(
    c[0].padEnd(28),
    (r.tickMs + " / " + r.sectionMs).padEnd(26),
    String(r.frame).padEnd(10),
    (r.objects + " (" + r.smokeObjects + ") / " + r.tickers).padEnd(27),
    String(
      r.chimneys === undefined ? "-" : r.sources + " of " + r.chimneys,
    ).padEnd(18),
    r.alive +
      " / " +
      r.drawn +
      (r.painted === undefined ? "" : " (" + r.painted + " painted)"),
  );
});

if (first === null) console.log("the same time, the same puffs: n/a (kept)");
else
  console.log(
    "the same time, the same puffs:",
    first.length / 8,
    "puffs;",
    "asked again",
    same(first, again) ? "the same" : "DIFFERENT",
    "| after",
    away,
    "chunks away and back",
    same(first, back) ? "the same" : "DIFFERENT (" + back.length / 8 + ")",
  );

await browser.close();
