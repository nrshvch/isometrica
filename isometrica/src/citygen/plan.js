/**
 * The town being planned: a window of the world round its site, a grid of
 * what each tile of it is to be - a road, a building's, a block's own ground
 * left open, the water - in tiles of its own, x and y from the window's
 * corner, and what goes into the save once it is all worked out (save).
 */
import Ground from "./ground";

//what a tile of the plan is
export var FREE = 0;
export var ROAD = 1;
export var LOT = 2;
export var WATER = 3;
//kept for something to go there - a pump station, a square - before the
//lots are handed out
export var KEPT = 4;

//the four ways from a tile, -x, -y, +x, +y - as the roads count them
//(core/roadrules)
export var SIDES = [
  [-1, 0],
  [0, -1],
  [1, 0],
  [0, 1],
];

/**
 * @param ground {Ground}
 * @param site {Object} (site.js)
 * @param margin {number} how far round the town the window reaches, a share
 *        of how far the town does
 */
export default function Plan(ground, site, margin) {
  var w = Math.round(site.rx * 2 * margin),
    h = Math.round(site.ry * 2 * margin);

  this.ground = ground;
  this.site = site;
  this.w = w;
  this.h = h;
  //the window's corner, in the world's tiles
  this.ox = site.x - (w >> 1);
  this.oy = site.y - (h >> 1);
  //the middle of the town, in the window's
  this.cx = w >> 1;
  this.cy = h >> 1;
  this.rx = site.rx;
  this.ry = site.ry;

  this.what = new Uint8Array(w * h);
  //the block a tile is the ground of, or -1
  this.blockOf = new Int32Array(w * h).fill(-1);
  //the building on a tile, its index in buildings, or -1
  this.on = new Int32Array(w * h).fill(-1);
  this.blocks = [];
  //by tile index: {material, way, level, surface}
  this.roads = Object.create(null);
  this.buildings = [];
  //the shape of the town's edge: how far out it reaches every way round,
  //a share of rx and ry (outline)
  this.lobes = null;

  for (var y = 0; y < h; y++)
    for (var x = 0; x < w; x++)
      if (ground.isWater(this.ox + x, this.oy + y))
        this.what[y * w + x] = WATER;
}

Plan.prototype.inside = function (x, y) {
  return x >= 0 && y >= 0 && x < this.w && y < this.h;
};

Plan.prototype.at = function (x, y) {
  return this.inside(x, y) ? this.what[y * this.w + x] : WATER;
};

Plan.prototype.index = function (x, y) {
  return y * this.w + x;
};

Plan.prototype.road = function (x, y) {
  return this.inside(x, y) ? this.roads[y * this.w + x] || null : null;
};

Plan.prototype.isRoad = function (x, y) {
  return this.at(x, y) === ROAD;
};

//the world's ground under tile x, y of the window
Plan.prototype.wx = function (x) {
  return this.ox + x;
};

Plan.prototype.wy = function (y) {
  return this.oy + y;
};

/**
 * How far out from the middle of the town tile x, y is: 1 at the town's
 * edge, as its outline has it - not round, but reaching further out one way
 * and less another (outline).
 */
Plan.prototype.reach = function (x, y) {
  var dx = (x - this.cx) / this.rx,
    dy = (y - this.cy) / this.ry,
    d = Math.sqrt(dx * dx + dy * dy);

  if (this.lobes === null || d === 0) return d;

  var a = Math.atan2(dy, dx),
    r = 1;

  for (var i = 0; i < this.lobes.length; i++)
    r +=
      this.lobes[i].amp * Math.cos(this.lobes[i].n * a + this.lobes[i].phase);

  return d / r;
};

Plan.prototype.setRoad = function (x, y, material, level) {
  var k = this.index(x, y),
    was = this.roads[k];

  this.what[k] = ROAD;

  if (was === undefined)
    this.roads[k] = {
      x: x,
      y: y,
      material: material,
      way: -1,
      level: level,
      surface: null,
    };
  else if (level < was.level) {
    was.level = level;
    was.material = material;
  }
};

Plan.prototype.clearRoad = function (x, y) {
  var k = this.index(x, y);

  if (this.what[k] !== ROAD) return;

  delete this.roads[k];
  this.what[k] = this.ground.isWater(this.wx(x), this.wy(y)) ? WATER : FREE;
};

//how many roads there are next to tile x, y, and on which sides
Plan.prototype.roadSides = function (x, y) {
  var out = [];

  for (var s = 0; s < 4; s++)
    if (this.isRoad(x + SIDES[s][0], y + SIDES[s][1])) out.push(s);

  return out;
};

/**
 * Puts a building up on the plan: code, its corner with the least x and y
 * at x, y, turned rotation times, covering w by h tiles as turned.
 */
Plan.prototype.build = function (code, x, y, w, h, rotation, extra) {
  var b = {
      code: code,
      x: x,
      y: y,
      w: w,
      h: h,
      rotation: rotation,
    },
    i,
    j;

  if (extra) for (var k in extra) b[k] = extra[k];

  b.id = this.buildings.length;
  this.buildings.push(b);

  for (i = 0; i < w; i++)
    for (j = 0; j < h; j++) {
      this.what[this.index(x + i, y + j)] = LOT;
      this.on[this.index(x + i, y + j)] = b.id;
    }

  return b;
};

/**
 * Takes a building off the plan again, its ground free.
 */
Plan.prototype.unbuild = function (b) {
  for (var i = 0; i < b.w; i++)
    for (var j = 0; j < b.h; j++) {
      this.what[this.index(b.x + i, b.y + j)] = FREE;
      this.on[this.index(b.x + i, b.y + j)] = -1;
    }

  b.gone = true;
};

/**
 * Whether w by h on x, y is free ground of the plan, inside it, that a
 * building stands on.
 */
Plan.prototype.free = function (x, y, w, h) {
  for (var i = 0; i < w; i++)
    for (var j = 0; j < h; j++)
      if (!this.inside(x + i, y + j) || this.at(x + i, y + j) !== FREE)
        return false;

  return this.ground.fits(this.wx(x), this.wy(y), w, h);
};

Plan.prototype.standing = function () {
  return this.buildings.filter(function (b) {
    return !b.gone;
  });
};

Plan.Ground = Ground;
