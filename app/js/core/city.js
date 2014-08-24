define(function (require) {
    var namespace = require("namespace");
    var validator = require('./lib/validator'),
        Events = require("events"),
        Laboratory = require("./city/laboratory"),
        CityStats = require("./city/citystats"),
        CityResourceOperations = require("./city/cityresourceoperations"),
        Area = require("./city/area"),
        CityBuildings = require("./city/citybuildings"),
        CityResources = require("./city/cityresources");

    namespace("Isometrica.Core").City = City;

    function City(world) {
        this.world = world;
        this.id = 1;

        this.timeEstablished = world.time.milliseconds;

        this.area = new Area(this);
        this.resources = new CityResources(this);
        this.stats = new CityStats(this);
        this.resourceOperations = new CityResourceOperations(this);
        this.lab = new Laboratory(this.world);
        this.buildings = this.cityBuildings = new CityBuildings(this);

        this.stats.init();

        Events.on(world, world.events.tick, this.onTick, {self: this});
    }

    City.prototype.events = {
        update: 0
    };

    City.prototype.name = "";
    City.prototype.world = null;
    City.prototype.cityHall = null;
    /**
     * @deprecated
     */
    City.prototype.buildings = null;
    City.prototype.cityBuildings = null;
    City.prototype.position = null;

    City.prototype.onTick = function(sender, args, meta){
        var self = meta.self;
        Events.fire(self, self.events.update, self);
    };

    City.prototype.clearTile = function (x, y) {
        this.world.buildings.remove(x,y);
        this.resourceOperations.subMoney(1);

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
            population: this.stats.population,
            maxPopulation: this.stats.citizenCapacity,
            ratings: this.stats.ratings.toJSON(),
            x: this.x,
            y: this.y,
            resources: this.resources.getResources(),
            resourceProduce: this.stats.resourceProduce,
            resourceDemand: this.stats.resourceDemand,
            maintenanceCost: this.stats.maintenanceCost
        };

        return data;
    };

    return City;
});
