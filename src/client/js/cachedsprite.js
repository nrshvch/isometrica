import Lighting from "./lighting";

//A picture as the renderers draw it: one or more parts, each a sprite on some
//sheet, laid over one another - a tile, or the tile with its shore on it, or
//a building out of its floors. Put together once, on a page of the canvas
//cache, the first time it is drawn, and drawn from there from then on.
//
//Renderers acquire it right before they draw it (engine SpriteRenderer does):
//that puts it on a page when it is not there - it may never have been, or
//been evicted for having gone undrawn - and marks it as drawn this frame, so
//that it stays. Its size is known from the start, so the renderers can cull
//it before it is ever drawn.
//
//Anything that changes from frame to frame is not put together here: a car's
//lamp is a CachedSprite of its own, drawn over the car's.

/**
 * @param sprites {SpriteCache} where the parts' sheets are loaded
 * @param key {string} what it is cached under
 * @param parts {{sheet: Object, frame: Object, x: number, y: number}[]}
 *        bottom first, each at x, y in the picture
 */
function CachedSprite(sprites, key, parts, width, height) {
  this.sprites = sprites;
  this.key = key;
  this.parts = parts;
  this.width = width;
  this.height = height;

  //one part can be drawn straight from its sheet when there is no room for
  //it on the pages - and so gives its slot up to one that cannot
  this.direct = parts.length === 1;

  //where it is while it is on a page, set by the canvas cache
  this.slot = -1;
  this.sourceImage = null;
  this.offsetX = 0;
  this.offsetY = 0;
}

/**
 * Makes it drawable from sourceImage at offsetX, offsetY this frame.
 *
 * @returns {boolean} false while a part's sheet is still loading - or when a
 *          picture of more than one part finds no room left on the pages
 */
CachedSprite.prototype.acquire = function () {
  var cache = this.sprites.cache;

  if (this.slot >= 0) {
    cache.slotUsed[this.slot] = cache.clock.frame;
    return true;
  }

  if (this.parts.length === 0 || !this.ready()) return false;

  if (cache.acquire(this)) return true;

  //no room left: a picture of one part is drawn straight from its sheet,
  //and tries for a slot again once there may be one
  if (this.direct) {
    var part = this.parts[0];

    this.sourceImage = part.sheet.image;
    this.offsetX = part.frame.x;
    this.offsetY = part.frame.y;

    return true;
  }

  return false;
};

/**
 * Keeps it on its page this frame without drawing it - for the frames of an
 * animation that are not the one showing.
 */
CachedSprite.prototype.keep = function () {
  var cache = this.sprites.cache;

  cache.keep(this);
  //and as it is drawn lit, where it is (see lightPass)
  if (this.faces) cache.keep(this.faces);
  if (this.night) cache.keep(this.night);
  if (this.shadow) cache.keep(this.shadow);
};

/**
 * Whether every part's sheet has loaded - asking for the ones that have not.
 */
CachedSprite.prototype.ready = function () {
  var ready = true;

  for (var i = 0; i < this.parts.length; i++)
    if (this.parts[i].sheet.image === null) {
      this.sprites.loadSheet(this.parts[i].sheet);
      ready = false;
    }

  return ready;
};

/**
 * Puts the parts together at x, y of ctx - a page of the canvas cache.
 */
CachedSprite.prototype.paint = function (ctx, x, y) {
  for (var i = 0; i < this.parts.length; i++) {
    var part = this.parts[i],
      f = part.frame;

    //a painted picture used just now is the last to be let go of
    if (part.sheet.generated !== null) this.sprites.generator.use(part.sheet);

    ctx.drawImage(
      part.sheet.image,
      f.x,
      f.y,
      f.w,
      f.h,
      x + part.x,
      y + part.y,
      f.w,
      f.h,
    );
  }
};

/* --- Lit -------------------------------------------------------------- */

//the passes a lit layer is drawn in (engine SpriteRenderer.pass): where
//things look up, and what shines at night
var UP = Lighting.UP,
  SHINE = Lighting.SHINE;

//what it is painted as for the light to be worked out as it is drawn - its
//faces side by side, what of it shines at night and itself in black - each
//put together when it is first wanted (see Layers), or null where no part of
//it can be painted so
CachedSprite.prototype.faces = undefined;
CachedSprite.prototype.night = undefined;
//itself in black, for the passes it has nothing of its own in (see Shadow)
CachedSprite.prototype.shadow = null;
//what lightPass hands out: where on a page what it draws is
CachedSprite.prototype.at = null;

/**
 * What to draw of it in a pass of a lit layer (engine SpriteRenderer), on
 * a page: its picture of what looks the pass's way - or of what shines,
 * lights on or not - and where it has none, itself in black, so it still
 * hides what is behind it; null for nothing to draw.
 *
 * Its faces are drawn once they are painted; until then, and for a picture
 * that has none, it is drawn as it is where things look up, and in black in
 * the other passes. On flat ground (flat) nothing behind it needs hiding:
 * what is black is not drawn there, nor anything of what shines.
 *
 * @param renderer {Object} what draws it: a building's has the seed its
 *        lights go on and off by (windows, see Lighting windowsOn)
 * @returns {{sourceImage, offsetX, offsetY}|null}
 */
CachedSprite.prototype.lightPass = function (pass, flat, renderer) {
  var layers;

  if (pass === SHINE) {
    if (flat) return null;

    layers = layersOf(this, "night");
    if (layers !== null && layers.acquire())
      return section(
        this,
        layers,
        renderer.windows !== undefined && Lighting.windowsOn(renderer.windows)
          ? 0
          : 1,
      );

    return shadowOf(this);
  }

  layers = layersOf(this, "faces");
  if (layers !== null && layers.acquire()) {
    if (flat && (layers.sides & (1 << pass)) === 0) return null;

    return section(this, layers, pass);
  }

  if (pass === UP) return this.acquire() ? this : null;

  return flat ? null : shadowOf(this);
};

function section(self, layers, k) {
  var at = self.at || (self.at = { sourceImage: null, offsetX: 0, offsetY: 0 });

  at.sourceImage = layers.sourceImage;
  at.offsetX = layers.offsetX + k * self.width;
  at.offsetY = layers.offsetY;

  return at;
}

function layersOf(self, look) {
  if (self[look] !== undefined) return self[look];

  var any = self.parts.some(function (part) {
    return self.sprites.lookSheet(part.sheet, look) !== null;
  });

  return (self[look] = any ? new Layers(self, look) : null);
}

function shadowOf(self) {
  var shadow = self.shadow || (self.shadow = new Shadow(self));

  return shadow.acquire() ? shadow : null;
}

/**
 * A picture put together the way it is to be drawn lit (shared/gen/isobox
 * setMode): its n pictures side by side - n its width over the sprite's - a
 * part painted out of boxes as its own n, any other in black where it has
 * no picture of its own: where things look up, in the faces, it is as it is.
 */
function Layers(sprite, look) {
  this.sprite = sprite;
  this.look = look;
  this.n = look === "faces" ? 3 : 2;
  this.width = sprite.width * this.n;
  this.height = sprite.height;
  //which of its n pictures have anything but black in them
  this.sides = 0;
  this.direct = false;
  this.slot = -1;
  this.sourceImage = null;
  this.offsetX = 0;
  this.offsetY = 0;
}

Layers.prototype.acquire = function () {
  var cache = this.sprite.sprites.cache;

  if (this.slot >= 0) {
    cache.slotUsed[this.slot] = cache.clock.frame;
    return true;
  }

  return this.ready() && cache.acquire(this);
};

Layers.prototype.ready = function () {
  var sprites = this.sprite.sprites,
    parts = this.sprite.parts,
    ready = true;

  for (var i = 0; i < parts.length; i++) {
    var sheet = sprites.lookSheet(parts[i].sheet, this.look) || parts[i].sheet;

    if (sheet.image === null) {
      sprites.loadSheet(sheet);
      ready = false;
    }
  }

  return ready;
};

Layers.prototype.paint = function (ctx, x, y) {
  var sprites = this.sprite.sprites,
    parts = this.sprite.parts,
    W = this.sprite.width,
    n = this.n,
    i,
    k;

  this.sides = 0;

  for (i = 0; i < parts.length; i++) {
    var part = parts[i],
      f = part.frame,
      own = sprites.lookSheet(part.sheet, this.look);

    if (own !== null) {
      sprites.generator.use(own);
      this.sides |= own.sides;

      for (k = 0; k < n; k++)
        ctx.drawImage(
          own.image,
          k * f.w,
          0,
          f.w,
          f.h,
          x + k * W + part.x,
          y + part.y,
          f.w,
          f.h,
        );

      continue;
    }

    if (part.sheet.generated !== null) sprites.generator.use(part.sheet);

    for (k = 0; k < n; k++) {
      var dx = x + k * W + part.x,
        dy = y + part.y;

      if (this.look === "faces" && k === UP) {
        ctx.drawImage(part.sheet.image, f.x, f.y, f.w, f.h, dx, dy, f.w, f.h);
        this.sides |= 1 << UP;
      } else ctx.drawImage(black(part), 0, 0, f.w, f.h, dx, dy, f.w, f.h);
    }
  }
};

/**
 * The sprite in black, where it is: for the passes it has nothing of its own
 * to draw in, so that it still hides what is behind it there.
 */
function Shadow(sprite) {
  this.sprite = sprite;
  this.width = sprite.width;
  this.height = sprite.height;
  this.direct = false;
  this.slot = -1;
  this.sourceImage = null;
  this.offsetX = 0;
  this.offsetY = 0;
}

Shadow.prototype.acquire = function () {
  var cache = this.sprite.sprites.cache;

  if (this.slot >= 0) {
    cache.slotUsed[this.slot] = cache.clock.frame;
    return true;
  }

  return this.sprite.ready() && cache.acquire(this);
};

Shadow.prototype.paint = function (ctx, x, y) {
  var parts = this.sprite.parts;

  for (var i = 0; i < parts.length; i++) {
    var part = parts[i],
      f = part.frame;

    ctx.drawImage(
      black(part),
      0,
      0,
      f.w,
      f.h,
      x + part.x,
      y + part.y,
      f.w,
      f.h,
    );
  }
};

//a part in black, on a scratch canvas - painted there rather than blacked
//out where it lands, which would black out what is under it too
var scratch = null;

function black(part) {
  var f = part.frame;

  if (scratch === null || scratch.width < f.w || scratch.height < f.h) {
    scratch = document.createElement("canvas");
    scratch.width = Math.max(f.w, scratch ? scratch.width : 0, 256);
    scratch.height = Math.max(f.h, scratch ? scratch.height : 0, 256);
    scratch.ctx = scratch.getContext("2d");
  }

  var ctx = scratch.ctx;

  ctx.globalCompositeOperation = "copy";
  ctx.drawImage(part.sheet.image, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, f.w, f.h);

  return scratch;
}

export default CachedSprite;
