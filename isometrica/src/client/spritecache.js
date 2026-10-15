import CanvasCache from "./canvascache";
import CachedSprite from "./cachedsprite";
import Generator from "./generator";
import Preloader from "./preloader";
import Pixels from "./pixels";

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
  //how big each generator's pictures from straight above are, and where
  //they are drawn from: {w, h, pivotX, pivotY}, or null for none (catalog
  //describe top)
  this.tops = {};
  //whether the world is drawn from above (client/view top) - for whoever
  //asks which pictures to draw it with (getTop)
  this.top = false;
  //paints the generated sprites, once the manifest is in
  this.generator = null;

  this.cache = new CanvasCache(clock, options || {});
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
  //for a picture of several side by side (see lookSheet), which of them have
  //anything but black in them, bit k for the k-th - told once it is painted
  this.sides = 0;
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
      //and paints ahead what the other sides of the world will want
      self.preloader = new Preloader(self);
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
      faced: meta.faced === true || s.faced === true,
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
  self.tops[meta.generator] = meta.top === undefined ? null : meta.top;
}

function json(url, options) {
  return fetch(url, options).then(function (response) {
    if (!response.ok) throw new Error(url + ": " + response.status);

    return response.json();
  });
}

/**
 * The sheet a generated picture is painted on another way, for the light to
 * be worked out as it is drawn (shared/gen/isobox setMode): "faces", its
 * faces side by side, or "night", what of it shines and the whole of it in
 * black - or null for a picture on a sheet that cannot be (one drawn by
 * hand, or painted other than out of boxes).
 */
SpriteCache.prototype.lookSheet = function (sheet, look) {
  var g = sheet.generated;

  if (g === null || g.faced !== true) return null;

  var name = g.name + "#" + look;

  return (
    this.sheets[name] ||
    (this.sheets[name] = new Sheet(null, {
      name: name,
      gen: g.gen,
      key: g.key,
      look: look,
      faced: true,
      view: g.view,
    }))
  );
};

/**
 * The sheet a generated picture is painted on seen from straight above
 * (shared/gen/catalog describe top) - lit, or in a look of its own as any
 * other (lookSheet) - or null for one that is not seen from above.
 */
SpriteCache.prototype.topSheet = function (sheet) {
  var g = sheet.generated;

  if (g === null || g.view === "top" || !this.tops[g.gen]) return null;

  var name = g.name + "@top";

  return (
    this.sheets[name] ||
    (this.sheets[name] = new Sheet(null, {
      name: name,
      gen: g.gen,
      key: g.key,
      faced: g.faced,
      view: "top",
    }))
  );
};

/**
 * How big a sprite's picture from straight above is and where it is drawn
 * from - {w, h, pivotX, pivotY} - or null for one that has none.
 */
SpriteCache.prototype.topFrame = function (name) {
  var frame = this.frames[name],
    g = frame && this.sheets[frame.sheet].generated;

  return g ? this.tops[g.gen] || null : null;
};

/**
 * One sprite seen from straight above (getTop) - nothing, for one not seen
 * from above at all.
 */
SpriteCache.prototype.topOf = function (name) {
  return this.getTop([name]);
};

/**
 * One picture of several sprites seen from straight above, laid over one
 * another bottom first, each where its point it is drawn from is (topFrame) -
 * for what stands on a tile, all of them the tile's square - shared by all
 * that ask for the same. A part laid up on others (a storey on a storey)
 * says how much higher it is, up, for how high its pixels stand. Its pivotX,
 * pivotY say where the point they are all drawn from is in it.
 *
 * @param parts {Array<string|{name: string, up: number}>} bottom first
 * @returns {CachedSprite}
 */
SpriteCache.prototype.getTop = function (parts) {
  var key =
      "top:" +
      parts
        .map(function (part) {
          return typeof part === "string" || !part.up
            ? part.name || part
            : part.name + "^" + part.up;
        })
        .join("+"),
    sprite = this.sprites[key];

  if (sprite !== undefined) return sprite;

  var laid = [],
    minX = 0,
    minY = 0,
    width = 0,
    height = 0;

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i],
      name = typeof part === "string" ? part : part.name,
      frame = this.frames[name],
      top = this.topFrame(name),
      sheet = frame && this.topSheet(this.sheets[frame.sheet]);

    //drawn without what is not seen from above - the stones, the smoke
    if (!top || !sheet) continue;

    laid.push({ sheet: sheet, top: top, up: part.up || 0 });
    minX = Math.min(minX, -top.pivotX);
    minY = Math.min(minY, -top.pivotY);
  }

  var resolved = laid.map(function (p) {
    var x = -p.top.pivotX - minX,
      y = -p.top.pivotY - minY;

    width = Math.max(width, x + p.top.w);
    height = Math.max(height, y + p.top.h);

    return {
      sheet: p.sheet,
      frame: {
        sheet: p.sheet.generated.name,
        x: 0,
        y: 0,
        w: p.top.w,
        h: p.top.h,
      },
      x: x,
      y: y,
      up: p.up,
    };
  });

  sprite = this.sprites[key] = new CachedSprite(
    this,
    key,
    resolved,
    width,
    height,
  );
  //seen from above: what stands high stands over its own pixel
  sprite.fromAbove = true;
  sprite.pivotX = -minX;
  sprite.pivotY = -minY;

  return sprite;
};

/**
 * The name of frame f of a generated picture that moves - water's waves,
 * named in its generator's data (shared/gen/catalog describe) - made
 * drawable the first time it is asked for: the same size and pivot, painted
 * by the same generator, with @t<f> after its key.
 */
SpriteCache.prototype.frameName = function (name, f) {
  var frame = this.frames[name];

  if (frame === undefined) return name;

  var g = this.sheets[frame.sheet].generated,
    out = name + "@t" + f;

  if (g !== null && this.frames[out] === undefined) {
    this.sheets[out] = new Sheet(null, {
      name: out,
      gen: g.gen,
      key: g.key + "@t" + f,
      faced: g.faced,
    });
    this.frames[out] = Object.assign({}, frame, { sheet: out });
  }

  return out;
};

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
 * Whether a sheet's picture is in - asking for it if it is not. Asked every
 * frame something on it is to be drawn: a generated picture wanted lately is
 * painted before one wanted a while ago, and one no longer wanted is not
 * painted at all (client/generator).
 *
 * @returns {boolean}
 */
SpriteCache.prototype.want = function (sheet) {
  if (sheet.generated !== null)
    return this.generator.want(sheet, this.cache.clock.frame);

  if (sheet.image === null) this.loadSheet(sheet);

  return sheet.image !== null;
};

/**
 * Starts loading a sheet, unless it is loading or loaded already - for
 * whoever waits for it rather than asking every frame (see want).
 *
 * @returns {Promise} its picture, as pixels (client/pixels)
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
        function (bitmap) {
          //put together on the CPU, as pixels, as everything else
          var image = Pixels.fromImage(bitmap);

          bitmap.close();

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

export default SpriteCache;
