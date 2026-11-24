/**
 * How many chunks of ground are made and let go of, and how long it takes,
 * as the camera: crosses a chunk's edge and comes back (three times), turns
 * a quarter directly and with the chunks held (as the animated turn holds
 * them), and goes over to the view from above and back. Rings that hold
 * (isometrica/docs/world.md, the way there) make the first and the last none.
 *
 *   node tools/world/streams.mjs <url>
 */
/* global vkaria, Isometrica */
import { args, launch, median, openWorld } from "./page.mjs";

var [url] = args();

if (!url) {
  console.log("node tools/world/streams.mjs <url>");
  process.exit(2);
}

var browser = await launch(),
  page = await openWorld(browser, url, 10000);

var rows = await page.evaluate(async function () {
  var T = vkaria.terrain,
    C = Isometrica.Client.Config,
    cam = vkaria.camera.cameraScript,
    p = vkaria.camera.transform.getPosition([]),
    step = C.chunkSize * C.tileSize,
    draw = T.draw,
    clear = T.clear,
    made = 0,
    gone = 0,
    out = [],
    frame = function () {
      return new Promise(function (r) {
        requestAnimationFrame(function () {
          r();
        });
      });
    },
    k;

  T.draw = function () {
    var n = T.chunks.length,
      r = draw.apply(this, arguments);

    if (T.chunks.length > n) made++;
    return r;
  };
  T.clear = function () {
    var n = T.chunks.length,
      r = clear.apply(this, arguments);

    if (T.chunks.length < n) gone++;
    return r;
  };

  async function measure(name, fn) {
    made = gone = 0;

    var t = performance.now();

    fn();
    out.push({
      what: name,
      ms: +(performance.now() - t).toFixed(1),
      made: made,
      gone: gone,
    });
    await frame();
    await frame();
  }

  for (k = 0; k < 3; k++) {
    await measure("over a chunk's edge", function () {
      cam.lookAt(p[0] + step, p[2]);
    });
    await measure("back over it", function () {
      cam.lookAt(p[0], p[2]);
    });
  }
  for (k = 0; k < 4; k++)
    await measure("quarter turn, direct", function () {
      vkaria.turnView(1);
    });
  for (k = 0; k < 4; k++)
    await measure("quarter turn, held", function () {
      vkaria.tilesman.hold(true);
      vkaria.turnView(1);
      vkaria.tilesman.hold(false);
    });
  for (k = 0; k < 2; k++) {
    await measure("view from above", function () {
      vkaria.setTopView(true);
    });
    await measure("back from above", function () {
      vkaria.setTopView(false);
    });
  }

  T.draw = draw;
  T.clear = clear;

  return out;
});

//one line for every kind of move: the chunks of every time it was made, and
//the middle of how long it took
var kinds = [];

rows.forEach(function (r) {
  var kind = kinds.find(function (x) {
    return x.what === r.what;
  });

  if (!kind) kinds.push((kind = { what: r.what, ms: [], chunks: [] }));
  kind.ms.push(r.ms);
  kind.chunks.push(r.made + "/" + r.gone);
});

console.log("move".padEnd(24), "chunks made/let go".padEnd(22), "ms (middle)");
kinds.forEach(function (k) {
  console.log(k.what.padEnd(24), k.chunks.join(" ").padEnd(22), median(k.ms));
});

await browser.close();
