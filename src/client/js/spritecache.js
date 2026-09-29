import engine from "engine";

//Sits between the pictures the game has and the renderers that draw them.
//
//Every picture is a sprite, found by its name somewhere on a sheet. The ones
//somebody drew are on the sheets tools/packsprites.js put under gfx/ and
//listed in gfx/manifest.json; the ones the game paints itself it painted onto
//sheets of its own as it started (client/generated). Either way how big every
//sprite is and where it is on its sheet is known from the start, so nothing
//ever has to wait for a picture to find out its size.
//
//A sheet is loaded the first time something draws a sprite on it, straight
//into a canvas of the sheet's size that its sprites already point into:
//browsers draw from a canvas, which lives on the GPU, faster than from a png.
//Until the picture is in, the canvas is empty and its sprites draw nothing.

var ROOT = "gfx/";
var MANIFEST = ROOT + "manifest.json";

function SpriteCache() {
  //name -> {sheet, x, y, w, h}
  this.frames = {};
  //sheet name -> Sheet
  this.sheets = {};
  this.sprites = {};
}

/**
 * @param [url] {string} where the picture is, for a sheet loaded as needed
 * @param [source] {CanvasImageSource} the picture, for one painted here
 */
function Sheet(width, height, url, source) {
  this.width = width;
  this.height = height;
  this.url = url || null;
  this.canvas = source || null;
  this.image = source ? Promise.resolve(source) : null;
}

/**
 * Reads gfx/manifest.json: every sprite drawn by hand, and the sheet it is on.
 * A sheet is asked for by its hash, so a browser holding an older one fetches
 * the new one rather than drawing what it has.
 *
 * @returns {Promise}
 */
SpriteCache.prototype.load = function () {
  var self = this;

  return fetch(MANIFEST, { cache: "no-cache" })
    .then(function (response) {
      if (!response.ok) throw new Error(MANIFEST + ": " + response.status);

      return response.json();
    })
    .then(function (manifest) {
      Object.keys(manifest.sheets).forEach(function (file) {
        var sheet = manifest.sheets[file];

        self.sheets[file] = new Sheet(
          sheet.width,
          sheet.height,
          ROOT + file + "?v=" + sheet.hash,
        );
      });

      Object.assign(self.frames, manifest.sprites);
    });
};

/**
 * Makes the sprites on a sheet painted here drawable by name.
 *
 * @param name {string} the sheet's own name, e.g. "gen/vehicles"
 * @param canvas {HTMLCanvasElement|OffscreenCanvas} the sheet
 * @param frames {Object} sprite name -> {x, y, w, h} on it
 */
SpriteCache.prototype.addSheet = function (name, canvas, frames) {
  this.sheets[name] = new Sheet(canvas.width, canvas.height, null, canvas);

  for (var sprite in frames) {
    var f = frames[sprite];

    this.frames[sprite] = { sheet: name, x: f.x, y: f.y, w: f.w, h: f.h };
  }
};

SpriteCache.prototype.has = function (name) {
  return this.frames[name] !== undefined;
};

/**
 * Every sprite whose name starts with prefix, sorted.
 */
SpriteCache.prototype.names = function (prefix) {
  return Object.keys(this.frames)
    .filter(function (name) {
      return name.indexOf(prefix) === 0;
    })
    .sort();
};

/**
 * The hash of the sheet a sprite is on, which changes whenever the sheet does
 * - for whoever keeps something made out of it.
 */
SpriteCache.prototype.version = function (name) {
  var sheet = this.sheets[this.frames[name].sheet];

  return sheet.url === null ? null : sheet.url.split("?v=")[1];
};

/**
 * The one sprite for that name, shared by everything that draws it, the size
 * of its picture from the start.
 *
 * @param name {string} e.g. "buildings/shop.png"
 * @returns {Isometrica.Engine.SpriteManager.Sprite}
 */
SpriteCache.prototype.getSprite = function (name) {
  var sprite = this.sprites[name];

  if (sprite !== undefined) return sprite;

  var frame = this.frames[name];

  sprite = this.sprites[name] = new engine.SpriteManager.Sprite();

  //0x0, which the renderers draw nothing for
  if (frame === undefined) {
    console.warn("No such sprite: " + name);
    return sprite;
  }

  sprite.sourceImage = canvasOf(this.sheets[frame.sheet]);
  sprite.offsetX = frame.x;
  sprite.offsetY = frame.y;
  sprite.width = frame.w;
  sprite.height = frame.h;

  return sprite;
};

/**
 * The pixels of some sprites, for painting something else out of them.
 *
 * @param names {string[]}
 * @returns {Promise<Object>} name -> {width, height, data}, data RGBA
 */
SpriteCache.prototype.readPixels = function (names) {
  var self = this;

  return Promise.all(
    names.map(function (name) {
      var frame = self.frames[name];

      if (frame === undefined)
        return Promise.reject(new Error("No such sprite: " + name));

      return imageOf(self.sheets[frame.sheet]).then(function (image) {
        var ctx = canvas(frame.w, frame.h).getContext("2d", {
          willReadFrequently: true,
        });

        ctx.drawImage(image, -frame.x, -frame.y);

        var data = ctx.getImageData(0, 0, frame.w, frame.h);

        return { width: data.width, height: data.height, data: data.data };
      });
    }),
  ).then(function (images) {
    var out = {};

    names.forEach(function (name, i) {
      out[name] = images[i];
    });

    return out;
  });
};

/**
 * The picture of a sheet, loaded the first time it is asked for.
 */
function imageOf(sheet) {
  if (sheet.image === null)
    sheet.image = fetch(sheet.url)
      .then(function (response) {
        if (!response.ok) throw new Error(sheet.url + ": " + response.status);

        return response.blob();
      })
      .then(function (blob) {
        return createImageBitmap(blob);
      });

  return sheet.image;
}

/**
 * The canvas the sprites of a sheet are drawn from - empty until the sheet
 * has loaded, and the sheet's picture from then on.
 */
function canvasOf(sheet) {
  if (sheet.canvas !== null) return sheet.canvas;

  var target = (sheet.canvas = canvas(sheet.width, sheet.height));

  imageOf(sheet).then(
    function (image) {
      target.getContext("2d").drawImage(image, 0, 0);

      //the canvas is all anybody needs of it from now on. Not closed: a
      //readPixels already waiting on it is handed the same picture
      sheet.image = Promise.resolve(target);
    },
    function (e) {
      console.warn("Sheet not loaded: " + e.message);
    },
  );

  return target;
}

function canvas(w, h) {
  return typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement("canvas"), { width: w, height: h });
}

SpriteCache.canvas = canvas;

export default SpriteCache;
