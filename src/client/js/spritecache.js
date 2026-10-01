import CanvasCache from "./canvascache";
import CachedSprite from "./cachedsprite";
import Generator from "./generator";

//Sits between the pictures the game has and the renderers that draw them.
//
//Every picture is a sprite, found by its name on a sheet - a picture drawn on
//its own is a sheet with just the one sprite on it. The ones somebody drew
//are on the sheets tools/packsprites.js put under gfx/ and listed in
//gfx/manifest.json. The ones the game paints for itself are listed in
//gfx/generated/<generator>.json, and each is a sheet of its own, painted the
//first time it is wanted (client/generator). Either way how big every sprite
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
  //what else the generators worked out, by generator: see
  //shared/gen/catalog describe
  this.generated = {};
  //paints the generated sprites, once the manifest is in
  this.generator = null;

  this.cache = new CanvasCache(
    clock,
    Object.assign({ canvas: canvas }, options),
  );
}

/**
 * @param url {string|null} where the picture is, or null for one painted here
 * @param [generated] {{name, gen, key}} for one painted here: the sprite, and
 *        how its generator knows it
 */
function Sheet(url, generated) {
  this.url = url;
  this.generated = generated || null;
  //the picture once it has loaded
  this.image = null;
  this.loading = null;
}

/**
 * Reads gfx/manifest.json: every sprite drawn by hand, and the sheet it is on
 * - and what every generator says it paints. A file is asked for by its
 * hash, so a browser holding an older one fetches the new one rather than
 * drawing what it has.
 *
 * @returns {Promise}
 */
SpriteCache.prototype.load = function () {
  var self = this;

  return json(MANIFEST, { cache: "no-cache" }).then(function (manifest) {
    var inputs = {},
      gens = Object.keys(manifest.generated);

    Object.keys(manifest.sheets).forEach(function (file) {
      self.sheets[file] = new Sheet(
        ROOT + file + "?v=" + manifest.sheets[file].hash,
      );
    });

    Object.assign(self.frames, manifest.sprites);

    //where the generators find what they paint from
    Object.keys(manifest.sprites).forEach(function (name) {
      var f = manifest.sprites[name];

      inputs[name] = {
        url: new URL(self.sheets[f.sheet].url, document.baseURI).href,
        x: f.x,
        y: f.y,
        w: f.w,
        h: f.h,
      };
    });

    return Promise.all(
      gens.map(function (gen) {
        var file = manifest.generated[gen];

        return json(ROOT + file.file + "?v=" + file.hash);
      }),
    ).then(function (metas) {
      metas.forEach(function (meta) {
        addGenerated(self, meta);
      });

      self.generator = new Generator(inputs);
    });
  });
};

/**
 * Makes every sprite a generator paints drawable by name - each a sheet of
 * its own, with nothing on it until it is painted.
 */
function addGenerated(self, meta) {
  Object.keys(meta.sprites).forEach(function (name) {
    var s = meta.sprites[name];

    self.sheets[name] = new Sheet(null, {
      name: name,
      gen: meta.generator,
      key: s.key !== undefined ? s.key : name,
    });
    self.frames[name] = {
      sheet: name,
      x: 0,
      y: 0,
      w: s.w,
      h: s.h,
      //for a part of something put together: where its tile's middle is
      pivotX: s.pivotX,
      pivotY: s.pivotY,
    };
  });

  self.generated[meta.generator] = meta.data;
}

function json(url, options) {
  return fetch(url, options).then(function (response) {
    if (!response.ok) throw new Error(url + ": " + response.status);

    return response.json();
  });
}

SpriteCache.prototype.has = function (name) {
  return this.frames[name] !== undefined;
};

/**
 * Where a sprite's frame is, how big and, for a generated part, its pivot -
 * or undefined for no such sprite.
 *
 * @returns {{w, h, pivotX, pivotY}|undefined}
 */
SpriteCache.prototype.frame = function (name) {
  return this.frames[name];
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
  if (sheet.generated !== null) return this.generator.load(sheet);

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

    //nobody waits for it: a sprite asks for it every frame until it is in
    sheet.loading.catch(function () {});
  }

  return sheet.loading;
};

function canvas(w, h) {
  return typeof OffscreenCanvas !== "undefined"
    ? new OffscreenCanvas(w, h)
    : Object.assign(document.createElement("canvas"), { width: w, height: h });
}

SpriteCache.canvas = canvas;

export default SpriteCache;
