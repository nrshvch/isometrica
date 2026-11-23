/**
 * The planning grid: a window round the site, what each tile is to be, and
 * the roads and buildings on it, in window coordinates. See .claude/skills/citygen.
 */
import Ground from "./ground";

export var FREE = 0;
export var ROAD = 1;
export var LOT = 2;
export var WATER = 3;
export var KEPT = 4;

//-x, -y, +x, +y, as the roads count sides (core/roadrules)
export var SIDES = [
  [-1, 0],
  [0, -1],
  [1, 0],
  [0, 1],
];

export default function Plan(ground, site, margin) {
  var w = Math.round(site.rx * 2 * margin),
    h = Math.round(site.ry * 2 * margin);

  this.ground = ground;
  this.site = site;
  this.w = w;
  this.h = h;
  this.ox = site.x - (w >> 1);
  this.oy = site.y - (h >> 1);
  this.cx = w >> 1;
  this.cy = h >> 1;
  this.rx = site.rx;
  this.ry = site.ry;

  this.what = new Uint8Array(w * h);
  this.blockOf = new Int32Array(w * h).fill(-1);
  this.on = new Int32Array(w * h).fill(-1);
  this.blocks = [];
  this.roads = Object.create(null);
  this.buildings = [];
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

Plan.prototype.wx = function (x) {
  return this.ox + x;
};

Plan.prototype.wy = function (y) {
  return this.oy + y;
};

//elliptical distance from the middle, 1 at the (lobed) outline
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

Plan.prototype.roadSides = function (x, y) {
  var out = [];

  for (var s = 0; s < 4; s++)
    if (this.isRoad(x + SIDES[s][0], y + SIDES[s][1])) out.push(s);

  return out;
};

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

Plan.prototype.unbuild = function (b) {
  for (var i = 0; i < b.w; i++)
    for (var j = 0; j < b.h; j++) {
      this.what[this.index(b.x + i, b.y + j)] = FREE;
      this.on[this.index(b.x + i, b.y + j)] = -1;
    }

  b.gone = true;
};

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
