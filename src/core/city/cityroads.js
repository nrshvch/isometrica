/**
 * What the city's streets reach.
 *
 * The city's road network is the biggest stretch of its roads that hangs
 * together, tile by tile - north, south, east or west, never a corner. A
 * building is on it when one of the tiles alongside it carries one of those
 * roads. A lane out in a field that does not join up with the rest is not
 * the network, and the houses along it are as good as unreachable - until it
 * is joined up, or grows to be the biggest itself.
 *
 * That is what makes a player lay streets instead of dropping houses wherever
 * there is room: a house off the network holds nobody (Building#citizenCapacity).
 */
import Events from "events";
import BuildingData from "data/buildings";
import BuildingClassCode from "data/classcode";
import Terrain from "../terrain";
import TileIterator from "../tileiterator";

import namespace from "namespace";
var CityService = namespace("Isometrica.Core.CityService");
CityService.Roads = CityRoads;

/**
 * @param city {City}
 * @constructor
 */
function CityRoads(city) {
  this.city = city;
  this._network = {};
  this._stale = true;
}

CityRoads.prototype.init = function () {
  var buildings = this.city.world.buildings;

  //the network is only ever changed by something being built or pulled down
  Events.on(buildings, buildings.events.buildingBuilt, onChange, this);
  Events.on(buildings, buildings.events.buildingRemoved, onChange, this);
};

/**
 * @param building {Building}
 * @returns {boolean} whether the city's streets reach it
 */
CityRoads.prototype.reaches = function (building) {
  update(this);

  var sides = alongside(building),
    i;

  for (i = 0; i < sides.length; i++) {
    if (this._network[sides[i]] === true) return true;
  }

  return false;
};

/**
 * @returns {number} how many road tiles the network has
 */
CityRoads.prototype.getNetworkSize = function () {
  update(this);

  var n = 0;

  for (var tile in this._network) n++;

  return n;
};

/**
 * The tiles that run alongside a building - its footprint grown by one to each
 * side, corners left out, which is what "neighbouring, but not diagonal" means
 * for something bigger than a single tile.
 *
 * @param building {Building}
 * @returns {number[]}
 */
function alongside(building) {
  var iter = building.occupiedTiles(),
    footprint = {},
    tiles = [],
    sides = [],
    tile,
    i;

  while (!iter.done) {
    tile = TileIterator.next(iter);
    footprint[tile] = true;
    tiles.push(tile);
  }

  for (i = 0; i < tiles.length; i++) {
    tile = tiles[i];

    offer(sides, footprint, tile + 1);
    offer(sides, footprint, tile - 1);
    offer(sides, footprint, tile + Terrain.dy);
    offer(sides, footprint, tile - Terrain.dy);
  }

  return sides;
}

function offer(sides, footprint, tile) {
  if (footprint[tile] !== true && sides.indexOf(tile) === -1) sides.push(tile);
}

function isRoad(world, tile) {
  var building = world.buildings.get(tile);

  return (
    building !== null &&
    BuildingData[building.buildingCode].classCode === BuildingClassCode.road
  );
}

function onChange(sender, args, self) {
  self._stale = true;
}

/**
 * Finds every stretch of the city's roads that hangs together, and keeps the
 * biggest as the network - of two the same size, the one that reaches
 * furthest towards the top of the map, so that it does not flip from one to
 * the other for nothing. Everything else may be paved, but it is not this
 * city's network.
 */
function update(self) {
  if (!self._stale) return;

  var world = self.city.world,
    buildings = self.city.buildings.getBuildings(),
    seen = {},
    best = {},
    bestSize = 0,
    bestFirst = Infinity,
    i;

  self._stale = false;

  for (i = 0; i < buildings.length; i++) {
    var start = buildings[i].tile;

    if (seen[start] === true || !isRoad(world, start)) continue;

    var network = {},
      open = [start],
      size = 1,
      first = start,
      tile;

    network[start] = true;
    seen[start] = true;

    while (open.length > 0) {
      tile = open.pop();

      [tile + 1, tile - 1, tile + Terrain.dy, tile - Terrain.dy].forEach(
        function (next) {
          if (step(world, network, open, next)) {
            seen[next] = true;
            size++;
            if (next < first) first = next;
          }
        },
      );
    }

    if (size > bestSize || (size === bestSize && first < bestFirst)) {
      best = network;
      bestSize = size;
      bestFirst = first;
    }
  }

  self._network = best;
}

//takes a road tile next to the network into it - whether it did
function step(world, network, open, tile) {
  if (network[tile] === true || !isRoad(world, tile)) return false;

  network[tile] = true;
  open.push(tile);

  return true;
}

export default CityRoads;
