/**
 * A stretch of the ground drawn as one gameObject: what each of its tiles is
 * drawn as kept in arrays side by side rather than in a gameObject a tile -
 * the way a tilemap keeps its tiles - so that the world has one gameObject
 * to cull and to go over where it had a few hundred. Off the screen, the
 * whole stretch costs one test; on it, every tile is culled and drawn as it
 * was when it was a sprite of its own (engine Canvas2dRenderer cull, Sprite-
 * Renderer), in the same order - the GPU is handed what it always was.
 *
 * Everything about a tile is a number in a typed array but its picture,
 * which is drawn from: a tile is culled from its numbers alone, and only one
 * on the screen is its picture looked at.
 *
 * What a tile shows, where, and how high its corners are is client/terrain's
 * to work out (shapeTile); this only keeps it, and culls, draws and picks by
 * it.
 *
 * A stretch is whatever tiles were drawn at once (Terrain#draw) - a chunk of
 * the ground as the camera brings it in - and stays where it was put in the
 * world's order, as they did one by one: the ground is not sorted by depth,
 * and what is drawn over what along a hillside goes by that order.
 */
import engine from "engine";
import RenderLayer from "./renderlayer";
import CameraScript from "./components/camerascript";

var Renderer = engine.Renderer,
  picture = engine.SpriteRenderer.picture,
  EngineConfig = engine.Config,
  //every picture drawn - its tiles, not the stretch, which the renderer
  //counted as one already (Canvas2dRenderer)
  DRAWN = engine.Stats.counter("drawn");

//what the stretch's screen box is worked out from (measure): the least and
//most x, y and z of where its tiles are in the world, and how far the
//pictures go out past that, the most of any of them - left and up of the
//spot each is drawn from (the pivot), and right and down of it
var X0 = 0,
  X1 = 1,
  Y0 = 2,
  Y1 = 3,
  Z0 = 4,
  Z1 = 5,
  LEFT = 6,
  RIGHT = 7,
  UP = 8,
  DOWN = 9;

//where on the screen the stretch may show (spread): a whole pixel more each
//way than its box, for the rounding of every tile's spot to the pixel
var spread = new Float64Array(4);

//the arrays a tile is kept in, a number each, by name and kind - what grows
//and closes up a slot at a time (grow, close); heights is four a tile
var PER_TILE = {
  tile: Int32Array,
  x: Float32Array,
  y: Float32Array,
  z: Float32Array,
  w: Uint16Array,
  h: Uint16Array,
  kind: Uint8Array,
  slope: Int16Array,
  level: Int16Array,
  view: Uint8Array,
};
var NAMES = Object.keys(PER_TILE);

/**
 * @param capacity {number} how many tiles it is made with room for - it
 *        grows past that, twice as big at a time, if it has to
 * @constructor
 */
function GroundChunk(capacity) {
  engine.GameObject.init(this, "ground");

  capacity = Math.max(capacity, 1);
  this.count = 0;
  //what each tile is, by its slot: its index (core Terrain); where it is in
  //the world - kept as a Transform keeps it, to the float, for each to be
  //put on the very pixel it was as a gameObject; how big its picture is
  //(w, h), 0 by 0 till the picture comes in; the shape it was last drawn
  //in (shape) - its terrain type, slope, how high its left corner is, and
  //which way it was seen from, 0 for a slot with no tile in it; and how
  //high its corners are drawn (heights: as TerrainGridRenderer reads them,
  //x, y; x + 1, y; x, y + 1; x + 1, y + 1)
  this.tile = new Int32Array(capacity);
  this.x = new Float32Array(capacity);
  this.y = new Float32Array(capacity);
  this.z = new Float32Array(capacity);
  this.w = new Uint16Array(capacity);
  this.h = new Uint16Array(capacity);
  this.kind = new Uint8Array(capacity);
  this.slope = new Int16Array(capacity);
  this.level = new Int16Array(capacity);
  this.view = new Uint8Array(capacity);
  this.heights = new Int8Array(capacity * 4);
  //what each is drawn as
  this.sprites = new Array(capacity).fill(null);
  //where in its picture every tile is drawn from - the same for them all
  this.pivotX = 0;
  this.pivotY = 0;
  //its box (X0..DOWN), and whether that is as the tiles are now; and
  //whether every picture's size is known - one still to come in may be any
  //size, and while there is one, the stretch is not culled as a whole and
  //the sizes are read again every frame
  this.box = new Float64Array(10);
  this.measured = false;
  this.sized = false;
  //how many of its tiles are taken out, the slots not closed up yet
  this.gone = 0;

  this.addComponent(new GroundRenderer());
}

GroundChunk.prototype = Object.create(engine.GameObject.prototype);

/**
 * Makes a slot for tile, at the end - drawn first, under the rest, as a
 * tile drawn after them was - and returns it.
 */
GroundChunk.prototype.add = function (tile) {
  if (this.count === this.tile.length) grow(this, this.count * 2);

  var s = this.count++;

  this.tile[s] = tile;
  this.view[s] = 0;
  this.measured = false;

  return s;
};

function grow(self, capacity) {
  var i, more;

  for (i = 0; i < NAMES.length; i++) {
    more = new PER_TILE[NAMES[i]](capacity);
    more.set(self[NAMES[i]]);
    self[NAMES[i]] = more;
  }

  more = new Int8Array(capacity * 4);
  more.set(self.heights);
  self.heights = more;

  while (self.sprites.length < capacity) self.sprites.push(null);
}

/**
 * Puts the tile in slot s where it is drawn, as the picture sprite.
 */
GroundChunk.prototype.set = function (s, x, y, z, sprite) {
  this.x[s] = x;
  this.y[s] = y;
  this.z[s] = z;
  this.sprites[s] = sprite;
  this.w[s] = sprite.width;
  this.h[s] = sprite.height;
  this.measured = false;
};

/**
 * Has every tile drawn from x, y in its picture.
 */
GroundChunk.prototype.setPivot = function (x, y) {
  if (this.pivotX === x && this.pivotY === y) return;

  this.pivotX = x;
  this.pivotY = y;
  this.measured = false;
};

/**
 * Whether the tile in slot s was last drawn in this shape - see shape.
 */
GroundChunk.prototype.shaped = function (s, kind, slope, level, view) {
  return (
    this.view[s] === view &&
    this.kind[s] === kind &&
    this.slope[s] === slope &&
    this.level[s] === level
  );
};

/**
 * The shape the tile in slot s is drawn in: its terrain type, its slope,
 * how high its left corner is, and which way it is seen from - any number
 * but 0, which is for a slot with no tile in it.
 */
GroundChunk.prototype.shape = function (s, kind, slope, level, view) {
  this.kind[s] = kind;
  this.slope[s] = slope;
  this.level[s] = level;
  this.view[s] = view;
};

/**
 * Takes the tile in slot s out - its slot left as it is until close() -
 * and says whether it is the first of the stretch's taken out since.
 */
GroundChunk.prototype.remove = function (s) {
  this.sprites[s] = null;
  this.view[s] = 0;
  this.measured = false;

  return ++this.gone === 1;
};

/**
 * Closes up the slots of the tiles taken out, the rest kept in their order,
 * and has slots - every tile's slot by its index (client/terrain) - say
 * where those that moved went. Every slot up to count has a tile in it
 * again after.
 */
GroundChunk.prototype.close = function (slots) {
  var count = this.count,
    view = this.view,
    heights = this.heights,
    n = 0,
    a,
    s,
    k;

  for (s = 0; s < count; s++) {
    if (view[s] === 0) continue;

    if (n !== s) {
      for (k = 0; k < NAMES.length; k++) {
        a = this[NAMES[k]];
        a[n] = a[s];
      }
      for (k = 0; k < 4; k++) heights[4 * n + k] = heights[4 * s + k];
      this.sprites[n] = this.sprites[s];
      slots[this.tile[n]] = n;
    }

    n++;
  }

  for (s = n; s < count; s++) this.sprites[s] = null;

  this.count = n;
  this.gone = 0;
};

/**
 * Works out its box (X0..DOWN) from its tiles as they are now - and reads
 * the size of every picture again, for one that has come in since.
 */
function measure(self) {
  var b = self.box,
    count = self.count,
    xs = self.x,
    ys = self.y,
    zs = self.z,
    ws = self.w,
    hs = self.h,
    sprites = self.sprites,
    sized = true,
    w,
    h,
    s;

  b[X0] = b[Y0] = b[Z0] = Infinity;
  b[X1] = b[Y1] = b[Z1] = -Infinity;
  w = h = 0;

  for (s = 0; s < count; s++) {
    if (sprites[s] === null) continue;

    if (ws[s] === 0) {
      ws[s] = sprites[s].width;
      hs[s] = sprites[s].height;
      if (ws[s] === 0) sized = false;
    }

    if (xs[s] < b[X0]) b[X0] = xs[s];
    if (xs[s] > b[X1]) b[X1] = xs[s];
    if (ys[s] < b[Y0]) b[Y0] = ys[s];
    if (ys[s] > b[Y1]) b[Y1] = ys[s];
    if (zs[s] < b[Z0]) b[Z0] = zs[s];
    if (zs[s] > b[Z1]) b[Z1] = zs[s];
    if (ws[s] > w) w = ws[s];
    if (hs[s] > h) h = hs[s];
  }

  b[LEFT] = self.pivotX;
  b[RIGHT] = Math.max(0, w - self.pivotX);
  b[UP] = self.pivotY;
  b[DOWN] = Math.max(0, h - self.pivotY);

  self.measured = true;
  self.sized = sized;
}

/**
 * Where on the screen M puts the world into the stretch may show, into
 * spread (left, right, top, bottom) - false when it has nothing in it to
 * show; and true, spread left as it was, while a picture of it is still to
 * come in and it may be any size.
 *
 * Where a point goes on the screen is a sum of what each of its x, y and z
 * adds, so over the box where the tiles are it goes from the least that
 * each adds to the most: the box's corners are not needed.
 */
function bounds(self, M) {
  var b = self.box,
    lo,
    hi,
    p,
    q;

  if (!self.measured || !self.sized) measure(self);
  if (self.count === 0 || b[X0] > b[X1]) return false;
  if (!self.sized) return true;

  lo = hi = M[12];
  p = M[0] * b[X0];
  q = M[0] * b[X1];
  lo += Math.min(p, q);
  hi += Math.max(p, q);
  p = M[4] * b[Y0];
  q = M[4] * b[Y1];
  lo += Math.min(p, q);
  hi += Math.max(p, q);
  p = M[8] * b[Z0];
  q = M[8] * b[Z1];
  lo += Math.min(p, q);
  hi += Math.max(p, q);
  spread[0] = lo - b[LEFT] - 1;
  spread[1] = hi + b[RIGHT] + 1;

  lo = hi = M[13];
  p = M[1] * b[X0];
  q = M[1] * b[X1];
  lo += Math.min(p, q);
  hi += Math.max(p, q);
  p = M[5] * b[Y0];
  q = M[5] * b[Y1];
  lo += Math.min(p, q);
  hi += Math.max(p, q);
  p = M[9] * b[Z0];
  q = M[9] * b[Z1];
  lo += Math.min(p, q);
  hi += Math.max(p, q);
  spread[2] = lo - b[UP] - 1;
  spread[3] = hi + b[DOWN] + 1;

  return true;
}

/**
 * Whether any of it may be on a screen width by height, or within pad of it
 * - the stretch as a whole, before any tile of it is looked at.
 */
GroundChunk.prototype.visible = function (M, width, height, pad) {
  if (!bounds(this, M)) return false;
  if (!this.sized) return true;

  return !(
    spread[0] > width + pad ||
    spread[1] < -pad ||
    spread[2] > height + pad ||
    spread[3] < -pad
  );
};

/**
 * Draws every tile of it on a screen width by height, or within pad of it,
 * into layer: culled and put on the pixel as the engine culls and puts a
 * sprite (Canvas2dRenderer cull - the two have to stay in step), and drawn
 * the last first, as they were when the last one put in the world was drawn
 * first. Returns how many were drawn.
 */
GroundChunk.prototype.draw = function (layer, renderer, M, width, height, pad) {
  var m0 = M[0],
    m1 = M[1],
    m4 = M[4],
    m5 = M[5],
    m8 = M[8],
    m9 = M[9],
    m12 = M[12],
    m13 = M[13],
    px = this.pivotX,
    py = this.pivotY,
    xs = this.x,
    ys = this.y,
    zs = this.z,
    ws = this.w,
    hs = this.h,
    right = width + pad,
    bottom = height + pad,
    drawn = 0,
    x,
    y,
    z,
    sx,
    sy,
    s;

  for (s = this.count - 1; s >= 0; s--) {
    x = xs[s];
    y = ys[s];
    z = zs[s];
    //added up in the engine's order, to the bit: the spot rounded to the
    //pixel is the engine's to the pixel
    sx = Math.floor(m0 * x + m4 * y + m8 * z + m12 - px + 0.5);
    sy = Math.floor(m1 * x + m5 * y + m9 * z + m13 - py + 0.5);

    if (sx > right || sx + ws[s] < -pad || sy > bottom || sy + hs[s] < -pad)
      continue;

    picture(layer, renderer, this.sprites[s], sx, sy, y);
    drawn++;
  }

  return drawn;
};

/**
 * The tile of it whose picture, as it is drawn on the screen M puts the
 * world on, is there to be seen at x, y - the first of them, which is drawn
 * over the rest - or -1. As the engine picks a sprite (Canvas2dRenderer
 * under, client/components/camerascript pick): the same box to the pixel,
 * and the pixel itself.
 */
GroundChunk.prototype.tileAt = function (M, x, y) {
  var m0 = M[0],
    m1 = M[1],
    m4 = M[4],
    m5 = M[5],
    m8 = M[8],
    m9 = M[9],
    m12 = M[12],
    m13 = M[13],
    px = this.pivotX,
    py = this.pivotY,
    xs = this.x,
    ys = this.y,
    zs = this.z,
    ws = this.w,
    hs = this.h,
    layer = this.renderer.layer,
    sx,
    sy,
    s;

  if (!bounds(this, M)) return -1;
  if (
    this.sized &&
    (x < spread[0] || x > spread[1] || y < spread[2] || y > spread[3])
  )
    return -1;

  for (s = 0; s < this.count; s++) {
    sx = Math.floor(m0 * xs[s] + m4 * ys[s] + m8 * zs[s] + m12 - px + 0.5);
    sy = Math.floor(m1 * xs[s] + m5 * ys[s] + m9 * zs[s] + m13 - py + 0.5);

    if (x < sx || x >= sx + ws[s] || y < sy || y >= sy + hs[s]) continue;

    if (
      CameraScript.hit(
        this.sprites[s],
        layer,
        Math.floor(x - sx),
        Math.floor(y - sy),
      )
    )
      return this.tile[s];
  }

  return -1;
};

/**
 * What draws a stretch of the ground: culled as a whole by the engine
 * (its cullingTest), and drawing its tiles itself.
 */
function GroundRenderer() {
  Renderer.call(this);

  this.layer = RenderLayer.groundLayer;
  this.enabled = true;
  //what Lighting collect reads off whatever draws a picture
  this.opacity = 1;
}

GroundRenderer.prototype = Object.create(Renderer.prototype);

GroundRenderer.prototype.cullingTest = function (
  viewport,
  viewportRenderer,
  self,
) {
  return self.gameObject.visible(
    viewportRenderer.M,
    viewport.width,
    viewport.height,
    EngineConfig.cullMargin || 0,
  );
};

GroundRenderer.prototype.render = function (
  layer,
  viewportRenderer,
  viewport,
  self,
) {
  var drawn = self.gameObject.draw(
    layer,
    self,
    viewportRenderer.M,
    viewport.width,
    viewport.height,
    EngineConfig.cullMargin || 0,
  );

  engine.Stats.count(DRAWN, drawn - 1);
};

export default GroundChunk;
