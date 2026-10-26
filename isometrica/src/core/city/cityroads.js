/**
 * What holds the city together, and what its streets reach.
 *
 * Every building of the city has an area round it: what is within RADIUS of
 * it, two tiles - counted from the middle of one tile to the middle of the
 * other, and rounded, so along a row or a column two tiles out, and a tile to
 * either side of those, and corner to corner one: round, rather than a
 * diamond (AREA). Where two areas share a tile they are one: along a row, two
 * buildings with three tiles between them share the middle one, and hang
 * together; with four between, their areas only touch, and they do not
 * (REACH). The city's area is all of it that hangs together. A village holds
 * together by its houses standing near each other, the way families settle;
 * a road is what reaches out to whatever stands further off, and the
 * cheapest way to. It holds together once it is finished - a house still
 * going up, a road still being laid, not yet; a tree is the world's, not the
 * city's.
 *
 * A road has no area of its own: only where it joins buildings to each other
 * does it have one, each tile of it as a building's - where a way along it,
 * never over the same tile twice, goes from inside one building's area to
 * inside another's (prune). Roads join where their tiles are side by side,
 * not across a gap. A road that leads nowhere is just a road, abandoned: a
 * tile of it in the middle of nowhere stands apart from nothing, a loop only
 * leads back to where it left, and a lane running off into the country past
 * the last house is the city's to the edge of the house's area, and no
 * further - the city's area along it two tiles on from there. Two branches
 * from one village to another are both the city's.
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
import Terrain from "../terrain";
import TileIterator from "../tileiterator";

import namespace from "namespace";
var CityService = namespace("Isometrica.Core.CityService");
CityService.Roads = CityRoads;

/**
 * How far a building's area, or a road tile's, reaches round each of its
 * tiles: the tiles whose middles are two tiles from its middle, rounded
 * (RADIUS) - along a row or a column two tiles out and one to either side of
 * those, corner to corner one, never two across and two down - as [x, y], its
 * own tile among them.
 *
 * @type {number[][]}
 */
var RADIUS = 2;
var AREA = within(RADIUS);
CityRoads.RADIUS = RADIUS;
CityRoads.AREA = AREA;

/**
 * Where from a tile of one thing a tile of another has an area that shares a
 * tile with its own (AREA) - three tiles between them along a row or a column
 * at most - as [x, y].
 *
 * @type {number[][]}
 */
var REACH = shared(AREA);
CityRoads.REACH = REACH;

//every [x, y] whose distance from [0, 0], rounded, is r at most
function within(r) {
  var out = [],
    dx,
    dy;

  for (dy = -r; dy <= r; dy++)
    for (dx = -r; dx <= r; dx++)
      if (Math.round(Math.sqrt(dx * dx + dy * dy)) <= r) out.push([dx, dy]);

  return out;
}

//every [x, y] but [0, 0] two areas the shape of area that far apart share a
//tile from: one's tiles less the other's
function shared(area) {
  var seen = {},
    out = [],
    dx,
    dy,
    i,
    j;

  for (i = 0; i < area.length; i++)
    for (j = 0; j < area.length; j++) {
      dx = area[i][0] - area[j][0];
      dy = area[i][1] - area[j][1];

      if ((dx === 0 && dy === 0) || seen[dx + "," + dy]) continue;

      seen[dx + "," + dy] = true;
      out.push([dx, dy]);
    }

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
 * What would hang together with code put down on each of anchors - finished,
 * sizeX by sizeY each, a road a tile: for what shows it while it is being put
 * down (the city-sim's border). One that would go on a tile of something
 * finished already - a road laid again - is what is there.
 *
 * @param code {number}
 * @param anchors {number[]}
 * @param sizeX {number}
 * @param sizeY {number}
 * @returns {{city: number[], apart: {tiles: number[], added: boolean}[]}} the
 *          tiles the city would stand on, and those of each part standing
 *          apart from it - whether what is put down is in it. What is put down
 *          in neither is a road that would lead nowhere
 */
CityRoads.prototype.plan = function (code, anchors, sizeX, sizeY) {
  var data = BuildingData[code],
    things = holders(this.city),
    taken = {},
    added = {},
    out = { city: [], apart: [] },
    at = {},
    into,
    part,
    tiles,
    t,
    i,
    j;

  for (i = 0; i < things.length; i++)
    for (j = 0; j < things[i].tiles.length; j++)
      taken[things[i].tiles[j]] = true;

  //a tree holds nothing together, put down or not
  for (
    i = 0;
    i < anchors.length && data.classCode !== BuildingClassCode.tree;
    i++
  ) {
    tiles = footprint(anchors[i], sizeX, sizeY);

    if (tiles.some(isTaken)) continue;

    tiles.forEach(take);
    added["new" + i] = true;
    things.push({
      id: "new" + i,
      tile: anchors[i],
      tiles: tiles,
      road: data.classCode === BuildingClassCode.road,
      hall: data.townHall === true,
      people: 0,
      building: null,
    });
  }

  function isTaken(tile) {
    return taken[tile] === true;
  }

  function take(tile) {
    taken[tile] = true;
  }

  var hung = workOut(things);

  for (i = 0; i < things.length; i++) {
    t = things[i];
    part = hung.partOf[t.id];

    if (part === undefined) continue;

    if (part === hung.main) into = out.city;
    else {
      if (at[part] === undefined) {
        at[part] = out.apart.length;
        out.apart.push({ tiles: [], added: false });
      }

      if (added[t.id] === true) out.apart[at[part]].added = true;
      into = out.apart[at[part]].tiles;
    }

    for (j = 0; j < t.tiles.length; j++) into.push(t.tiles[j]);
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
 * Every tile a thing's area shares a tile with the area of another on (REACH)
 * - or, with AREA, every tile of its area - its own left out.
 *
 * @param thing {Object} (holders)
 * @param [offsets] {number[][]} REACH where left out
 * @returns {number[]}
 */
function near(thing, offsets) {
  var tiles = thing.tiles,
    own = {},
    out = [],
    seen = {},
    next,
    i,
    j;

  offsets = offsets || REACH;

  for (i = 0; i < tiles.length; i++) own[tiles[i]] = true;

  for (i = 0; i < tiles.length; i++)
    for (j = 0; j < offsets.length; j++) {
      next = tiles[i] + offsets[j][0] + offsets[j][1] * Terrain.dy;

      if (own[next] === true || seen[next] === true) continue;

      seen[next] = true;
      out.push(next);
    }

  return out;
}

//the tiles of a footprint sizeX by sizeY on anchor
function footprint(anchor, sizeX, sizeY) {
  var iter = new TileIterator(
      anchor,
      anchor + (sizeX - 1) + (sizeY - 1) * Terrain.dy,
    ),
    out = [];

  while (!iter.done) out.push(TileIterator.next(iter));

  return out;
}

/**
 * What of the city holds it together (holds), in the order it went up - as
 * what hangs together is worked out from (workOut): each its id, its tile and
 * the tiles it stands on, whether it is a road or a town hall, how many live
 * in it, and the building.
 *
 * @param city {City}
 * @returns {Object[]}
 */
function holders(city) {
  var buildings = city.buildings.getBuildings(),
    population = city.population,
    out = [],
    iter,
    tiles,
    b,
    i;

  for (i = 0; i < buildings.length; i++) {
    b = buildings[i];

    if (!holds(b)) continue;

    iter = b.occupiedTiles();
    tiles = [];
    while (!iter.done) tiles.push(TileIterator.next(iter));

    out.push({
      id: b.id,
      tile: b.tile,
      tiles: tiles,
      road: isRoadData(b),
      hall: CityRoads.isTownHall(b),
      people: isRoadData(b) ? 0 : population.getResidents(b),
      building: b,
    });
  }

  return out;
}

function isRoadData(building) {
  return (
    BuildingData[building.buildingCode].classCode === BuildingClassCode.road
  );
}

//whether a building of the city holds it together: anything but a tree, once
//it is finished - a house going up, a road being laid, not yet
function holds(building) {
  return (
    finished(building) &&
    BuildingData[building.buildingCode].classCode !== BuildingClassCode.tree
  );
}

//whether it is finished: a road the traffic can drive, a house to live in
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

  self._stale = false;
  self._version++;

  var things = holders(self.city),
    hung = workOut(things),
    network = {},
    i;

  for (i = 0; i < things.length; i++)
    if (things[i].road && hung.partOf[things[i].id] === hung.main)
      network[things[i].tile] = true;

  self._partOf = hung.partOf;
  self._main = hung.main;
  self._network = network;
  self._hall = hung.hall === null ? null : hung.hall.building;
}

/**
 * What hangs together of things (holders), in the order they went up: the
 * part each is in - the roads that lead nowhere in none (prune) - and which
 * part is the city, with the town hall it is where it is for, if any.
 *
 * @param things {Object[]}
 * @returns {{partOf: Object, main: number, hall: Object|null}} partOf thing
 *          id -> part
 */
function workOut(things) {
  var byTile = {},
    //thing id -> its place in the order they went up
    order = {},
    partOf = {},
    parts = [],
    main = -1,
    hall = -1,
    pruned,
    t,
    i,
    j;

  for (i = 0; i < things.length; i++) {
    order[things[i].id] = i;
    for (j = 0; j < things[i].tiles.length; j++)
      byTile[things[i].tiles[j]] = things[i];
  }

  //the roads that lead nowhere are not part of it
  pruned = prune(things, byTile);

  //the parts, in the order things went up: the first of each is its oldest
  for (i = 0; i < things.length; i++) {
    t = things[i];

    if (pruned[t.id] === true || partOf[t.id] !== undefined) continue;

    var index = parts.length,
      part = { size: 0, people: 0, oldest: i, hall: -1 },
      open = [t],
      tiles,
      next;

    parts.push(part);
    partOf[t.id] = index;

    while (open.length > 0) {
      t = open.pop();

      weigh(part, t, order[t.id]);

      tiles = near(t);

      for (j = 0; j < tiles.length; j++) {
        next = byTile[tiles[j]];

        if (
          next === undefined ||
          pruned[next.id] === true ||
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

  return {
    partOf: partOf,
    main: main,
    hall: hall === -1 ? null : things[hall],
  };
}

/**
 * The roads that lead nowhere, out of what holds the city together. A road
 * holds it together only where it joins buildings to each other: where a way
 * along it goes from one building to another - from a tile of it inside the
 * one's area (AREA) to a tile of it inside the other's, its tiles side by side
 * between, never over the same tile twice. A road past the last house is the
 * city's to the edge of the house's area, and its area two tiles on from
 * there. Two branches both going from one village to another are such ways; a
 * loop that only leads back to where it left the road, a lane on into the
 * country, a tile on its own, are not.
 *
 * Worked out as graph theory has it: the roads, and the buildings they stand
 * in the areas of, each building joined to one more thing, the same for all of them - a
 * road is on such a way if it is on a ring with that one thing, which is when
 * the two are in a block of the graph together (ringsWith).
 *
 * @param things {Object[]} (holders)
 * @param byTile {Object} tile -> the thing on it
 * @returns {Object} road id -> true, for every road taken out
 */
function prune(things, byTile) {
  var roads = [],
    //thing id -> where it is in the graph; 0 the one thing the buildings are
    //all joined to
    at = {},
    joins = [[]],
    pruned = {},
    on,
    road,
    other,
    tiles,
    i,
    j;

  for (i = 0; i < things.length; i++)
    if (things[i].road) {
      at[things[i].id] = joins.length;
      joins.push([]);
      roads.push(things[i]);
    }

  for (i = 0; i < roads.length; i++) {
    road = roads[i];

    //the road's tiles side by side
    for (j = 0; j < STEP.length; j++) {
      other = byTile[road.tile + STEP[j]];

      if (other !== undefined && other.road)
        joins[at[road.id]].push(at[other.id]);
    }

    //and the buildings it stands in the area of
    tiles = near(road, AREA);

    for (j = 0; j < tiles.length; j++) {
      other = byTile[tiles[j]];

      if (other === undefined || other.road) continue;

      if (at[other.id] === undefined) {
        at[other.id] = joins.length;
        joins.push([0]);
        joins[0].push(at[other.id]);
      }

      if (joins[at[road.id]].indexOf(at[other.id]) === -1) {
        joins[at[road.id]].push(at[other.id]);
        joins[at[other.id]].push(at[road.id]);
      }
    }
  }

  on = ringsWith(joins, 0);

  for (i = 0; i < roads.length; i++)
    if (on[at[roads[i].id]] !== true) pruned[roads[i].id] = true;

  return pruned;
}

/**
 * What is on a ring with root in a graph: whatever is in a block - a
 * biconnected component - with it. Hopcroft and Tarjan's, gone over without
 * recursion: a depth-first walk from root, every block found as the walk
 * comes back up to the first of it, which for a block of root's is root.
 *
 * @param joins {number[][]} what each is joined to
 * @param root {number}
 * @returns {Object} -> true, for root and what is on a ring with it
 */
function ringsWith(joins, root) {
  var found = [],
    low = [],
    count = 0,
    stack = [],
    walk = [{ at: root, from: -1, next: 0 }],
    on = {},
    step,
    v,
    w,
    up;

  found[root] = low[root] = count++;
  on[root] = true;

  while (walk.length > 0) {
    step = walk[walk.length - 1];
    v = step.at;

    if (step.next < joins[v].length) {
      w = joins[v][step.next++];

      if (found[w] === undefined) {
        found[w] = low[w] = count++;
        stack.push(w);
        walk.push({ at: w, from: v, next: 0 });
      } else if (w !== step.from) low[v] = Math.min(low[v], found[w]);

      continue;
    }

    walk.pop();

    if (walk.length === 0) break;

    up = walk[walk.length - 1].at;
    low[up] = Math.min(low[up], low[v]);

    //a block, up the first of it
    if (low[v] >= found[up])
      do {
        w = stack.pop();
        if (up === root) on[w] = true;
      } while (w !== v);
  }

  return on;
}

//from a tile to the next one at each side, -x, -y, +x, +y
var STEP = [-1, -Terrain.dy, 1, Terrain.dy];

//what a thing (holders) adds to the part it is in
function weigh(part, thing, at) {
  part.size += thing.tiles.length;

  if (thing.road) return;

  part.people += thing.people;
  if (at < part.oldest) part.oldest = at;
  if (thing.hall && (part.hall === -1 || at < part.hall)) part.hall = at;
}

//whether part a is more the city than b: bigger, then more lived in, then
//older
function better(a, b) {
  if (a.size !== b.size) return a.size > b.size;
  if (a.people !== b.people) return a.people > b.people;

  return a.oldest < b.oldest;
}

export default CityRoads;
