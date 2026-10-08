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
    sides = 0;

  this.painter
    .paint(message)
    .then(function (painted) {
      if (message.look) sides = sidesOf(painted, SECTIONS[message.look] || 1);

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
        self.post({ type: "picture", name: name, image: image, sides: sides }, [
          image,
        ]);
      },
      function (e) {
        self.post({ type: "failed", name: name, error: String(e) }, []);
      },
    );
};

//how many pictures side by side each look is painted in (shared/gen/isobox
//sections, shared/gen/looks)
var SECTIONS = { deferred: 2, night: 11 };

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
