/**
 * Who lives where.
 *
 * People live in houses: every house keeps how many live in it, and that is
 * what goes into the save. The city's people are those of the houses on its
 * roads (core/city/cityroads), and it is they who pay it their taxes.
 *
 * The city grows into its houses by itself, a few at a time - more the more
 * room there is, and only while it is pleasant enough to live in (Ecology) -
 * the oldest houses filling first. A house has room for as many as it has
 * beds, as long as it has what it needs - a road, water - and, for a house
 * whose people work in town, for as many of them as there are jobs: the jobs
 * go to the beds of the oldest houses first. Whoever is in a house with less
 * room than that moves out, one a tick, and is gone: the city fills the room
 * it has elsewhere with its own growth.
 *
 * A house cut off from the city's roads is abandoned: room for nobody. Its
 * people stay a while, paying nobody, and move out - one a tick out of each
 * part that is cut off - till it stands empty. Joined up again, it is the
 * city's once more, with whoever is still there.
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
//750 to 1800 money a head to build, one earns itself back in 40 to 90 ticks
//once it fills up (an apartment block, dense as it is, takes 150).
var TAX_MONEY = 20;
CityPopulation.TAX_MONEY = TAX_MONEY;

//what the houses that are the city's go under, where the parts cut off from
//it go under what they are cut off with (CityRoads#cutOff)
var CITY = "city";

/**
 * What one resident of this house pays per tick. People in a house of their
 * own are worth more to the treasury a head than people in a block of flats,
 * so what a city earns depends on what it puts them up in, not only on how
 * many of them there are.
 *
 * @param data {Object} building data
 * @returns {number} money per tick, per head
 */
function taxPerResident(data) {
  return data.taxPerResident !== undefined ? data.taxPerResident : TAX_MONEY;
}
CityPopulation.taxPerResident = taxPerResident;

/**
 * @param city {City}
 * @constructor
 */
function CityPopulation(city) {
  this.city = city;

  //building id -> how many live in it, for every house anybody does
  this._residents = {};
  //people on the way in, or out, short of a whole one (#onTick)
  this._joining = 0;

  //the room in the houses, worked out once a tick like the jobs are (see
  //CityJobs) - and how many of the city's own live in them, once they move
  this._surveyedAt = null;
  this._room = {};
  this._shortOfJobs = {};
  this._capacity = 0;
  this._counted = null;
  this._countedFor = -1;
}

CityPopulation.prototype.init = function () {
  var world = this.city.world,
    buildings = world.buildings;

  Events.on(world, world.events.tick, onTick, this);
  //a house pulled down takes its people with it
  Events.on(buildings, buildings.events.buildingRemoved, onRemoved, this);
};

/**
 * Whether the people of this house need work in the city to move in. Only a
 * trailer or a tiny house is cheap enough to live in without a job.
 *
 * @param data {Object} building data
 * @returns {boolean}
 */
function needsJobs(data) {
  return data.needsJobs !== false;
}
CityPopulation.needsJobs = needsJobs;

/**
 * Whether a city can be founded with a house of this kind: one whose people
 * need nothing of a town - no work in it, no water - but a lane to it, the
 * way a family or a few settle somewhere. Only what is offered to be built.
 *
 * @param data {Object} building data
 * @returns {boolean}
 */
CityPopulation.canFound = function (data) {
  return (
    data !== undefined &&
    !data.hidden &&
    data.citizenCapacity > 0 &&
    !needsJobs(data) &&
    !(data.requires && data.requires.water)
  );
};

/**
 * @returns {number} how many the city's houses have room for: every bed in
 *                   the houses that need no jobs, and as many of the rest as
 *                   there are jobs to go round
 */
CityPopulation.prototype.getCapacity = function () {
  survey(this);
  return this._capacity;
};

/**
 * @returns {number} how many live in the city - not counting those left in
 *                   houses cut off from it
 */
CityPopulation.prototype.getPopulation = function () {
  var version = this.city.roadService.version();

  //counted again once anybody moves, or the city's roads change
  if (this._counted === null || this._countedFor !== version) {
    this._counted = count(this, this.city.buildingService.getBuildings());
    this._countedFor = version;
  }

  return this._counted;
};

/**
 * @returns {Object} who lives in which house, as it goes into a save: by the
 *          tile each house stands on, and what is on its way in or out
 */
CityPopulation.prototype.save = function () {
  var buildings = this.city.buildingService.getBuildings(),
    residents = {},
    n,
    i;

  for (i = 0; i < buildings.length; i++) {
    n = this._residents[buildings[i].id];
    if (n > 0) residents[buildings[i].tile] = n;
  }

  return { residents: residents, joining: this._joining };
};

/**
 * Puts the people back in their houses. A save from before they were kept
 * house by house has only how many there were: they are put up the way they
 * were then, the oldest houses filled first.
 *
 * @param data {Object|number} as #save left it, or a head count
 */
CityPopulation.prototype.load = function (data) {
  var buildings = this.city.buildingService.getBuildings(),
    world = this.city.world,
    building,
    tile,
    n;

  this._residents = {};
  this._joining = 0;
  this._surveyedAt = null;
  this._counted = null;

  if (typeof data === "number") {
    survey(this);
    settle(this, buildings, Math.floor(Math.max(data, 0)));
  } else if (data !== null && typeof data === "object") {
    for (tile in data.residents || {}) {
      building = world.buildings.get(+tile);
      n = Math.floor(data.residents[tile]);

      if (
        building === null ||
        buildings.indexOf(building) === -1 ||
        !(n > 0) ||
        !building.data.citizenCapacity
      )
        continue;

      this._residents[building.id] = Math.min(n, building.data.citizenCapacity);
    }

    if (isFinite(data.joining)) this._joining = data.joining;
  }

  this._counted = null;
  //who works where goes by how many live here
  this.city.jobs.recount();
};

/**
 * How many live in this house - in it still, if it is cut off from the city.
 *
 * @param building {Building}
 * @returns {number}
 */
CityPopulation.prototype.getResidents = function (building) {
  return this._residents[building.id] || 0;
};

/**
 * What the people of this house pay the city per tick: nothing, from a house
 * cut off from it.
 *
 * @param building {Building}
 * @returns {number}
 */
CityPopulation.prototype.getTaxes = function (building) {
  var n = this._residents[building.id] || 0;

  if (n === 0 || this.city.roadService.cutOff(building) !== null) return 0;

  return n * taxPerResident(building.data);
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
CityPopulation.prototype.isShortOfJobs = function (building) {
  survey(this);
  return this._shortOfJobs[building.id] === true;
};

CityPopulation.prototype.getTaxIncomeAmount = function () {
  var buildings = this.city.buildingService.getBuildings(),
    total = 0,
    i;

  for (i = 0; i < buildings.length; i++) total += this.getTaxes(buildings[i]);

  return total;
};

function onTick(world, args, self) {
  var buildings = self.city.buildingService.getBuildings();

  survey(self);
  moveOut(self, buildings);
  grow(self, buildings);

  payTaxes(self);
}

function onRemoved(sender, building, self) {
  if (self._residents[building.id] === undefined) return;

  delete self._residents[building.id];
  self._counted = null;
}

//how many of the city's own live in its houses
function count(self, buildings) {
  var roads = self.city.roadService,
    total = 0,
    n,
    i;

  for (i = 0; i < buildings.length; i++) {
    n = self._residents[buildings[i].id];
    if (n > 0 && roads.cutOff(buildings[i]) === null) total += n;
  }

  return total;
}

/**
 * How much room every house has, this tick - the beds there is all it needs
 * for, of the houses that are the city's, and none in one cut off from it.
 */
function survey(self) {
  var now = self.city.world.time.now;

  if (self._surveyedAt === now) return;

  var buildings = self.city.buildingService.getBuildings(),
    //beds in houses that need jobs are only good for as many as can work,
    //handed to the beds of the oldest first
    jobs = self.city.jobs.getJobs(),
    room = {},
    shortOfJobs = {},
    capacity = 0,
    beds,
    n,
    i;

  for (i = 0; i < buildings.length; i++) {
    //a house cut off from the city has none - nobody moves in without a
    //road to it, or water in it
    beds = buildings[i].citizenCapacity();

    if (beds === 0) continue;

    n = beds;

    if (needsJobs(buildings[i].data)) {
      if (jobs === 0) shortOfJobs[buildings[i].id] = true;

      n = Math.min(beds, jobs);
      jobs -= n;
    }

    room[buildings[i].id] = n;
    capacity += n;
  }

  self._surveyedAt = now;
  self._room = room;
  self._shortOfJobs = shortOfJobs;
  self._capacity = capacity;
}

/**
 * One person a tick moves out of a house that has less room than people in
 * it - out of the newest of them, for the city and for every part cut off
 * from it.
 */
function moveOut(self, buildings) {
  var roads = self.city.roadService,
    leaving = {},
    id,
    n,
    i;

  for (i = 0; i < buildings.length; i++) {
    id = buildings[i].id;
    n = self._residents[id];

    if (n > 0 && n > (self._room[id] || 0))
      leaving[roads.cutOff(buildings[i]) || CITY] = id;
  }

  for (var part in leaving) take(self, leaving[part], 1);
}

/**
 * People come to the city, or leave it, as it is pleasant to live in: while
 * it is, as many come a tick as the root of the room there is for them, and
 * move into the oldest houses with room; while it is not, a hundredth of the
 * city leaves at most, out of the newest.
 */
function grow(self, buildings) {
  var free = 0,
    population = self.getPopulation(),
    avgEco = self.city.tilesParams.avgEco(),
    //(-1, 1)
    effect = avgEco / (MAX_PARAM_VAL / 2) - 1,
    id,
    i;

  for (i = 0; i < buildings.length; i++) {
    id = buildings[i].id;
    free += Math.max(0, (self._room[id] || 0) - (self._residents[id] || 0));
  }

  if (effect < 0) self._joining += population * 0.01 * effect;
  else self._joining += (free > 0 ? Math.max(1, Math.sqrt(free)) : 0) * effect;

  if (self._joining >= 1) settle(self, buildings, Math.floor(self._joining));
  else if (self._joining <= -1)
    evict(self, buildings, -Math.ceil(self._joining));

  //whoever had nowhere to go, or nobody to go, does not wait for next tick
  self._joining -= Math.trunc(self._joining);
}

//n more into the oldest of the city's houses with room for them
function settle(self, buildings, n) {
  var id, room, i;

  for (i = 0; i < buildings.length && n > 0; i++) {
    id = buildings[i].id;
    room = Math.min(n, (self._room[id] || 0) - (self._residents[id] || 0));

    if (room <= 0) continue;

    self._residents[id] = (self._residents[id] || 0) + room;
    n -= room;
  }

  self._counted = null;
}

//n fewer, out of the newest of the city's houses
function evict(self, buildings, n) {
  var roads = self.city.roadService,
    out,
    i;

  for (i = buildings.length - 1; i >= 0 && n > 0; i--) {
    if (!(self._residents[buildings[i].id] > 0)) continue;
    if (roads.cutOff(buildings[i]) !== null) continue;

    out = Math.min(n, self._residents[buildings[i].id]);
    take(self, buildings[i].id, out);
    n -= out;
  }
}

function take(self, id, n) {
  var left = (self._residents[id] || 0) - n;

  if (left > 0) self._residents[id] = left;
  else delete self._residents[id];

  self._counted = null;
}

function payTaxes(self) {
  var money = {};
  money[Resource.money] = self.getTaxIncomeAmount();
  self.city.resourcesModule.add(money);
}

export default CityPopulation;
