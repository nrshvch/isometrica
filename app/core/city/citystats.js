/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 04.05.14
 * Time: 18:41
 * To change this template use File | Settings | File Templates.
 */
define(function (require) {
    var Resources = require("../resources"),
        Events = require("events"),
        BuildingData = require("data/buildings");

    var namespace = require("namespace");
    var CityService = namespace("Isometrica.Core.CityService");
    CityService.Stats = CityStats;

    var resourceBuffer1 = {};

    function CityStats(city) {
        this.city = city;
        this.resourceDemand = {};
        this.resourceProduce = {};
        this.maintenanceCost = {};
    }

    CityStats.prototype.city = null;
    CityStats.prototype.resourceDemand = null;
    CityStats.prototype.resourceProduce = null;
    CityStats.prototype.maintenanceCost = null;

    CityStats.prototype.events = {
        update: 0
    };

    CityStats.prototype.init = function () {
        var world = this.city.world;
        Events.on(world, world.events.tick, onWorldTick, this);
    };

    CityStats.prototype.getCityResourceDemand = function(){
        return calculateResourceConsumption(this);
    };

    CityStats.prototype.getCityResourceProduce = function(){
        return calculateResourceProduction(this);
    };

    CityStats.prototype.getCityBuildingMaintenanceCost = function(){
        return calculateMaintenanceCost(this);
    };

    function onWorldTick(sender, args, self) {
        Events.fire(self, self.events.update);
    }

    //PRIVATE

    function calculateBuildingMaintenanceDailyCostPercent(city, building, dateNow) {
        //After 10 years of building exploitation it starts to require maintenance costs.
        //Max.maintenance cost per year is 25% of building construction cost.
        //Maintenance cost starts from 1% and raises to max in 50 years, after maintenance started.
        var dateThen = new Date();
        dateThen.setTime(building.createdAt);
        var dYear = dateNow.getYear() - dateThen.getYear() - 10,
            percent = 0, r = 0;

        if (dYear > 0) {
            if (dYear <= 50) {
                percent = 0.25 * dYear / 50;
            } else if (dYear > 50) {
                percent = 0.25;
            }

            //amount of resources to take, daily
            r = percent / city.world.time.daysInYear;
        }

        return r;
    }

    function calculateResourceConsumption(cityStats) {
        Resources.clear(cityStats.resourceDemand);

        var buildings = cityStats.city.buildingService.getBuildings(),
            l = buildings.length;

        for (var i = 0; i < l; i++)
            Resources.add(cityStats.resourceDemand, cityStats.resourceDemand, buildings[i]);

        return cityStats.resourceDemand;
    }

    function calculateResourceProduction(self) {
        Resources.clear(self.resourceProduce);
        var buildings = self.city.buildingService.getBuildings();
        var l = buildings.length;
        for (var i = 0; i < l; i++) {
            Resources.add(self.resourceProduce, self.resourceProduce, buildings[i].producing);
        }

        return self.resourceProduce;
    }

    function calculateMaintenanceCost(cityStats) {
        var dateNow = new Date();
        dateNow.setTime(cityStats.city.world.time.now);

        Resources.clear(cityStats.maintenanceCost);

        var buildings = cityStats.city.buildingService.getBuildings();
        var l = buildings.length;

        for (var i = 0; i < l; i++) {
            var building = buildings[i];
            var data = BuildingData[building.buildingCode];

            var maintenanceCostN = calculateBuildingMaintenanceDailyCostPercent(cityStats.city, building, dateNow);
            Resources.mul(resourceBuffer1, data.constructionCost, maintenanceCostN);
            Resources.add(cityStats.maintenanceCost, cityStats.maintenanceCost, resourceBuffer1);
        }

        return cityStats.maintenanceCost;
    }

    return CityStats;
});