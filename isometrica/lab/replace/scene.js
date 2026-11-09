/**
 * The replacement bench (lab/replace.html): one building on a patch of flat
 * grass, a road along its front, and nothing else (lab/bench/world) - put
 * up in the place of itself, or of anything else that covers its ground, the
 * way the game does it (client/buildman replace): fenced off, the
 * bulldozers coming, coming down a tile at a time as they get to it, and a
 * building site on its ground as soon as they are done - going up by the
 * bench's clock - into another look of the same, or whatever was asked for.
 */
import BuildingData from "../../src/data/buildings";
import BuildingClassCode from "../../src/data/classcode";
import Replacement from "../../src/core/replacement";
import Rotation from "../../src/core/rotation";

//the ground the scene stands on, tiles from the middle of the bench: its
//corner with the least x and y, and how far it goes - room round the
//biggest lot there is for the bulldozers to come out of their dust on
var X = -5,
  Y = -5,
  W = 11,
  H = 11;

//what stands to begin with: a town house
var FIRST = 4112;

/**
 * Every building the catalogue offers, by its size and then its name:
 * {value, label} each.
 */
export function kinds() {
  return Object.keys(BuildingData)
    .filter(function (code) {
      var b = BuildingData[code];

      return (
        !b.hidden &&
        b.classCode !== BuildingClassCode.road &&
        b.classCode !== BuildingClassCode.tree
      );
    })
    .sort(function (a, b) {
      var x = BuildingData[a],
        y = BuildingData[b];

      return (
        x.sizeX * x.sizeY - y.sizeX * y.sizeY || x.name.localeCompare(y.name)
      );
    })
    .map(function (code) {
      var b = BuildingData[code];

      return {
        value: code,
        label: b.name + " (" + b.sizeX + "×" + b.sizeY + ")",
      };
    });
}

/**
 * @param world {World} the bench's world (lab/bench/world)
 */
export function Scene(world) {
  this.world = world;
  this.code = FIRST;
  this.rotation = 0;
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
 * Put up again, standing finished, over whatever was left - the road along
 * the front of it, the way it faces - once the bulldozers are done.
 *
 * @returns {boolean} whether it was
 */
Scene.prototype.put = function () {
  var world = this.world,
    lot = this.lot(),
    turns = Rotation.turns(this.rotation);

  if (!world.wipe(X, Y, W, H)) return false;

  //faces -y unturned, -x turned once, +y twice, +x three times
  if (turns === 0) world.road(X, lot.y - 1, W, false, "asphalt");
  else if (turns === 2) world.road(X, lot.y + lot.sizeY, W, false, "asphalt");
  else if (turns === 1) world.road(lot.x - 1, Y, H, true, "asphalt");
  else world.road(lot.x + lot.sizeX, Y, H, true, "asphalt");

  world.put(this.code, lot.x, lot.y, this.rotation);

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
 * What stands on the lot: the game's own building - finished, or going up -
 * or null while nothing does.
 */
Scene.prototype.standing = function () {
  var lot = this.lot();

  return this.world.core.buildingService.get(this.world.tile(lot.x, lot.y));
};

/**
 * Whatever covers the lot, turned some way, as the game offers it to put up
 * in the place of what stands there (core/replacement fits).
 */
Scene.prototype.candidates = function () {
  var lot = this.lot();

  return kinds().filter(function (k) {
    return Replacement.fits(k.value, lot.sizeX, lot.sizeY);
  });
};

/**
 * Put up in the place of what stands: code - or another look of the same
 * kind, for none.
 *
 * @returns {number} ErrorCode - 0 once it is under way
 */
Scene.prototype.replace = function (code) {
  var lot = this.lot(),
    there = this.standing(),
    with_ = code || (there ? Replacement.kindOf(there.buildingCode) : null);

  if (with_ === null) return -1;

  var error = this.world.replace(lot.x, lot.y, with_);

  //and what stands from now on is what goes up there, turned the way it
  //does (core/replacement turnFor)
  if (error === 0) {
    var waiting = this.world.city.buildings.replacing(),
      next = waiting[waiting.length - 1] || this.standing();

    if (next) {
      this.code = Replacement.kindOf(next.code || next.buildingCode);
      this.rotation = next.rotation;
    }
  }

  return error;
};
