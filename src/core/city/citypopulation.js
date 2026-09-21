/**
 * Created by User on 21.08.2014.
 */
import Events from "events";
/**
 * @type {TileParam}
 */
import Resource from "../resourcecode";
import TileParamsMan from "../world/tileparamsmanager";

import namespace from "namespace";
var CityService = namespace("Isometrica.Core.CityService");
CityService.Population = CityPopulation;

var MAX_PARAM_VAL = TileParamsMan.MAX_PARAM_VAL;

//What one citizen pays per tick. Houses earn nothing by standing there - it is
//the people in them who pay - so this is what a house is bought for: at around
//100 to 140 money a head to build, one earns itself back in 40 to 70 ticks
//once it fills up.
var TAX_MONEY = 2;
CityPopulation.TAX_MONEY = TAX_MONEY;


/**
 * @param city {City}
 * @constructor
 */
function CityPopulation(city){
    this.city = city;
    this._population = 0;

    //who lives where, worked out once a day like the jobs are (see CityJobs)
    this._housedAt = null;
    this._residents = {};
}

CityPopulation.prototype.init = function(){
    var world = this.city.world;

    Events.on(world, world.events.tick, onTick, this);
};

CityPopulation.prototype.getCapacity = function(){
    return calculateCapacity(this);
};

CityPopulation.prototype.getPopulation = function(){
    return Math.max(this._population | 0, 0);
};

/**
 * @returns {number} how many live here, down to the fraction a tick moves
 */
CityPopulation.prototype.save = function(){
    return this._population;
};

/**
 * @param population {number}
 */
CityPopulation.prototype.load = function(population){
    this._population = population || 0;
};

/**
 * How many of the city's people live in this building. The city only counts
 * heads, so they are put up the way the jobs are handed out: the oldest
 * houses fill first.
 *
 * @param building {Building}
 * @returns {number}
 */
CityPopulation.prototype.getResidents = function(building){
    house(this);
    return this._residents[building.id] || 0;
};

CityPopulation.prototype.getTaxIncomeAmount = function(){
    return TAX_MONEY * this.getPopulation();
};

function onTick(world, args, self){
    populationChangePerTick(self);

    payTaxes(self);
}

function house(self){
    var now = self.city.world.time.now;

    if (self._housedAt === now)
        return;

    var buildings = self.city.buildingService.getBuildings(),
        left = self.getPopulation(),
        residents = {},
        capacity, n, i;

    for (i = 0; i < buildings.length; i++) {
        capacity = buildings[i].citizenCapacity();

        if (capacity === 0)
            continue;

        n = Math.min(capacity, left);
        left -= n;
        residents[buildings[i].id] = n;
    }

    self._housedAt = now;
    self._residents = residents;
}

function calculateCapacity(self){
    var r = 0;
    var buildings = self.city.buildingService.getBuildings();
    for (var key in buildings) {
        var building = buildings[key];
        r += building.citizenCapacity();
    }
    return r;
}

function populationChangePerTick(self) {
    var pop = self.getPopulation();
    var totalCap = calculateCapacity(self);
    var avgEco = self.city.tilesParams.avgEco();
    var change = 0;
    var cap = totalCap - pop;
    var citizensLeaveDueBadRatings = pop * 0.01; //1% of population
    var maxCitizensCanJoin = cap > 0 ? Math.max(1, Math.sqrt(cap)) : 0;

    //calculate overralEffect
    var ecoEffect = avgEco / (MAX_PARAM_VAL / 2) - 1; // (-1,1)
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

    self._population += change;
}

function payTaxes(self){
    var money = {};
    money[Resource.money] = self.getTaxIncomeAmount();
    self.city.resourcesModule.add(money);
}

export default CityPopulation;
