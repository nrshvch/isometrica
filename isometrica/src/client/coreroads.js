/**
 * The roads the traffic drives on, from the core: every finished road in the
 * world, loaded or not - in the shape `traffic.js` asks for (getRoad, with
 * data, typeCode and surface, as client/roadman's) - and the cities' road
 * tiles sorted by region. Skill traffic, agents.md.
 */
import Core from "../core/main";
import BuildingState from "../core/buildingstate";

var Surface = Core.Surface,
  Terrain = Core.Terrain,
  roadCode = Core.BuildingClassCode.road;

//a road of the core's as the traffic reads one: its model, its surface, and
//its shape - a ramp 1..4 (Surface.shapeOf), anything else flat (90000, as
//client/road profile has a flat piece)
function CoreRoad(roads, model) {
  this.roads = roads;
  this.data = model;
}

CoreRoad.prototype.surface = function () {
  var model = this.data;

  return Array.isArray(model.surface)
    ? model.surface
    : Surface.natural(this.roads.core.terrain, model.tile);
};

Object.defineProperty(CoreRoad.prototype, "typeCode", {
  get: function () {
    var shape = Surface.shapeOf(this.surface());

    return shape > 0 ? shape : 90000;
  },
});

CoreRoad.prototype.isStop = function () {
  return !!(this.data.look && this.data.look.stop);
};

/**
 * @param core {Logic} the world's core: its buildings, terrain and cities
 * @param regionOf {function(number, number): number} the region a tile x, y
 *        is in (client/tilesman regionOf)
 */
function CoreRoads(core, regionOf) {
  this.core = core;
  this.regionOf = regionOf;
  //tile -> CoreRoad, made again when the model on the tile is another
  this._roads = new Map();
  //the cities' network tiles by region, and what they were sorted for
  this._byRegion = new Map();
  this._sortedFor = "";
}

//the road model on tile, or null
function modelOf(self, tile) {
  var model = self.core.buildingService.get(tile);

  return model !== null &&
    model.data &&
    model.data.classCode === roadCode &&
    typeof model.tile === "number"
    ? model
    : null;
}

function wrap(self, tile, model) {
  var road = self._roads.get(tile);

  if (road === undefined || road.data !== model) {
    road = new CoreRoad(self, model);
    self._roads.set(tile, road);
  }

  return road;
}

/**
 * The finished road on tile, which the traffic can drive - or null.
 */
CoreRoads.prototype.getRoad = function (tile) {
  var model = modelOf(this, tile);

  if (model === null) return null;
  if (model.getState && model.getState() === BuildingState.underConstruction)
    return null;

  return wrap(this, tile, model);
};

/**
 * The road on tile, finished or still being laid, or null.
 */
CoreRoads.prototype.anyRoad = function (tile) {
  var model = modelOf(this, tile);

  return model === null ? null : wrap(this, tile, model);
};

/**
 * The cities' road network tiles (core/city/cityroads networkTiles) in the
 * regions keys[0..n), into out - sorted by region again only when a
 * network has changed.
 *
 * @param keys {ArrayLike<number>}
 * @returns {number[]} out
 */
CoreRoads.prototype.cityTiles = function (keys, n, out) {
  var cities = this.core.cities.getCities(),
    stamp = "",
    i;

  for (i = 0; i < cities.length; i++)
    stamp += cities[i]._id + ":" + cities[i].roads.version() + ",";

  if (stamp !== this._sortedFor) {
    this._sortedFor = stamp;
    this._byRegion.clear();

    for (i = 0; i < cities.length; i++) {
      var tiles = cities[i].roads.networkTiles();

      for (var k = 0; k < tiles.length; k++) {
        var t = tiles[k],
          key = this.regionOf(Terrain.extractX(t), Terrain.extractY(t)),
          list = this._byRegion.get(key);

        if (list === undefined) this._byRegion.set(key, (list = []));
        list.push(t);
      }
    }
  }

  out.length = 0;
  for (i = 0; i < n; i++) {
    var found = this._byRegion.get(keys[i]);

    if (found !== undefined)
      for (var j = 0; j < found.length; j++)
        if (this.getRoad(found[j]) !== null) out.push(found[j]);
  }

  return out;
};

export default CoreRoads;
