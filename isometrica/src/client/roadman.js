/**
 * Created by denis on 9/18/14.
 */
import Events from "events";
import Buildman from "./buildman";
import Core from "../core/main";

var BuildingClassCode = Core.BuildingClassCode;
var Terrain = Core.Terrain;

//the road on tile, finished or still being laid
function getRoad(self, tile) {
  var road = self._roads[tile];
  return road || null;
}

/*
 * Every road loaded is kept by its tile - and, packed in a list for picking
 * one at random, the finished ones, which are what the traffic drives on;
 * the ones still being laid (client/roadworks) are kept apart until they
 * are finished.
 */
function addRoad(self, tile, road) {
  self._roads[tile] = road;
  file(self, tile, road);
}

//into the list of finished roads, or among the ones being laid
function file(self, tile, road) {
  if (road.isReady()) {
    delete self._works[tile];
    if (self._index[tile] === undefined) {
      self._index[tile] = self._tiles.length;
      self._tiles.push(tile);
    }
  } else {
    unlist(self, tile);
    self._works[tile] = road;
  }
}

//out of the list of finished roads: the last tile takes the place of the
//one going, so the list stays packed
function unlist(self, tile) {
  if (self._index[tile] === undefined) return;

  var i = self._index[tile],
    last = self._tiles.pop();

  if (last !== tile) {
    self._tiles[i] = last;
    self._index[last] = i;
  }

  delete self._index[tile];
}

function removeRoad(self, tile) {
  if (self._roads[tile] === undefined) return;

  unlist(self, tile);
  delete self._works[tile];
  delete self._roads[tile];
}

function updateRoadsNear(self, tile) {
  var road;
  (road = getRoad(self, tile + 1)) !== null && road.updateProfile();
  (road = getRoad(self, tile + Terrain.dy)) !== null && road.updateProfile();
  (road = getRoad(self, tile - 1)) !== null && road.updateProfile();
  (road = getRoad(self, tile - Terrain.dy)) !== null && road.updateProfile();
}

//the roads next to tile drawn again whatever their pieces - their barriers
//come and go with the road there (client/roadview)
function redrawNear(self, tile) {
  [1, -1, Terrain.dy, -Terrain.dy].forEach(function (d) {
    var road = getRoad(self, tile + d);

    if (road !== null) road.view.update();
  });
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

    for (var tile in self._roads) self._roads[tile].updateProfile();
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
  //every loaded road tile finished, packed, for picking one at random
  this._tiles = [];
  this._index = {};
  //and the ones still being laid, by tile
  this._works = {};
  this._refresh = null;
}

/**
 * A road was finished, or came back from a save part laid (client/road
 * setData): kept with the finished ones or among the ones being laid; and a
 * road finished joins the traffic's network, its neighbours' barriers come
 * down, and which roads are streets may have changed with it.
 */
Roadman.prototype.refile = function (road) {
  var tile = road.data.tile;

  if (this._roads[tile] !== road) return;

  var was = this._works[tile] !== undefined;

  file(this, tile, road);

  if (was !== (this._works[tile] !== undefined)) {
    redrawNear(this, tile);
    refreshSoon(this);
  }
};

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

/**
 * The road on tile the traffic can drive - a finished one - or null.
 */
Roadman.prototype.getRoad = function (tile) {
  var road = getRoad(this, tile);

  return road !== null && this._works[tile] === undefined ? road : null;
};

/**
 * The road on tile, finished or still being laid, or null - for how it is
 * laid and joins up with the roads round it.
 */
Roadman.prototype.anyRoad = function (tile) {
  return getRoad(this, tile);
};

/**
 * The roads loaded that are still being laid, by tile. The map itself, not a
 * copy.
 *
 * @returns {Object<number, Road>}
 */
Roadman.prototype.getWorks = function () {
  return this._works;
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
 * The loaded road tiles with a bus stop on them.
 *
 * @returns {number[]}
 */
Roadman.prototype.getStops = function () {
  var out = [];

  for (var i = 0; i < this._tiles.length; i++)
    if (this._roads[this._tiles[i]].isStop()) out.push(this._tiles[i]);

  return out;
};

/**
 * A loaded road tile picked at random, or -1 when there is none.
 */
Roadman.prototype.getRandomRoadTile = function () {
  var tiles = this._tiles;

  return tiles.length === 0 ? -1 : tiles[(Math.random() * tiles.length) | 0];
};

export default Roadman;
