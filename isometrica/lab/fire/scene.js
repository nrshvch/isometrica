/**
 * The fire bench (lab/fire.html): one building on a patch of flat grass, a
 * road along its front and a few trees about it, and nothing else (lab/
 * bench/world) - set on fire the way the game sets one on fire (client/
 * buildman fireUp): it catches in a window low down, and the fire spreads
 * window by window, floor by floor, black smoke rolling up off it; it comes
 * down, and what is left of it burns on and smoulders - a burnt-out ruin
 * then (client/fires, client/ruin). All of it over a day of the game's
 * time, by a clock of the bench's own: as fast as the game's, or faster,
 * stood still, or put on an hour, or to just before it comes down - by day
 * or at night.
 */
import BuildingData from "../../src/data/buildings";
import BuildingState from "../../src/core/buildingstate";
import CoreBuilding from "../../src/core/building";
import Rotation from "../../src/core/rotation";

//the ground the scene stands on, tiles from the middle of the bench: its
//corner with the least x and y, and how far it goes
var X = -6,
  Y = -6,
  W = 13,
  H = 13;

//what stands to begin with: a block of flats with a yard
var FIRST = 430;

//the trees round it, off its corners and along the far side of the road
var TREES = [
  [-4, -4],
  [-3, 4],
  [4, -3],
  [4, 4],
  [-5, 1],
  [5, 0],
];

var HOUR = 3600000;

//the hour it is by day, and at night (core/vtime)
var DAY = 10 * HOUR,
  NIGHT = 22 * HOUR;

/**
 * @param world {World} the bench's world (lab/bench/world)
 */
export function Scene(world) {
  var self = this,
    time = world.client.game.time,
    last = time.time;

  this.world = world;
  this.code = FIRST;
  this.rotation = 0;
  //how many hours of the game's time the fire goes on by a second of the
  //bench's own (its "how fast" too)
  this.rate = 1 / 3;
  //the game's time by the fire's clock, ms - going on by the bench's own,
  //the game's standing still
  this.at = world.core.time.now;
  this.night = false;

  //the fire goes by the bench's clock (client/fires now)
  world.client.fires.clock = function () {
    var t = time.time;

    if (t !== last) {
      self.at += (t - last) * self.rate * (HOUR / 1000);
      last = t;
    }

    return self.at;
  };

  world.ground(X, Y, W, H);
  this.put();
  world.look(0, 0);
}

//the lot it stands on, turned as it is: its corner, round the middle, and
//its size
Scene.prototype.lot = function () {
  var data = BuildingData[this.code],
    sizeX = Rotation.sizeX(data, this.rotation),
    sizeY = Rotation.sizeY(data, this.rotation);

  return {
    x: -Math.floor(sizeX / 2),
    y: -Math.floor(sizeY / 2),
    sizeX: sizeX,
    sizeY: sizeY,
  };
};

/**
 * Put up again, standing finished, over whatever was left of it - and the
 * trees and the road round it - once nothing is going on.
 *
 * @returns {boolean} whether it was
 */
Scene.prototype.put = function () {
  var world = this.world,
    lot = this.lot();

  if (!world.wipe(X, Y, W, H)) return false;

  world.road(X, lot.y - 1, W, false, "asphalt");
  world.put(this.code, lot.x, lot.y, this.rotation);
  TREES.forEach(function (t) {
    world.plant(t[0], t[1]);
  });

  return true;
};

/**
 * Another kind of building, put up in the middle unturned.
 */
Scene.prototype.pick = function (code) {
  this.code = +code;
  this.rotation = 0;

  return this.put();
};

/**
 * Put up again turned a quarter turn on its ground.
 */
Scene.prototype.turn = function () {
  this.rotation = Rotation.next(this.rotation);

  if (!this.put()) this.rotation = (this.rotation + 3) & 3;
};

/**
 * What stands in the middle, the core's - standing, on fire or burnt down -
 * or null.
 */
Scene.prototype.building = function () {
  var lot = this.lot();

  return this.world.core.buildingService.get(this.world.tile(lot.x, lot.y));
};

/**
 * Sets it on fire, the way the game does - now, by the fire's clock.
 *
 * @returns {number} ErrorCode - 0 once it is alight
 */
Scene.prototype.fireUp = function () {
  var b = this.building();

  if (b === null) return -1;

  //the fire's clock on from the world's, as it set it on fire
  this.at = this.world.core.time.now;

  return this.world.client.buildman.fireUp(b.tile);
};

/**
 * The fire's clock put on so many hours.
 */
Scene.prototype.skip = function (hours) {
  this.at += hours * HOUR;
};

/**
 * The fire's clock put on to a moment before it comes down - if it is not
 * down already.
 */
Scene.prototype.toFall = function () {
  var b = this.building();

  if (b === null || b.fire === null) return;

  this.at = Math.max(this.at, b.fire + CoreBuilding.BURNS - 0.08 * HOUR);
};

/**
 * By day or at night - the hour of the day only, the fire going on as it
 * was.
 */
Scene.prototype.setNight = function (on) {
  var time = this.world.core.time,
    day = Math.floor(time.now / (24 * HOUR)) * 24 * HOUR;

  this.night = on;
  //the day going by with the clock, for the bench only (client/lighting
  //setDayNight would keep it so for every page)
  this.world.client.lighting.dayNight = true;
  time.setTime(day + (on ? NIGHT : DAY));
};

/**
 * How it is: standing, on fire, or burnt down - how long it has burnt, of
 * the game's time, and how many of its windows are ablaze.
 */
Scene.prototype.status = function () {
  var b = this.building(),
    blazes = this.world.client.fires.status(),
    blaze = blazes.length > 0 ? blazes[0] : null,
    state = b !== null ? b.getState() : null;

  return {
    name: b !== null ? BuildingData[b.buildingCode].name : null,
    state:
      state === BuildingState.burning
        ? "on fire"
        : state === BuildingState.ruin
          ? blaze !== null
            ? blaze.phase
            : "a cold ruin"
          : state === BuildingState.ready
            ? "standing"
            : "-",
    hours:
      b !== null && b.fire !== null
        ? Math.round(((this.at - b.fire) / HOUR) * 10) / 10
        : null,
    windows: blaze !== null ? blaze.windows : 0,
    ablaze: blaze !== null ? blaze.ablaze : 0,
    sparks: blaze !== null ? blaze.sparks : 0,
    falling: this.world.client.fires.falling(),
  };
};
