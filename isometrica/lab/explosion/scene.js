/**
 * The explosion bench (lab/explosion.html): one building on a patch of flat
 * grass, a road along its front and a few trees about it, and nothing else
 * (lab/bench/world) - blown up the way the game blows one up (client/
 * buildman explode): no fence, no bulldozer, the charges going off at its
 * foot and then all of it torn into pieces and thrown all round in a
 * fireball, the heaps of rubble it leaves lying there till they are
 * cleared away - by the bulldozers, as clearing them does in the game.
 */
import BuildingData from "../../src/data/buildings";
import BuildingCode from "../../src/data/buildingcode";
import Rotation from "../../src/core/rotation";

//the ground the scene stands on, tiles from the middle of the bench: its
//corner with the least x and y, and how far it goes - room round the
//biggest lot there is for its pieces to land on
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
 * Put up again, standing finished, over whatever was left - its rubble
 * too, and the trees and the road round it - once nothing is going on.
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
 * What stands on the lot - or null, blown up, its rubble lying there.
 */
Scene.prototype.standing = function () {
  var lot = this.lot(),
    b = this.world.core.buildingService.get(this.world.tile(lot.x, lot.y));

  return b !== null && b.data.variantOf !== BuildingCode.rubble ? b : null;
};

/**
 * Blown up.
 *
 * @returns {number} ErrorCode - 0 once it has gone up
 */
Scene.prototype.explode = function () {
  var lot = this.lot();

  return this.world.explode(lot.x, lot.y);
};

/**
 * The rubble it left cleared away by the bulldozers, as the game clears it.
 *
 * @returns {number} the tiles cleared
 */
Scene.prototype.clearRubble = function () {
  return this.world.clear(this.world.rubble());
};
