/**
 * What holds the city together, and what its streets reach.
 *
 * The city's buildings and roads hang together where they stand near enough
 * to each other: next to each other, or with a tile between them along a row
 * or a column, or corner to corner - never further (LINKS: two tiles apart,
 * counted along the rows and columns). A village holds together by its
 * houses standing near each other, the way families settle, with a yard
 * between them or none; a road is what reaches out to whatever stands
 * further off, and the cheapest way to. Only what is finished holds anything
 * together - a road still being laid, a house still going up, not yet - and a
 * tree is the world's, not the city's.
 *
 * What hangs together may come apart into parts. The city is the part its
 * town hall stands in, if one stands, and otherwise the bigger one, by
 * everything in it: its road tiles and the ground its buildings stand on. Of
 * two the same, the one more people live in, then the one with the oldest of
 * the city's buildings. It is worked out again whenever something goes up,
 * comes down or is finished - from what stands then, so nothing of it goes
 * into the save.
 *
 * Every building of the city wants to be part of it (#linked) - the water
 * tower as much as a house. One that is not is cut off from it - abandoned:
 * it costs the city nothing, earns it nothing, waters nothing, and its people
 * move out (core/city/citypopulation), till it is joined up again.
 *
 * The roads of the part that is the city are its road network. What wants a
 * road (data/buildings requires) wants one of them right alongside it, no
 * tile between - and may want more of a road than a gravel lane: a cobbled
 * street or asphalt. That is what makes a player lay streets for a town: a
 * house in town off them holds nobody (Building#citizenCapacity).
 */
import Events from "events";
import * as RoadRules from "../roadrules";
import BuildingData from "../../data/buildings";
import BuildingClassCode from "../../data/classcode";
import BuildingState from "../buildingstate";
import Rotation from "../rotation";
import Terrain from "../terrain";
import TileIterator from "../tileiterator";

import namespace from "namespace";
var CityService = namespace("Isometrica.Core.CityService");
CityService.Roads = CityRoads;

/**
 * Where from a tile of one thing a tile of another holds it together with it:
 * two tiles apart at most, counted along the rows and columns - next to it,
 * with a tile between along the row or the column, or corner to corner - as
 * [x, y].
 *
 * @type {number[][]}
 */
var LINKS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [2, 0],
  [-2, 0],
  [0, 2],
  [0, -2],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
CityRoads.LINKS = LINKS;

/**
 * @param city {City}
 * @constructor
 */
function CityRoads(city) {
  this.city = city;
  //road tile -> true, for the city's road network
  this._network = {};
  //building id -> the part it is in, and which part is the city's
  this._partOf = {};
  this._main = -1;
  //the town hall the city is where it is for, if any
  this._hall = null;
  //how many times it was worked out (#version)
  this._version = 0;
  this._stale = true;
}

CityRoads.prototype.init = function () {
  var buildings = this.city.world.buildings,
    own = this.city.buildings;

  //what hangs together only ever changes with something being built or
  //pulled down - or being finished
  Events.on(buildings, buildings.events.buildingBuilt, onChange, this);
  Events.on(buildings, buildings.events.buildingRemoved, onChange, this);
  Events.on(buildings, buildings.events.buildingStateChange, onChange, this);
  //and with the city taking a building on, after the world has it - the
  //city's own buildings are what it is made of
  Events.on(own, own.events.new, onChange, this);
};

/**
 * @param building {Building}
 * @param [least] {string} the least of a road it wants alongside it -
 *        "gravel", "cobble" or "asphalt" (core/roadrules MATERIALS); any road
 *        where left out
 * @returns {boolean} whether the city's streets reach it: a road of the
 *          network right alongside it
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
 * @param building {Building}
 * @returns {boolean} whether it is part of the city: finished, and hanging
 *          together with it
 */
CityRoads.prototype.linked = function (building) {
  update(this);

  return this._main !== -1 && this._partOf[building.id] === this._main;
};

/**
 * @param tile {number}
 * @returns {boolean} whether the road on tile is part of the city's network -
 *          the roads of the part of it that is the city
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
 * What a building of the city is cut off from it with, if it is: the same for
 * everything in one part that is not the city's, and a building's own while
 * it is not finished. Null for one that is part of the city - and for a road,
 * which is only part of the network or not, or a tree, which is the world's.
 *
 * @param building {Building}
 * @returns {string|null}
 */
CityRoads.prototype.cutOff = function (building) {
  var classCode = BuildingData[building.buildingCode].classCode,
    part;

  if (
    classCode === BuildingClassCode.road ||
    classCode === BuildingClassCode.tree
  )
    return null;

  update(this);

  part = this._partOf[building.id];

  if (part === undefined) return "own" + building.id;

  return part === this._main ? null : "part" + part;
};

/**
 * @returns {Building[]} what the city is made of: its buildings and roads
 *          that are part of it - for what shows where it is
 */
CityRoads.prototype.members = function () {
  update(this);

  var buildings = this.city.buildings.getBuildings(),
    r = [],
    i;

  for (i = 0; i < buildings.length; i++)
    if (this._partOf[buildings[i].id] === this._main) r.push(buildings[i]);

  return r;
};

/**
 * @returns {number} changes whenever what hangs together is worked out again
 *          - for whatever goes by who is part of the city to know it may
 *          have changed
 */
CityRoads.prototype.version = function () {
  update(this);

  return this._version;
};

/**
 * @returns {Building|null} the town hall standing in the city - the oldest,
 *          of more than one - which is where the city is
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

/**
 * Every tile near enough to a building to hold together with what stands on
 * it (LINKS), its own left out.
 *
 * @param building {Building}
 * @returns {number[]}
 */
function near(building) {
  var iter = building.occupiedTiles(),
    footprint = {},
    tiles = [],
    out = [],
    seen = {},
    tile,
    next,
    i,
    j;

  while (!iter.done) {
    tile = TileIterator.next(iter);
    footprint[tile] = true;
    tiles.push(tile);
  }

  for (i = 0; i < tiles.length; i++)
    for (j = 0; j < LINKS.length; j++) {
      next = tiles[i] + LINKS[j][0] + LINKS[j][1] * Terrain.dy;

      if (footprint[next] === true || seen[next] === true) continue;

      seen[next] = true;
      out.push(next);
    }

  return out;
}

function isRoadData(building) {
  return (
    BuildingData[building.buildingCode].classCode === BuildingClassCode.road
  );
}

//whether a building of the city holds it together: finished - a road still
//being laid, or laid again, reaches nothing yet - and not a tree
function holds(building) {
  return (
    building.getState() === BuildingState.ready &&
    BuildingData[building.buildingCode].classCode !== BuildingClassCode.tree
  );
}

function onChange(sender, args, self) {
  self._stale = true;
}

/**
 * Finds every part of the city's roads and buildings that hangs together,
 * and keeps the one that is the city: the one its town hall stands in, or
 * the bigger (better). What is not in it may stand, paved or lived in, but
 * it is not part of this city.
 */
function update(self) {
  if (!self._stale) return;

  var world = self.city.world,
    population = self.city.population,
    buildings = self.city.buildings.getBuildings(),
    //building id -> its place in the order the city's went up, for what
    //holds the city together
    order = {},
    partOf = {},
    parts = [],
    network = {},
    main = -1,
    hall = -1,
    b,
    i;

  self._stale = false;
  self._version++;

  for (i = 0; i < buildings.length; i++)
    if (holds(buildings[i])) order[buildings[i].id] = i;

  //the parts, in the order the city's buildings went up: the first of
  //each is its oldest
  for (i = 0; i < buildings.length; i++) {
    b = buildings[i];

    if (order[b.id] === undefined || partOf[b.id] !== undefined) continue;

    var index = parts.length,
      part = { size: 0, people: 0, oldest: i, hall: -1 },
      open = [b],
      tiles,
      next,
      j;

    parts.push(part);
    partOf[b.id] = index;

    while (open.length > 0) {
      b = open.pop();

      weigh(part, b, order[b.id], population);

      tiles = near(b);

      for (j = 0; j < tiles.length; j++) {
        next = world.buildings.get(tiles[j]);

        if (
          next === null ||
          order[next.id] === undefined ||
          partOf[next.id] !== undefined
        )
          continue;

        partOf[next.id] = index;
        open.push(next);
      }
    }
  }

  for (i = 0; i < parts.length; i++) {
    if (parts[i].hall === -1) continue;

    if (hall === -1 || parts[i].hall < hall) {
      hall = parts[i].hall;
      main = i;
    }
  }

  if (main === -1)
    for (i = 0; i < parts.length; i++)
      if (main === -1 || better(parts[i], parts[main])) main = i;

  for (i = 0; i < buildings.length; i++)
    if (isRoadData(buildings[i]) && partOf[buildings[i].id] === main)
      network[buildings[i].tile] = true;

  self._partOf = partOf;
  self._main = main;
  self._network = network;
  self._hall = hall === -1 ? null : buildings[hall];
}

//what a building adds to the part it is in
function weigh(part, building, at, population) {
  if (isRoadData(building)) {
    part.size++;
    return;
  }

  part.size +=
    Rotation.sizeX(building.data, building.rotation) *
    Rotation.sizeY(building.data, building.rotation);
  part.people += population.getResidents(building);
  if (at < part.oldest) part.oldest = at;
  if (CityRoads.isTownHall(building) && (part.hall === -1 || at < part.hall))
    part.hall = at;
}

//whether part a is more the city than b: bigger, then more lived in, then
//older
function better(a, b) {
  if (a.size !== b.size) return a.size > b.size;
  if (a.people !== b.people) return a.people > b.people;

  return a.oldest < b.oldest;
}

export default CityRoads;
