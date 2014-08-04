define(function (require) {
    var namespace = require("namespace");
    var EventManager = require("events"),
        Events = require("events"),
        ResponseCode = require("core/responsecode"),
        World = require("./world"),
        savegame = require("text!testsavegame");

    var Core = namespace("Isometrica.Core");

    function CoreInterface() {
        this.world = new World();

        var buildings = this.world.buildings;

        Events.subscribe(this.world.time, this.world.time.events.advance, onTimeAdvance, this);
        Events.subscribe(buildings, buildings.events.buildingBuilt, onBuildingBuilt, this);
        Events.subscribe(buildings, buildings.events.buildingUpdated, onBuildingUpdated, this);
        Events.subscribe(buildings, buildings.events.buildingRemoved, onBuildingRemoved, this);
        Events.subscribe(this.world, this.world.events.cityEstablished, function (sender, city, self) {
            Events.subscribe(city, city.events.update, onCityUpdate, self);
            Events.subscribe(city.lab, city.lab.events.researchComplete, onResearchComplete, self);
            Events.subscribe(city.lab, city.lab.events.researchStart, onResearchStart, self);
            Events.subscribe(city.lab, city.lab.events.buildingInvented, onBuildingInvented, self);

            Events.fire(self, ResponseCode.cityEstablished, city.toJSON());
        }, this);
    }

    CoreInterface.ResponseCode = ResponseCode;

    CoreInterface.prototype = Object.create(EventManager.prototype);

    //region Event handlers
    function onTimeAdvance(sender, vtime, self) {
        Events.fire(self, ResponseCode.timeAdvanced, {
            day: vtime.day,
            month: vtime.month,
            monthName: vtime.monthName,
            year: vtime.year
        });
    }

    function onBuildingBuilt(sender, building, self) {
        Events.fire(self, ResponseCode.buildingBuilt, building);
    }

    function onBuildingUpdated(sender, building, self) {
        Events.fire(self, ResponseCode.buildingUpdated, building);
    }

    function onBuildingRemoved(sender, building, self) {
        Events.fire(self, ResponseCode.buildingRemoved, building);
    }

    function onCityUpdate(sender, args, self) {
        var city = args;
        Events.fire(self, ResponseCode.cityUpdate, city.toJSON());
    }

    function onResearchStart(sender, args, self) {
        Events.fire(self, ResponseCode.researchStart, args);
    }

    function onResearchComplete(sender, args, self) {
        Events.fire(self, ResponseCode.researchStart, args);
        Events.fire(self, ResponseCode.message, {
            text: "test test test"
        });
    }

    function onBuildingInvented(sender, args, self) {
        Events.fire(self, ResponseCode.buildingInvented, args);
    }

    //endregion

    CoreInterface.prototype.start = function () {

        this.world.start();

        //var save = localStorage.saveGame;

        // if(save)
        //  this.world.load(JSON.parse(save));

        //save each 30secs
        var world = this.world;
        var self = this;
        /*
        setInterval(function () {
            localStorage.saveGame = JSON.stringify(world.save());
        }, 30000);
        */
    };

    CoreInterface.prototype.clearTile = function (x, y, callback) {
        throw "OBSOLETE";
        callback(this.world.city.clearTile(x, y));
    };

    CoreInterface.prototype.research = function (directionCode, callback) {
        throw "OBSOLETE";
        callback(this.world.city.lab.research(directionCode));
    };

    CoreInterface.prototype.getResearchData = function (callback) {
        throw "OBSOLETE";
        callback(this.world.city.lab.getResearchData());
    };

    Core.CoreInterface = CoreInterface;

    return Core.CoreInterface;
});
