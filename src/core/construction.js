/**
 * Created by denis on 8/27/14.
 */
import Events from "events";
import ConstructionData from "data/buildings";
import TileIterator from "./tileiterator";
import Terrain from "./terrain";
import ConstructionState from "./buildingstate";

var id = 0;

var events = {
  stateChange: 0,
};

function constructor(self) {
  self.id = id++;
}

/**
 * @param [done] {boolean|number} true for one that stands finished from the
 *        moment it appears, or how far along it is already, 0..1 - a building
 *        coming back from a save picks up where it was left
 */
function init(self, world, code, tile, rot, done) {
  self.data = ConstructionData[code];
  self.world = world;
  self.tile = tile;
  self.buildingCode = code;
  self.rotation = rot || 0;

  var time = self.data.constructionTime,
    progress = done === true ? 1 : typeof done === "number" ? done : 0;

  if (time === 0 || progress >= 1) {
    self._state = ConstructionState.ready;
  } else {
    self._state = ConstructionState.underConstruction;
    //as if it had started that long ago, so that it is timed the same
    self._startedAt = Date.now() - progress * time;
    setTimeout(
      function () {
        self._state = ConstructionState.ready;
        Events.fire(self, events.stateChange, self._state);
      },
      (1 - progress) * time,
    );
  }
}

function Construction() {
  constructor(this);
}

Construction.constructor = constructor;
Construction.events = events;
Construction.init = init;

Construction.prototype.id = -1;
Construction.prototype.tile = -1;
Construction.prototype.rotation = 0;
Construction.prototype.data = null;
Construction.prototype.world = null;
Construction.prototype.buildingCode = -1;
Construction.prototype._state = ConstructionState.none;
//when it started going up, on the clock that times it (see init)
Construction.prototype._startedAt = 0;

Construction.prototype.init = function (world, code, tile, rot, done) {
  return init(this, world, code, tile, rot, done);
};

Construction.prototype.getState = function () {
  return this._state;
};

/**
 * How far it has gone up: 1 once it stands finished.
 *
 * @returns {number} 0..1
 */
Construction.prototype.getProgress = function () {
  if (this._state !== ConstructionState.underConstruction) return 1;

  return Math.min(
    1,
    Math.max(0, (Date.now() - this._startedAt) / this.data.constructionTime),
  );
};

Construction.prototype.getCity = function () {
  var world = this.world,
    city = null,
    cityId = world.landRegistry.getTileOwner(this.tile);

  if (cityId !== -1) city = world.cities.getCity(cityId);

  return city;
};

/**
 *
 * @returns {TileIterator}
 */
Construction.prototype.occupiedTiles = function () {
  var sizeX = this.rotation ? this.data.sizeY : this.data.sizeX,
    sizeY = this.rotation ? this.data.sizeX : this.data.sizeY;

  return new TileIterator(
    this.tile,
    this.tile + (sizeX - 1) + (sizeY - 1) * Terrain.dy,
  );
};

export default Construction;
