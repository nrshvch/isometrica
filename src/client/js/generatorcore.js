import { createPainter } from "shared/gen/catalog";

/**
 * Paints generated pictures one at a time, as they are asked for - off the
 * main thread, in the generator worker, or on it where there is no worker.
 *
 * Nothing painted is kept here, nor between visits: a picture is quicker to
 * paint again (a few milliseconds, off the main thread) than anything that
 * would keep it is to look after. The hand-drawn pictures a generator paints
 * from are loaded the first time that generator paints anything, and only
 * those.
 *
 * @param post {function(Object, Transferable[])} how answers get back
 */
function GeneratorCore(post) {
  this.post = post;
  this.inputs = null;
  this.painter = null;
  //url -> Promise of the decoded sheet, one load of each
  this.sheets = {};
}

/**
 * @param message {{inputs: Object}} every hand-drawn picture a generator may
 *        paint from, by sprite name: {url, x, y, w, h} - where it is
 */
GeneratorCore.prototype.init = function (message) {
  var self = this;

  this.inputs = message.inputs;
  this.painter = createPainter(function (prefixes) {
    return loadPixels(self, prefixes);
  });

  //what earlier versions of the game kept in the browser, gone with them
  if (typeof indexedDB !== "undefined")
    indexedDB.deleteDatabase("isometrica-generated");
};

/**
 * Answers with {type: "picture", name, image, sides} - an ImageBitmap,
 * handed over, and for a picture of pictures side by side which of them have
 * anything in them but black (see sides) - or {type: "failed", name, error}.
 *
 * @param message {{name: string, gen: string, key: string, look: string}}
 *        the sprite, how its generator knows it, and how it is painted if not
 *        lit (shared/gen/catalog createPainter)
 */
GeneratorCore.prototype.paint = function (message) {
  var self = this,
    name = message.name,
    sides = 0,
    lights = null;

  this.painter
    .paint(message)
    .then(function (painted) {
      if (message.look) sides = sidesOf(painted, SECTIONS[message.look] || 1);
      if (message.look === "night") lights = lightsOf(painted);

      return createImageBitmap(
        new ImageData(
          new Uint8ClampedArray(painted.data),
          painted.width,
          painted.height,
        ),
      );
    })
    .then(
      function (image) {
        self.post(
          {
            type: "picture",
            name: name,
            image: image,
            sides: sides,
            lights: lights,
          },
          [image],
        );
      },
      function (e) {
        self.post({ type: "failed", name: name, error: String(e) }, []);
      },
    );
};

//how many pictures side by side each look is painted in (shared/gen/isobox
//sections, shared/gen/looks)
var SECTIONS = { deferred: 2, night: 7 };

//the night's pictures (shared/gen/looks NIGHT): what shines, the four ways
//its lights can be on, then the whole of it in black, how high every pixel
//of it stands, and the whole of it in white
var NIGHT = 7,
  WAYS = 4,
  HIGH = 5;

//how big a patch of what shines makes one light, a side. It shines as much
//as how much of it is lit, and how brightly - all of it in white the most -
//rising quickly at first, so a single window still throws its light, and a
//whole lit shop front no more than so much more
var CELL = 8;

/**
 * The lights of what shines of a picture at night - for it to light what is
 * round it as it is drawn (client/lighting): what of it shines, every patch
 * of it CELL by CELL, as one light where its pixels shining are - x, y, how
 * high they stand, the light they give and how much of it they give with
 * the first lights on and with more, one way and another, 0..1 - packed,
 * eight numbers a light: x, y, z, colour (0xrrggbb), and the four.
 */
function lightsOf(painted) {
  var w = painted.width / NIGHT,
    h = painted.height,
    data = painted.data,
    cols = Math.ceil(w / CELL),
    rows = Math.ceil(h / CELL),
    //per cell: x, y, z summed, r, g, b summed, how many, and per way
    sums = new Float64Array(cols * rows * 11),
    out = [],
    x,
    y,
    k;

  for (y = 0; y < h; y++)
    for (x = 0; x < w; x++) {
      var cell = (Math.floor(y / CELL) * cols + Math.floor(x / CELL)) * 11,
        any = false;

      for (k = 0; k < WAYS; k++) {
        var o = (y * painted.width + k * w + x) * 4;

        if (data[o + 3] === 0 || (data[o] | data[o + 1] | data[o + 2]) === 0)
          continue;

        if (!any) {
          var t = (y * painted.width + HIGH * w + x) * 4;

          sums[cell] += x;
          sums[cell + 1] += y;
          sums[cell + 2] += data[t];
          sums[cell + 3] += data[o];
          sums[cell + 4] += data[o + 1];
          sums[cell + 5] += data[o + 2];
          sums[cell + 6]++;
          any = true;
        }
        sums[cell + 7 + k] += Math.max(data[o], data[o + 1], data[o + 2]) / 255;
      }
    }

  for (k = 0; k < cols * rows; k++) {
    var c = k * 11,
      n = sums[c + 6];

    if (n === 0) continue;

    out.push(
      Math.round((sums[c] / n) * 10) / 10,
      Math.round((sums[c + 1] / n) * 10) / 10,
      Math.round(sums[c + 2] / n),
      (Math.round(sums[c + 3] / n) << 16) |
        (Math.round(sums[c + 4] / n) << 8) |
        Math.round(sums[c + 5] / n),
      shining(sums[c + 7]),
      shining(sums[c + 8]),
      shining(sums[c + 9]),
      shining(sums[c + 10]),
    );
  }

  return out.length > 0 ? out : null;
}

//how much a patch shines, 0..1, from how bright its pixels are, summed
function shining(sum) {
  return Math.round(Math.sqrt(Math.min(1, sum / (CELL * CELL))) * 100) / 100;
}

/**
 * Of n pictures side by side, which have any pixel in them that is not black
 * - bit k for the k-th - so that drawing one that has not can be left out
 * where nothing behind it needs hiding (client/cachedsprite lightPass).
 */
function sidesOf(painted, n) {
  var w = painted.width / n,
    data = painted.data,
    sides = 0,
    i,
    k;

  for (i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0 || (data[i] | data[i + 1] | data[i + 2]) === 0)
      continue;

    k = Math.floor(((i / 4) % painted.width) / w);
    sides |= 1 << k;
  }

  return sides;
}

/**
 * The pixels of every input whose name starts with one of the prefixes, by
 * sprite name.
 */
function loadPixels(self, prefixes) {
  var names = Object.keys(self.inputs).filter(function (name) {
    return prefixes.some(function (prefix) {
      return name.indexOf(prefix) === 0;
    });
  });

  return Promise.all(
    names.map(function (name) {
      var input = self.inputs[name];

      return sheet(self, input.url).then(function (ctx) {
        var data = ctx.getImageData(input.x, input.y, input.w, input.h);

        return { width: data.width, height: data.height, data: data.data };
      });
    }),
  ).then(function (pictures) {
    var out = {};

    names.forEach(function (name, i) {
      out[name] = pictures[i];
    });

    return out;
  });
}

/**
 * A sheet loaded onto a canvas to be read from.
 */
function sheet(self, url) {
  if (self.sheets[url] === undefined)
    self.sheets[url] = fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error(url + ": " + response.status);

        return response.blob();
      })
      .then(function (blob) {
        return createImageBitmap(blob);
      })
      .then(
        function (image) {
          var canvas = makeCanvas(image.width, image.height),
            ctx = canvas.getContext("2d", { willReadFrequently: true });

          ctx.drawImage(image, 0, 0);
          image.close();

          return ctx;
        },
        function (e) {
          //loaded again the next time it is wanted
          delete self.sheets[url];
          throw e;
        },
      );

  return self.sheets[url];
}

//in the worker there is only OffscreenCanvas; on the main thread, where the
//core runs when there is no worker, there may only be the other kind
function makeCanvas(w, h) {
  return typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement("canvas"), { width: w, height: h });
}

export default GeneratorCore;
