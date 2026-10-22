/**
 * Created by denis on 8/27/14.
 */
import Events from "events";
import ConstructionData from "../data/buildings";
import TileIterator from "./tileiterator";
import Terrain from "./terrain";
import ConstructionState from "./buildingstate";
import Rotation from "./rotation";

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
  self.rotation = Rotation.turns(rot);

  start(self, done === true ? 1 : typeof done === "number" ? done : 0);
}

/**
 * Sets it going up from progress, 0..1 - or finished, from 1 - and has it
 * finished once the rest of its construction time is up: only the last time
 * it was set going counts, so one built over again (rebuild) is not finished
 * early by the timer of the time before.
 */
function start(self, progress) {
  var time = self.data.constructionTime,
    run = (self._run = (self._run || 0) + 1);

  if (time === 0 || progress >= 1) {
    self._state = ConstructionState.ready;
    return;
  }

  self._state = ConstructionState.underConstruction;
  //as if it had started that long ago, so that it is timed the same
  self._startedAt = Date.now() - progress * time;
  setTimeout(
    function () {
      if (self._run !== run) return;

      self._state = ConstructionState.ready;
      Events.fire(self, events.stateChange, self._state);
    },
    (1 - progress) * time,
  );
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
//how many times it was set going up (start), for the timer of the last one
Construction.prototype._run = 0;

Construction.prototype.init = function (world, code, tile, rot, done) {
  return init(this, world, code, tile, rot, done);
};

/**
 * Has it built over again from the start, where it stands - a road paved over
 * in something else (core/city/citybuildings upgrade) goes through its works
 * the way a new one does.
 */
Construction.prototype.rebuild = function () {
  start(this, 0);
  Events.fire(this, events.stateChange, this._state);
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
  var sizeX = Rotation.sizeX(this.data, this.rotation),
    sizeY = Rotation.sizeY(this.data, this.rotation);

  return new TileIterator(
    this.tile,
    this.tile + (sizeX - 1) + (sizeY - 1) * Terrain.dy,
  );
};

export default Construction;
