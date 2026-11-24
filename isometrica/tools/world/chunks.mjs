/**
 * The ground's chunks kept straight through clearing and drawing again:
 * a 3x3 patch cleared from the middle of a chunk, the chunk drawn again,
 * the whole of it cleared and drawn again. After each, every tile drawn is
 * in the chunk and slot the terrain says, a slot with a tile in it, its
 * picture's size cached right, and every chunk in the world. Exits 1 if not.
 *
 *   node tools/world/chunks.mjs <url>
 */
/* global vkaria */
import { args, launch, openWorld } from "./page.mjs";

var [url] = args();

if (!url) {
  console.log("node tools/world/chunks.mjs <url>");
  process.exit(2);
}

var browser = await launch(),
  page = await openWorld(browser, url, 3000);

var steps = await page.evaluate(function () {
  var T = vkaria.terrain,
    world = vkaria.game.logic.world,
    c = T.chunks[Math.min(4, T.chunks.length - 1)],
    first = c.list.tag[0],
    //tile index (y << 16) ^ x: core/terrain convertToIndex
    x0 = first & 0xffff,
    y0 = first >>> 16,
    out = [];

  function check(step) {
    var tiles = 0,
      wrong = 0,
      k,
      chunk,
      s;

    for (k in T.tiles) {
      tiles++;
      chunk = T.tiles[k];
      s = T.slots[k];
      if (
        s >= chunk.count ||
        chunk.list.tag[s] !== +k ||
        chunk.view[s] === 0 ||
        chunk.sprites[s] === null ||
        chunk.pictures.width[s] !== chunk.sprites[s].width
      )
        wrong++;
    }

    out.push({
      step: step,
      tiles: tiles,
      inChunks: T.chunks.reduce(function (a, ch) {
        return a + ch.count;
      }, 0),
      chunks: T.chunks.length,
      wrong: wrong,
      allInWorld: T.chunks.every(function (ch) {
        return ch.world === world;
      }),
    });
  }

  check("as loaded");
  T.clear(x0 + 10, y0 + 10, 3, 3);
  check("3x3 cleared");
  T.draw(x0, y0, 24, 24);
  check("drawn again");
  T.clear(x0, y0, 24, 24);
  check("chunk cleared");
  T.draw(x0, y0, 24, 24);
  check("drawn again");

  return out;
});

var failed = 0;

steps.forEach(function (s) {
  var ok = s.wrong === 0 && s.tiles === s.inChunks && s.allInWorld;

  if (!ok) failed++;
  console.log(
    (ok ? "ok  " : "FAIL") + " " + s.step.padEnd(14),
    `tiles ${s.tiles}, in chunks ${s.inChunks}, chunks ${s.chunks}, wrong ${s.wrong}`,
  );
});

await browser.close();
process.exit(failed ? 1 : 0);
