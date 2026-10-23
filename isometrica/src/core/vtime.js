import Events from "events";

//The clock the city runs on: one tick of the world is so much game time -
//each game says how much (VTime.setTickLength): five minutes building the
//city, a day going by in under five minutes of the real thing; a minute
//delivering in it. Nothing keeps a date any more - the game only ever shows
//the time of day - so this counts the ticks and says what time of day it is
//now.
var millisecondsInTick = 300000,
  millisecondsInDay = 86400000;

function VTime(world) {
  this.now = 0;

  this.hour = 0;
  this.minute = 0;
  this.day = 1;

  Events.subscribe(
    world,
    world.events.tick,
    function (sender, args, self) {
      self.tick();
    },
    this,
  );
}

var events =
  (VTime.events =
  VTime.prototype.events =
    {
      advance: 3,
      newDay: 0,
    });

//how much game time one tick of the world is worth
VTime.millisecondsPerTick = millisecondsInTick;

/**
 * Sets how much game time a tick of the world is worth, ms - before the world
 * starts ticking (core/logic).
 */
VTime.setTickLength = function (ms) {
  if (!(ms > 0)) return;

  millisecondsInTick = VTime.millisecondsPerTick = ms;
};

/**
 * @returns {number} how many ticks of the world a game day is
 */
VTime.ticksPerDay = function () {
  return Math.round(millisecondsInDay / millisecondsInTick);
};

VTime.prototype.constructor = VTime;

VTime.prototype.start = function () {
  Events.fire(this, this.events.newDay, this.now);
};

function set(self, now) {
  var inDay = now % millisecondsInDay;

  self.now = now;
  self.hour = Math.floor(inDay / 3600000);
  self.minute = Math.floor((inDay % 3600000) / 60000);
  self.day = Math.floor(now / millisecondsInDay) + 1;
}

VTime.prototype.setTime = function (now) {
  set(this, now);
  Events.fire(this, this.events.newDay, this.now);
};

//is supposed to be runned once in a second
VTime.prototype.tick = function () {
  this.advance();
};

VTime.prototype.advance = function () {
  var day = this.day;

  set(this, this.now + millisecondsInTick);

  Events.fire(this, this.events.advance, this);

  if (this.day !== day) Events.fire(this, this.events.newDay, this.now);
};

VTime.prototype.toString = function () {
  return this.toHM();
};

/**
 * The time of day, as it is shown: "00:00" to "23:59".
 */
VTime.prototype.toHM = function () {
  return (
    (this.hour < 10 ? "0" : "") +
    this.hour +
    ":" +
    (this.minute < 10 ? "0" : "") +
    this.minute
  );
};

VTime.prototype.save = function () {
  return this.now;
};

VTime.prototype.load = function (now) {
  this.setTime(now);
  return true;
};

export default VTime;
