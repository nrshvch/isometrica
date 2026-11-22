/**
 * A stretch of the ground drawn as one gameObject: what each of its tiles is
 * drawn as kept in arrays side by side rather than in a gameObject a tile -
 * the way a tilemap keeps its tiles - so that the world has one gameObject
 * to cull and to go over where it had a few hundred. Off the screen, the
 * whole stretch costs one test; on it, every tile is culled and drawn as it
 * was when it was a sprite of its own (engine Canvas2dRenderer cull, Sprite-
 * Renderer), in the same order - the GPU is handed what it always was.
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
//spot each is drawn from (its pivot), and right and down of it
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

/**
 * @param capacity {number} how many tiles it is made with room for - it
 *        grows past that if it has to
 * @constructor
 */
function GroundChunk(capacity) {
  engine.GameObject.init(this, "ground");

  capacity = Math.max(capacity, 1);
  this.count = 0;
  //what each tile is, by its slot: its index (core Terrain), where it is in
  //the world - kept as a Transform keeps it, to the float, for each to be
  //put on the very pixel it was as a gameObject - what it is drawn as and
  //from where in it, how high its corners are drawn (as TerrainGridRenderer
  //reads them: x, y; x + 1, y; x, y + 1; x + 1, y + 1), and the shape it was
  //last drawn in (client/terrain shapeTile) - null for a tile taken out
  this.tile = new Int32Array(capacity);
  this.x = new Float32Array(capacity);
  this.y = new Float32Array(capacity);
  this.z = new Float32Array(capacity);
  this.pivotX = new Float32Array(capacity);
  this.pivotY = new Float32Array(capacity);
  this.heights = new Int8Array(capacity * 4);
  this.sprites = new Array(capacity).fill(null);
  this.shapes = new Array(capacity).fill(null);
  //its box (X0..DOWN), and whether that is as the tiles are now; and
  //whether every picture's size is known - one still to come in may be any
  //size, and while there is one, the stretch is not culled as a whole
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
  this.measured = false;

  return s;
};

function grow(self, capacity) {
  var keys = ["tile", "x", "y", "z", "pivotX", "pivotY"],
    i,
    more;

  for (i = 0; i < keys.length; i++) {
    more = new self[keys[i]].constructor(capacity);
    more.set(self[keys[i]]);
    self[keys[i]] = more;
  }

  more = new Int8Array(capacity * 4);
  more.set(self.heights);
  self.heights = more;

  for (i = self.sprites.length; i < capacity; i++) {
    self.sprites.push(null);
    self.shapes.push(null);
  }
}

/**
 * Puts the tile in slot s where it is drawn, as the picture sprite, from
 * pivotX, pivotY in it.
 */
GroundChunk.prototype.set = function (s, x, y, z, sprite, pivotX, pivotY) {
  this.x[s] = x;
  this.y[s] = y;
  this.z[s] = z;
  this.sprites[s] = sprite;
  this.pivotX[s] = pivotX;
  this.pivotY[s] = pivotY;
  this.measured = false;
};

/**
 * Takes the tile in slot s out - its slot left as it is until close() -
 * and says whether it is the first of the stretch's taken out since.
 */
GroundChunk.prototype.remove = function (s) {
  this.sprites[s] = null;
  this.shapes[s] = null;
  this.measured = false;

  return ++this.gone === 1;
};

/**
 * Closes up the slots of the tiles taken out, the rest kept in their order,
 * and has slots - every tile's slot by its index (client/terrain) - say
 * where those that moved went.
 */
GroundChunk.prototype.close = function (slots) {
  var count = this.count,
    heights = this.heights,
    n = 0,
    s,
    k;

  for (s = 0; s < count; s++) {
    if (this.shapes[s] === null) continue;

    if (n !== s) {
      this.tile[n] = this.tile[s];
      this.x[n] = this.x[s];
      this.y[n] = this.y[s];
      this.z[n] = this.z[s];
      this.pivotX[n] = this.pivotX[s];
      this.pivotY[n] = this.pivotY[s];
      this.sprites[n] = this.sprites[s];
      this.shapes[n] = this.shapes[s];
      for (k = 0; k < 4; k++) heights[4 * n + k] = heights[4 * s + k];
      slots[this.tile[n]] = n;
    }

    n++;
  }

  for (s = n; s < count; s++) {
    this.sprites[s] = null;
    this.shapes[s] = null;
  }

  this.count = n;
  this.gone = 0;
};

/**
 * Works out its box (X0..DOWN) from its tiles as they are now.
 */
function measure(self) {
  var b = self.box,
    count = self.count,
    sized = true,
    sprite,
    x,
    y,
    z,
    px,
    py,
    s;

  b[X0] = b[Y0] = b[Z0] = Infinity;
  b[X1] = b[Y1] = b[Z1] = -Infinity;
  b[LEFT] = b[RIGHT] = b[UP] = b[DOWN] = 0;

  for (s = 0; s < count; s++) {
    sprite = self.sprites[s];

    if (sprite === null) continue;
    if (sprite.width === 0) sized = false;

    x = self.x[s];
    y = self.y[s];
    z = self.z[s];
    px = self.pivotX[s];
    py = self.pivotY[s];

    if (x < b[X0]) b[X0] = x;
    if (x > b[X1]) b[X1] = x;
    if (y < b[Y0]) b[Y0] = y;
    if (y > b[Y1]) b[Y1] = y;
    if (z < b[Z0]) b[Z0] = z;
    if (z > b[Z1]) b[Z1] = z;
    if (px > b[LEFT]) b[LEFT] = px;
    if (sprite.width - px > b[RIGHT]) b[RIGHT] = sprite.width - px;
    if (py > b[UP]) b[UP] = py;
    if (sprite.height - py > b[DOWN]) b[DOWN] = sprite.height - py;
  }

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
    xs = this.x,
    ys = this.y,
    zs = this.z,
    pivotX = this.pivotX,
    pivotY = this.pivotY,
    sprites = this.sprites,
    drawn = 0,
    sprite,
    x,
    y,
    z,
    sx,
    sy,
    s;

  for (s = this.count - 1; s >= 0; s--) {
    sprite = sprites[s];

    if (sprite === null) continue;

    x = xs[s];
    y = ys[s];
    z = zs[s];
    sx = Math.floor(m0 * x + m4 * y + m8 * z + m12 - pivotX[s] + 0.5);
    sy = Math.floor(m1 * x + m5 * y + m9 * z + m13 - pivotY[s] + 0.5);

    if (
      sx > width + pad ||
      sx + sprite.width < -pad ||
      sy > height + pad ||
      sy + sprite.height < -pad
    )
      continue;

    picture(layer, renderer, sprite, sx, sy, y);
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
    layer = this.renderer.layer,
    sprite,
    px,
    py,
    pz,
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
    sprite = this.sprites[s];

    if (sprite === null) continue;

    px = this.x[s];
    py = this.y[s];
    pz = this.z[s];
    sx = Math.floor(m0 * px + m4 * py + m8 * pz + m12 - this.pivotX[s] + 0.5);
    sy = Math.floor(m1 * px + m5 * py + m9 * pz + m13 - this.pivotY[s] + 0.5);

    if (x < sx || x >= sx + sprite.width || y < sy || y >= sy + sprite.height)
      continue;

    if (CameraScript.hit(sprite, layer, Math.floor(x - sx), Math.floor(y - sy)))
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
