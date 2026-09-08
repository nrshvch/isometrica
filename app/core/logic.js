import Events from "events";
import Terrain from "./terrain";
import Buildings from "./buildings";
import VTime from "./vtime";
import EnvService from "./ambient";
import Config from "./config";
import InfluenceMap from "./influencemap";
import TileParamsMan from "./world/tileparamsmanager";
import MarketService from "./world/marketsrv";
import MessagingService from "./msgsrv";
import CityService from "./citysrv";
import namespace from "namespace";

namespace("Isometrica.Core").Logic = Logic;

function Logic() {
    this.world = this;

    this.messagingService = new MessagingService(this);
    this.time = new VTime(this);
    this.terrain = new Terrain(this);
    this.buildingService = this.constructionService = this.buildings = new Buildings(this);
    this.envService = new EnvService(this);
    this.tileParams = new TileParamsMan(this);
    this.marketService = new MarketService(this);
    this.cities = new CityService(this);

    this.influenceMap = this.areaService = new InfluenceMap(this);
}

var events = Logic.events = Logic.prototype.events = {
    tick: 1
};

/**
 * Current game time
 * @type {null}
 */
Logic.prototype.now = null;

Logic.prototype.terrain = null;
Logic.prototype.buildings = null;

Logic.prototype.start = function () {
    var self = this;
    setInterval(function () {
        Events.fire(self, events.tick, self, null);
    }, Config.tickDelay);

    this.time.start();
    this.buildingService.init();
    this.envService.init();
    this.marketService.init();
    this.cities.init();
};

export default Logic;
