import Events from "events";
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
import namespace from "namespace";

namespace("Isometrica.Core").Logic = Logic;

/**
 * @param [options] {{tick: number, saves: string, api: string,
 *        catchUp: boolean}} what the game played in the world wants of it:
 *        how much game time a tick of it is worth, ms (VTime.setTickLength),
 *        what its cities are saved under in localStorage (CityStore), where
 *        on its server they are kept as well, if it has one (CitySync), and
 *        whether its city goes on while the game is away (#catchUp)
 */
function Logic(options) {
  options = options || {};

  VTime.setTickLength(options.tick);

  this.world = this;
  this.catchesUp = options.catchUp === true;

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

  //the player's city goes to localStorage through here, and up to the
  //server - nothing starts until whoever knows the url asks it to open a city
  var store = new CityStore(undefined, options.saves);

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
 * Current game time
 * @type {null}
 */
Logic.prototype.now = null;

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

//the timer the world ticks by, null while it is paused
Logic.prototype.ticking = null;

//when the clock was stopped (#pause), real time - for #resume to make up
Logic.prototype.pausedAt = null;

//true while the world makes up for time it was away (#catchUp)
Logic.prototype.catchingUp = false;

/**
 * Stops the world's clock - nothing grows, earns or is paid for - until
 * resume: for while the page is out of sight.
 */
Logic.prototype.pause = function () {
  if (this.ticking === null) return;

  clearInterval(this.ticking);
  this.ticking = null;
  this.pausedAt = Date.now();
};

/**
 * Starts the world's clock again - for a game whose city goes on while it
 * is away, after making up for the time it was stopped (#catchUp).
 */
Logic.prototype.resume = function () {
  var self = this;

  if (this.ticking !== null) return;

  if (this.pausedAt !== null) {
    this.catchUp(Date.now() - this.pausedAt);
    this.pausedAt = null;
  }

  this.ticking = setInterval(function () {
    Events.fire(self, events.tick, self, null);
  }, Config.tickDelay);
};

/**
 * Makes up for real time the world was away - the game closed, the page out
 * of sight - for a game whose city goes on meanwhile: the ticks that would
 * have gone by played out at once, as many as there were seconds of it
 * (Config tickDelay) and a game day's at most, so that the city grows and
 * earns as it would have, up to a day of it.
 *
 * @param ms {number} how long it was away, real time
 * @returns {number} how many ticks were played out
 */
Logic.prototype.catchUp = function (ms) {
  var ticks = Math.min(Math.floor(ms / Config.tickDelay), VTime.ticksPerDay()),
    i;

  if (!this.catchesUp || !(ticks > 0)) return 0;

  this.catchingUp = true;

  try {
    for (i = 0; i < ticks; i++) Events.fire(this, events.tick, this, null);
  } finally {
    this.catchingUp = false;
  }

  return ticks;
};

export default Logic;
