/**
 * Created by denis on 9/18/14.
 */
import Events from "events";
import Buildman from "./buildman";
import Core from "core/main";

var BuildingClassCode = Core.BuildingClassCode;
var Terrain = Core.Terrain;

function getRoad(self, tile) {
  var road = self._roads[tile];
  return road || null;
}

function addRoad(self, tile, road) {
  if (self._roads[tile] === undefined) {
    self._index[tile] = self._tiles.length;
    self._tiles.push(tile);
  }

  self._roads[tile] = road;
}

function removeRoad(self, tile) {
  if (self._roads[tile] === undefined) return;

  //the last tile takes the place of the one going, so the list stays packed
  var i = self._index[tile],
    last = self._tiles.pop();

  if (last !== tile) {
    self._tiles[i] = last;
    self._index[last] = i;
  }

  delete self._index[tile];
  delete self._roads[tile];
}

function updateRoadsNear(self, tile) {
  var road;
  (road = getRoad(self, tile + 1)) !== null && road.updateProfile();
  (road = getRoad(self, tile + Terrain.dy)) !== null && road.updateProfile();
  (road = getRoad(self, tile - 1)) !== null && road.updateProfile();
  (road = getRoad(self, tile - Terrain.dy)) !== null && road.updateProfile();
}

function onBuildingLoad(sender, building, self) {
  var model = building.model();
  var data = model.data;

  if (data.classCode === BuildingClassCode.road) {
    addRoad(self, model.tile, building);

    updateRoadsNear(self, model.tile);

    building.updateProfile();

    //which roads are the city's network may have changed with it
    refreshSoon(self);
  } else updateRoadsAround(self, model);
}

/**
 * Has every road work out its piece again - once, a moment from now, however
 * many roads came and went in the meantime: as a city loads, or a road joins
 * two stretches into one network.
 */
function refreshSoon(self) {
  if (self._refresh !== null) return;

  self._refresh = setTimeout(function () {
    self._refresh = null;

    for (var i = 0; i < self._tiles.length; i++)
      self._roads[self._tiles[i]].updateProfile();
  }, 0);
}

/**
 * Has the roads round a building - alongside it and at its corners - work
 * out their pieces again: a street with something on it now, or no more.
 */
function updateRoadsAround(self, model) {
  var iter = model.occupiedTiles(),
    seen = {},
    tile,
    road,
    dx,
    dy;

  while (!iter.done) {
    tile = iter.next();

    for (dx = -1; dx <= 1; dx++)
      for (dy = -1; dy <= 1; dy++) {
        var t = tile + dx + dy * Terrain.dy;

        if (seen[t] === true) continue;
        seen[t] = true;
        if ((road = getRoad(self, t)) !== null) road.updateProfile();
      }
  }
}

function onBuildingUnload(sender, building, self) {
  var model = building.model();
  var data = model.data;

  if (data.classCode === BuildingClassCode.road) {
    removeRoad(self, model.tile);

    //the same event carries both a demolished road and one whose chunk is
    //just being unloaded; only a demolished one is gone from the core, and
    //only then should the junctions around it fall back to simpler pieces
    if (self.root.core.buildingService.get(model.tile) === null) {
      updateRoadsNear(self, model.tile);
      refreshSoon(self);
    }
  } else if (self.root.core.buildingService.get(model.tile) === null)
    updateRoadsAround(self, model);
}

function Roadman(root) {
  this.root = root;
  this._roads = {};
  //every loaded road tile, packed, for picking one at random
  this._tiles = [];
  this._index = {};
  this._refresh = null;
}

Roadman.prototype.init = function () {
  var buildman = this.root.buildman;

  Events.on(buildman, Buildman.events.buildingLoad, onBuildingLoad, this);
  Events.on(buildman, Buildman.events.buildingUnload, onBuildingUnload, this);

  //a road whose view was made before this ran never worked out which piece
  //to draw, and would sit there as a lone crossroads for good - so anything
  //already standing is taken over here rather than trusted to arrive
  var views = buildman.getBuildingViews();

  for (var i = 0; i < views.length; i++)
    onBuildingLoad(buildman, views[i], this);
};

Roadman.prototype.getRoad = function (tile) {
  return getRoad(this, tile);
};

/**
 * Whether the road on tile is a street - paved, with its pavements and its
 * street lights: one of the city's road network (see core CityRoads), with a
 * building next to it, alongside or at a corner. Out in the country, or on a
 * stretch that does not join up with the rest, it is plain asphalt.
 */
Roadman.prototype.paved = function (tile) {
  var buildings = this.root.core.buildingService,
    //a road may run on past the city's land, and still be its street
    cities = this.root.core.cities.getCities(),
    dx,
    dy;

  if (
    !cities.some(function (city) {
      return city.roads.inNetwork(tile);
    })
  )
    return false;

  for (dx = -1; dx <= 1; dx++)
    for (dy = -1; dy <= 1; dy++) {
      var other = buildings.get(tile + dx + dy * Terrain.dy);

      if (
        other !== null &&
        other.data.classCode !== BuildingClassCode.road &&
        other.data.classCode !== BuildingClassCode.tree
      )
        return true;
    }

  return false;
};

/**
 * How many road tiles are loaded right now.
 */
Roadman.prototype.getRoadCount = function () {
  return this._tiles.length;
};

/**
 * Every loaded road tile. The list itself, not a copy - whoever gets it reads
 * it and leaves it alone.
 *
 * @returns {number[]}
 */
Roadman.prototype.getRoadTiles = function () {
  return this._tiles;
};

/**
 * A loaded road tile picked at random, or -1 when there is none.
 */
Roadman.prototype.getRandomRoadTile = function () {
  var tiles = this._tiles;

  return tiles.length === 0 ? -1 : tiles[(Math.random() * tiles.length) | 0];
};

export default Roadman;
