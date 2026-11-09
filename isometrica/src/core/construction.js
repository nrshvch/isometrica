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

//how much of the way a building goes up is its ground cleared for it first
//(awaitClearing): the bulldozers' share of it
var CLEAR_SHARE = 0.1;

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
  clearTimeout(self._timer);
  self._timer = setTimeout(
    function () {
      self._timer = null;
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
Construction.CLEAR_SHARE = CLEAR_SHARE;

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
//the timer it is finished by
Construction.prototype._timer = null;
//waiting for its ground to be cleared before it goes up (awaitClearing),
//and how much of it is, 0..1
Construction.prototype._clearing = false;
Construction.prototype._cleared = 0;

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

/**
 * Has it go up as far as it would have in ms more - for time that went by
 * with the game closed, made up for at once (Logic#catchUp): the clock it is
 * timed by stood still meanwhile, the save keeping only how far it had got.
 * Finished, if that is far enough.
 *
 * @param ms {number} real time
 */
/**
 * Has it wait for its ground to be cleared before it goes up - the
 * bulldozers out to it (core/city/citybuildings, client/clearworks): its
 * first CLEAR_SHARE of the way up, as much of it as is cleared (setCleared),
 * and the rest of the way going by its time from when it all is (cleared).
 * Nothing for one up at once.
 */
Construction.prototype.awaitClearing = function () {
  if (this._state !== ConstructionState.underConstruction) return;

  this._run++;
  clearTimeout(this._timer);
  this._timer = null;
  this._clearing = true;
  this._cleared = 0;
};

/**
 * Whether it waits for its ground to be cleared still (awaitClearing).
 */
Construction.prototype.clearing = function () {
  return this._clearing;
};

/**
 * How much of its ground is cleared, 0..1, while it waits for it to be.
 */
Construction.prototype.setCleared = function (part) {
  if (this._clearing) this._cleared = Math.max(0, Math.min(1, part));
};

/**
 * Its ground cleared: it goes up from here, the rest of the way by its time
 * - and whoever draws it told.
 */
Construction.prototype.cleared = function () {
  if (!this._clearing) return;

  this._clearing = false;
  start(this, CLEAR_SHARE);
  Events.fire(this, events.stateChange, this._state);
};

Construction.prototype.advance = function (ms) {
  if (this._state !== ConstructionState.underConstruction || !(ms > 0)) return;

  //time made up for: its ground long since cleared
  if (this._clearing) {
    this._clearing = false;
    start(this, CLEAR_SHARE);
  }

  var time = this.data.constructionTime,
    progress = Math.min(1, this.getProgress() + ms / time);

  if (progress < 1) {
    start(this, progress);
    return;
  }

  this._run++;
  clearTimeout(this._timer);
  this._timer = null;
  this._state = ConstructionState.ready;
  Events.fire(this, events.stateChange, this._state);
};

/**
 * Has it go on from progress, 0..1 - finished, from 1 - however far it had
 * got: for a bench that times it by a clock of its own, going as fast or as
 * slowly as asked, or not at all (lab/bench/world).
 *
 * @param progress {number}
 */
Construction.prototype.setProgress = function (progress) {
  //its ground is cleared by the bulldozers first, as fast as they go
  if (this._state !== ConstructionState.underConstruction || this._clearing)
    return;

  if (progress < 1) start(this, Math.max(0, progress));
  else this.advance(this.data.constructionTime);
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
  if (this._clearing) return CLEAR_SHARE * this._cleared;

  return Math.min(
    1,
    Math.max(0, (Date.now() - this._startedAt) / this.data.constructionTime),
  );
};

/**
 * The city it is part of: the world's, wherever it stands - there are no
 * borders to say otherwise - or null before one is founded.
 *
 * @returns {City|null}
 */
Construction.prototype.getCity = function () {
  var cities = this.world.cities.getCities();

  return cities.length > 0 ? cities[0] : null;
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
