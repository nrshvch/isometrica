/**
 * The building bench (lab/buildings.html): one building, whole, put together
 * out of its parts the way the game puts it together (client/buildingview,
 * client/compoundbuilding), on flat grass with nothing else about
 * (lab/bench/world) - looked at from any side, turned any way, a look of
 * its own picked afresh, and brought down whole at the push of a button the
 * way it comes down in the game (client/demolition) - fenced off, every tile
 * of it at once, no bulldozer coming - and put back up.
 */
import BuildingData from "../../src/data/buildings";
import Rotation from "../../src/core/rotation";
import { buildings } from "../bench/world.js";

//the ground about it cleared of whatever went before, tiles a side
var ROUND = 14;

/**
 * @param world {World} the bench's world (lab/bench/world)
 * @param code {number|string} what stands
 */
export function Stand(world, code) {
  this.world = world;
  this.code = +code;
  this.rotation = 0;
  //what it looks like - kept, put up again - or undefined for a look of its
  //own, picked as it is first seen
  this.look = undefined;
  this.building = null;
  //the tiles it was brought down from, while it is down
  this.down = null;

  this.show();
}

//how it stands: its corner and its size, turned as it is, round the middle
function placed(self) {
  var data = BuildingData[self.code],
    sizeX = Rotation.sizeX(data, self.rotation),
    sizeY = Rotation.sizeY(data, self.rotation);

  return {
    x: -Math.floor(sizeX / 2),
    y: -Math.floor(sizeY / 2),
    sizeX: sizeX,
    sizeY: sizeY,
  };
}

/**
 * Puts it up as it is to stand now, in the middle of the world, over
 * whatever stood there - and the camera on it.
 *
 * @returns {boolean} whether it went up
 */
Stand.prototype.show = function () {
  var world = this.world,
    at = placed(this);

  this.down = null;
  world.wipe(-ROUND / 2, -ROUND / 2, ROUND, ROUND);
  this.building = world.put(this.code, at.x, at.y, this.rotation, this.look);

  //the look it was given as it was first drawn, kept from here on
  if (this.building !== null) this.look = this.building.look;

  world.look(at.x + (at.sizeX - 1) / 2, at.y + (at.sizeY - 1) / 2);

  return this.building !== null;
};

/**
 * Another kind of building, a look of its own.
 */
Stand.prototype.pick = function (code) {
  this.code = +code;
  this.look = undefined;
  this.rotation = 0;

  return this.show();
};

/**
 * Another look for the same kind - for one put together out of parts; one
 * drawn whole has the one.
 *
 * @returns {boolean} whether it has looks to pick from
 */
Stand.prototype.another = function () {
  this.look = undefined;
  this.show();

  return BuildingData[this.code].compound !== undefined;
};

/**
 * Any building at all, a look of its own.
 *
 * @returns {number} its code
 */
Stand.prototype.any = function () {
  var all = buildings();

  this.pick(all[Math.floor(Math.random() * all.length)].value);

  return this.code;
};

/**
 * Turned round a quarter turn on its ground, by either way - as it can be
 * put down turned.
 */
Stand.prototype.rotate = function (by) {
  this.rotation = (((this.rotation + by) % 4) + 4) % 4;

  return this.show();
};

/**
 * Brought down, there and then - every tile of it at once.
 *
 * @returns {boolean} whether there was anything to bring down
 */
Stand.prototype.demolish = function () {
  if (this.building === null || this.down !== null) return false;

  this.down = this.world.bringDown(this.building.tile);
  this.building = null;

  return this.down.length > 0;
};

/**
 * Put back up as it stood, its rubble and its fence gone.
 */
Stand.prototype.restore = function () {
  if (this.down !== null) this.world.rebuild(this.down);

  return this.show();
};
