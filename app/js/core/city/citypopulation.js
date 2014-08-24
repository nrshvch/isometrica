/**
 * Created by User on 21.08.2014.
 */
define(function(require){
    var Events = require("Events");
    /**
     * @type {TileParam}
     */
    var TileParam = require("./tileparam");
    var TileParams = require("./tileparams");


    /**
     * @param city {City}
     * @constructor
     */
    function CityPopulation(city){
        this.city = city;
        this.population = 0;
    }

    CityPopulation.prototype.init = function(){
        var world = this.city.world;

        Events.on(world, world.events.tick, onTick, this);
    };

    function onTick(world, args, self){

    }

    function calculateCapacity(self){
        var r = 0;
        var buildings = self.city.cityBuildings.getBuildings();
        for (var key in buildings) {
            var building = buildings[key];
            r += building.citizenCapacity();
        }
        return r;
    }

    function populationChangePerTick(self) {
        var totalCap = calculateCapacity(self);
        var avgEco = avgEco(self);
        var change = 0;
        var cap = totalCap - self.population;
        var citizensLeaveDueBadRatings = self.population * 0.01; //1% of population
        var maxCitizensCanJoin = cap > 0 ? Math.max(1, Math.sqrt(cap)) : 0;

        //calculate overralEffect
        var ecoEffect = avgEco / (MAX_ECO / 2) - 1; // (-1,1)
        var ecoWeight = 1;
        var overallEffect = ecoEffect * ecoWeight; // (-1,1)

        //if effect is low , citizens leave
        if (overallEffect < 0) {
            change = citizensLeaveDueBadRatings * overallEffect;
        } else if (cap < 0) {//if capacity is not enough citizens leave by one
            change = -1;
        } else {//if effect is high enough , citizens join
            change = maxCitizensCanJoin * overallEffect;
        }

        //console.log("CAP:"+cap,"AECO:"+avgEco,"ECO:"+ecoEffect, "OVRL:"+overallEffect,"CHNG:"+change);

        cityStats._population += change;
    }

    function avgEco(self){
        var area = self.city.area.getInfluenceArea(),
            t,
            tileParamsMan = self.city.world.tileParamsMan,
            params, eco, ecosum = 0, i = 0;

        for(var key in area){
            t = area[key];
            params = tileParamsMan.get(t);
            eco = TileParams.get(params, TileParam.Ecology);
            ecosum += eco;
        }

        return (i > 0 && ecosum / i) || -1;
    }

    return CityPopulation;
});
