import Events from "events";
import Terrain from "./terrain";
import Buildings from "./buildings";
import VTime from "./vtime";
import EnvService from "./ambient";
import Config from "./config";
import CityLand from "./cityland";
import TileParamsMan from "./world/tileparamsmanager";
import MarketService from "./world/marketsrv";
import MessagingService from "./msgsrv";
import CityService from "./citysrv";
import CityPersistence from "./persistence/citypersistence";
import namespace from "namespace";

namespace("Isometrica.Core").Logic = Logic;

function Logic() {
  this.world = this;

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
  this.landRegistry = this.areaService = new CityLand(this);
  this.cities = new CityService(this);

  //the player's city goes to localStorage through here - nothing starts
  //until whoever knows the url asks it to open a city
  this.persistence = new CityPersistence(this);
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

/**
 * Stops the world's clock - nothing grows, earns or is paid for - until
 * resume: for while the page is out of sight.
 */
Logic.prototype.pause = function () {
  if (this.ticking === null) return;

  clearInterval(this.ticking);
  this.ticking = null;
};

Logic.prototype.resume = function () {
  var self = this;

  if (this.ticking !== null) return;

  this.ticking = setInterval(function () {
    Events.fire(self, events.tick, self, null);
  }, Config.tickDelay);
};

export default Logic;
