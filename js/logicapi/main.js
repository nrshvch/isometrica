//TODO: Realizovatj vsjo toljko na eventah bilo owibkoj. Nado operaciji s kolbekami, na takije slu4aji kogda naprimer nado getCityData.
//TODO message bus. ResponseCode.message event for message. But for e.g. researchComplete use default event.
define(function (require) {
    var EventManager = require("lib/eventmanager"),
        Logic = require("logic"),
        mapper = require("./mapper"),
        serializer = require("./mapper"),
        ResponseCode = require("lib/responsecode"),
        savegame = require("text!testsavegame");

    function Api() {
        EventManager.call(this);
        this.logic = new Logic();

        var self = this,
            tiles = this.logic.world.tiles,
            buildings = this.logic.world.buildings;


        this.onTimeAdvance = function (sender, args) {
            self.dispatchEvent(ResponseCode.timeAdvanced, self, {
                day: sender.day,
                month: sender.month,
                monthName: sender.monthName,
                year: sender.year
            });
        };


        this.onTileUpdate = function (tile) {
            self.dispatchEvent(ResponseCode.tileUpdated, serializer.tile(tile));
        };

        this.onBuildingBuilt = function (building) {
            self.dispatchEvent(ResponseCode.buildingBuilt, self, serializer.building(building));
        };

        this.onBuildingUpdated = function (building) {
            self.dispatchEvent(ResponseCode.buildingUpdated,self, serializer.building(building));
        };

        this.onBuildingRemoved = function (building) {
            self.dispatchEvent(ResponseCode.buildingRemoved, self, serializer.building(building));
        };

        this.onCityUpdate = function (city) {
            self.dispatchEvent(ResponseCode.cityUpdate, self, serializer.city(city));
        };

        this.onResearchStart = function (sender, args) {
            self.dispatchEvent(ResponseCode.researchStart, sender, args);
        };

        this.onResearchComplete = function (sender, args) {
            self.dispatchEvent(ResponseCode.researchComplete, sender, args);

            self.dispatchEvent(ResponseCode.message, sender, {
                text: "test test test"
            });
        };

        this.onBuildingInvented = function (sender, args) {
            self.dispatchEvent(ResponseCode.buildingInvented, this, args);
        };

        this.onCityEstablished = function (world, city) {
            var city = self.logic.world.city;

            city.addEventListener(city.events.update, self.onCityUpdate);

            city.lab.addEventListener(city.lab.events.researchComplete, self.onResearchComplete);

            city.lab.addEventListener(city.lab.events.researchStart, self.onResearchStart);

            city.lab.addEventListener(city.lab.events.buildingInvented, self.onBuildingInvented);

            self.dispatchEvent(ResponseCode.cityEstablished, self, serializer.city(city));
        };





        this.logic.world.time.eventManager.addEventListener(this.logic.world.time.events.newDay, this.onTimeAdvance);
        tiles.addEventListener(tiles.events.update, this.onTileUpdate);
        buildings.addEventListener(buildings.events.buildingBuilt, this.onBuildingBuilt);
        buildings.addEventListener(buildings.events.buildingUpdated, this.onBuildingUpdated);
        buildings.addEventListener(buildings.events.buildingRemoved, this.onBuildingRemoved);
        this.logic.world.eventManager.addEventListener(this.logic.world.events.cityEstablished, this.onCityEstablished);
    }

    Api.ResponseCode = ResponseCode;

    Api.prototype = Object.create(EventManager.prototype);

    Api.prototype.start = function () {
        this.logic.world.start();

        var save = localStorage.saveGame;

        // if(save)
        //  this.logic.world.load(JSON.parse(save));

        //save each 30secs
        var world = this.logic.world;
        var self = this;
        setInterval(function () {
            self.logic.tick(Date.now());
        }, 250);
        setInterval(function () {
            localStorage.saveGame = JSON.stringify(world.save());
        }, 30000);
    }

    Api.prototype.getTileData = function (x, y, w, h, callback) {
        w = w || 1;
        h = h || 1;

        if (x !== undefined && y !== undefined)
            callback({
                meta: {
                    type: "range",
                    x: x,
                    y: y,
                    w: w,
                    h: h
                },
                data: serializer.tiles(this.logic.world.tiles.getRange(x, y, w, h))
            });
    };

    Api.prototype.clearTile = function (x, y, callback) {
        callback(this.logic.world.city.clearTile(x, y));
    };





    //Buildings
    Api.prototype.getBuildingData = function (x, y, w, h, callback) {
        w = w || 1;
        h = h || 1;

        if (x !== undefined && y !== undefined)
            callback({
                meta: {
                    type: "range",
                    x: x,
                    y: y,
                    w: w,
                    h: h
                },
                data: serializer.buildings(this.logic.world.buildings.getRange(x, y, w, h))
            });
    };

    Api.prototype.build = function (buildingCode, x, y, rotate, callback) {
        var tile = this.logic.world.tiles.get(x, y),
            success, error = "";

        try {
            this.logic.world.city.build(buildingCode, tile, rotate);
            success = true;
        } catch (e) {
            error = e;
            success = false;
        }

        callback({
            success: success,
            error: error
        });
    };





    //City
    Api.prototype.getCityData = function (callback) {
        var city = this.logic.world.city;

        if (city)
            callback(serializer.city(city));
        else
            callback(null);
    };

    Api.prototype.establishCity = function (x, y, name, callback) {
        var tile = this.logic.world.tiles.get(x, y);
        var city = this.logic.world.establishCity(tile, name);
        callback(serializer.city(city));
    };

    Api.prototype.renameCity = function (name, callback) {
        var city = this.logic.world.city;
        city.name = name;
        callback(serializer.city(city));
        this.dispatchEvent(ResponseCode.cityUpdate, this, serializer.city(city));
    };


    //Laboratory
    Api.prototype.getAvailableBuildings = function (callback) {
        callback(this.logic.world.city.lab.getAvailableBuildings());
    };

    Api.prototype.research = function (directionCode, callback) {
        callback(this.logic.world.city.lab.research(directionCode));
    };

    Api.prototype.getResearchData = function (callback) {
        callback(this.logic.world.city.lab.getResearchData());
    };

    //Resource market
    Api.prototype.buyResource = function (resourceCode, amount) {
        var r = this.logic.world.city.buyResource(resourceCode, amount);

        if (r)
            this.dispatchEvent(ResponseCode.errorMessage, this.logic.world.city, "Not enough resources!");
    };

    Api.prototype.sellResource = function (resourceCode, amount) {
        this.logic.world.city.sellResource(resourceCode, amount);
    };

    Api.prototype.buildBridge = function (x0, y0, x1, y1) {
        try {
            this.logic.world.buildings.buildBridge(x0, y0, x1, y1);
        } catch (e) {
            console.log(e)
        }
    };

    return Api;
});
