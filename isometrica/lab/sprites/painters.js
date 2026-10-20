/**
 * The workers that paint the gallery's pictures (worker.js), off the page's
 * thread: what a generator paints, asked once and kept, and a picture of it
 * at a time - handed round the workers in turn.
 */

//how many workers paint
var WORKERS = Math.max(
  2,
  Math.min(4, (navigator.hardwareConcurrency || 4) - 1),
);

var workers = [],
  turn = 0,
  waiting = {},
  nextId = 1,
  described = {};

function worker() {
  if (workers.length === 0)
    for (var i = 0; i < WORKERS; i++) {
      var w = new Worker(new URL("./worker.js", import.meta.url), {
        type: "module",
      });

      w.onmessage = function (e) {
        var m = e.data,
          key = m.type === "described" ? "d:" + m.gen : m.id,
          done = waiting[key];

        delete waiting[key];
        if (done) done(m);
      };
      workers.push(w);
    }

  return workers[turn++ % workers.length];
}

/**
 * What a generator paints: { sprites: [[name, w, h, key]], ms, faced } -
 * asked once, and kept.
 */
export function describe(gen) {
  if (described[gen]) return described[gen];

  described[gen] = new Promise(function (resolve) {
    waiting["d:" + gen] = resolve;
    worker().postMessage({ type: "describe", gen: gen });
  });

  return described[gen];
}

/**
 * A picture: { width, height, data } - or { error }.
 */
export function paint(gen, key, look) {
  return new Promise(function (resolve) {
    var id = nextId++;

    waiting[id] = resolve;
    worker().postMessage({
      type: "paint",
      id: id,
      gen: gen,
      key: key,
      look: look,
    });
  });
}

//a picture onto a canvas, pixel for pixel - how big it shows is the page's
export function put(canvas, p) {
  canvas.width = p.width;
  canvas.height = p.height;
  canvas
    .getContext("2d")
    .putImageData(new ImageData(p.data, p.width, p.height), 0, 0);
}
