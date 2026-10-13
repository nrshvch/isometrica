import Lighting from "./lighting";
import GLView from "./glview";

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

  //drawn from a page, always: there is nothing else to draw it from
  this.direct = false;

  //where it is while it is on a page, set by the canvas cache
  this.slot = -1;
  this.sourceImage = null;
  this.offsetX = 0;
  this.offsetY = 0;
}

/**
 * Makes it drawable from sourceImage at offsetX, offsetY this frame.
 *
 * @returns {boolean} false while a part's sheet is still loading - or when it
 *          finds no room left on the pages
 */
CachedSprite.prototype.acquire = function () {
  var cache = this.sprites.cache;

  if (this.slot >= 0) {
    cache.slotUsed[this.slot] = cache.clock.frame;
    return true;
  }

  if (this.parts.length === 0 || !this.ready()) return false;

  return cache.acquire(this);
};

/**
 * Keeps it on its page this frame without drawing it - for the frames of an
 * animation that are not the one showing.
 */
CachedSprite.prototype.keep = function () {
  var cache = this.sprites.cache;

  cache.keep(this);
  //and as it is drawn lit, where it is (see glQuad)
  if (this.deferred) cache.keep(this.deferred);
  if (this.night) cache.keep(this.night);
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

//how a picture is drawn into one of the pictures of the screen (client/
//glview): not at all, in black where it is, or from a picture of its own
var SKIP = GLView.SKIP,
  DARK_ = GLView.DARK,
  FROM = GLView.FROM;

//its pictures to be lit as it is drawn, side by side (shared/gen/looks
//DEFERRED): its colours, which way every pixel looks, and how high every
//pixel stands - and with that, how high it stands over the ground under
//every pixel, for the shadows the sun casts (see Layers finish)
var DEFERRED = 3,
  ALBEDO = 0,
  NORMAL = 1,
  HIGH = 2;

//its pictures for the night, side by side (shared/gen/looks NIGHT): what
//shines one way with the first of its lights on and with more of them, the
//same the other way, itself in black, how high every pixel stands, and the
//whole of it in white
var NIGHT = 7,
  DARK = 4,
  TALL = 5,
  WHOLE = 6;

//what it is painted as for the light to be worked out as it is drawn - its
//colours and the ways it looks side by side, and its pictures for the
//night - each put together when it is first wanted (see Layers), or null
//where no part of it can be painted so
CachedSprite.prototype.deferred = undefined;
CachedSprite.prototype.night = undefined;

/**
 * Where it is drawn from into each of the pictures of the screen (client/
 * glview add): d, from o on, four times over the page, x and y there and
 * how (SKIP, DARK, FROM) - into the colours, the ways things look, how high
 * things stand, and what shines. In a lit layer,
 * from its pictures to be lit; anywhere else, its picture as it is painted.
 * Where it has none of its own, it is drawn as it is with the colours, and in
 * black otherwise - which is looking up, standing on the ground, nothing
 * shining - so it still hides what is behind it.
 *
 * On flat ground (flat) nothing behind it needs hiding: what is black is not
 * drawn there - nor how high it stands, being on the ground, nor anything of
 * what shines.
 *
 * @param renderer {Object} what draws it, and with it whether what of it
 *        shines is lit at this hour (see Lighting shines)
 * @param lit {boolean} in a lit layer
 * @param night {boolean} with what shines, how high things stand and the
 *        light thrown round drawn too
 * @returns {boolean} false while there is nothing to draw yet
 */
CachedSprite.prototype.glQuad = function (renderer, flat, lit, night, d, o) {
  var layers = lit ? layersOf(this, "deferred") : null,
    W = this.width;

  if (layers !== null && layers.acquire()) {
    put(d, o, layers, ALBEDO * W, FROM);
    if (flat && (layers.sides & (1 << NORMAL)) === 0) skip(d, o + 4);
    else put(d, o + 4, layers, NORMAL * W, FROM);
    //how high it stands - and over the ground, for the shadows - which on
    //flat ground is nothing
    if (flat) skip(d, o + 8);
    else put(d, o + 8, layers, HIGH * W, FROM);
  } else {
    if (!this.acquire()) return false;
    put(d, o, this, 0, FROM);
    if (flat || !lit) {
      skip(d, o + 4);
      skip(d, o + 8);
    } else {
      put(d, o + 4, this, 0, DARK_);
      put(d, o + 8, this, 0, DARK_);
    }
  }

  if (!night || flat) {
    skip(d, o + 12);
    return true;
  }

  layers = layersOf(this, "night");
  if (layers !== null && layers.acquire()) {
    var on = Lighting.shines(renderer),
      way = (renderer.variant === 1 ? 2 : 0) + on - 1;

    put(d, o + 12, layers, (on === 0 ? DARK : way) * W, FROM);
  } else put(d, o + 12, this, 0, DARK_);

  return true;
};

/**
 * The lights of what shines of it at night (client/generatorcore lightsOf),
 * every part's moved to where it is in it, lifted as it is laid higher, and
 * lit the other way round where the part is: {x, y, z, color, ways} - where
 * it shines from in it, how high, its light 0..1, and how much of it with
 * the first lights on and with more, one way and the other. Null while its
 * pictures for the night are not drawn, or when nothing of it shines.
 */
CachedSprite.prototype.nightLights = function () {
  var layers = this.night;

  return layers && layers.slot >= 0 ? layers.lights : null;
};

//drawn from what is on a page, x across from where it is there
function put(d, o, from, x, how) {
  d[o] = from.sourceImage;
  d[o + 1] = from.offsetX + x;
  d[o + 2] = from.offsetY;
  d[o + 3] = how;
}

function skip(d, o) {
  d[o + 3] = SKIP;
}

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

function layersOf(self, look) {
  if (self[look] !== undefined) return self[look];

  var any = self.parts.some(function (part) {
    return self.sprites.lookSheet(part.sheet, look) !== null;
  });

  return (self[look] = any ? new Layers(self, look) : null);
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
  if (night) this.lights = null;

  //(a part that does not say where its foot is stands on the ground)
  for (i = 0; i < parts.length; i++)
    ground = Math.max(ground, parts[i].y + (parts[i].frame.pivotY || 0));

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
          (k < DARK ? k ^ swap : k) * f.w,
          0,
          f.w,
          f.h,
          x + k * W + part.x,
          y + part.y,
          f.w,
          f.h,
        );

      var up = ground - (part.y + (f.pivotY || 0));

      if (night) {
        lift(ctx, own.image, f, x + TALL * W + part.x, y + part.y, up);
        if (own.lights) this.addLights(own.lights, part, up, swap);
      } else
        lift(ctx, own.image, f, x + HIGH * W + part.x, y + part.y, up, true);

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
 * The lights of a part's pictures for the night (packed, generatorcore
 * lightsOf), among the whole's: where they are in it, as high as the part
 * is laid higher, and the ways it is lit swapped where the part's are.
 */
Layers.prototype.addLights = function (packed, part, up, swap) {
  var out = this.lights || (this.lights = []);

  up = up > 0 ? up : 0;

  for (var i = 0; i < packed.length; i += 8) {
    var c = packed[i + 3];

    out.push({
      x: part.x + packed[i],
      y: part.y + packed[i + 1],
      z: packed[i + 2] + up,
      color: [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255],
      ways: [
        packed[i + 4 + (0 ^ swap)],
        packed[i + 4 + (1 ^ swap)],
        packed[i + 4 + (2 ^ swap)],
        packed[i + 4 + (3 ^ swap)],
      ],
    });
  }
};

/**
 * Lifts how high a part stands by up, where it was just drawn at x, y in
 * the picture of how high things stand: the part as painted stands on its
 * own foot, which is up higher than the ground the whole stands on - added
 * on, a pixel a unit, wherever the part is (its picture in white, by
 * up / 255: the night's own, or its colours in white, deferred).
 */
function lift(ctx, image, f, x, y, up, deferred) {
  if (!(up > 0)) return;

  var from = deferred ? silhouette(image, 0, 0, f.w, f.h, "#fff") : image;

  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = Math.min(1, up / 255);
  ctx.drawImage(from, deferred ? 0 : WHOLE * f.w, 0, f.w, f.h, x, y, f.w, f.h);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

/**
 * The pixels of the deferred pictures painted (canvascache finish), w
 * across: under every pixel of how high it stands, how high it stands over
 * that bit of the ground - the most of what stands over it - in the green.
 * A pixel h high stands over the ground h pixels further down the picture,
 * a pixel a unit; a roof stands over all the ground the building does, a
 * wall over the ground at its foot. Every pixel of it is then as there as
 * can be, the colours' own saying how much of it there is (client/glview).
 */
Layers.prototype.finish = function (pixels, w) {
  if (this.look !== "deferred") return;

  var W = this.sprite.width,
    H = this.sprite.height,
    x0 = HIGH * W,
    over = new Uint8Array(W * H),
    i,
    j,
    o,
    k;

  for (j = 0; j < H; j++)
    for (i = 0; i < W; i++) {
      o = (j * w + x0 + i) * 4;
      if (pixels[o + 3] === 0) continue;

      var h = pixels[o],
        at = j + h;

      if (at < H && h > over[at * W + i]) over[at * W + i] = h;
    }

  //a slope going up away from the eye steps over a row of the ground now
  //and then: filled in from either side of it
  for (i = 0; i < W; i++)
    for (j = 1; j + 1 < H; j++) {
      k = j * W + i;
      if (over[k] === 0 && over[k - W] > 0 && over[k + W] > 0)
        over[k] = Math.min(over[k - W], over[k + W]);
    }

  for (j = 0; j < H; j++)
    for (i = 0; i < W; i++) {
      o = (j * w + x0 + i) * 4;
      k = over[j * W + i];
      pixels[o + 1] = k;
      //and nothing of it glows (client/glview GLOW) - what lifted it added
      //to the blue as well
      pixels[o + 2] = 0;
      if (k > 0 || pixels[o + 3] > 0) pixels[o + 3] = 255;
    }
};

//a part in black, on a scratch canvas - painted there rather than blacked
//out where it lands, which would black out what is under it too
var scratch = null;

function black(part) {
  var f = part.frame;

  return silhouette(part.sheet.image, f.x, f.y, f.w, f.h, "#000");
}

//w by h of image from x, y, all in one colour, at the top left of the
//scratch canvas
function silhouette(image, x, y, w, h, colour) {
  if (scratch === null || scratch.width < w || scratch.height < h) {
    scratch = document.createElement("canvas");
    scratch.width = Math.max(w, scratch ? scratch.width : 0, 256);
    scratch.height = Math.max(h, scratch ? scratch.height : 0, 256);
    scratch.ctx = scratch.getContext("2d");
  }

  var ctx = scratch.ctx;

  ctx.globalCompositeOperation = "copy";
  ctx.drawImage(image, x, y, w, h, 0, 0, w, h);
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, w, h);

  return scratch;
}

export default CachedSprite;
