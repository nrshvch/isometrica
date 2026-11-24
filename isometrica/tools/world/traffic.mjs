/**
 * The traffic as the camera goes: the cars round where it starts noted (by
 * their drivers, Driver id), the camera taken far away and brought back, and
 * how many of the same cars are found there again and how far they are from
 * where they were; and what the traffic costs a frame (its tickers, timed
 * one by one) and how many cars it steps a frame, fully and coarsely, over
 * the busy town, a few chunks off it, further, and far out in the country. On a city generated from a fixed seed (--city=town|city|metropolis,
 * or none for the town a new player starts on, which has few cars).
 * isometrica/docs/world.md, Measuring.
 *
 *   node tools/world/traffic.mjs <url> [--city=city] [--beside=6] [--away=12]
 *     [--far=60]
 */
/* global vkaria, Isometrica */
import { args, flag, launch, openWorld } from "./page.mjs";

var [url] = args(),
  away = +flag("away", 12),
  far = +flag("far", 60),
  beside = +flag("beside", 6),
  size = flag("city", "city");

if (!url) {
  console.log(
    "node tools/world/traffic.mjs <url> [--city=city] [--beside=6] [--away=12] [--far=60]",
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
      : { id: "traffc", size: size, seed: 7, near: [32768, 27000] },
  );

//the drivers awake (on the roads the traffic drives now) and, of them, those
//within r tiles of the camera
var NOTE = function (r) {
  var C = Isometrica.Client.Config,
    p = vkaria.camera.transform.getPosition([]),
    cx = p[0] / C.tileSize,
    cy = p[2] / C.tileSize,
    drivers = vkaria.carman.traffic.drivers,
    near = {};

  drivers.forEach(function (d) {
    if (Math.abs(d.x - cx) <= r && Math.abs(d.y - cy) <= r)
      near[d.id] = [d.x, d.y];
  });

  return { awake: drivers.length, near: near };
};

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

//what the traffic's tickers take a frame, over 60 frames, and the cars
async function cost() {
  await page.evaluate("Isometrica.Engine.Stats.enable(true, true)");
  await page.waitForFunction(
    "Isometrica.Engine.Stats.snapshot().frames >= 60",
    null,
    { timeout: 180000, polling: 500 },
  );

  var r = await page.evaluate(function () {
    var s = Isometrica.Engine.Stats.snapshot(),
      ms = 0,
      frame = 0,
      counter = function (name) {
        var c = s.counters.find(function (x) {
          return x.name === name;
        });

        return c ? c.avg : 0;
      };

    s.tickers.forEach(function (t) {
      if (t.name === "cars" || t.name === "traffic") ms += t.avg;
    });
    s.sections.forEach(function (x) {
      if (x.name === "frame") frame = x.avg;
    });

    var man = vkaria.carman;

    return {
      ms: +ms.toFixed(3),
      frame: +frame.toFixed(2),
      awake: man.traffic.drivers.length,
      cars: man.agents ? man.agents.length : man.cars.length,
      full: Math.round(counter("cars stepped")),
      coarse: Math.round(counter("cars stepped coarse")),
      views: man.cars.length,
    };
  });

  await page.evaluate("Isometrica.Engine.Stats.enable(false)");

  return r;
}

var R = 30;

await go(0, 0);
await page.waitForTimeout(3000);

var before = await page.evaluate(NOTE, R),
  costs = [];

costs.push(["over the town", await cost()]);

//beside it: the town left in the coarse ring, or some of it
await go(beside, 0);
await page.waitForTimeout(8000);
costs.push([beside + " chunks off", await cost()]);

//away beyond every ring, a while, and back
await go(away, 0);
await page.waitForTimeout(12000);
costs.push([away + " chunks off", await cost()]);
await go(0, 0);
await page.waitForTimeout(3000);

var after = await page.evaluate(NOTE, R + 10),
  ids = Object.keys(before.near),
  same = 0,
  moved = 0;

ids.forEach(function (id) {
  if (after.near[id] === undefined) return;
  same++;
  moved += Math.hypot(
    after.near[id][0] - before.near[id][0],
    after.near[id][1] - before.near[id][1],
  );
});

await go(far, far);
await page.waitForTimeout(12000);
costs.push([far + " chunks off, the country", await cost()]);

console.log(
  "cars round the start".padEnd(28),
  ids.length,
  "| the same ones there after",
  away,
  "chunks away and back:",
  same,
  same > 0 ? "(moved " + (moved / same).toFixed(1) + " tiles on average)" : "",
);
console.log(
  "camera over".padEnd(28),
  "traffic ms a frame".padEnd(20),
  "frame ms".padEnd(10),
  "awake / cars / views".padEnd(22),
  "stepped full / coarse",
);
costs.forEach(function (c) {
  console.log(
    c[0].padEnd(28),
    String(c[1].ms).padEnd(20),
    String(c[1].frame).padEnd(10),
    (c[1].awake + " / " + c[1].cars + " / " + c[1].views).padEnd(22),
    c[1].full + " / " + c[1].coarse,
  );
});

await browser.close();
