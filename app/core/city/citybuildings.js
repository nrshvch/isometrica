/**
 * Created by User on 19.08.2014.
 */
define(function (require) {
    var Events = require("events");
    var BuildingCode = require("../buildingcode");
    var BuildingData = require("data/data");
    var ErrorCode = require("../errorcode");
    var Building = require("../building");
    var Terrain = require("../terrain");
    var TileIterator = require("../tileiterator");

    var namespace = require("namespace");
    var CityService = namespace("Isometrica.Core.CityService");
    CityService.Buildings = CityBuildings;

    /**
     * @param city {City}
     * @constructor
     */
    function CityBuildings(city) {
        this._buildings = [];
        this.city = this._city = city;
    }

    /**
     * @type {City}
     * @private
     */
    CityBuildings.prototype._city = null;

    /**
     * @type {Array}
     * @private
     */
    CityBuildings.prototype._buildings = null;

    CityBuildings.prototype.cityHall = null;

    var events = CityBuildings.prototype.events = {
        "new": 0,
        "remove": 1
    };

    CityBuildings.prototype.init = function () {

    };

    CityBuildings.prototype.buildBuilding = function (code, tile, rotate) {
        var city = this.city;
        var root = this.city.root;

        var errorCode = buildTest(this, code, tile, rotate);

        if (errorCode === ErrorCode.NONE) {
            var data = BuildingData[code];
            var building = new Building();
            building.init(city.world, code, tile, rotate);

            root.buildings.build(building);

            city.resources.sub(data.constructionCost);
            this._buildings.push(building);

            if (code === BuildingCode.cityHall)
                this.cityHall = building;

            Events.fire(this, events.new, building);
        } else {
            root.messagingService.sendTileMessage(tile, Isometrica.Core.MessageType.tileError, errorCode);
        }
    };

    CityBuildings.prototype.buildRoad = function(code, tile0, tile1){
        var city = this.city;
        var root = city.root;
        var data = BuildingData[code];
        var iter = new TileIterator(tile0, tile1);
        var bs = [];
        while(!iter.done){
            var tile = TileIterator.next(iter);
            var errorCode = buildTest(this, code, tile);



            if(errorCode !== ErrorCode.NONE){
                root.messagingService.sendTileMessage(tile, Isometrica.Core.MessageType.tileError, errorCode);
                continue;
            }

            var building = new Building();
            building.init(root, code, tile);

            root.buildings.build(building);

            city.resources.sub(data.constructionCost);

            this._buildings.push(building);

            bs.push(building);
        }

        for(var i in bs)
            Events.fire(this, events.new, bs[i]);
    };

    CityBuildings.prototype.destroyBuilding = function () {
        throw "Not implemented";
    };

    CityBuildings.prototype.getBuildings = function () {
        return this._buildings;
    };

    function buildTest(self, code, tile, rotation) {
        var test = self.city.root.buildingService.test(code, tile, rotation);

        if(test !== ErrorCode.NONE)
            return test;

        var city = self.city;

        var data = BuildingData[code],
            availableBuildingList = city.laboratoryService.getAvailableBuildings();

        if (availableBuildingList[code] !== true)
            return ErrorCode.BUILDING_NOT_AVAIL;
        else if (code === BuildingCode.cityHall && self.cityHall !== null)
            return ErrorCode.CITY_HALL_ALREADY_BUILT;
        else if (!city.area.contains(tile, Terrain.convertToIndex(data.sizeX, data.sizeY)))
            return ErrorCode.CANT_BUILD_HERE;
        else if (!city.resources.hasEnough(data.constructionCost))
            return ErrorCode.NOT_ENOUGH_RES;

        return ErrorCode.NONE;
    }

    return CityBuildings;
});