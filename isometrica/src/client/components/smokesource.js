import engine from "engine";
import SmokeScript from "./smokeScript";

var pool = [];

var killSmoke = function () {
  this.world.removeGameObject(this);
  pool.push(this);
};

var getSmoke = function () {
  if (pool.length > 0) return pool.pop();
  else {
    var smoke = new engine.GameObject(),
      script = new SmokeScript();
    smoke.addComponent(script);
    smoke.smoke = script;
    smoke.destroy = killSmoke;
    return smoke;
  }
};

/**
 * A chimney. A fire is going in the house under it, or it is not: lit in
 * most houses of a morning and an evening, in a few round the middle of the
 * day and in the small hours - each house making up its mind again every
 * few minutes, in its own time. While it is lit, a puff comes out a little
 * under every second, never quite in step with the last - one thin wisp.
 *
 * @param building {Building} optional - the house the chimney is on. A house
 *                            nobody has moved into, for want of a street or of
 *                            water, has no fire going; with no building given
 *                            it smokes regardless.
 */
function SmokeSourceScript(building) {
  engine.Component.call(this);
  this.building = building || null;
}

var vec3Buffer = new Float32Array(3);

//how often a puff comes out of a chimney with a fire going, ms, give or take
//as much as JITTER of that
var PUFF_EVERY = 800,
  JITTER = 0.25;

//how often a house makes up its mind about its fire, ms, give or take half
//that again
var RETHINK = 180000;

//how many houses have a fire going, by the hour
function lit(hour) {
  if (hour >= 6 && hour < 9) return 0.7;
  if (hour >= 17 && hour < 23) return 0.6;
  if (hour >= 9 && hour < 17) return 0.22;
  return 0.18;
}

SmokeSourceScript.prototype = Object.create(engine.Component.prototype);

SmokeSourceScript.prototype.start = function () {
  this.next = this.gameObject.world.logic.time.now + Math.random() * PUFF_EVERY;
  //whether its fire is going, decided as it is first seen
  this.rethinkAt = 0;
  this.burning = false;
};

SmokeSourceScript.prototype.tick = function (time) {
  var now = time.now;

  if (now >= this.rethinkAt) {
    this.burning = Math.random() < lit(hourNow());
    this.rethinkAt = now + RETHINK * (0.5 + Math.random());
  }

  if (now < this.next) return;

  this.next = now + PUFF_EVERY * (1 + (Math.random() * 2 - 1) * JITTER);
  if (this.burning && isLit(this.building)) this.spawnSmoke();
};

//the hour of the game's day
function hourNow() {
  var core = typeof vkaria !== "undefined" ? vkaria.core : null;

  return core && core.time ? core.time.hour : 12;
}

function isLit(building) {
  if (building === null) return true;

  var city = building.getCity();

  return city !== null && city.missing(building) === null;
}

SmokeSourceScript.prototype.spawnSmoke = function () {
  this.gameObject.transform.getPosition(vec3Buffer);
  SmokeSourceScript.puff(
    this.gameObject.world,
    vec3Buffer[0],
    vec3Buffer[1],
    vec3Buffer[2],
  );
};

/**
 * Lets out one puff of smoke at that point in the world, to rise and fade
 * there - for whatever smokes on its own schedule rather than with a
 * SmokeSource on it, like a car.
 *
 * @param [kind] {Object} SmokeScript.steam, the default, or SmokeScript.soot
 */
SmokeSourceScript.puff = function (world, x, y, z, kind) {
  var smoke = getSmoke();
  smoke.smoke.kind = kind || SmokeScript.steam;
  smoke.transform.setPosition(x, y, z);
  world.addGameObject(smoke);
};

export default SmokeSourceScript;
