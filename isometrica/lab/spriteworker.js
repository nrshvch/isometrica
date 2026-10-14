/**
 * Paints the generated pictures off the page's thread (lab/sprites.js): what
 * a generator paints, and one picture of it at a time - the same painting
 * the game does in its generator worker (shared/gen/catalog).
 */
import * as Catalog from "../src/shared/gen/catalog.js";

//nothing is drawn by hand any more: every generator paints from nothing
var painter = Catalog.createPainter(function () {
  return Promise.resolve({});
});

//how many pictures side by side the night is painted in, and how many of
//them are what shines (shared/gen/looks NIGHT)
var NIGHT = 7,
  SHINES = 4;

/**
 * A picture to look at: lit, as the day has it - or at night, the way the
 * game draws it: the lit picture darkened and blue, and over it whatever of
 * it shines with all its lights on. (Painted for the night, a picture is
 * several side by side - what shines, its height, a mask - for the game's
 * lighting to work from; nothing to look at as it is.)
 */
function picture(gen, key, look) {
  var lit = painter.paint({ gen: gen, key: key });

  if (look !== "night" || Catalog.FACED[gen] !== true) return lit;

  return Promise.all([
    lit,
    painter.paint({ gen: gen, key: key, look: "night" }),
  ]).then(function (both) {
    var day = both[0],
      night = both[1],
      w = day.width,
      h = day.height,
      out = new Uint8ClampedArray(w * h * 4);

    if (night.width !== w * NIGHT) return day;

    for (var j = 0; j < h; j++)
      for (var i = 0; i < w; i++) {
        var o = (j * w + i) * 4,
          glow = [0, 0, 0];

        for (var k = 0; k < SHINES; k++) {
          var n = (j * night.width + k * w + i) * 4;

          glow[0] = Math.max(glow[0], night.data[n]);
          glow[1] = Math.max(glow[1], night.data[n + 1]);
          glow[2] = Math.max(glow[2], night.data[n + 2]);
        }

        out[o] = day.data[o] * 0.16 + glow[0];
        out[o + 1] = day.data[o + 1] * 0.19 + glow[1];
        out[o + 2] = day.data[o + 2] * 0.32 + glow[2];
        out[o + 3] = day.data[o + 3];
      }

    return { width: w, height: h, data: out };
  });
}

self.onmessage = function (e) {
  var m = e.data;

  if (m.type === "describe") {
    var started = performance.now(),
      sprites = Catalog.describe(m.gen, {}).sprites;

    self.postMessage({
      type: "described",
      gen: m.gen,
      ms: performance.now() - started,
      faced: Catalog.FACED[m.gen] === true,
      sprites: Object.keys(sprites).map(function (name) {
        var s = sprites[name];

        return [name, s.w, s.h, s.key || name];
      }),
    });
    return;
  }

  picture(m.gen, m.key, m.look).then(
    function (p) {
      var data = new Uint8ClampedArray(p.data);

      self.postMessage(
        {
          type: "painted",
          id: m.id,
          width: p.width,
          height: p.height,
          data: data,
        },
        [data.buffer],
      );
    },
    function (err) {
      self.postMessage({ type: "painted", id: m.id, error: String(err) });
    },
  );
};
