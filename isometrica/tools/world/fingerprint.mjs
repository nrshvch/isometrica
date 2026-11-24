/**
 * What the ground hands the GPU in a frame - every quad, by picture, place,
 * size and height - the tile a pick finds at every 8th pixel of the screen,
 * and the grid's lines: from the side turned 0, 1 and 2 times and from above,
 * each once it has stopped changing. Two builds' fingerprints compared
 * (compare.mjs) say whether a change drew the ground any differently.
 *
 *   node tools/world/fingerprint.mjs <url> <out.json>
 *
 * See isometrica/docs/world.md, Measuring.
 */
import fs from "node:fs";
import { args, launch, openWorld } from "./page.mjs";

var [url, out] = args();

if (!url || !out) {
  console.log("node tools/world/fingerprint.mjs <url> <out.json>");
  process.exit(2);
}

//in the page: the ground layer's quads in the next frame drawn, and the tile
//a pick finds at x, y
var RECORDER = `
window.__recordGround = function () {
  var L = Isometrica.Engine.Config.gl, view = L.view;
  return new Promise(function (resolve) {
    var orig = { begin: L.begin, layer: L.layer, collect: L.collect, flush: L.flush, add: view.add, keep: view.keep },
      layer = -1, quads = [], pending = null, cur = null, done = false;
    function restore() {
      L.begin = orig.begin; L.layer = orig.layer; L.collect = orig.collect; L.flush = orig.flush;
      view.add = orig.add; view.keep = orig.keep;
    }
    function keyOf(s) {
      return s.key !== undefined ? s.key : s.frames ? "anim:" + s.frames[0].key : s.next ? "meanwhile:" + s.next.key : String(s);
    }
    L.begin = function () { layer = -1; quads = []; return orig.begin.apply(this, arguments); };
    L.layer = function () { layer++; return orig.layer.apply(this, arguments); };
    L.collect = function (renderer, sprite) {
      cur = layer === 0 ? keyOf(sprite) : null;
      return orig.collect.apply(this, arguments);
    };
    view.add = function (x, y, w, h, alpha, elev, dither, over) {
      pending = cur === null ? null : [cur, x, y, w, h, alpha, elev || 0, dither ? 1 : 0, over || 0];
      return orig.add.apply(this, arguments);
    };
    view.keep = function () { if (pending) quads.push(pending); pending = null; return orig.keep.apply(this, arguments); };
    L.flush = function () {
      var r = orig.flush.apply(this, arguments);
      if (layer === 0 && !done) { done = true; restore(); resolve(quads); }
      return r;
    };
  });
};
window.__pickTile = function (x, y) {
  return vkaria.terrain.tileAt(vkaria.camera.cameraScript, x, y);
};`;

var browser = await launch(),
  page = await openWorld(browser, url),
  result = {};

await page.evaluate(RECORDER);

//the ground's quads, once two frames a second apart in a row agree (the
//pictures painted on the way in), and then the picks and the grid
async function settle(label) {
  var last = null,
    same = 0,
    t0 = Date.now(),
    q;

  for (;;) {
    await page.waitForTimeout(1000);
    q = JSON.stringify(await page.evaluate("window.__recordGround()"));
    same = q === last ? same + 1 : 0;
    last = q;
    if ((same >= 2 && Date.now() - t0 > 6000) || Date.now() - t0 > 60000) break;
  }

  var picks = await page.evaluate(`(function () {
      var r = [];
      for (var y = 4; y < 800; y += 8)
        for (var x = 4; x < 1280; x += 8) r.push(window.__pickTile(x, y));
      return r;
    })()`),
    tiles = await page.evaluate("Object.keys(vkaria.terrain.tiles).length"),
    grid = await page.evaluate(
      "Array.from(vkaria.terrain.grid.points || []).join(',')",
    );

  result[label] = { quads: JSON.parse(last), picks, tiles, grid };
  console.log(
    label.padEnd(6),
    "quads",
    result[label].quads.length,
    "tiles",
    tiles,
    "picks hitting a tile",
    picks.filter(function (p) {
      return p !== -1;
    }).length,
    "/",
    picks.length,
  );
}

await settle("side0");
await page.evaluate("vkaria.turnView(1)");
await settle("side1");
await page.evaluate("vkaria.turnView(1)");
await settle("side2");
await page.evaluate("vkaria.turnView(-2)");
await page.evaluate("vkaria.setTopView(true)");
await settle("top");

fs.writeFileSync(out, JSON.stringify(result));
await browser.close();
