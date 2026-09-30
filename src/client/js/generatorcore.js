import { createPainter } from "shared/gen/catalog";
import PictureStore from "./picturestore";

/**
 * Paints generated pictures one at a time, as they are asked for - off the
 * main thread, in the generator worker, or on it where there is no worker.
 *
 * Asked for a picture, it looks in the browser first (PictureStore) for one
 * painted by the same version of its generator; only when there is none does
 * it paint it (shared/gen/catalog), hand it over, and keep it for next time.
 * The hand-drawn pictures a generator paints from are loaded the first time
 * that generator paints anything, and only those.
 *
 * @param post {function(Object, Transferable[])} how answers get back
 */
function GeneratorCore(post) {
  this.post = post;
  this.inputs = null;
  this.store = null;
  this.painter = null;
  //url -> Promise of the decoded sheet, one load of each
  this.sheets = {};
}

//pictures kept in the browser at most
GeneratorCore.LIMIT = 1024;

/**
 * @param message {{inputs: Object}} every hand-drawn picture a generator may
 *        paint from, by sprite name: {url, x, y, w, h} - where it is
 */
GeneratorCore.prototype.init = function (message) {
  var self = this;

  this.inputs = message.inputs;
  this.store = new PictureStore(message.limit || GeneratorCore.LIMIT);
  this.painter = createPainter(function (prefixes) {
    return loadPixels(self, prefixes);
  });
};

/**
 * Answers with {type: "picture", name, image, painted} - an ImageBitmap,
 * handed over, and whether it was painted just now rather than kept from
 * before - or {type: "failed", name, error}.
 *
 * @param message {{name: string, gen: string, key: string, version: string}}
 *        the sprite, and how its generator and the version of it know it
 */
GeneratorCore.prototype.paint = function (message) {
  var self = this,
    name = message.name;

  var painted = false;

  this.store
    .get(name, message.version)
    .then(function (blob) {
      if (blob !== null) return createImageBitmap(blob);

      painted = true;
      return paint(self, message);
    })
    .then(
      function (image) {
        self.post(
          { type: "picture", name: name, image: image, painted: painted },
          [image],
        );
      },
      function (e) {
        self.post({ type: "failed", name: name, error: String(e) }, []);
      },
    );
};

function paint(self, message) {
  return self.painter.paint(message).then(function (picture) {
    var data = new ImageData(
      new Uint8ClampedArray(picture.data),
      picture.width,
      picture.height,
    );

    keep(self, message, data);

    return createImageBitmap(data);
  });
}

/**
 * Keeps a picture just painted for next time, without holding up the one who
 * asked for it.
 */
function keep(self, message, data) {
  var canvas = makeCanvas(data.width, data.height);

  canvas.getContext("2d").putImageData(data, 0, 0);
  toBlob(canvas)
    .then(function (blob) {
      return self.store.put(message.name, message.version, blob);
    })
    .catch(function (e) {
      console.warn("Generated picture not kept: " + e);
    });
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

function toBlob(canvas) {
  if (canvas.convertToBlob) return canvas.convertToBlob({ type: "image/png" });

  return new Promise(function (resolve) {
    canvas.toBlob(resolve, "image/png");
  });
}

export default GeneratorCore;
