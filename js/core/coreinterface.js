//TODO: Realizovatj vsjo toljko na eventah bilo owibkoj. Nado operaciji s kolbekami, na takije slu4aji kogda naprimer nado getCityData.
//TODO message bus. ResponseCode.message event for message. But for e.g. researchComplete use default event.
define(function (require) {
    var EventManager = require("lib/eventmanager"),
        Events = require("lib/events"),
        ResponseCode = require("lib/responsecode"),
        World = require("./world"),
        savegame = require("text!testsavegame");

    var Core = namespace("Vkaria.Core");

    function CoreInterface() {
        this.world = new World();

        var buildings = this.world.buildings;

        Events.subscribe(this.world.time, this.world.time.events.newDay, onTimeAdvance, this);
        Events.subscribe(buildings, buildings.events.buildingBuilt, onBuildingBuilt, this);
        Events.subscribe(buildings, buildings.events.buildingUpdated, onBuildingUpdated, this);
        Events.subscribe(buildings, buildings.events.buildingRemoved, onBuildingRemoved, this);
        Events.subscribe(this.world, this.world.events.cityEstablished, function (world, city, self) {
            Events.subscribe(city, city.events.update, onCityUpdate, self);
            Events.subscribe(city.lab, city.lab.events.researchComplete, onResearchComplete, self);
            Events.subscribe(city.lab, city.lab.events.researchStart, onResearchStart, self);
            Events.subscribe(city.lab, city.lab.events.buildingInvented, onBuildingInvented, self);

            Events.fire(self, ResponseCode.cityEstablished, self, city.toJSON());
        }, this);
    }

    CoreInterface.ResponseCode = ResponseCode;

    CoreInterface.prototype = Object.create(EventManager.prototype);

    //region Event handlers
    function onTimeAdvance(sender, args, self) {
        Events.fireAsync(self, ResponseCode.timeAdvanced, self, {
            day: sender.day,
            month: sender.month,
            monthName: sender.monthName,
            year: sender.year
        });
    }

    function onBuildingBuilt(sender, building, self) {
        Events.fireAsync(self, ResponseCode.buildingBuilt, self, building);
    }

    function onBuildingUpdated(sender, building, self) {
        Events.fireAsync(self, ResponseCode.buildingUpdated, self, building);
    }

    function onBuildingRemoved(sender, building, self) {
        Events.fireAsync(self, ResponseCode.buildingRemoved, self, building);
    }

    function onCityUpdate(sender, args, self) {
        var city = sender;
        Events.fireAsync(self, ResponseCode.cityUpdate, self, city.toJSON());
    }

    function onResearchStart(sender, args, self) {
        Events.fireAsync(self, ResponseCode.researchStart, self, args);
    }

    function onResearchComplete(sender, args, self) {
        Events.fireAsync(self, ResponseCode.researchStart, self, args);
        Events.fireAsync(self, ResponseCode.message, self, {
            text: "test test test"
        });
    }

    function onBuildingInvented(sender, args, self) {
        Events.fireAsync(self, ResponseCode.buildingInvented, self, args);
    }

    //endregion

    CoreInterface.prototype.start = function () {

        this.world.start();

        var save = localStorage.saveGame;

        // if(save)
        //  this.world.load(JSON.parse(save));

        //save each 30secs
        var world = this.world;
        var self = this;
        setInterval(function () {
            localStorage.saveGame = JSON.stringify(world.save());
        }, 30000);
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
