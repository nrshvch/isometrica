/**
 * The world in the page against the world on a worker (client/host): the
 * main thread's ms a second and a frame on the world (moving it on, or
 * playing the worker's frames), the bytes a second the frames come to, how
 * long a command takes from sent to seen in the page's copy, and whether
 * that copy is the worker's world after a while of it - both saved, the
 * same to the byte - with a clearing going on. Skill buildings, server.md;
 * isometrica/docs/world.md, Measuring.
 *
 *   node tools/world/worker.mjs <url> [--for=20]
 */
/* global vkaria, Isometrica */
import { args, flag, launch, openWorld } from "./page.mjs";

var [url] = args(),
  span = +flag("for", 20) * 1000;

if (!url) {
  console.log("node tools/world/worker.mjs <url> [--for=20]");
  process.exit(2);
}

async function measure(browser, onWorker) {
  var page = await openWorld(
      browser,
      url,
      15000,
      null,
      onWorker ? "&worker=on" : "",
    ),
    out = { host: onWorker ? "worker" : "in the page" };

  out.inThread = await page.evaluate("vkaria.host.inThread");

  //a frame's sections, over 40 frames
  await page.evaluate("Isometrica.Engine.Stats.enable(true)");
  await page.waitForFunction(
    "Isometrica.Engine.Stats.snapshot().frames >= 40",
    null,
    { timeout: 120000 },
  );
  Object.assign(
    out,
    await page.evaluate(function () {
      var s = Isometrica.Engine.Stats.snapshot(),
        get = function (name) {
          var x = s.sections.find(function (y) {
            return y.name === name;
          });

          return x ? +x.avg.toFixed(3) : 0;
        };

      return {
        frameMs: get("frame"),
        worldMsAFrame: get("world"),
        cityTickMsAFrame: get("city tick"),
        fps: +s.fps.toFixed(1),
      };
    }),
  );
  await page.evaluate("Isometrica.Engine.Stats.enable(false)");

  //over a while: ms a second on the main thread, bytes a second
  var before = await page.evaluate(
    "Object.assign({ t: performance.now() }, vkaria.host.stats)",
  );

  await page.waitForTimeout(span);

  var after = await page.evaluate(
      "Object.assign({ t: performance.now() }, vkaria.host.stats)",
    ),
    seconds = (after.t - before.t) / 1000;

  out.worldMsASecond = +((after.ms - before.ms) / seconds).toFixed(3);
  out.framesASecond = +((after.frames - before.frames) / seconds).toFixed(1);
  out.bytesASecond = Math.round((after.bytes - before.bytes) / seconds);

  //commands there and back: a road's own look given it again (nothing
  //changes), twenty times; then the trees of a patch near the middle
  //cleared, till the copy has the ground being cleared
  out.latency = await page.evaluate(function () {
    var core = vkaria.core,
      road = null,
      times = [];

    for (var id in core.buildingService.buildings) {
      var b = core.buildingService.buildings[id];

      if (b.data.classCode === 1 && b.look) {
        road = b;
        break;
      }
    }

    return new Promise(function (resolve) {
      var n = 0;

      function one() {
        var sent = performance.now();

        vkaria.host.command(
          {
            type: "look",
            tile: road.tile,
            look: JSON.parse(JSON.stringify(road.look)),
          },
          function () {
            times.push(performance.now() - sent);
          },
        );
        if (++n < 20) setTimeout(one, 200);
        else
          setTimeout(function () {
            times.sort(function (a, c) {
              return a - c;
            });
            resolve({
              answered: times.length,
              median: +times[times.length >> 1].toFixed(2),
              most: +times[times.length - 1].toFixed(2),
            });
          }, 1000);
      }

      one();
    });
  });

  out.clearing = await page.evaluate(function () {
    var core = vkaria.core,
      T = core.terrain.constructor,
      city = core.cities.getCity(0),
      c = city.tile(),
      tiles = [];

    for (var r = 3; r < 30 && tiles.length < 6; r++)
      for (var d = -r; d <= r && tiles.length < 6; d++) {
        var t = T.convertToIndex(T.extractX(c) + d, T.extractY(c) + r);

        if (
          core.buildingService.get(t) === null &&
          core.envService.hasScenery(t) &&
          !core.terrain.beingCleared(t)
        )
          tiles.push(t);
      }

    var sent = performance.now();

    return new Promise(function (resolve) {
      vkaria.clearworks.clear(
        { type: "clear", city: city.id(), tiles: tiles },
        function (result) {
          resolve({
            tiles: tiles.length,
            cleared: result.cleared.length,
            seenMs: +(performance.now() - sent).toFixed(2),
            beingCleared: tiles.filter(function (t) {
              return core.terrain.beingCleared(t);
            }).length,
          });
        },
      );
    });
  });

  //the bulldozers at it a while, then the copy against the world
  await page.waitForTimeout(span);
  out.check = await page.evaluate(function () {
    return vkaria.host.check().then(function (r) {
      return {
        same: r.same,
        version: r.version,
        bytes: r.ours ? r.ours.length : 0,
        digestsOff: vkaria.host.mirror.diverged,
        dropped: vkaria.host.mirror.dropped,
        dozers: vkaria.clearworks.dozers(),
        firstDiff:
          r.same || !r.ours
            ? -1
            : (function () {
                for (var i = 0; i < r.ours.length; i++)
                  if (r.ours[i] !== r.theirs[i]) return i;
                return r.ours.length;
              })(),
        around:
          r.same || !r.ours
            ? ""
            : (function () {
                for (var i = 0; i < r.ours.length; i++)
                  if (r.ours[i] !== r.theirs[i])
                    return (
                      r.ours.slice(Math.max(0, i - 80), i + 80) +
                      "  ||  " +
                      r.theirs.slice(Math.max(0, i - 80), i + 80)
                    );
                return "";
              })(),
      };
    });
  });

  await page.close();

  return out;
}

var browser = await launch(),
  results = [];

try {
  results.push(await measure(browser, false));
  results.push(await measure(browser, true));
} finally {
  await browser.close();
}

console.log(
  "host          world ms a frame / a second   city tick ms a frame   frame ms   bytes/s   frames/s   command median/most ms   clearing seen ms   copy = world",
);
results.forEach(function (r) {
  console.log(
    r.host.padEnd(14) +
      (r.worldMsAFrame + " / " + r.worldMsASecond).padEnd(30) +
      String(r.cityTickMsAFrame).padEnd(23) +
      String(r.frameMs).padEnd(11) +
      String(r.bytesASecond).padEnd(10) +
      String(r.framesASecond).padEnd(11) +
      (r.latency.median + " / " + r.latency.most).padEnd(25) +
      String(r.clearing.seenMs).padEnd(19) +
      (r.check.same ? "same" : "DIFFERENT") +
      " (" +
      r.check.bytes +
      " bytes, digests off " +
      r.check.digestsOff +
      ")",
  );
});
console.log(JSON.stringify(results));

process.exit(
  results.every(function (r) {
    return r.check.same && r.check.digestsOff === 0;
  })
    ? 0
    : 1,
);
