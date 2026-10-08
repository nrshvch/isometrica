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
  if (this.deferred) cache.keep(this.deferred);
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

//the passes a lit layer is drawn in (engine SpriteRenderer.pass): its
//colours, the ways it looks, and at night how high it stands, what shines,
//and the light thrown round it
var ALBEDO = Lighting.ALBEDO,
  NORMAL = Lighting.NORMAL,
  HEIGHT = Lighting.HEIGHT,
  SHINE = Lighting.SHINE,
  GLOW = Lighting.GLOW;

//its pictures to be lit as it is drawn, side by side (shared/gen/looks
//DEFERRED): its colours, and which way every pixel looks
var DEFERRED = 2;

//its pictures for the night, side by side (shared/gen/looks NIGHT): what
//shines one way with the first of its lights on and with more of them, the
//same the other way, itself in black, the light it throws round it each of
//those ways, how high every pixel stands, and the whole of it in white
var NIGHT = 11,
  DARK = 4,
  SPILT = 5,
  TALL = 9,
  WHOLE = 10;

/**
 * Which of its pictures for the night a sprite is drawn with in pass: of
 * what shines, the one its lights are on in at this hour (Lighting shines)
 * the way its renderer lights it (variant, 0 or 1), or itself in black; of
 * the light thrown round, what it throws with those lights on.
 */
function nightSection(pass, renderer) {
  var on = Lighting.shines(renderer);

  if (on === 0) return DARK;

  return (
    (pass === GLOW ? SPILT : 0) + (renderer.variant === 1 ? 2 : 0) + on - 1
  );
}

//what it is painted as for the light to be worked out as it is drawn - its
//colours and the ways it looks side by side, and its pictures for the
//night - each put together when it is first wanted (see Layers), or null
//where no part of it can be painted so
CachedSprite.prototype.deferred = undefined;
CachedSprite.prototype.night = undefined;
//itself in black, for the passes it has nothing of its own in (see Shadow)
CachedSprite.prototype.shadow = null;
//what lightPass hands out: where on a page what it draws is
CachedSprite.prototype.at = null;

/**
 * What to draw of it in a pass of a lit layer (engine SpriteRenderer), on
 * a page: its colours, the ways it looks, how high it stands, what of it
 * shines - lights on or not - or the light it throws round it; and where it
 * has none, itself as it is with the colours and in black otherwise - which
 * is looking up, standing on the ground, and nothing shining - so it still
 * hides what is behind it; null for nothing to draw.
 *
 * On flat ground (flat) nothing behind it needs hiding: what is black is not
 * drawn there - nor how high it stands, being on the ground, nor anything of
 * what shines.
 *
 * @param renderer {Object} what draws it, and with it whether what of it
 *        shines is lit at this hour (see Lighting shines)
 * @returns {{sourceImage, offsetX, offsetY}|null}
 */
CachedSprite.prototype.lightPass = function (pass, flat, renderer) {
  var layers;

  //how high it stands, what shines, or the light it throws round it
  if (pass >= HEIGHT) {
    if (flat) return null;

    layers = layersOf(this, "night");
    if (layers !== null && layers.acquire())
      return section(
        this,
        layers,
        pass === HEIGHT ? TALL : nightSection(pass, renderer),
      );

    return shadowOf(this);
  }

  layers = layersOf(this, "deferred");
  if (layers !== null && layers.acquire()) {
    if (flat && (layers.sides & (1 << pass)) === 0) return null;

    return section(this, layers, pass);
  }

  if (pass === ALBEDO) return this.acquire() ? this : null;

  return flat ? null : shadowOf(this);
};

//whether part i of a sprite is lit at night the other way round from the
//way the sprite is (see Layers paint) - by a toss of its own, the same every
//time for the same part in the same place
function swapped(part, i) {
  var h = (part.y * 73856093) ^ (part.x * 19349663) ^ (i * 83492791);

  var name = String(part.frame.sheet);

  for (var c = 0; c < name.length; c++)
    h = (Math.imul(h, 31) + name.charCodeAt(c)) | 0;

  return ((h >>> 7) & 1) === 1;
}

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
 * no picture of its own: with the colours, it is as it is.
 */
function Layers(sprite, look) {
  this.sprite = sprite;
  this.look = look;
  this.n = look === "night" ? NIGHT : DEFERRED;
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
    night = this.look === "night",
    //where the ground is in it: the foot of the lowest part - every part
    //laid higher than that stands as much higher (see lift)
    ground = -Infinity,
    i,
    k;

  this.sides = 0;

  for (i = 0; i < parts.length; i++)
    ground = Math.max(ground, parts[i].y + parts[i].frame.pivotY);

  for (i = 0; i < parts.length; i++) {
    var part = parts[i],
      f = part.frame,
      own = sprites.lookSheet(part.sheet, this.look);

    if (own !== null) {
      sprites.generator.use(own);
      this.sides |= own.sides;

      //for the night, a part lit the other way round from the rest now and
      //then - so that a storey that comes up again and again is not lit
      //alike every time
      var swap = night && swapped(part, i) ? 2 : 0;

      for (k = 0; k < n; k++)
        ctx.drawImage(
          own.image,
          (k < DARK || !night
            ? k ^ swap
            : k > DARK && k < TALL
              ? SPILT + ((k - SPILT) ^ swap)
              : k) * f.w,
          0,
          f.w,
          f.h,
          x + k * W + part.x,
          y + part.y,
          f.w,
          f.h,
        );

      if (night)
        lift(
          ctx,
          own.image,
          f,
          x + TALL * W + part.x,
          y + part.y,
          ground - (part.y + f.pivotY),
        );

      continue;
    }

    if (part.sheet.generated !== null) sprites.generator.use(part.sheet);

    //a part with no pictures of its own: as it is with the colours, and
    //black - looking up, on the ground, nothing shining - otherwise
    for (k = 0; k < n; k++) {
      var dx = x + k * W + part.x,
        dy = y + part.y;

      if (!night && k === ALBEDO) {
        ctx.drawImage(part.sheet.image, f.x, f.y, f.w, f.h, dx, dy, f.w, f.h);
        this.sides |= 1 << ALBEDO;
      } else ctx.drawImage(black(part), 0, 0, f.w, f.h, dx, dy, f.w, f.h);
    }
  }
};

/**
 * Lifts how high a part stands by up, where it was just drawn at x, y in
 * the picture of how high things stand: the part as painted stands on its
 * own foot, which is up higher than the ground the whole stands on - added
 * on, a pixel a unit, wherever the part is (its picture in white, by
 * up / 255).
 */
function lift(ctx, image, f, x, y, up) {
  if (up <= 0) return;

  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.min(1, up / 255);
  ctx.drawImage(image, WHOLE * f.w, 0, f.w, f.h, x, y, f.w, f.h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

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
