/**
 * Created by denis on 8/27/14.
 */
import Events from "events";
import ConstructionData from "../data/buildings";
import TileIterator from "./tileiterator";
import Terrain from "./terrain";
import ConstructionState from "./buildingstate";
import Rotation from "./rotation";

//names for constructions of a world that gives none (a bench's stand-in)
var id = 0;

var events = {
  stateChange: 0,
};

//how far a building goes up while its ground is cleared for it first
//(awaitClearing) - by its time, as it would anyway, but no further till the
//bulldozers are done
var CLEAR_SHARE = 0.1;

function constructor(self) {
  self.id = -1;
}

//the world's clock (Logic#advance), or 0 for a world without one
function clockOf(world) {
  return world !== null && typeof world.clock === "number" ? world.clock : 0;
}

/**
 * @param [done] {boolean|number} true for one that stands finished from the
 *        moment it appears, or how far along it is already, 0..1 - a building
 *        coming back from a save picks up where it was left
 */
function init(self, world, code, tile, rot, done) {
  self.data = ConstructionData[code];
  self.world = world;
  //its name, for good: one it had before (a save), or the world's next
  if (world === null || typeof world.name !== "function") {
    if (self.id < 0) self.id = id++;
  } else self.id = self.id > 0 ? world.keepName(self.id) : world.name();
  self.tile = tile;
  self.buildingCode = code;
  self.rotation = Rotation.turns(rot);

  start(self, done === true ? 1 : typeof done === "number" ? done : 0);
}

/**
 * Sets it going up from progress, 0..1 - or finished, from 1 - and has it
 * finished once the rest of its construction time is up on the world's
 * clock (Buildings#due): only the last time it was set going counts, so one
 * built over again (rebuild) is not finished early by the time before.
 */
function start(self, progress) {
  var time = self.data.constructionTime;

  if (time === 0 || progress >= 1) {
    self._state = ConstructionState.ready;
    self._dueAt = -1;
    return;
  }

  self._state = ConstructionState.underConstruction;
  //as if it had started that long ago, so that it is timed the same
  self._startedAt = clockOf(self.world) - progress * time;
  self._dueAt = self._startedAt + time;
  if (self.world.buildings && self.world.buildings.schedule)
    self.world.buildings.schedule(self, self._dueAt);
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
//when it started going up, and when it is to be finished - -1 for not by
//the clock - on the world's clock (start)
Construction.prototype._startedAt = 0;
Construction.prototype._dueAt = -1;
//waiting for its ground to be cleared before it goes up (awaitClearing)
Construction.prototype._clearing = false;

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
 * Has it wait for its ground to be cleared before it goes up - the
 * bulldozers out to it (core/city/citybuildings buildBuilding, Works
 * sweep): how far along it is goes on by its time from the
 * start, as it would anyway, but no further than CLEAR_SHARE till its
 * ground is cleared (cleared) - and it goes up the rest of the way from
 * there. Nothing for one up at once.
 */
Construction.prototype.awaitClearing = function () {
  if (this._state !== ConstructionState.underConstruction) return;

  //not to be finished by the clock meanwhile
  this._dueAt = -1;
  this._clearing = true;
};

/**
 * Whether it waits for its ground to be cleared still (awaitClearing).
 */
Construction.prototype.clearing = function () {
  return this._clearing;
};

/**
 * Its ground cleared: it goes up from here, the rest of the way by its time
 * - and whoever draws it told.
 */
Construction.prototype.cleared = function () {
  if (!this._clearing) return;

  var progress = this.getProgress();

  this._clearing = false;
  start(this, progress);
  Events.fire(this, events.stateChange, this._state);
};

/**
 * Has it go up as far as it would have in ms more of the world's clock, at
 * once - finished, if that is far enough.
 *
 * @param ms {number}
 */
Construction.prototype.advance = function (ms) {
  if (this._state !== ConstructionState.underConstruction || !(ms > 0)) return;

  //time made up for: its ground long since cleared
  if (this._clearing) {
    var cleared = this.getProgress();

    this._clearing = false;
    start(this, cleared);
  }

  var time = this.data.constructionTime,
    progress = Math.min(1, this.getProgress() + ms / time);

  if (progress < 1) {
    start(this, progress);
    return;
  }

  this.finish();
};

/**
 * Finished, there and then - its time up on the world's clock
 * (Buildings#due), or made up for (#advance) - and whoever draws it told.
 */
Construction.prototype.finish = function () {
  if (this._state !== ConstructionState.underConstruction) return;

  this._dueAt = -1;
  this._state = ConstructionState.ready;
  Events.fire(this, events.stateChange, this._state);
};

/**
 * When it is to be finished on the world's clock: -1 for not by it
 * (finished, or waiting for its ground).
 *
 * @returns {number}
 */
Construction.prototype.dueAt = function () {
  return this._dueAt;
};

/**
 * Has it go on from progress, 0..1 - finished, from 1 - however far it had
 * got: for a bench that times it by a clock of its own, going as fast or as
 * slowly as asked, or not at all (lab/bench/world).
 *
 * @param progress {number}
 */
Construction.prototype.setProgress = function (progress) {
  if (this._state !== ConstructionState.underConstruction) return;

  //its ground being cleared still: no further than CLEAR_SHARE, and not
  //finished by a timer (awaitClearing)
  if (this._clearing) {
    this._startedAt =
      clockOf(this.world) -
      Math.min(CLEAR_SHARE, Math.max(0, progress)) * this.data.constructionTime;
    return;
  }

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

  var progress = Math.min(
    1,
    Math.max(
      0,
      (clockOf(this.world) - this._startedAt) / this.data.constructionTime,
    ),
  );

  //no further than so far till its ground is cleared (awaitClearing)
  return this._clearing ? Math.min(CLEAR_SHARE, progress) : progress;
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
