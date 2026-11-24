/**
 * A stretch of the ground drawn as one gameObject, its tiles in typed arrays:
 * a draw list (where each is) and a table of pictures (how big each is,
 * shared/draw), culled by shared/draw's Visible and drawn and picked like
 * sprites, in the order they were put.
 * See isometrica/.claude/skills/rendering/camera.md (Ground and frames).
 */
import engine from "engine";
import { DrawList, Pictures, Visible } from "shared/draw";
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

//what of a stretch is on the screen, one stretch drawn at a time
var onScreen = Visible(1024);

//the arrays a tile's shape is kept in, a number each, by name and kind -
//what grows and closes up a slot at a time (grow, close); heights is four a
//tile; where it is and how big its picture is are in list and pictures
var PER_TILE = {
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
  //each tile by its slot, a row of the draw list: where it is in the world
  //(x, y, z) - to the float, as a Transform keeps it, for each to be put on
  //the very pixel it was as a gameObject - and its index (core Terrain) as
  //the row's tag. Its picture is the one of the same number in pictures:
  //how big (0 by 0 till it comes in) and where it is drawn from. A slot's
  //sprite may be its own (Meanwhile, client/terrain), so the table is the
  //stretch's, a picture a slot.
  this.list = DrawList(capacity);
  this.pictures = Pictures(capacity);
  //the shape it was last drawn in (shape) - its terrain type, slope, how
  //high its left corner is, and which way it was seen from, 0 for a slot
  //with no tile in it; and how high its corners are drawn (heights: as
  //TerrainGridRenderer reads them, x, y; x + 1, y; x, y + 1; x + 1, y + 1)
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
  if (this.count === this.view.length) grow(this, this.count * 2);

  var s = this.count++;

  this.list.add(0, 0, 0, s, 0, tile);
  this.pictures.add(0, 0, this.pivotX, this.pivotY);
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

  //list and pictures grow by themselves, as rows are added
  more = new Int8Array(capacity * 4);
  more.set(self.heights);
  self.heights = more;

  while (self.sprites.length < capacity) self.sprites.push(null);
}

/**
 * Puts the tile in slot s where it is drawn, as the picture sprite.
 */
GroundChunk.prototype.set = function (s, x, y, z, sprite) {
  var list = this.list;

  //to the float, as it was kept in a Float32Array: the same pixel
  list.x[s] = Math.fround(x);
  list.y[s] = Math.fround(y);
  list.z[s] = Math.fround(z);
  this.sprites[s] = sprite;
  this.pictures.width[s] = sprite.width;
  this.pictures.height[s] = sprite.height;
  this.measured = false;
};

/**
 * Has every tile drawn from x, y in its picture.
 */
GroundChunk.prototype.setPivot = function (x, y) {
  if (this.pivotX === x && this.pivotY === y) return;

  this.pivotX = x;
  this.pivotY = y;
  this.pictures.pivotX.fill(x, 0, this.count);
  this.pictures.pivotY.fill(y, 0, this.count);
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
    list = this.list,
    pictures = this.pictures,
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
      //the row's picture stays its own number
      list.x[n] = list.x[s];
      list.y[n] = list.y[s];
      list.z[n] = list.z[s];
      list.tag[n] = list.tag[s];
      pictures.width[n] = pictures.width[s];
      pictures.height[n] = pictures.height[s];
      slots[list.tag[n]] = n;
    }

    n++;
  }

  for (s = n; s < count; s++) this.sprites[s] = null;

  this.count = list.count = pictures.count = n;
  this.gone = 0;
};

/**
 * Works out its box (X0..DOWN) from its tiles as they are now - and reads
 * the size of every picture again, for one that has come in since.
 */
function measure(self) {
  var b = self.box,
    count = self.count,
    xs = self.list.x,
    ys = self.list.y,
    zs = self.list.z,
    ws = self.pictures.width,
    hs = self.pictures.height,
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
 * sprite (shared/draw Visible, the engine's cull - the two have to stay in
 * step), and drawn the last first, as they were when the last one put in
 * the world was drawn first. Returns how many were drawn.
 */
GroundChunk.prototype.draw = function (layer, renderer, M, width, height, pad) {
  var seen = onScreen,
    sprites = this.sprites,
    ys = this.list.y,
    rows,
    sxs,
    sys,
    s,
    i;

  seen.clear();
  seen.cull(this.list, this.pictures, M, width, height, pad);

  rows = seen.rows;
  sxs = seen.sx;
  sys = seen.sy;

  for (i = seen.count - 1; i >= 0; i--) {
    s = rows[i];
    picture(layer, renderer, sprites[s], sxs[i], sys[i], ys[s]);
  }

  return seen.count;
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
    xs = this.list.x,
    ys = this.list.y,
    zs = this.list.z,
    ws = this.pictures.width,
    hs = this.pictures.height,
    tiles = this.list.tag,
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
      return tiles[s];
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
