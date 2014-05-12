//TODO add resource market
//TODO add city population. Population growth should raise the need of housing, that way stimulating player to continue city building.
//TODO what about culture? This would make a purpose to build "special" buildings, like churches, museums.

define(function (require) {
    var validator = require('./lib/validator'),
        BuildingCode = require('lib/buildingcode'),
        buildingData = require('lib/buildingdata'),
        Events = require("lib/events"),
        ErrorCode = require("lib/errorcode"),
        Laboratory = require("./laboratory"),
        CityStats = require("./citystats"),
        CityResourceOperations = require("./cityresourceoperations");



    function City(root) {
        var world = root;

        this.stats = new CityStats(this);
        this.resourceOperations = new CityResourceOperations(this);

        Events.subscribe(root, root.events.tick, function(sender, args, meta){
            var self = meta.self;
            self.stats.CalculateAll();
            Events.fire(self, self.events.update, self, self);
        }, {self: this});

        this.timeEstablished = world.time.milliseconds;

        this.world = world;
        this.buildings = [];

        this.buildingByClass = [];
        for (var key in BuildingCode) {
            this.buildingByClass[BuildingCode[key]] = [];
        }

        this.lab = new Laboratory(this.world);

        var self = this;
        this.onBuildingRemoved = function (buildman, building) {
            var index = self.buildings.indexOf(building);
            if (index >= 0) {
                self.buildings.splice(index, 1);

                if (building.constructor.buildingCode === BuildingCode.cityHall) {
                    self.cityHall = null;
                }
            }
        };

        var buildman = this.world.buildings;
        Events.subscribe(buildman, buildman.events.buildingRemoved, this.onBuildingRemoved,this);
        //this.world.buildings.addEventListener(this.world.buildings.events.buildingRemoved, this.onBuildingRemoved);
    }

    City.prototype.events = {
        update: 0
    };
    City.prototype.name = "";
    City.prototype.world = null;
    City.prototype.cityHall = null;
    City.prototype.buildings = null;
    City.prototype.position = null;


    City.prototype.clearTile = function (x, y) {
        var tile = this.world.tiles.get(x, y);
        tile.clear();
        this.resourceOperations.subMoney(1);
        return true;
    };


    City.prototype.buildTest = function (buildingCode, baseTile, rotation) {
        var result = {
            success: true,
            error: ErrorCode.NONE
        };

        var data = buildingData[buildingCode],
            availableBuildingList = this.lab.getAvailableBuildings();

        if (availableBuildingList.indexOf(buildingCode) === -1) {
            result.success = false;
            result.error = ErrorCode.BUILDING_NOT_AVAIL;
        } else if (buildingCode === BuildingCode.cityHall && this.cityHall !== null) {
            result.success = false;
            result.error = ErrorCode.CITY_HALL_ALREADY_BUILT;
        } else if (this.stats.resourcesTotal.some(function (el, ind) {
            return data.constructionCost[ind] !== 0 && el < data.constructionCost[ind];
        })) {
            result.success = false;
            result.error = ErrorCode.NOT_ENOUGH_RES;
        }

        return result;
    };

    City.prototype.build = function (buildingCode, baseTile, rotate) {
        var allow = this.buildTest(buildingCode, baseTile, rotate);

        if (allow.success) {
            var data = buildingData[buildingCode];
            var building = this.world.buildings.build(buildingCode, baseTile.x, baseTile.y, rotate);

            this.resourceOperations.sub(data.constructionCost);
            this.buildings.push(building);
            this.buildingByClass[data.buildingCode].push(building);

            if (building.data.buildingCode === BuildingCode.cityHall)
                this.cityHall = building;

            return true;
        }
        return false;
    };

    City.prototype.research = function (buildingCode) {
        var data = buildingData[buildingCode],
            resources = this.resources,
            enoughResources = data.researchCost.every(function (element, index) {
                return element <= resources[index];
            });

        if (enoughResources) {
            this.laboratory.research(buildingCode);
            this.resourceOperations.sub(data.researchCost);
        } else {
            throw "Not enough resources!";
        }
    };

    City.prototype.save = function () {
        var buildings = [];

        for (var index in this.buildings) {
            buildings.push(this.buildings[index].toJSON());
        }

        var save = {
            name: this.name,
            x: this.position.x,
            y: this.position.y,
            timeEstablished: this.timeEstablished,
            resources: this.resources,
            cityHall: (this.cityHall && this.cityHall.toJSON()) || null,
            buildings: buildings,
            laboratory: this.lab.save()
        };
        return save;
    };

    City.prototype.load = function (data) {
        this.name = data.name;
        this.position = this.world.tiles.get(data.x, data.y);
        this.timeEstablished = data.timeEstablished;
        this.resources = data.resources;
        this.cityHall = (data.cityHall && this.world.buildings.buildingIdToBuildingMap[data.cityHall.id]) || null;

        for (var index in data.buildings) {
            var b = this.world.buildings.buildingIdToBuildingMap[data.buildings[index].id];

            this.buildings.push(b);
            this.buildingByClass[b.data.buildingCode].push(b);
        }

        this.laboratory.load(data.lab);
    };

    City.prototype.toJSON = function () {
        var data = {
            name: this.name,
            population: this.stats.population,
            maxPopulation: this.stats.citizenCapacity,
            ratings: this.stats.ratings.toJSON(),
            x: this.position.x,
            y: this.position.y,
            resources: this.stats.resourcesTotal,
            resourceProduce: this.stats.resourceProduce,
            resourceDemand: this.stats.resourceDemand,
            maintenanceCost: this.stats.maintenanceCost
        };

        return data;
    };

    return City;
});
