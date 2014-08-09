//TODO add resource market
//TODO add city population. Population growth should raise the need of housing, that way stimulating player to continue city building.
//TODO what about culture? This would make a purpose to build "special" buildings, like churches, museums.

define(function (require) {
    var namespace = require("namespace");
    var validator = require('./lib/validator'),
        BuildingCode = require('core/buildingcode'),
        buildingData = require('./buildingdata'),
        Events = require("events"),
        ErrorCode = require("core/errorcode"),
        Laboratory = require("./laboratory"),
        CityStats = require("./citystats"),
        Terrain = require("./terrain"),
        CityResourceOperations = require("./cityresourceoperations");

    var BuildingData = buildingData;

    namespace("Isometrica.Core").City = City;

    function City(root) {
        var world = root;

        this.id = 1;

        this.stats = new CityStats(this);
        this.resourceOperations = new CityResourceOperations(this);

        Events.on(root, root.events.tick, this.onTick, {self: this});

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
        Events.off(buildman, buildman.events.buildingRemoved, this.onBuildingRemoved,this);
        //this.world.buildings.addEventListener(this.world.buildings.events.buildingRemoved, this.onBuildingRemoved);
    }

    function isInsideCityBorders(city, x0, y0, w, l){
        var inside = true;
        var iterator = new Terrain.TerrainIterator(x0,y0,w,l);
        var area = city.getInfluenceArea();
        while(true){
            var tile = iterator.next();
            if(tile === -1)
                break;
            //var x = Terrain.extractX(tile);
            //var y = Terrain.extractY(tile);

            if(area[tile] === undefined){
                inside = false;
                break;
            }
        }
        return inside;
    }

    City.prototype.events = {
        update: 0,
        buildingBuilt: 1,
        buildingRemoved: 2
    };

    City.prototype.name = "";
    City.prototype.world = null;
    City.prototype.cityHall = null;
    City.prototype.buildings = null;
    City.prototype.position = null;

    City.prototype.onTick = function(sender, args, meta){
        var self = meta.self;
        self.stats.CalculateAll();
        Events.fire(self, self.events.update, self);
    };

    City.prototype.clearTile = function (x, y) {
        this.world.buildings.remove(x,y);
        this.resourceOperations.subMoney(1);
        return true;
    };


    City.prototype.buildTest = function (buildingCode, x,y, rotated) {
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
        } else if(!isInsideCityBorders(this,x,y,data.sizeX,data.sizeY)) {
            result.success = false;
            result.error = ErrorCode.CANT_BUILD_HERE;
        } else if (this.stats.resourcesTotal.some(function (el, ind) {
            return data.constructionCost[ind] !== 0 && el < data.constructionCost[ind];
        })) {
            result.success = false;
            result.error = ErrorCode.NOT_ENOUGH_RES;
        }

        return result;
    };

    City.prototype.build = function (buildingCode, baseX, baseY, rotate, onSuccess, onError) {
        var test = this.buildTest(buildingCode, baseX, baseY, rotate);
        var self = this;

        if (test.success) {
            var data = buildingData[buildingCode];
            this.world.buildings.build(buildingCode, baseX, baseY, rotate, function(building){

                self.resourceOperations.sub(data.constructionCost);
                self.buildings.push(building);
                self.buildingByClass[data.buildingCode].push(building);

                if (building.data.buildingCode === BuildingCode.cityHall)
                    self.cityHall = building;

                onSuccess(building);

                Events.fire(self, self.events.buildingBuilt, building);
            }, onError);
        }else{
            onError(test.error);
        }
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
            x: this.x,
            y: this.y,
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
            x: this.x,
            y: this.y,
            resources: this.stats.resourcesTotal,
            resourceProduce: this.stats.resourceProduce,
            resourceDemand: this.stats.resourceDemand,
            maintenanceCost: this.stats.maintenanceCost
        };

        return data;
    };

    City.prototype.getBuildings = function(){
        return this.buildings;
    };

    //Area
    function calcCityTerritory(buildings, outArray){
        var index, iter;

        for(var i = 0, l = buildings.length; i < l; i++){
            iter = buildings[i].occupiedTiles();
            while((index = iter.next()) !== -1)
                outArray.push(index);
        }
        return outArray;
    }

    City.prototype.getInfluenceArea = function(){
        var r = this.world.influenceMap.getInfluenceArea(this.id);
        return r;
    };

    return City;
});
