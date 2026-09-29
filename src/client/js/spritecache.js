import CanvasCache from "./canvascache";
import CachedSprite from "./cachedsprite";

//Sits between the pictures the game has and the renderers that draw them.
//
//Every picture is a sprite, found by its name on a sheet - a picture drawn on
//its own is a sheet with just the one sprite on it. The ones somebody drew
//are on the sheets tools/packsprites.js put under gfx/ and listed in
//gfx/manifest.json; the ones the game paints itself it painted onto sheets of
//its own as it started (client/generated). Either way how big every sprite
//is and where it is on its sheet is known from the start, so nothing ever
//has to wait for a picture to find out its size.
//
//The sheets are only where pictures are taken from. What is drawn is drawn
//from the canvas cache: a few big pages that only what is on screen is put
//onto - see CachedSprite and CanvasCache. A sheet is loaded the first time a
//sprite on it is wanted there.

var ROOT = "gfx/";
var MANIFEST = ROOT + "manifest.json";

/**
 * @param clock {{frame: number}} counts the frames drawn - engine Time
 * @param [options] {Object} for the canvas cache: pageSize, maxPages
 */
function SpriteCache(clock, options) {
  //name -> {sheet, x, y, w, h}
  this.frames = {};
  //sheet name -> Sheet
  this.sheets = {};
  //key -> CachedSprite
  this.sprites = {};

  this.cache = new CanvasCache(
    clock,
    Object.assign({ canvas: canvas }, options),
  );
}

/**
 * @param [url] {string} where the picture is, for a sheet loaded as needed
 * @param [image] {CanvasImageSource} the picture, for one painted here
 */
function Sheet(url, image) {
  this.url = url || null;
  //the picture once it has loaded
  this.image = image || null;
  this.loading = image ? Promise.resolve(image) : null;
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
        self.sheets[file] = new Sheet(
          ROOT + file + "?v=" + manifest.sheets[file].hash,
        );
      });

      Object.assign(self.frames, manifest.sprites);
    });
};

/**
 * Makes the sprites on a sheet painted here drawable by name.
 *
 * @param name {string} the sheet's own name, e.g. "gen/vehicles"
 * @param image {CanvasImageSource} the sheet
 * @param frames {Object} sprite name -> {x, y, w, h} on it
 */
SpriteCache.prototype.addSheet = function (name, image, frames) {
  this.sheets[name] = new Sheet(null, image);

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
 * @returns {CachedSprite}
 */
SpriteCache.prototype.getSprite = function (name) {
  return this.sprites[name] || this.getComposite([name]);
};

/**
 * One picture made of several sprites laid over one another, bottom first,
 * put together once and drawn as one - shared by everything that asks for the
 * same parts in the same places.
 *
 * @param parts {Array<string|{name: string, x: number, y: number}>} a name
 *        alone is at 0, 0; x, y are where the part's top left corner goes,
 *        never left of or above the picture's
 * @returns {CachedSprite}
 */
SpriteCache.prototype.getComposite = function (parts) {
  var key = parts
      .map(function (part) {
        return typeof part === "string" || (!part.x && !part.y)
          ? part.name || part
          : part.name + "@" + part.x + "," + part.y;
      })
      .join("+"),
    sprite = this.sprites[key];

  if (sprite !== undefined) return sprite;

  var resolved = [],
    width = 0,
    height = 0;

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i],
      name = typeof part === "string" ? part : part.name,
      frame = this.frames[name],
      x = part.x || 0,
      y = part.y || 0;

    //drawn without it, which draws nothing for a sprite of one part
    if (frame === undefined) {
      console.warn("No such sprite: " + name);
      continue;
    }

    resolved.push({
      sheet: this.sheets[frame.sheet],
      frame: frame,
      x: x,
      y: y,
    });
    width = Math.max(width, x + frame.w);
    height = Math.max(height, y + frame.h);
  }

  return (this.sprites[key] = new CachedSprite(
    this,
    key,
    resolved,
    width,
    height,
  ));
};

/**
 * Starts loading a sheet, unless it is loading or loaded already.
 *
 * @returns {Promise} its picture
 */
SpriteCache.prototype.loadSheet = function (sheet) {
  if (sheet.loading === null) {
    sheet.loading = fetch(sheet.url)
      .then(function (response) {
        if (!response.ok) throw new Error(sheet.url + ": " + response.status);

        return response.blob();
      })
      .then(function (blob) {
        return createImageBitmap(blob);
      })
      .then(
        function (image) {
          return (sheet.image = image);
        },
        function (e) {
          console.warn("Sheet not loaded: " + e.message);
          throw e;
        },
      );

    //a sprite asking for it every frame does not wait for it; readPixels,
    //which does, still sees it fail
    sheet.loading.catch(function () {});
  }

  return sheet.loading;
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

      return self.loadSheet(self.sheets[frame.sheet]).then(function (image) {
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

function canvas(w, h) {
  return typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement("canvas"), { width: w, height: h });
}

SpriteCache.canvas = canvas;

export default SpriteCache;
