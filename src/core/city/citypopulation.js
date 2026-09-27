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
//75 to 180 money a head to build, one earns itself back in 40 to 90 ticks
//once it fills up (an apartment block, dense as it is, takes 150).
var TAX_MONEY = 2;
CityPopulation.TAX_MONEY = TAX_MONEY;

/**
 * What one resident of this house pays per tick. People in a house of their
 * own are worth more to the treasury a head than people in a block of flats,
 * so what a city earns depends on what it puts them up in, not only on how
 * many of them there are.
 *
 * @param data {Object} building data
 * @returns {number} money per tick, per head
 */
function taxPerResident(data){
    return data.taxPerResident !== undefined ? data.taxPerResident : TAX_MONEY;
}
CityPopulation.taxPerResident = taxPerResident;


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
    this._shortOfJobs = {};
}

CityPopulation.prototype.init = function(){
    var world = this.city.world;

    Events.on(world, world.events.tick, onTick, this);
};

/**
 * Whether the people of this house need work in the city to move in. Only a
 * trailer or a tiny house is cheap enough to live in without a job.
 *
 * @param data {Object} building data
 * @returns {boolean}
 */
function needsJobs(data){
    return data.needsJobs !== false;
}
CityPopulation.needsJobs = needsJobs;

/**
 * @returns {number} how many can live in the city: every bed in the houses
 *                   that need no jobs, and as many of the rest as there are
 *                   jobs to go round
 */
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

/**
 * Whether this house has no work for any of its beds: the jobs are handed to
 * the beds of the oldest houses first, whether anybody sleeps in them yet or
 * not, and they ran out before this one. A house left with some jobs, but
 * fewer than it has beds, does not count.
 *
 * @param building {Building}
 * @returns {boolean}
 */
CityPopulation.prototype.isShortOfJobs = function(building){
    house(this);
    return this._shortOfJobs[building.id] === true;
};

CityPopulation.prototype.getTaxIncomeAmount = function(){
    var buildings = this.city.buildingService.getBuildings(),
        total = 0, i;

    house(this);

    for (i = 0; i < buildings.length; i++)
        total += (this._residents[buildings[i].id] || 0)
            * taxPerResident(buildings[i].data);

    return total;
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
        //beds in houses that need jobs are only good for as many as can work
        jobs = self.city.jobs.getJobs(),
        //the same jobs handed to beds rather than people, so that a house
        //still waiting for its people is known to be short all the same
        bedJobs = jobs,
        residents = {},
        shortOfJobs = {},
        capacity, n, i;

    for (i = 0; i < buildings.length; i++) {
        capacity = buildings[i].citizenCapacity();

        if (capacity === 0)
            continue;

        if (needsJobs(buildings[i].data)) {
            if (bedJobs === 0)
                shortOfJobs[buildings[i].id] = true;

            bedJobs = Math.max(bedJobs - capacity, 0);
            capacity = Math.min(capacity, jobs);
        }

        n = Math.min(capacity, left);
        left -= n;
        residents[buildings[i].id] = n;

        if (needsJobs(buildings[i].data))
            jobs -= n;
    }

    self._housedAt = now;
    self._residents = residents;
    self._shortOfJobs = shortOfJobs;
}

function calculateCapacity(self){
    var free = 0, working = 0;
    var buildings = self.city.buildingService.getBuildings();
    for (var key in buildings) {
        var building = buildings[key];

        if (needsJobs(building.data))
            working += building.citizenCapacity();
        else
            free += building.citizenCapacity();
    }
    return free + Math.min(working, self.city.jobs.getJobs());
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
