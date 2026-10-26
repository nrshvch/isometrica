/**
 * What holds the city together, and what its streets reach.
 *
 * Every building of the city, and every tile of its roads, has an area round
 * it: what is within RADIUS of it, two tiles - counted from the middle of
 * one tile to the middle of the other, so along a row or a column two tiles
 * out, and corner to corner one (AREA). Where two areas share a tile they
 * are one: along a row, two buildings with three tiles between them share
 * the middle one, and hang together; with four between, their areas only
 * touch, and they do not (REACH). The city's area is all of it that hangs
 * together. A village holds together by its houses standing near each
 * other, the way families settle; a road is what reaches out to whatever
 * stands further off, and the cheapest way to. It holds together from the
 * moment it is put down, going up or not; a tree is the world's, not the
 * city's.
 *
 * A road that leads nowhere is not part of the city: of the city's roads, only
 * those that join something to something - their area sharing a tile with a
 * building's at either end, or on to a road whose does - hold anything
 * together; a lane running off into the country past the last house does
 * not, from the last of it that does on (prune). Where a road leaves the city
 * that way is its way out (#exits).
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
 * The finished roads of the part that is the city are its road network - one
 * still being laid reaches nothing yet. What wants a road (data/buildings
 * requires) wants one of them right alongside it, no tile between - and may
 * want more of a road than a gravel lane: a cobbled street or asphalt. That is what makes a player lay streets for a town: a
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
 * How far a building's area, or a road tile's, reaches round each of its
 * tiles: within two tiles of its middle (RADIUS) - along a row or a column
 * two tiles out, corner to corner one, never further - as [x, y], its own
 * tile among them.
 *
 * @type {number[][]}
 */
var RADIUS = 2;
var AREA = within(RADIUS, true);
CityRoads.RADIUS = RADIUS;
CityRoads.AREA = AREA;

/**
 * Where from a tile of one thing a tile of another has an area that shares a
 * tile with its own (AREA): twice as far - three tiles between them along a
 * row or a column at most - as [x, y].
 *
 * @type {number[][]}
 */
var REACH = within(2 * RADIUS, false);
CityRoads.REACH = REACH;

//every [x, y] within r along the rows and columns, and [0, 0] with them or not
function within(r, own) {
  var out = [],
    dx,
    dy;

  for (dy = -r; dy <= r; dy++)
    for (dx = -r; dx <= r; dx++)
      if (Math.abs(dx) + Math.abs(dy) <= r && (own || dx !== 0 || dy !== 0))
        out.push([dx, dy]);

  return out;
}

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
  //the road tiles of the city a road leaves it from (#exits)
  this._exits = [];
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
 * Where the city's roads leave it: every road tile of the city's network that
 * a road leading nowhere goes straight on from, next to it (prune) - the last
 * of the city's that way - and the side it goes on at, -x, -y, +x, +y as 0..3:
 * for a game to put up the sign of a town's limits there.
 *
 * @returns {{tile: number, side: number}[]}
 */
CityRoads.prototype.exits = function () {
  update(this);

  return this._exits;
};

/**
 * @returns {Building[][]} what hangs together but is not the city: each part
 *          of the city's buildings and roads cut off from it - for what shows
 *          where they are
 */
CityRoads.prototype.detached = function () {
  update(this);

  var buildings = this.city.buildings.getBuildings(),
    parts = {},
    out = [],
    part,
    i;

  for (i = 0; i < buildings.length; i++) {
    part = this._partOf[buildings[i].id];

    if (part === undefined || part === this._main) continue;

    if (parts[part] === undefined) out.push((parts[part] = []));
    parts[part].push(buildings[i]);
  }

  return out;
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
 * Every tile within offsets of a building's - its area (AREA), or what an area
 * shares a tile with (REACH) - its own left out.
 *
 * @param building {Building}
 * @param [offsets] {number[][]} REACH where left out
 * @returns {number[]}
 */
function near(building, offsets) {
  var iter = building.occupiedTiles(),
    footprint = {},
    tiles = [],
    out = [],
    seen = {},
    tile,
    next,
    i,
    j;

  offsets = offsets || REACH;

  while (!iter.done) {
    tile = TileIterator.next(iter);
    footprint[tile] = true;
    tiles.push(tile);
  }

  for (i = 0; i < tiles.length; i++)
    for (j = 0; j < offsets.length; j++) {
      next = tiles[i] + offsets[j][0] + offsets[j][1] * Terrain.dy;

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

//whether a building of the city holds it together: anything but a tree, from
//the moment it is put down
function holds(building) {
  return (
    BuildingData[building.buildingCode].classCode !== BuildingClassCode.tree
  );
}

//a road the traffic can drive, finished - one still being laid reaches
//nothing yet
function finished(building) {
  return building.getState() === BuildingState.ready;
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

  //the roads that lead nowhere are not part of it
  var pruned = prune(world, buildings, order);

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
    if (
      isRoadData(buildings[i]) &&
      partOf[buildings[i].id] === main &&
      finished(buildings[i])
    )
      network[buildings[i].tile] = true;

  self._partOf = partOf;
  self._main = main;
  self._network = network;
  self._hall = hall === -1 ? null : buildings[hall];
  self._exits = exits(world, buildings, partOf, main, pruned);
}

/**
 * Where a road tile is joined to another for the lead of a road: to the next
 * tile of the same run of road, side by side - a straight run of road is a
 * line, one tile to the next - and to any tile of another run whose area
 * shares a tile with its own (REACH), the way the two runs hold together.
 *
 * @param runOf {Object} road tile -> the run of road it is part of
 */
function roadsFrom(world, road, runOf) {
  var tile = road.tile,
    run = runOf[tile],
    out = [],
    next,
    i;

  for (i = 0; i < REACH.length; i++) {
    next = tile + REACH[i][0] + REACH[i][1] * Terrain.dy;

    if (runOf[next] === undefined) continue;

    if (
      runOf[next] === run &&
      Math.abs(REACH[i][0]) + Math.abs(REACH[i][1]) !== 1
    )
      continue;

    out.push(world.buildings.get(next));
  }

  return out;
}

/**
 * Takes the roads that lead nowhere out of what holds the city together
 * (order): from the far end of a road whose area shares no tile with a
 * building's, a tile at a time, back to the last of it whose area does or
 * with a road going on - and roads whose areas share none with a building's
 * at all, round in a ring even. What is left joins something to something.
 *
 * @returns {Object} road id -> true, for every road taken out
 */
function prune(world, buildings, order) {
  var roads = [],
    runOf = {},
    near_ = {},
    left = {},
    degree = {},
    pruned = {},
    links = {},
    open = [],
    road,
    tiles,
    other,
    i,
    j;

  for (i = 0; i < buildings.length; i++)
    if (order[buildings[i].id] !== undefined && isRoadData(buildings[i])) {
      roads.push(buildings[i]);
      runOf[buildings[i].tile] = -1;
    }

  //the runs of road, tile by tile side by side
  for (i = 0, j = 0; i < roads.length; i++) {
    if (runOf[roads[i].tile] !== -1) continue;

    var open_ = [roads[i].tile];

    runOf[roads[i].tile] = j;

    while (open_.length > 0) {
      var at = open_.pop();

      STEP.forEach(function (step) {
        if (runOf[at + step] === -1) {
          runOf[at + step] = j;
          open_.push(at + step);
        }
      });
    }

    j++;
  }

  //a road whose area shares a tile with a building's of the city is where it
  //leads
  for (i = 0; i < roads.length; i++) {
    road = roads[i];
    tiles = near(road);

    for (j = 0; j < tiles.length; j++) {
      other = world.buildings.get(tiles[j]);

      if (
        other !== null &&
        order[other.id] !== undefined &&
        !isRoadData(other)
      ) {
        near_[road.id] = true;
        break;
      }
    }

    links[road.id] = roadsFrom(world, road, runOf);
    degree[road.id] = links[road.id].length;
    left[road.id] = true;

    if (near_[road.id] !== true && degree[road.id] <= 1) open.push(road);
  }

  //the far ends, back to where they lead
  while (open.length > 0) {
    road = open.pop();

    if (left[road.id] !== true) continue;

    delete left[road.id];
    pruned[road.id] = true;

    for (j = 0; j < links[road.id].length; j++) {
      other = links[road.id][j];

      if (left[other.id] !== true) continue;

      degree[other.id]--;
      if (near_[other.id] !== true && degree[other.id] <= 1) open.push(other);
    }
  }

  //and whatever is left with nothing near any of it
  var seen = {};

  for (i = 0; i < roads.length; i++) {
    if (left[roads[i].id] !== true || seen[roads[i].id] === true) continue;

    var run = [roads[i]],
      leads = false;

    seen[roads[i].id] = true;

    for (j = 0; j < run.length; j++) {
      if (near_[run[j].id] === true) leads = true;

      links[run[j].id].forEach(function (next) {
        if (left[next.id] === true && seen[next.id] !== true) {
          seen[next.id] = true;
          run.push(next);
        }
      });
    }

    if (!leads) for (j = 0; j < run.length; j++) pruned[run[j].id] = true;
  }

  for (var id in pruned) delete order[id];

  return { pruned: pruned, links: links };
}

//from a tile to the next one at each side, -x, -y, +x, +y
var STEP = [-1, -Terrain.dy, 1, Terrain.dy];

//the city's road tiles a road leading nowhere goes on from, next to them, and
//the side it does
function exits(world, buildings, partOf, main, pruned) {
  var out = [],
    next,
    b,
    i,
    s;

  if (main === -1) return out;

  for (i = 0; i < buildings.length; i++) {
    b = buildings[i];

    if (!isRoadData(b) || partOf[b.id] !== main) continue;

    for (s = 0; s < 4; s++) {
      next = world.buildings.get(b.tile + STEP[s]);

      if (next !== null && pruned.pruned[next.id] === true)
        out.push({ tile: b.tile, side: s });
    }
  }

  return out;
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
