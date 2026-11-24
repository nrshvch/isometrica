import Events from "events";
import { toss } from "shared/random";
import Terrain from "./terrain";
import Buildings from "./buildings";
import VTime from "./vtime";
import EnvService from "./ambient";
import Config from "./config";
import TileParamsMan from "./world/tileparamsmanager";
import MarketService from "./world/marketsrv";
import MessagingService from "./msgsrv";
import CityService from "./citysrv";
import CityPersistence from "./persistence/citypersistence";
import CityStore from "./persistence/citystore";
import CitySync from "./persistence/citysync";
import Works from "./works";
import Commands from "./commands";
import namespace from "namespace";

namespace("Isometrica.Core").Logic = Logic;

/**
 * @param [options] {{tick: number, saves: string, api: string,
 *        catchUp: boolean, seed: number, storage: Storage,
 *        now: function(): number}} what the game played in the world wants
 *        of it: how much game time a tick of it is worth, ms
 *        (VTime.setTickLength), what its cities are saved under (CityStore;
 *        in storage, localStorage unless said), where on its server they are
 *        kept as well, if it has one (CitySync), and whether its city goes on
 *        while the game is away (#catchUp); the seed its chance comes from
 *        till a save brings its own (#chance), and the real clock, for how
 *        long it was away (Date.now unless said)
 */
function Logic(options) {
  options = options || {};

  VTime.setTickLength(options.tick);

  this.world = this;
  this.catchesUp = options.catchUp === true;
  if (typeof options.now === "function") this.realNow = options.now;

  //the world's clock, ms: moved on by #advance only, and what goes by it
  //(building, clearing, the bulldozers) goes by nothing else
  this.clock = 0;
  //till the next tick of the world, ms of the clock
  this.untilTick = Config.tickDelay;
  //what the world's chance is worked out from (#chance), saved with it
  this.seed = options.seed >>> 0;
  //the last name given (#name): saved with the world, never given twice
  this.named = 0;

  this.messagingService = new MessagingService(this);
  this.time = new VTime(this);
  this.terrain = new Terrain(this);
  this.buildingService =
    this.constructionService =
    this.buildings =
      new Buildings(this);
  this.envService = new EnvService(this);
  this.tileParams = new TileParamsMan(this);
  this.marketService = new MarketService(this);
  this.cities = new CityService(this);
  //the bulldozers out, clearing and bringing down (core/works)
  this.works = new Works(this);

  //the player's city goes to localStorage through here, and up to the
  //server - nothing starts until whoever knows the url asks it to open a city
  var store = new CityStore(options.storage, options.saves);

  this.persistence = new CityPersistence(
    this,
    store,
    options.api ? new CitySync(options.api, store) : null,
    options.initialCity,
  );
}

var events =
  (Logic.events =
  Logic.prototype.events =
    {
      tick: 1,
    });

/**
 * The real clock, ms: only for how long the world was away (#pause, saves),
 * never for what goes on in it.
 *
 * @returns {number}
 */
Logic.prototype.realNow = function () {
  return Date.now();
};

/**
 * A name for something of the world - a building, a bulldozer - that lasts:
 * counted on from the last one given, which is saved with the world, so
 * never the same as one given before, on this page or another (#keepName).
 *
 * @returns {number}
 */
Logic.prototype.name = function () {
  return ++this.named;
};

/**
 * Keeps a name given before (a save opened again): none given after it is
 * the same.
 *
 * @param name {number}
 * @returns {number} name
 */
Logic.prototype.keepName = function (name) {
  if (name > this.named) this.named = name;
  return name;
};

/**
 * Something on a tile changed - the ground, what stands there, who lives
 * there: its region is saved again at the next save, and only the regions
 * so marked are (core/persistence/regions).
 *
 * @param tile {number}
 */
Logic.prototype.touch = function (tile) {
  if (this.persistence) this.persistence.regions.mark(tile);
};

/**
 * A chance, 0..1, from the world's seed, where (a tile, a region), what (a
 * record's name) and when (a step, a time): the same whatever order things
 * are worked out in, and on another machine (shared/random toss).
 *
 * @param where {number}
 * @param what {number}
 * @param when {number}
 * @param [salt] {number} tells apart chances of the same moment
 * @returns {number}
 */
Logic.prototype.chance = function (where, what, when, salt) {
  return toss(
    this.seed,
    where >>> 0,
    what >>> 0,
    Math.max(0, Math.floor(when)),
    salt,
  );
};

Logic.prototype.terrain = null;
Logic.prototype.buildings = null;

Logic.prototype.start = function () {
  this.resume();

  this.time.start();
  this.buildingService.init();
  this.envService.init();
  this.marketService.init();
  this.cities.init();
};

/**
 * Moves the world's clock on by ms: what is going up and what is being
 * cleared goes by it, the bulldozers are moved on, and a tick of the world
 * (VTime, the cities) goes by every Config.tickDelay of it - none while the
 * world is paused. The one way the world's time goes on: a client calls it
 * a frame at a time (#driveBy), the world's own timer a tick at a time
 * when nobody does, a tool in node as fast as it likes.
 * See isometrica/.claude/skills/buildings/core.md (One clock).
 *
 * @param ms {number}
 */
Logic.prototype.advance = function (ms) {
  if (!(ms > 0)) return;

  move(this, ms, true);

  if (this.paused) return;

  this.untilTick -= ms;
  while (this.untilTick <= 0) {
    this.untilTick += Config.tickDelay;
    this.tick();
  }
};

//the clock on by ms, and what is due by then done; the bulldozers moved on
//too, unless they are brought up to date some other way (Works#load)
function move(self, ms, works) {
  self.clock += ms;
  if (works) self.works.tick(ms);
  self.buildings.due(self.clock);
}

/**
 * One tick of the world: the game's time on (VTime), the cities grown,
 * earning and paying - and how long it took told (#timed).
 */
Logic.prototype.tick = function () {
  var started = this.timed !== null ? performance.now() : 0;

  Events.fire(this, events.tick, this, null);

  if (this.timed !== null)
    this.timed(performance.now() - started, this.catchingUp);
};

/**
 * Has whoever calls #advance a frame at a time drive the world: its own
 * timer is not started, or is stopped (client/vkaria).
 */
Logic.prototype.driveBy = function () {
  this.driven = true;
  if (this.ticking !== null) clearInterval(this.ticking);
  this.ticking = null;
};

//the world's own timer, null while it is paused or driven from outside
Logic.prototype.ticking = null;

//whether whoever draws it moves the world's clock on (#driveBy)
Logic.prototype.driven = false;

//whether no ticks go by (#pause), the clock going on all the same
Logic.prototype.paused = false;

//when the world was paused (#pause), real time - for #resume to make up
Logic.prototype.pausedAt = null;

//true while the world makes up for time it was away (#catchUp)
Logic.prototype.catchingUp = false;

/**
 * Stops the world's ticks - nothing grows, earns or is paid for - until
 * resume: for while the page is out of sight. What is going up and the
 * bulldozers go on with the clock if it is moved on (a bench's own).
 */
Logic.prototype.pause = function () {
  if (this.paused) return;

  this.paused = true;
  if (this.ticking !== null) clearInterval(this.ticking);
  this.ticking = null;
  this.pausedAt = this.realNow();
};

/**
 * Starts the world's ticks again - after making up for the time it was
 * stopped (#away): everything going up and being cleared brought on by it,
 * and the ticks played out for a game whose city goes on while it is away
 * (#catchUp).
 *
 * @param [away] {number} how long it was stopped, ms - the real clock's
 *        since #pause unless said (a copy told it: core/mirror)
 */
Logic.prototype.resume = function (away) {
  var self = this;

  if (this.paused && (this.pausedAt !== null || away !== undefined)) {
    if (away === undefined) away = this.realNow() - this.pausedAt;
    this.away(Math.max(0, away));
  }
  this.paused = false;
  this.pausedAt = null;

  if (this.driven || this.ticking !== null) return;

  this.ticking = setInterval(function () {
    self.advance(Config.tickDelay);
  }, Config.tickDelay);
};

/**
 * Makes up for ms the world was not moved on, at once: the ticks of it
 * played out (#catchUp, as far as it goes), the clock moved on the rest
 * with no ticks - what was going up goes on as it would have - and the
 * bulldozers brought on (Works#catchUp). For a page back in sight
 * (#resume), and a stretch too long for steps (core/server).
 *
 * @param away {number} ms
 */
Logic.prototype.away = function (away) {
  var played = this.catchUp(away);

  move(this, Math.max(0, away - played * Config.tickDelay), false);
  this.works.catchUp(away);
  this.terrain.restartClearing();
};

/**
 * Whether this world is a copy that follows another's frames (core/mirror):
 * nothing but they move it on, and whoever draws it does not write to it.
 *
 * @type {boolean}
 */
Logic.prototype.follows = false;

/**
 * Told how long every tick took, ms - and whether it was the ticks made up
 * for at once (#catchUp) - for a debug panel to show; or null.
 *
 * @type {function(number, boolean)|null}
 */
Logic.prototype.timed = null;

/**
 * Makes up for real time the world was away - the game closed, the page out
 * of sight - for a game whose city goes on meanwhile: the ticks that would
 * have gone by played out at once, as many as there were seconds of it
 * (Config tickDelay) and a game day's at most, so that the city grows and
 * earns as it would have, up to a day of it. The clock goes on a tick at a
 * time with them, so that what is finished going up on the way earns from
 * then on; the bulldozers are brought up to date by their own (Works#load,
 * #resume).
 *
 * @param ms {number} how long it was away, real time
 * @returns {number} how many ticks were played out
 */
Logic.prototype.catchUp = function (ms) {
  var ticks = Math.min(Math.floor(ms / Config.tickDelay), VTime.ticksPerDay()),
    i;

  if (!this.catchesUp || !(ticks > 0)) return 0;

  this.catchingUp = true;

  var started = this.timed !== null ? performance.now() : 0,
    timed = this.timed;

  this.timed = null;
  try {
    for (i = 0; i < ticks; i++) {
      move(this, Config.tickDelay, false);
      this.tick();
    }
  } finally {
    this.catchingUp = false;
    this.timed = timed;
  }

  //tiles the bulldozers are still on are being cleared still
  this.terrain.restartClearing();

  if (this.timed !== null) this.timed(performance.now() - started, true);

  return ticks;
};

/**
 * Does what the player does to the world, given as a plain object - build,
 * clear, replace, blast, set on fire, shape the ground, found a city
 * (core/commands): the one way in, for it to be sent from anywhere later.
 *
 * @param command {{type: string}}
 * @returns {*} what it came to, by its type
 */
Logic.prototype.command = function (command) {
  return Commands.run(this, command);
};

export default Logic;
