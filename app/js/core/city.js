define(function (require) {
    var namespace = require("namespace");
    var Events = require("events");
    var Laboratory = require("./city/laboratory"),
        CityStats = require("./city/citystats"),
        Area = require("./city/area"),
        CityBuildings = require("./city/citybuildings"),
        CityResources = require("./city/cityresources");
    var CityTilesParams = require("./city/citytilesparams");
    var CityPopulation = require("./city/citypopulation");
    var Terrain = require("./terrain");

    var Core = namespace("Isometrica.Core");

    Core.City = City;

    function City(world) {
        this.root = this.world = world;
        this.id = 1;

        this.timeEstablished = world.time.milliseconds;

        this.area = this.areaService = new Area(this);
        this.tilesParams = this.tileParamsService = new CityTilesParams(this);
        this.resourcesModule = this.resources = this.resourcesService = new CityResources(this);
        this.statsModule = this.statsService = new CityStats(this);
        this.populationModule = this.populationService = new CityPopulation(this);
        this.lab = this.laboratoryService = new Laboratory(this);
        this.buildings = this.cityBuildings = this.buildingsService = new CityBuildings(this);

        this.statsService.init();
        this.populationService.init();
        this.areaService.init();

        Events.on(world, world.events.tick, this.onTick, {self: this});
    }

    var events = City.events = City.prototype.events = {
        update: 0
    };

    City.prototype.name = "";
    City.prototype.world = null;
    City.prototype.cityHall = null;
    City.prototype.position = null;

    City.prototype.onTick = function (sender, args, meta) {
        var self = meta.self;
        Events.fire(self, self.events.update, self);
    };

    City.prototype.clearTile = function (x, y) {
        //this.world.buildings.remove(x,y);
        this.world.terrain.clearTile(Terrain.convertToIndex(x, y));
        this.resourcesModule.subMoney(1);

        return true;
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
            population: this.populationModule.getPopulation(),
            maxPopulation: this.populationModule.getCapacity(),
            x: this.x,
            y: this.y,
            resources: this.resources.getResources(),
            resourceProduce: this.statsModule.getCityResourceProduce(),
            resourceDemand: this.statsModule.getCityResourceDemand(),
            maintenanceCost: this.statsModule.getCityBuildingMaintenanceCost()
        };

        return data;
    };

    return City;
});
