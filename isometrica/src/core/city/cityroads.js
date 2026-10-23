/**
 * What the city's streets reach.
 *
 * The city's roads can come apart into stretches that no longer join up,
 * tile by tile - north, south, east or west, never a corner. The city is the
 * stretch its town hall stands on, if one stands, and otherwise the bigger
 * one, by everything on it: its roads, and the ground taken by what stands
 * along them. Of two the same, the one more people live along, then the one
 * the oldest of the city's buildings is on. That is its road network, worked
 * out again whenever something goes up, comes down or is finished - from
 * what stands then, so nothing of it goes into the save.
 *
 * A building is on it when one of the tiles alongside it carries one of its
 * roads. One that wants a road and is not is cut off from the city -
 * abandoned, whatever road it has: it costs the city nothing, earns it
 * nothing, and its people move out (core/city/citypopulation), till it is
 * joined up again.
 *
 * That is what makes a player lay streets instead of dropping houses wherever
 * there is room: a house off the network holds nobody (Building#citizenCapacity).
 * And a building may want more of a road than a gravel lane (data/buildings
 * requires): a cobbled street or asphalt alongside it, for anything but a
 * village's own houses.
 */
import Events from "events";
import * as RoadRules from "../roadrules";
import BuildingData from "../../data/buildings";
import BuildingClassCode from "../../data/classcode";
import BuildingState from "../buildingstate";
import Rotation from "../rotation";
import ServiceCode from "../servicecode";
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
  //road tile -> the stretch it is part of, and which of them is the city's
  this._stretchAt = {};
  this._main = -1;
  //the town hall the city is where it is for, if any
  this._hall = null;
  //building id -> what it is cut off with (#cutOff), as asked
  this._cut = {};
  //how many times it was worked out (#version)
  this._version = 0;
  this._stale = true;
}

CityRoads.prototype.init = function () {
  var buildings = this.city.world.buildings,
    own = this.city.buildings;

  //the network is only ever changed by something being built or pulled down
  //- or by a road being finished
  Events.on(buildings, buildings.events.buildingBuilt, onChange, this);
  Events.on(buildings, buildings.events.buildingRemoved, onChange, this);
  Events.on(buildings, buildings.events.buildingStateChange, onChange, this);
  //and by the city taking a building on, after the world has it - what it
  //weighs a stretch by is the city's buildings
  Events.on(own, own.events.new, onChange, this);
};

/**
 * @param building {Building}
 * @param [least] {string} the least of a road it wants alongside it -
 *        "gravel", "cobble" or "asphalt" (core/roadrules MATERIALS); any road
 *        where left out
 * @returns {boolean} whether the city's streets reach it
 */
CityRoads.prototype.reaches = function (building, least) {
  update(this);

  var world = this.city.world,
    sides = alongside(building),
    i;

  for (i = 0; i < sides.length; i++) {
    if (
      this._network[sides[i]] === true &&
      RoadRules.serves(
        RoadRules.materialOf(world.buildings.get(sides[i])),
        least,
      )
    )
      return true;
  }

  return false;
};

/**
 * @param tile {number}
 * @returns {boolean} whether the road on tile is part of the city's network -
 *          the stretch of its roads that is the city
 */
CityRoads.prototype.inNetwork = function (tile) {
  update(this);

  return this._network[tile] === true;
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
 * @param building {Building}
 * @returns {boolean} whether a road of the city's network runs alongside it,
 *          whatever it is laid in
 */
CityRoads.prototype.onNetwork = function (building) {
  update(this);

  var sides = alongside(building),
    i;

  for (i = 0; i < sides.length; i++)
    if (this._network[sides[i]] === true) return true;

  return false;
};

/**
 * What a building that wants a road is cut off from the city with, if it is:
 * the same for everything along one stretch of road that is not the city's,
 * and a building's own where it has no road at all. Null for one on the
 * network, and for anything that wants no road - a water tower, a park -
 * which does what it does wherever it stands.
 *
 * @param building {Building}
 * @returns {string|null}
 */
CityRoads.prototype.cutOff = function (building) {
  update(this);

  var cut = this._cut[building.id];

  if (cut !== undefined) return cut;

  var requires = BuildingData[building.buildingCode].requires,
    sides,
    stretch,
    i;

  cut = null;

  if (requires !== undefined && requires[ServiceCode.road]) {
    sides = alongside(building);
    cut = "own" + building.id;

    for (i = 0; i < sides.length; i++) {
      stretch = this._stretchAt[sides[i]];

      if (stretch === undefined) continue;

      if (stretch === this._main) {
        cut = null;
        break;
      }

      cut = "road" + stretch;
    }
  }

  this._cut[building.id] = cut;

  return cut;
};

/**
 * @returns {number} changes whenever the network is worked out again - for
 *          whatever goes by who is on it to know it may have changed
 */
CityRoads.prototype.version = function () {
  update(this);

  return this._version;
};

/**
 * @returns {Building|null} the town hall standing on the city's network - the
 *          oldest, of more than one - which is where the city is
 */
CityRoads.prototype.townHall = function () {
  update(this);

  return this._hall;
};

/**
 * Whether a building is a town hall - the building a city goes by.
 *
 * @param building {Building}
 * @returns {boolean}
 */
CityRoads.isTownHall = function (building) {
  return BuildingData[building.buildingCode].townHall === true;
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

//a road there, finished - one still being laid reaches nothing yet
function isRoad(world, tile) {
  var building = world.buildings.get(tile);

  return (
    building !== null &&
    BuildingData[building.buildingCode].classCode === BuildingClassCode.road &&
    building.getState() !== BuildingState.underConstruction
  );
}

function onChange(sender, args, self) {
  self._stale = true;
}

/**
 * Finds every stretch of the city's roads that hangs together, and keeps the
 * one that is the city as the network: the one its town hall stands on, or
 * the bigger (better). Everything else may be paved, but it is not this
 * city's network.
 */
function update(self) {
  if (!self._stale) return;

  var world = self.city.world,
    population = self.city.population,
    buildings = self.city.buildings.getBuildings(),
    stretchAt = {},
    stretches = [],
    network = {},
    main = -1,
    hall = -1,
    b,
    i,
    j;

  self._stale = false;
  self._cut = {};
  self._version++;

  //the stretches, in the order the city's buildings went up: the first
  //road of each is its oldest
  for (i = 0; i < buildings.length; i++) {
    var start = buildings[i].tile;

    if (stretchAt[start] !== undefined || !isRoad(world, start)) continue;

    var index = stretches.length,
      open = [start],
      size = 1,
      tile;

    stretchAt[start] = index;

    while (open.length > 0) {
      tile = open.pop();

      [tile + 1, tile - 1, tile + Terrain.dy, tile - Terrain.dy].forEach(
        function (next) {
          if (stretchAt[next] !== undefined || !isRoad(world, next)) return;

          stretchAt[next] = index;
          open.push(next);
          size++;
        },
      );
    }

    stretches.push({ size: size, people: 0, oldest: i, hall: -1 });
  }

  //and what stands along each, weighed in with it
  for (i = 0; i < buildings.length; i++) {
    b = buildings[i];

    var classCode = BuildingData[b.buildingCode].classCode;

    if (
      classCode === BuildingClassCode.road ||
      classCode === BuildingClassCode.tree
    )
      continue;

    var sides = alongside(b),
      seen = {},
      tiles =
        Rotation.sizeX(b.data, b.rotation) * Rotation.sizeY(b.data, b.rotation),
      stretch;

    for (j = 0; j < sides.length; j++) {
      stretch = stretchAt[sides[j]];

      if (stretch === undefined || seen[stretch] === true) continue;

      seen[stretch] = true;
      stretches[stretch].size += tiles;
      stretches[stretch].people += population.getResidents(b);
      if (i < stretches[stretch].oldest) stretches[stretch].oldest = i;
      if (
        stretches[stretch].hall === -1 &&
        CityRoads.isTownHall(b) &&
        b.getState() === BuildingState.ready
      )
        stretches[stretch].hall = i;
    }
  }

  for (i = 0; i < stretches.length; i++) {
    if (stretches[i].hall === -1) continue;

    if (
      hall === -1 ||
      stretches[i].hall < hall ||
      (stretches[i].hall === hall && better(stretches[i], stretches[main]))
    ) {
      hall = stretches[i].hall;
      main = i;
    }
  }

  if (main === -1)
    for (i = 0; i < stretches.length; i++)
      if (main === -1 || better(stretches[i], stretches[main])) main = i;

  for (var key in stretchAt) if (stretchAt[key] === main) network[key] = true;

  self._network = network;
  self._stretchAt = stretchAt;
  self._main = main;
  self._hall = hall === -1 ? null : buildings[hall];
}

//whether stretch a is more the city than b: bigger, then more lived in, then
//older
function better(a, b) {
  if (a.size !== b.size) return a.size > b.size;
  if (a.people !== b.people) return a.people > b.people;

  return a.oldest < b.oldest;
}

export default CityRoads;
