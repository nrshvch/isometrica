/**
 * Who works where.
 *
 * Shops, banks and offices only make money with people behind the counter, and
 * the only people there are are the city's citizens - so a street of shops
 * with no houses around it earns nothing, and it is the houses that make the
 * commerce worth building.
 *
 * Jobs are a count, like money, not a reach, like water: every citizen can
 * work anywhere in the city. They take the jobs of the oldest businesses
 * first, so the city's shops fill up one after the other instead of all of
 * them standing half empty - the ones left without anybody are plain to see.
 */
import namespace from "namespace";

var CityService = namespace("Isometrica.Core.CityService");
CityService.Jobs = CityJobs;

/**
 * @param city {City}
 * @constructor
 */
function CityJobs(city) {
    this.city = city;

    //when the jobs were last handed out - once a day is often enough, and
    //every building asks during the same tick
    this._at = null;
    this._total = 0;
    this._filled = 0;
    //building id -> how many work there
    this._workers = {};
}

/**
 * @returns {number} how many jobs the working businesses offer
 */
CityJobs.prototype.getJobs = function () {
    allocate(this);
    return this._total;
};

/**
 * @returns {number} how many of them have somebody in them
 */
CityJobs.prototype.getFilled = function () {
    allocate(this);
    return this._filled;
};

/**
 * @param building {Building}
 * @returns {number} how many work in it
 */
CityJobs.prototype.getWorkers = function (building) {
    allocate(this);
    return this._workers[building.id] || 0;
};

/**
 * How much of what a building makes it actually makes, going by who turned up.
 * Anything that employs nobody is not held back by it.
 *
 * @param building {Building}
 * @returns {number} 0..1
 */
CityJobs.prototype.getStaffing = function (building) {
    var jobs = building.jobs();

    if (jobs === 0)
        return building.data.jobs ? 0 : 1;

    return this.getWorkers(building) / jobs;
};

function allocate(self) {
    var now = self.city.world.time.now;

    if (self._at === now)
        return;

    var buildings = self.city.buildingService.getBuildings(),
        left = self.city.population.getPopulation(),
        total = 0,
        workers = {},
        jobs, n, i;

    //the city's buildings are kept in the order they went up
    for (i = 0; i < buildings.length; i++) {
        jobs = buildings[i].jobs();

        if (jobs === 0)
            continue;

        n = Math.min(jobs, left);
        left -= n;
        total += jobs;
        workers[buildings[i].id] = n;
    }

    self._at = now;
    self._total = total;
    self._filled = self.city.population.getPopulation() - left;
    self._workers = workers;
}

export default CityJobs;
