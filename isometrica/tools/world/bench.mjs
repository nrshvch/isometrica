/**
 * What the world costs the script, on the same world every run: a still
 * frame's sections, the heap, a pass over the slots and a tile picked, the
 * ground's own loop, chunks coming in and going as the camera pans, a quarter
 * turn (chunks held, as the animated turn holds them, and direct), and what a
 * round of turns allocates. Run against two builds, a few times each, turn
 * about, and compare the middles (isometrica/docs/world.md, Measuring).
 *
 *   node tools/world/bench.mjs <url> <out.json>
 */
/* global vkaria, Isometrica */
import fs from "node:fs";
import { args, HEIGHT, launch, median, openWorld, WIDTH } from "./page.mjs";

var [url, out] = args();

if (!url || !out) {
  console.log("node tools/world/bench.mjs <url> <out.json>");
  process.exit(2);
}

var browser = await launch(["--js-flags=--expose-gc"]),
  page = await openWorld(browser, url, 12000),
  cdp = await page.context().newCDPSession(page),
  result = {};

function show(name, value) {
  console.log(name.padEnd(8), JSON.stringify(value));
}

//the heap after a full collection, and how many game objects
await cdp.send("HeapProfiler.collectGarbage");
await page.waitForTimeout(500);
await cdp.send("HeapProfiler.collectGarbage");
result.heap = await page.evaluate(function () {
  return {
    mb: +(performance.memory.usedJSHeapSize / 1048576).toFixed(2),
    gameObjects: vkaria.game.logic.world.gameObjectsCount,
  };
});
show("heap", result.heap);

//a still camera: the frame's sections, averaged over 40 frames
await page.evaluate("Isometrica.Engine.Stats.enable(true)");
await page.waitForFunction(
  "Isometrica.Engine.Stats.snapshot().frames >= 40",
  null,
  { timeout: 120000, polling: 500 },
);
result.still = await page.evaluate(function () {
  var s = Isometrica.Engine.Stats.snapshot(),
    r = {};

  s.sections.forEach(function (x) {
    if (
      /^(frame|update|render|render: (slots|cull|layers|sort)|draw: ground|submit: ground|draw: buildings)$/.test(
        x.name,
      )
    )
      r[x.name] = +x.avg.toFixed(3);
  });
  s.counters.forEach(function (c) {
    if (/^(gameObjects|drawn|sprites batched)$/.test(c.name))
      r["#" + c.name] = Math.round(c.avg);
  });

  return r;
});
await page.evaluate("Isometrica.Engine.Stats.enable(false)");
show("still", result.still);

//the loops on their own, no GPU in them: a pass over every slot (what a pick
//of game objects makes), a tile picked, and the ground's own cull and draw
//with what it draws handed to nothing - warmed, the best of five runs
result.loops = await page.evaluate(
  function (screen) {
    var E = Isometrica.Engine,
      world = vkaria.game.logic.world,
      T = vkaria.terrain,
      cam = vkaria.camera,
      M = cam.camera.getWorldToScreen(),
      pad = E.Config.cullMargin || 0,
      N = 300,
      t,
      i,
      x,
      y,
      n;

    t = performance.now();
    for (i = 0; i < N; i++)
      E.Canvas2dRenderer.under(world, cam.camera, 640, 400, [], []);
    var under = (performance.now() - t) / N;

    t = performance.now();
    n = 0;
    for (y = 20; y < screen.h; y += 40)
      for (x = 20; x < screen.w; x += 40) {
        T.tileAt(cam.cameraScript, x, y);
        n++;
      }
    var pick = (performance.now() - t) / n;

    var was = E.SpriteRenderer.collect,
      runs = [];

    E.SpriteRenderer.collect = { collect: function () {} };

    function pass() {
      T.chunks.forEach(function (c) {
        if (c.visible(M, screen.w, screen.h, pad))
          c.draw(null, c.renderer, M, screen.w, screen.h, pad);
      });
    }

    for (i = 0; i < 300; i++) pass();
    for (var k = 0; k < 5; k++) {
      t = performance.now();
      for (i = 0; i < 1000; i++) pass();
      runs.push((performance.now() - t) / 1000);
    }
    E.SpriteRenderer.collect = was;

    return {
      slotPassMs: +under.toFixed(4),
      tilePickMs: +pick.toFixed(4),
      groundLoopMs: +Math.min.apply(null, runs).toFixed(4),
    };
  },
  { w: WIDTH, h: HEIGHT },
);
show("loops", result.loops);

//the camera taken eight chunks along and back, a chunk at a time: what
//making and letting go of the ground took, and the worst frame's slots
result.stream = await page.evaluate(async function () {
  var T = vkaria.terrain,
    C = Isometrica.Client.Config,
    cam = vkaria.camera.cameraScript,
    p = vkaria.camera.transform.getPosition([]),
    step = C.chunkSize * C.tileSize,
    draw = T.draw,
    clear = T.clear,
    acc = { draw: 0, clear: 0 },
    frame = function () {
      return new Promise(function (r) {
        requestAnimationFrame(function () {
          r();
        });
      });
    },
    i;

  T.draw = function () {
    var t = performance.now(),
      r = draw.apply(this, arguments);

    acc.draw += performance.now() - t;
    return r;
  };
  T.clear = function () {
    var t = performance.now(),
      r = clear.apply(this, arguments);

    acc.clear += performance.now() - t;
    return r;
  };

  Isometrica.Engine.Stats.enable(true);
  for (i = 1; i <= 8; i++) {
    cam.lookAt(p[0] + i * step, p[2]);
    await frame();
    await frame();
  }
  for (i = 7; i >= 0; i--) {
    cam.lookAt(p[0] + i * step, p[2]);
    await frame();
    await frame();
  }

  var slots = Isometrica.Engine.Stats.snapshot().sections.find(function (x) {
    return x.name === "render: slots";
  });

  Isometrica.Engine.Stats.enable(false);
  T.draw = draw;
  T.clear = clear;

  return {
    drawMs: +acc.draw.toFixed(1),
    clearMs: +acc.clear.toFixed(1),
    slotsWorstMs: +slots.max.toFixed(2),
  };
});
show("stream", result.stream);
await page.waitForTimeout(3000);

//what a round of turns allocates, collected or not (the sampling heap
//profiler, every 4 KB)
await cdp.send("HeapProfiler.enable");
await cdp.send("HeapProfiler.startSampling", {
  samplingInterval: 4096,
  includeObjectsCollectedByMajorGC: true,
  includeObjectsCollectedByMinorGC: true,
});
await page.evaluate("for (var k = 0; k < 4; k++) vkaria.turnView(1)");
var { profile } = await cdp.send("HeapProfiler.stopSampling"),
  sum = function (n) {
    return n.children.reduce(function (a, c) {
      return a + sum(c);
    }, n.selfSize);
  };

result.turnAllocMb = +(sum(profile.head) / 1048576).toFixed(1);
show("alloc", { mbOver4Turns: result.turnAllocMb });
await page.waitForTimeout(3000);

//a quarter turn: held, the chunks as they are (what the animated turn does),
//and direct
result.turn = await page.evaluate(async function () {
  var frame = function () {
      return new Promise(function (r) {
        requestAnimationFrame(function () {
          r();
        });
      });
    },
    held = [],
    direct = [],
    t,
    k;

  for (k = 0; k < 4; k++) {
    vkaria.turnView(1);
    await frame();
  }
  for (k = 0; k < 4; k++) {
    vkaria.tilesman.hold(true);
    t = performance.now();
    vkaria.turnView(1);
    held.push(performance.now() - t);
    vkaria.tilesman.hold(false);
    await frame();
    await frame();
  }
  for (k = 0; k < 4; k++) {
    t = performance.now();
    vkaria.turnView(1);
    direct.push(performance.now() - t);
    await frame();
    await frame();
  }

  return { held: held, direct: direct };
});
result.turn = {
  heldMs: +median(result.turn.held).toFixed(1),
  directMs: +median(result.turn.direct).toFixed(1),
};
show("turn", result.turn);

fs.writeFileSync(out, JSON.stringify(result, null, 1));
await browser.close();
