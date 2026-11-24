/**
 * The bulldozers out of sight and over a reload: ground cleared (trees,
 * stones) and a building demolished through the game's own way (client
 * clearworks clear, core/city clearTile), on the town a new player starts on
 * - once watched, for how long it takes; once with the camera gone twelve
 * chunks away for longer than that, whether it is done when it comes back
 * and when, and what game objects and tickers the works keep meanwhile; and
 * once saved and the page opened again halfway (the page's own save and a
 * reload), whether the bulldozers go on where they were and finish. Skill
 * buildings, going-up.md; isometrica/docs/world.md, Measuring.
 *
 *   node tools/world/works.mjs <url> [--away=12] [--for=60]
 */
/* global vkaria, Isometrica */
import { args, flag, launch, openWorld } from "./page.mjs";

var [url] = args(),
  away = +flag("away", 12),
  awayFor = +flag("for", 60) * 1000;

if (!url) {
  console.log("node tools/world/works.mjs <url> [--away=12] [--for=60]");
  process.exit(2);
}

var browser = await launch(),
  page = await openWorld(browser, url, 15000);

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

/**
 * Three jobs in view round the camera, nearest first: a finished building
 * of two to six tiles, and the trees and stones of a patch of ground near
 * it - none of them sharing a tile.
 */
function pick() {
  return page.evaluate(function () {
    var C = Isometrica.Client.Config,
      core = vkaria.core,
      T = core.terrain.constructor,
      tm = vkaria.tilesman,
      p = vkaria.camera.transform.getPosition([]),
      cx = p[0] / C.tileSize,
      cy = p[2] / C.tileSize,
      taken = {},
      jobs = [],
      list = [];

    function inView(tile) {
      return tm.levelOf(tm.regionOf(T.extractX(tile), T.extractY(tile))) === 4;
    }

    function free(tile) {
      return (
        taken[tile] !== true &&
        core.buildingService.get(tile) === null &&
        inView(tile) &&
        !core.terrain.beingCleared(tile)
      );
    }

    for (var id in core.buildingService.buildings) {
      var b = core.buildingService.buildings[id],
        tiles = b.tiles();

      if (
        b.getState() !== 2 ||
        b.demolishing ||
        [3, 4, 5].indexOf(b.data.classCode) === -1 ||
        tiles.length < 2 ||
        tiles.length > 6 ||
        !tiles.every(inView)
      )
        continue;
      list.push({
        b: b,
        far: Math.hypot(T.extractX(b.tile) - cx, T.extractY(b.tile) - cy),
      });
    }
    list.sort(function (a, c) {
      return a.far - c.far;
    });

    for (var i = 0; i < list.length && jobs.length < 3; i++) {
      var bt = list[i].b.tiles(),
        bx = T.extractX(list[i].b.tile),
        by = T.extractY(list[i].b.tile),
        ground = null;

      if (
        bt.some(function (t) {
          return taken[t] === true;
        })
      )
        continue;

      //a 3 by 3 patch with trees or stones on four tiles of it or more
      for (var r = 2; r < 14 && ground === null; r++)
        for (var dx = -r; dx <= r && ground === null; dx++)
          for (var dy = -r; dy <= r && ground === null; dy++) {
            var g = [];

            for (var a = 0; a < 3; a++)
              for (var c = 0; c < 3; c++) {
                var t = T.convertToIndex(bx + dx + a, by + dy + c);

                if (!free(t)) {
                  g = null;
                  a = c = 3;
                } else if (core.envService.hasScenery(t)) g.push(t);
              }
            if (g !== null && g.length >= 4) ground = g;
          }

      if (ground === null) continue;

      bt.concat(ground).forEach(function (t) {
        taken[t] = true;
      });
      jobs.push({ building: list[i].b.tile, size: bt.length, ground: ground });
    }

    return jobs;
  });
}

//the ground and the building of a job cleared, the way the game does it
function start(job) {
  return page.evaluate(function (job) {
    var city = vkaria.core.cities.getCity(0),
      clear = function (t) {
        return city.clearTile(t);
      };

    city.resourcesModule.addResource("money", 1000000);
    vkaria.clearworks.clear(job.ground, clear);
    vkaria.clearworks.clear([job.building], clear);

    return vkaria.core.buildingService.get(job.building).demolishing === true;
  }, job);
}

/**
 * How a job stands: the bulldozers out and the tiles waiting (all of them,
 * any build), the building there still and how many of its tiles are down,
 * how many of the ground's tiles are being cleared still; and the game
 * objects of the works there are (bulldozers, demolitions, their fences,
 * rubble, trees going over) and those of them that tick.
 */
function status(job) {
  return page.evaluate(function (job) {
    var w = vkaria.clearworks,
      core = vkaria.core,
      b = core.buildingService.get(job.building),
      objects = 0,
      tickers = 0,
      kinds = {},
      names = ["clearworks", "demolition", "fence", "rubble", "felling"];

    vkaria.game.logic.world.gameObjects.forEach(function (go) {
      if (!go || go.world === null || names.indexOf(go.name) === -1) return;
      objects++;
      kinds[go.name] = (kinds[go.name] || 0) + 1;
      for (var i = 0; i < go.componentsCount; i++)
        if (go.components[i].tick) {
          tickers++;
          break;
        }
    });

    return {
      dozers: typeof w.dozers === "function" ? w.dozers() : w.dozers.length,
      waiting:
        typeof w.waiting === "function"
          ? w.waiting()
          : Object.keys(w.waiting).length,
      stands: b !== null && b.demolishing === true,
      down: b !== null && b.down ? b.down.length : -1,
      ground: job.ground.filter(function (t) {
        return core.terrain.beingCleared(t);
      }).length,
      //less the one that steps the works
      objects: objects - 1,
      tickers: tickers - 1,
      kinds: kinds,
    };
  }, job);
}

function done(s) {
  return !s.stands && s.ground === 0;
}

/**
 * Polls a job every second for up to ms (every: all of it; else till it is
 * done): when the ground was cleared and the building down, seconds from
 * now, and the most game objects and tickers the works had from `from` s
 * on.
 */
async function watch(job, ms, every, from) {
  var t0 = Date.now(),
    out = {
      ground: -1,
      down: -1,
      objects: 0,
      tickers: 0,
      kinds: {},
      last: null,
    };

  while (Date.now() - t0 < ms) {
    var s = await status(job),
      t = Math.round((Date.now() - t0) / 100) / 10;

    out.last = s;
    if (t >= (from || 0)) {
      if (s.objects > out.objects) out.kinds = s.kinds;
      out.objects = Math.max(out.objects, s.objects);
      out.tickers = Math.max(out.tickers, s.tickers);
    }
    if (s.ground === 0 && out.ground < 0) out.ground = t;
    if (!s.stands && out.down < 0) out.down = t;
    if (done(s) && !every) break;
    await page.waitForTimeout(1000);
  }

  return out;
}

function line(name, r) {
  console.log(
    name.padEnd(40),
    String(r.ground < 0 ? "not yet" : r.ground + " s").padEnd(10),
    String(r.down < 0 ? "not yet" : r.down + " s").padEnd(10),
    String(r.objects + " / " + r.tickers).padEnd(12),
    JSON.stringify(r.kinds),
    JSON.stringify(r.last),
  );
}

var jobs = await pick();

if (jobs.length < 3) {
  console.log("found", jobs.length, "jobs round the camera, wanted 3");
  await browser.close();
  process.exit(1);
}

console.log(
  "jobs:",
  jobs
    .map(function (j) {
      return j.size + "-tile building, " + j.ground.length + " tiles of trees";
    })
    .join("; "),
);
console.log(
  "".padEnd(40),
  "ground".padEnd(10),
  "building".padEnd(10),
  "objects / tickers (most)",
);

//watched where it is, for how long a job takes
await start(jobs[0]);
line("watched", await watch(jobs[0], 120000));

//the camera away for longer than that, the job going on behind it
await start(jobs[1]);
await page.waitForTimeout(500);
await go(away, 0);

var gone = await watch(jobs[1], awayFor, true, 8);

line(away + " chunks off, " + awayFor / 1000 + " s (from 8 s)", gone);
await go(0, 0);
await page.waitForTimeout(3000);
line("and back", await watch(jobs[1], 1000, true));

//saved and opened again halfway, the page's own way
await start(jobs[2]);
await page.waitForTimeout(6000);

var before = await status(jobs[2]);

await page.evaluate("vkaria.core.persistence.save()");
await page.reload();
await page.waitForFunction(
  "window.vkaria && vkaria.terrain && vkaria.terrain.chunks && vkaria.terrain.chunks.length > 0",
  null,
  { timeout: 90000 },
);
await page.waitForTimeout(3000);
console.log("saved 6 s in:".padEnd(40), JSON.stringify(before));
line("opened again", await watch(jobs[2], 1000, true));
line("then", await watch(jobs[2], 120000));

await browser.close();
