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
  this.sprites.cache.keep(this);
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

export default CachedSprite;
