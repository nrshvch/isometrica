/**
 * The world's terrain (the game's own noise) with the generator's earthworks
 * over it, saved as terrain.points; Ground(flat) for the lab bench.
 * See .claude/skills/citygen/engine.md (tiles, buildings, roads).
 */
import Terrain from "../core/terrain";
import TerrainType from "../core/terraintype";
import Surface from "../core/surface";

var MAX_DRAG = 400;

export default function Ground(flat) {
  this.terrain = new Terrain(null);
  this.moved = Object.create(null);

  if (flat !== undefined) {
    var points = this.terrain.gridPoints;

    this.terrain.getGridPointHeight = function (indexOrX, y) {
      var index = arguments.length === 2 ? (y << 16) ^ indexOrX : indexOrX,
        moved = points[index];

      return moved !== undefined ? moved : flat;
    };
  }
}

Ground.index = Terrain.convertToIndex;

Ground.prototype.height = function (x, y) {
  return this.terrain.getGridPointHeight(Terrain.convertToIndex(x, y));
};

Ground.prototype.corners = function (x, y) {
  return Surface.ground(this.terrain, Terrain.convertToIndex(x, y));
};

Ground.prototype.type = function (x, y) {
  return this.terrain.getTerrainType(Terrain.convertToIndex(x, y));
};

Ground.prototype.isWater = function (x, y) {
  return this.type(x, y) === TerrainType.water;
};

Ground.prototype.isWet = function (x, y) {
  return this.type(x, y) !== TerrainType.grass;
};

//as core/buildings buildTest: flat at the footprint's top corner
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

var RAMP_TOPS = Surface.RAMP_TOPS;

//the surfaces the game lays a road on (client/road surfaces)
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

function around(x, y) {
  return [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ];
}

//flat at h, neighbours dragged a step at a time (core/terrain planLevel);
//false if too much moves or land and water would swap
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

//the moved points, as Terrain#save keeps them
Ground.prototype.points = function () {
  var out = [];

  for (var k in this.moved) out.push([+k, this.moved[k]]);

  return out;
};
