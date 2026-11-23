/**
 * The ground a city is generated on: the world's own terrain (isometrica
 * core/terrain) - the same noise, so what is worked out here is what the
 * game draws - with the generator's earthworks laid over it, to go into the
 * save as the ground's shaped points (Terrain#save points).
 *
 * In world tiles, x and y, as the game counts them.
 */
import Terrain from "isometrica/core/terrain";
import TerrainType from "isometrica/core/terraintype";
import Surface from "isometrica/core/surface";

//how far shaping one point may drag the ground round it along, in points -
//past that it is a hill being moved, not a street levelled
var MAX_DRAG = 400;

export default function Ground() {
  //a terrain of no world: the noise, and the points the generator moved
  this.terrain = new Terrain(null);
  //grid point index -> height, for every point moved
  this.moved = Object.create(null);
}

Ground.index = Terrain.convertToIndex;

Ground.prototype.height = function (x, y) {
  return this.terrain.getGridPointHeight(Terrain.convertToIndex(x, y));
};

//the heights at the corners of tile x, y: A (x, y), B (x + 1, y),
//C (x, y + 1), D (x + 1, y + 1) - as core/surface has them
Ground.prototype.corners = function (x, y) {
  return Surface.ground(this.terrain, Terrain.convertToIndex(x, y));
};

Ground.prototype.type = function (x, y) {
  return this.terrain.getTerrainType(Terrain.convertToIndex(x, y));
};

Ground.prototype.isWater = function (x, y) {
  return this.type(x, y) === TerrainType.water;
};

//any corner of it in the water: the beach, or the sea itself
Ground.prototype.isWet = function (x, y) {
  return this.type(x, y) !== TerrainType.grass;
};

/**
 * Whether a building can stand on tile x, y as the game puts one up: flat at
 * the highest corner of its footprint, on a step of concrete at most, never
 * in the water (core/buildings buildTest, core/surface fits).
 *
 * @param [top] {number} the highest corner of the whole footprint - the
 *        tile's own where left out
 */
Ground.prototype.standsOn = function (x, y, top) {
  var g = this.corners(x, y),
    high = top === undefined ? Math.max(g[0], g[1], g[2], g[3]) : top;

  if (this.isWater(x, y)) return false;

  return Surface.fits(this.terrain, Terrain.convertToIndex(x, y), [
    high,
    high,
    high,
    high,
  ]);
};

/**
 * Whether a building w by h on x, y (its corner with the least x and y) can go
 * up on the ground there.
 */
Ground.prototype.fits = function (x, y, w, h) {
  var top = -Infinity,
    i,
    j,
    g;

  for (i = 0; i < w; i++)
    for (j = 0; j < h; j++) {
      g = this.corners(x + i, y + j);
      top = Math.max(top, g[0], g[1], g[2], g[3]);
    }

  for (i = 0; i < w; i++)
    for (j = 0; j < h; j++) if (!this.standsOn(x + i, y + j, top)) return false;

  return true;
};

//the corners each ramp is up at, of A, B, C and D (core/surface)
var RAMP_TOPS = Surface.RAMP_TOPS;

/**
 * Every surface a road on tile x, y can have - flat at the top of the ground,
 * or a ramp a step up, on the ground or on concrete - the way the game lays
 * one (client/road surfaces), the ground's own first.
 *
 * @returns {number[][]}
 */
Ground.prototype.roadSurfaces = function (x, y) {
  var tile = Terrain.convertToIndex(x, y),
    terrain = this.terrain,
    g = Surface.ground(terrain, tile),
    high = Math.max(g[0], g[1], g[2], g[3]),
    out = [];

  function add(surface) {
    if (
      Surface.fits(terrain, tile, surface) &&
      surface.some(function (h, k) {
        return h === g[k];
      })
    )
      out.push(surface);
  }

  add([high, high, high, high]);

  [high - 1, high].forEach(function (low) {
    for (var r = 1; r <= 4; r++)
      add(
        RAMP_TOPS[r].map(function (up) {
          return low + up;
        }),
      );
  });

  return out;
};

//the four grid points next to point x, y
function around(x, y) {
  return [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ];
}

/**
 * Levels tiles - each [x, y] - flat at height h, the ground round them
 * dragged along so that no two points next to each other are more than a
 * step apart, as the game shapes it (core/terrain planLevel). Nothing is
 * moved if that would drag too much along, or put dry land under the water.
 *
 * @returns {boolean} whether it was levelled
 */
Ground.prototype.level = function (tiles, h) {
  var plan = Object.create(null),
    queue = [],
    count = 0,
    self = this,
    i,
    j;

  function get(x, y) {
    var k = Terrain.convertToIndex(x, y);

    return plan[k] !== undefined ? plan[k].h : self.height(x, y);
  }

  function set(x, y, v) {
    var k = Terrain.convertToIndex(x, y);

    if (plan[k] === undefined) count++;
    plan[k] = { x: x, y: y, h: v };
    queue.push([x, y]);
  }

  for (i = 0; i < tiles.length; i++)
    for (j = 0; j < 4; j++) {
      var px = tiles[i][0] + (j & 1),
        py = tiles[i][1] + (j >> 1);

      if (get(px, py) !== h) set(px, py, h);
    }

  while (queue.length > 0) {
    var p = queue.pop(),
      at = get(p[0], p[1]),
      nbs = around(p[0], p[1]);

    for (i = 0; i < nbs.length; i++) {
      var n = get(nbs[i][0], nbs[i][1]);

      if (n < at - 1) set(nbs[i][0], nbs[i][1], at - 1);
      else if (n > at + 1) set(nbs[i][0], nbs[i][1], at + 1);
      else continue;

      if (count > MAX_DRAG) return false;
    }
  }

  //dry land is never dug down into the sea, nor the sea filled in
  for (var k in plan) {
    var was = this.height(plan[k].x, plan[k].y);

    if (was > 0 !== plan[k].h > 0) return false;
  }

  for (k in plan) {
    this.terrain.gridPoints[k] = plan[k].h;
    this.moved[k] = plan[k].h;
  }

  return true;
};

/**
 * The points moved, as a save keeps them (Terrain#save points).
 *
 * @returns {number[][]}
 */
Ground.prototype.points = function () {
  var out = [];

  for (var k in this.moved) out.push([+k, this.moved[k]]);

  return out;
};
