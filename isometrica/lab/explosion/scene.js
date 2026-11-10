/**
 * The explosion bench (lab/explosion.html): one building on a patch of flat
 * grass, a road along its front and a few trees about it, and nothing else
 * (lab/bench/world) - blown up the way the game blows one up (client/
 * buildman explode): no fence, no bulldozer, the charges going off at its
 * foot and then all of it torn into pieces and thrown all round in a
 * fireball, the heaps of rubble it leaves lying there till they are
 * cleared away - by the bulldozers, as clearing them does in the game. Or
 * two of it side by side, blown up one after the other: a pile of rubble
 * each, not one pile of the two (client/rubble). And all of it on a
 * hillside, for the rubble to lie on it as it slopes.
 *
 * Or with its neighbours round it (setAround): a town house next to it, a
 * park on its other side, another across the road, and one further off
 * along the street - the blast bringing down the ones near it, the park
 * wrecked, and the one further off knocked about but standing.
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

//its neighbours, when it has them: what each is, and where - next to it
//on its -x side, on its +x side, across the road from it, and further off
//along the street - from the corner of its lot, as far along x as its lot
//is wide where "wide" says so, and back across the road from its front
var NEIGHBOURS = [
  { code: 4112, x: -1, y: 0, what: "next to it" },
  { code: 5012, x: 0, y: 0, wide: 1, what: "the park beside it" },
  { code: 4112, x: 0, y: 0, across: true, what: "across the road" },
  { code: 4112, x: 3, y: 0, wide: 1, what: "further along" },
];

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
  //and another of it beside it, along the road
  this.beside = false;
  //and the ground a hillside, rather than flat
  this.hill = false;
  //and its neighbours round it
  this.around = false;
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
  if (this.beside && !this.around)
    world.put(this.code, lot.x + lot.sizeX, lot.y, this.rotation);
  if (this.around)
    this.neighbours().forEach(function (n) {
      world.put(n.code, n.x, n.y, 0);
    });
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
 * How much higher a grid point of the hillside is than its foot, steps, i,
 * j from the corner of the ground: a step up every six along the diagonal,
 * one of them across the middle - where what stands stands, on as much of
 * a slope as anything can be put up on (core/surface fits).
 */
function hillside(i, j) {
  return Math.max(0, Math.min(3, Math.floor((i + j - 6) / 6)));
}

/**
 * On a hillside, or on the flat - put up again on it.
 *
 * @returns {boolean} whether it was
 */
Scene.prototype.setHill = function (on) {
  if (this.world.busy()) return false;

  this.hill = on;
  this.world.ground(X, Y, W, H, on ? hillside : undefined);

  return this.put();
};

/**
 * Where its neighbours go, as its lot is now: {code, x, y, what} each, x, y
 * the corner of each off the middle of the bench.
 */
Scene.prototype.neighbours = function () {
  var lot = this.lot();

  return NEIGHBOURS.map(function (n) {
    var data = BuildingData[n.code];

    return {
      code: n.code,
      x:
        lot.x + n.x + (n.wide ? lot.sizeX : 0) - (n.x < 0 ? data.sizeX - 1 : 0),
      y: n.across ? lot.y - 1 - data.sizeY : lot.y + n.y,
      what: n.what,
    };
  });
};

/**
 * With its neighbours round it, or not - put up again.
 *
 * @returns {boolean} whether it was
 */
Scene.prototype.setAround = function (on) {
  var was = this.around;

  this.around = on;
  if (!this.put()) this.around = was;

  return this.around === on;
};

/**
 * How its neighbours are: what each is, where it is, and how sound - or
 * down, a heap of rubble or a wrecked park.
 *
 * @returns {{what: string, name: string, health: number|null}[]}
 */
Scene.prototype.neighbourhood = function () {
  var world = this.world,
    core = world.core;

  if (!this.around) return [];

  return this.neighbours().map(function (n) {
    var b = core.buildingService.get(world.tile(n.x, n.y)),
      standing = b !== null && b.data.variantOf !== BuildingCode.rubble;

    return {
      what: n.what,
      name: BuildingData[n.code].name,
      health: standing ? Math.round(b.getHealth(core.time.now)) : null,
    };
  });
};

/**
 * With another of it beside it, or not - put up again.
 *
 * @returns {boolean} whether it was
 */
Scene.prototype.setBeside = function (on) {
  var was = this.beside;

  this.beside = on;
  if (!this.put()) this.beside = was;

  return this.beside === on;
};

//what stands so many lots along from the middle one, or null
function standingAt(self, k) {
  var lot = self.lot(),
    b = self.world.core.buildingService.get(
      self.world.tile(lot.x + k * lot.sizeX, lot.y),
    );

  return b !== null && b.data.variantOf !== BuildingCode.rubble ? b : null;
}

/**
 * What stands on the lot - or null, blown up, its rubble lying there.
 */
Scene.prototype.standing = function () {
  return standingAt(this, 0);
};

/**
 * Whatever still stands - the one in the middle, the one beside it.
 *
 * @returns {Building[]}
 */
Scene.prototype.left = function () {
  return [standingAt(this, 0), this.beside ? standingAt(this, 1) : null].filter(
    Boolean,
  );
};

/**
 * The first of what still stands blown up: the one in the middle, then the
 * one beside it.
 *
 * @returns {number} ErrorCode - 0 once it has gone up, -1 for none left
 */
Scene.prototype.explode = function () {
  var b = this.left()[0];

  return b ? this.world.client.buildman.explode(b.tile) : -1;
};

/**
 * How many piles of rubble lie there - the heaps of each building blown up
 * one pile (core/city explode).
 */
Scene.prototype.piles = function () {
  var core = this.world.core,
    seen = {};

  this.world.rubble("heaps").forEach(function (t) {
    var b = core.buildingService.get(t);

    seen[b && b.look ? b.look.pile : "?"] = true;
  });

  return Object.keys(seen).length;
};

/**
 * The rubble it left cleared away by the bulldozers, as the game clears it.
 *
 * @returns {number} the tiles cleared
 */
Scene.prototype.clearRubble = function () {
  return this.world.clear(this.world.rubble());
};
