/**
 * The city's roads as the courier drives them: every one there is, not just
 * those on screen - the client only keeps the roads of the chunks it has
 * loaded (client/roadman), and an order goes right across town.
 *
 * Two roads join where they meet level, at the same height all along the
 * edge between them (core/surface meets) - the same as the traffic goes by
 * (client/carman), so the courier's car takes no way the rest could not.
 */
import Terrain from "core/terrain";
import Surface from "core/surface";
import BuildingData from "data/buildings";
import BuildingClassCode from "data/classcode";
import Pathfinder from "../pathfinding/pathfinder";

//from a tile to the next one at each side, -x, -y, +x, +y - the sides
//Surface.meets counts
var STEP = [-1, -Terrain.dy, 1, Terrain.dy];

function distance(a, b) {
  return Pathfinder.manhattan(
    Terrain.extractX(a),
    Terrain.extractY(a),
    Terrain.extractX(b),
    Terrain.extractY(b),
  );
}

/**
 * @param buildings {Buildings} the core's, every building by tile
 * @constructor
 */
function Roads(buildings) {
  this.buildings = buildings;
}

/**
 * The road on tile, its core building, or null.
 */
Roads.prototype.road = function (tile) {
  var building = this.buildings.get(tile);

  return building !== null &&
    BuildingData[building.buildingCode].classCode === BuildingClassCode.road
    ? building
    : null;
};

Roads.prototype.isRoad = function (tile) {
  return this.road(tile) !== null;
};

/**
 * Fills out with the road tiles the car can drive to straight from tile.
 */
Roads.prototype.neighbours = function (tile, out) {
  var from = this.road(tile),
    to,
    side;

  if (from === null || from.surface === null) return out;

  for (side = 0; side < 4; side++) {
    to = this.road(tile + STEP[side]);

    if (to !== null && Surface.meets(from.surface, side, to.surface))
      out.push(tile + STEP[side]);
  }

  return out;
};

/**
 * The way from one road tile to another, both ends included - just the one
 * tile when they are the same, empty when there is no way.
 *
 * @returns {number[]}
 */
Roads.prototype.route = function (from, to) {
  var self = this;

  if (from === to) return this.isRoad(from) ? [from] : [];

  return Pathfinder.searchTiles(
    from,
    to,
    function (tile, out) {
      self.neighbours(tile, out);
    },
    distance,
  );
};

/**
 * Every road tile that can be driven to from tile, tile among them, as a set
 * - empty when it is not on a road.
 *
 * @returns {Set<number>}
 */
Roads.prototype.reachable = function (tile) {
  var seen = new Set(),
    queue = [],
    next = [],
    i;

  if (!this.isRoad(tile)) return seen;

  seen.add(tile);
  queue.push(tile);

  for (var head = 0; head < queue.length; head++) {
    next.length = 0;
    this.neighbours(queue[head], next);

    for (i = 0; i < next.length; i++)
      if (!seen.has(next[i])) {
        seen.add(next[i]);
        queue.push(next[i]);
      }
  }

  return seen;
};

/**
 * The road tile nearest to (x, y), in tiles, among those given - or -1.
 *
 * @param tiles {Iterable<number>}
 */
Roads.nearest = function (tiles, x, y) {
  var best = -1,
    bestD = Infinity,
    d;

  for (var tile of tiles) {
    d =
      Math.abs(Terrain.extractX(tile) - x) +
      Math.abs(Terrain.extractY(tile) - y);

    //of two as near, the lower tile - so the same city always gives the same
    if (d < bestD || (d === bestD && tile < best)) {
      best = tile;
      bestD = d;
    }
  }

  return best;
};

Roads.distance = distance;

export default Roads;
