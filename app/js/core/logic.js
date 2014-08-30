define(function (require) {
    var Events = require("events"),
        Terrain = require("./terrain"),
        Buildings = require("./buildings"),
        City = require("./city"),
        VTime = require("./vtime"),
        EnvService = require("./ambient"),
        Config = require("./config"),
        InfluenceMap = require("./influencemap");
    var TileParamsMan = require("./world/tileparamsmanager");
    var MarketService = require("./world/marketsrv");
    var MessagingService = require("./msgsrv");
    var namespace = require("namespace");

    namespace("Isometrica.Core").Logic = Logic;

    function Logic() {
        this.world = this;

        this.messagingService = new MessagingService(this);
        this.time = new VTime(this);
        this.terrain = new Terrain(this);
        this.buildingService = this.buildings = new Buildings(this);
        this.envService = new EnvService(this);
        this.tileParams = new TileParamsMan(this);
        this.marketService = new MarketService(this);

        this.influenceMap = new InfluenceMap(this);

        var self = this;
        setInterval(function () {
            Events.fire(self, events.tick, self, null);
        }, Config.tickDelay);
    }

    var events = Logic.events = Logic.prototype.events = {
        cityEstablished: 0,
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
        this.time.start();
        this.buildingService.init();
        this.envService.init();
        this.marketService.init();
    };


    Logic.prototype.establishCity = function (x, y, name) {
        if (!this.city) {
            this.city = new City(this);
            this.city.world = this;
            this.city.name = name;
            this.city.x = x;
            this.city.y = y;

            Events.fire(this, events.cityEstablished, this.city);
            return this.city;
        }
        return false;
    };

    Logic.prototype.getCity = function(id){
        return this.city;
    };

    return Logic;
});
