/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 04.05.14
 * Time: 18:41
 * To change this template use File | Settings | File Templates.
 */
define(function (require) {
    var TileRatings = require("lib/tileratings"),
        Resources = require("lib/resources");

    var TAX_MONEY = 1;

    var resourceBuffer1 = Resources.create(),
        resourceBuffer2 = Resources.create(),
        resourceBuffer3 = Resources.create(),
        resourceBuffer4 = Resources.create(),
        dateBuffer1 = new Date(),
        dateBuffer2 = new Date;

    function CityStats(city){
        this.city = city;
        this.ratings = TileRatings.create();
        this.resourceDemand = Resources.create();
        this.resourceProduce = Resources.create();
        this.resourcesTotal = Resources.create();
        this.maintenanceCost = Resources.create();

        this.resourcesTotal[Resources.ResourceCode.money] = 100;
        this.resourcesTotal[Resources.ResourceCode.stone] = 100;
        this.resourcesTotal[Resources.ResourceCode.wood] = 100;
    }

    CityStats.prototype.city = null;
    CityStats.prototype.resourceDemand = null;
    CityStats.prototype.resourceProduce = null;
    CityStats.prototype.resourcesTotal = null;
    CityStats.prototype.maintenanceCost = null;
    CityStats.prototype.incomeFromTaxes = null;
    CityStats.prototype.ratings = null;
    CityStats.prototype._population = 0;
    Object.defineProperty(CityStats.prototype, "population", {
        get: function () {
            return Math.max(this._population | 0, 0);
        }
    });
    CityStats.prototype.citizenCapacity = 0;

    CityStats.prototype.CalculateAll = function(){
        calculateCitizenCapacity(this);
        calculateRatings(this);
        calculateIncomeFromCitizens(this);
        calculateMaintenanceCost(this);
        calculateResourceConsumption(this);
        calculateResourceProduction(this);
        calculateResources(this);
    };

    //PRIVATE

    var defaultRatings = TileRatings.create();
    defaultRatings.values[TileRatings.TileRatingEnum.Ecology] = 100;

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

    function calculateCitizenCapacity(cityStats) {
        var r = 0;
        for (var key in cityStats.city.buildings) {
            var building = cityStats.city.buildings[key];
            r += building.citizenCapacity();
        }
        cityStats.citizenCapacity = r;
    }

    function calculateRatings(cityStats){
        TileRatings.copy(cityStats.ratings, defaultRatings);
        var BuildingsCount = cityStats.city.buildings.length;
        if (cityStats.city.buildings.length > 0) {
            for (var key in cityStats.city.buildings) {
                var building = cityStats.city.buildings[key];
                TileRatings.add(cityStats.ratings, cityStats.ratings, cityStats.city.world.ratingsman.getRatings(building.x, building.y));
            }
        }
        for(var key in cityStats.ratings.values){
            cityStats.ratings.values[key] /= BuildingsCount;
        }
    }

    function calculateIncomeFromCitizens(cityStats) {
        cityStats.incomeFromTaxes = TAX_MONEY * cityStats.population
    }

    function calculateResourceConsumption(cityStats) {
        Resources.copy(cityStats.resourceDemand, Resources.zero);

        for (var i = 0; i < cityStats.city.buildings.length; i++)
            Resources.add(cityStats.resourceDemand, cityStats.resourceDemand, cityStats.city.buildings[i].demanding);
    }

    function calculateResourceProduction(cityStats){
        Resources.copy(cityStats.resourceDemand, Resources.zero);

        for (var i = 0; i < cityStats.city.buildings.length; i++)
            Resources.add(cityStats.resourceProduce, cityStats.resourceProduce, cityStats.city.buildings[i].producing);
    }

    function calculateMaintenanceCost(cityStats){
        var dateNow = new Date();
        dateNow.setTime(cityStats.city.world.time.now);

        Resources.copy(cityStats.maintenanceCost, Resources.zero);

        for (var i = 0, l = cityStats.city.buildings.length; i < l; i++){
            var building = cityStats.city.buildings[i];

            var maintenanceCostN = calculateBuildingMaintenanceDailyCostPercent(cityStats.city, building, dateNow);
            Resources.mul(resourceBuffer1, building.data.constructionCost, maintenanceCostN);
            Resources.add(cityStats.maintenanceCost, cityStats.maintenanceCost, resourceBuffer1);
        }
    }

    function calculateResources(cityStats){
        Resources.add(cityStats.resourcesTotal, cityStats.resourcesTotal, cityStats.resourceProduce);
        Resources.sub(cityStats.resourcesTotal, cityStats.resourcesTotal, cityStats.resourceDemand);
        Resources.add(cityStats.resourcesTotal, cityStats.resourcesTotal, cityStats.maintenanceCost);
        Resources.add(cityStats.resourcesTotal, cityStats.resourcesTotal, Resources.create({money: cityStats.incomeFromTaxes}));
    }

    function calculatePopulationChangePerTick(cityStats) {
        var totalCap = cityStats.citizenCapacity;
        var avgEco = cityStats.ratings.values[TileRatings.TileRatingEnum.Ecology];
        var MAX_ECO = 100;
        var change = 0;
        var cap = totalCap - cityStats.population;
        var citizensLeaveDueBadRatings = cityStats.population * 0.01; //1% of population
        var maxCitizensCanJoin = cap > 0 ? Math.max(1, Math.sqrt(cap)) : 0;

        //calculate overralEffect
        var ecoEffect = avgEco / 50 - 1; // (-1,1)
        var ecoWeight = 1;
        var overallEffect = ecoEffect * ecoWeight; // (-1,1)

        //if effect is low , citizens leave
        if(overallEffect < 0)              {
            change = citizensLeaveDueBadRatings * overallEffect;
        }
        //is effect is high enoguh , citizens join
        else{
            change = maxCitizensCanJoin * overallEffect;
        }

        //console.log("AECO:"+avgEco,"ECO:"+ecoEffect, "OVRL:"+overallEffect,"CHNG:"+change);

        cityStats._population += change;
    }

    return CityStats;
});