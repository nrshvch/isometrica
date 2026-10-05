import namespace from "namespace";
import Events from "events";
import Laboratory from "./city/laboratory";
import CityStats from "./city/citystats";
import Area from "./city/area";
import CityBuildings from "./city/citybuildings";
import CityResources from "./city/cityresources";
import CityTilesParams from "./city/citytilesparams";
import CityPopulation from "./city/citypopulation";
import CityJobs from "./city/cityjobs";
import CityWater from "./city/citywater";
import CityRoads from "./city/cityroads";
import ServiceCode from "./servicecode";
import Resource from "./resourcecode";
import BuildingCode from "data/buildingcode";
import BuildingClassCode from "data/classcode";
import BuildingData from "data/buildings";
import Config from "./config";
import Terrain from "./terrain";
import ErrorCode from "./errorcode";
import TerrainType from "./terraintype";
import Surface from "./surface";

var Core = namespace("Isometrica.Core");

Core.City = City;

var id = 0;

var events =
  (City.events =
  City.prototype.events =
    {
      update: 0,
      rename: 1,
    });

/**
 *
 * @param world
 * @param tile
 * @constructor
 */
function City(world, tile) {
  this.update = Events.event(events.update);
  this.rename = Events.event(events.rename);

  this.root = this.world = world;
  this._id = id++;
  this._tile = tile;
  this.timeEstablished = world.time.milliseconds;

  this.area = this.areaService = new Area(this);
  this.tilesParams = this.tileParamsService = new CityTilesParams(this);
  this.resourcesModule =
    this.resources =
    this.resourcesService =
      new CityResources(this);
  this.statsService = new CityStats(this);
  this.populationService = this.population = new CityPopulation(this);
  this.jobs = this.jobsService = new CityJobs(this);
  this.lab = this.laboratoryService = new Laboratory(this);
  this.buildings = this.buildingService = new CityBuildings(this);
  this.water = this.waterService = new CityWater(this);
  this.roads = this.roadService = new CityRoads(this);

  //register city in influence map
  //this.root.areaService.registerCity(this);

  this.statsService.init();
  this.waterService.init();
  this.roadService.init();
  this.populationService.init();
  this.areaService.init();
  this.buildingService.init();

  Events.on(world, world.events.tick, this.onTick, { self: this });
  Events.on(world, world.events.tick, onLandTick, this);
}

/**
 * What the land costs to hold, on every tick, when there is no town hall to
 * bill it to (see the town hall's upkeepPerTile in data/buildings): so much
 * for every tile bought on top of the block the city was founded on -
 * nothing while nobody lives in the town.
 *
 * @returns {number} money per tick
 */
function landUpkeep(self) {
  if (self.buildingService.cityHall !== null) return 0;
  if (self.populationService.getPopulation() === 0) return 0;

  return (
    (BuildingData[BuildingCode.cityHall].upkeepPerTile || 0) *
    self.areaService.getBoughtTileCount()
  );
}

function onLandTick(sender, args, self) {
  var due = landUpkeep(self);

  if (due > 0) self.resourcesService.subResource(Resource.money, due);
}

City.events = events;

City.prototype._name = "";
City.prototype.world = null;
City.prototype._tile = -1;

/**
 * A city is founded on bare land: a small town has no need of a town hall,
 * and the player puts one up when it has grown into one.
 */
City.prototype.init = function () {};

/**
 * What this building wants from the city and is not getting.
 *
 * A street comes before the mains - it is the first thing the player should
 * put right, and the one the game complains about first - so a house with
 * neither road nor water is reported as missing its road.
 *
 * @param building {Building}
 * @returns {string|null} a ServiceCode, or null when the building has all it
 *                        asks for (which is everything a shed asks for)
 */
City.prototype.missing = function (building) {
  var requires = BuildingData[building.buildingCode].requires;

  if (requires === undefined) return null;

  if (
    requires[ServiceCode.road] === true &&
    !this.roadService.reaches(building)
  )
    return ServiceCode.road;

  if (
    requires[ServiceCode.water] === true &&
    !this.waterService.serves(building)
  )
    return ServiceCode.water;

  return null;
};

/**
 * What a building did for the treasury on the last tick: what it made, less
 * what it cost to run, plus the taxes of whoever lives in it.
 *
 * @param building {Building}
 * @returns {number} money per tick, negative when it costs more than it brings
 */
City.prototype.getBuildingIncome = function (building) {
  return (
    (building.producing[Resource.money] || 0) -
    (building.demanding[Resource.money] || 0) +
    this.populationService.getResidents(building) *
      CityPopulation.taxPerResident(building.data)
  );
};

/**
 * Where the city's money came from and went on the last tick, the way the
 * buildings were paid and billed for it (see Building): the taxes of the
 * people in the houses, what the businesses took over the counter, and the
 * upkeep of the roads, the water towers and the city hall - which is billed
 * for the offices themselves and for every tile of land bought on top of the
 * block the city was founded on.
 *
 * @returns {{taxes: number, commerce: number, income: number, roads: number,
 *          water: number, land: number, cityHall: number, other: number,
 *          upkeep: number, net: number}} money per tick, upkeep as what is paid
 */
City.prototype.getBudget = function () {
  var buildings = this.buildingService.getBuildings(),
    r = {
      taxes: this.populationService.getTaxIncomeAmount(),
      commerce: 0,
      roads: 0,
      water: 0,
      land: 0,
      cityHall: 0,
      other: 0,
    },
    building,
    data,
    paid,
    flat,
    i;

  for (i = 0; i < buildings.length; i++) {
    building = buildings[i];
    data = building.data;

    r.commerce += building.producing[Resource.money] || 0;

    paid = building.demanding[Resource.money] || 0;

    if (paid === 0) continue;

    if (data.classCode === BuildingClassCode.road) {
      r.roads += paid;
    } else if (data.waterRadius) {
      //whatever waters the town: a water tower, a pump station
      r.water += paid;
    } else if (building.buildingCode === BuildingCode.cityHall) {
      //the flat part is the offices, the rest is the land
      flat = Math.min(
        paid,
        (data.demanding && data.demanding[Resource.money]) || 0,
      );
      r.cityHall += flat;
      r.land += paid - flat;
    } else {
      r.other += paid;
    }
  }

  //the land, when there is no town hall it is billed through
  r.land += landUpkeep(this);

  r.income = r.taxes + r.commerce;
  r.upkeep = r.roads + r.water + r.land + r.cityHall + r.other;
  r.net = r.income - r.upkeep;

  return r;
};

/**
 * How many people all the houses have room for, jobs or no jobs - unlike
 * CityPopulation#getCapacity, which only counts the beds there is work for.
 *
 * @returns {number}
 */
City.prototype.getHousingSlots = function () {
  var buildings = this.buildingService.getBuildings(),
    r = 0,
    i;

  for (i = 0; i < buildings.length; i++) r += buildings[i].citizenCapacity();

  return r;
};

/**
 * How many of the city's buildings are going without, per service.
 *
 * @returns {Object} ServiceCode -> count
 */
City.prototype.getMissingServices = function () {
  var buildings = this.buildingService.getBuildings(),
    r = {},
    missing,
    i;

  for (var name in ServiceCode) r[ServiceCode[name]] = 0;

  for (i = 0; i < buildings.length; i++) {
    missing = this.missing(buildings[i]);

    if (missing !== null) r[missing]++;
  }

  return r;
};

City.prototype.onTick = function (sender, args, meta) {
  var self = meta.self;
  Events.fire(self, self.events.update, self);
};

/**
 * Whether there is anything on the tile the city may clear away.
 */
function clearable(self, tile) {
  var building = self.world.buildingService.get(tile);

  //bare ground has nothing to clear away, so it is free and does nothing
  if (building === null) return self.world.envService.hasScenery(tile);

  //roads may be laid outside of the borders, so they have to be
  //removable out there as well - any other building is city land only.
  //A tree or a rock is part of the world, not of the city, so it can go
  //anywhere
  return (
    self.areaService.contains(tile) ||
    BuildingData[building.buildingCode].classCode === BuildingClassCode.road
  );
}

/**
 * What clearing these tiles would come to - one clearTileCost for each that
 * has anything on it to clear - without clearing any of them.
 *
 * @param tiles {number[]}
 * @returns {{error: number, tile: number, cost: number}} as #quoteTerraform
 */
City.prototype.quoteClear = function (tiles) {
  var cost = 0,
    i;

  for (i = 0; i < tiles.length; i++) {
    if (clearable(this, tiles[i])) cost += Config.clearTileCost;
  }

  return {
    error:
      cost === 0
        ? ErrorCode.NOTHING_TO_CLEAR
        : this.resourcesService.hasEnoughResource(Resource.money, cost)
          ? ErrorCode.NONE
          : ErrorCode.NOT_ENOUGH_RES,
    tile: tiles[0],
    cost: cost,
  };
};

City.prototype.clearTile = function (tile) {
  if (
    !clearable(this, tile) ||
    !this.resourcesService.hasEnoughResource(
      Resource.money,
      Config.clearTileCost,
    )
  )
    return false;

  this.world.terrain.clear(tile);
  this.resourcesModule.subResource(Resource.money, Config.clearTileCost);
  return true;
};

/**
 * Raises or lowers tiles as one piece of land, whatever shape they make - see
 * Terrain#planLevel for what that does to the ground - and pays for it. The
 * ground belongs to the world, not to the city, so it can be shaped anywhere;
 * the city only foots the bill.
 *
 * Every tile the ground moves under is a tile modified, whether it was picked
 * or only dragged along: each costs terraformTileCost - ten times that for
 * water being raised - plus clearing whatever tree or rock was on it, the
 * ones the player put there included. A building or a road on any of them
 * stays standing where its surface still fits the ground (core/surface), on
 * concrete that takes up the difference, the way OpenTTD lets land be shaped
 * under a building; any other stops the whole thing.
 *
 * @param tiles {number[]}
 * @param direction {number} 1 to raise, -1 to lower
 * @returns {{error: number, tile: number, cost: number, tiles: number[],
 *          kept: Building[]}} error is an ErrorCode, and tile the tile it is
 *          about; cost is what was paid; tiles every tile the ground moved
 *          under, and kept what stood on them and stays
 */
City.prototype.terraform = function (tiles, direction) {
  var quote = this.quoteTerraform(tiles, direction),
    terrain = this.world.terrain,
    keep = Object.create(null),
    i;

  if (quote.error !== ErrorCode.NONE)
    return { error: quote.error, tile: quote.tile, cost: 0 };

  //cleared by hand, since the ground only clears the tiles it never did
  //before
  for (i = 0; i < quote.planted.length; i++)
    terrain.clearTile(quote.planted[i]);

  //what stays stands on its surface where it stood, the ground under it
  //moved
  quote.kept.forEach(function (building) {
    var iter = building.occupiedTiles();

    while (!iter.done) keep[iter.next()] = true;
  });

  terrain.modify(quote.plan, keep);
  this.resourcesModule.subResource(Resource.money, quote.cost);

  return {
    error: ErrorCode.NONE,
    tile: quote.tile,
    cost: quote.cost,
    tiles: quote.plan.tiles,
    kept: quote.kept,
  };
};

/**
 * What #terraform would do and charge, without doing it: cost is the price
 * even when the city cannot afford it (NOT_ENOUGH_RES), and 0 when it cannot
 * be done at all.
 *
 * @param tiles {number[]}
 * @param direction {number} 1 to raise, -1 to lower
 * @returns {{error: number, tile: number, cost: number, plan: Object,
 *          planted: number[], kept: Building[], blocked: number[]}} plan,
 *          planted and kept - what stays standing - are for
 *          #terraform to carry out: the ground to move and the trees put down
 *          in its way. blocked is, with TILE_TAKEN, every tile the buildings
 *          in the way stand on - the whole of each of them
 */
City.prototype.quoteTerraform = function (tiles, direction) {
  var world = this.world,
    terrain = world.terrain,
    plan = terrain.planLevel(tiles, direction),
    tile0 = tiles[0],
    cost = 0,
    planted = [],
    blocked = [],
    blockers = Object.create(null),
    kept = [],
    keeps = Object.create(null),
    after,
    tile,
    building,
    occupied,
    i;

  if (plan === null)
    return { error: ErrorCode.TERRAFORM_TOO_LARGE, tile: tile0, cost: 0 };

  after = terrain.after(plan);

  for (i = 0; i < plan.tiles.length; i++) {
    tile = plan.tiles[i];

    building = world.buildingService.get(tile);

    //a tree or cliff the player put down goes the way a wild one does
    if (building !== null) {
      //one whose surface fits the ground as it will be stays, on concrete
      //that takes up the difference (core/surface) - the ground under it
      //is paid for all the same
      if (keeps[building.tile] === undefined)
        keeps[building.tile] =
          BuildingData[building.buildingCode].classCode !==
            BuildingClassCode.tree && Surface.standsOn(after, building);

      if (keeps[building.tile] === true) {
        if (kept.indexOf(building) === -1) kept.push(building);
      }
      //every one of them, so that the player sees all there is to
      //move out of the way rather than one at a time
      else if (
        BuildingData[building.buildingCode].classCode !== BuildingClassCode.tree
      ) {
        if (blockers[building.tile] !== true) {
          blockers[building.tile] = true;

          occupied = building.occupiedTiles();
          while (!occupied.done) blocked.push(occupied.next());
        }

        continue;
      } else {
        planted.push(building.tile);
        cost += Config.clearTileCost;
      }
    }

    //what the tile is and what grows there are looked up before the
    //ground moves
    cost +=
      Config.terraformTileCost *
      (direction > 0 && terrain.getTerrainType(tile) === TerrainType.water
        ? Config.terraformWaterFactor
        : 1);

    if (world.envService.hasScenery(tile)) cost += Config.clearTileCost;
  }

  if (blocked.length > 0)
    return {
      error: ErrorCode.TILE_TAKEN,
      tile: blocked[0],
      cost: 0,
      blocked: blocked,
    };

  return {
    error: this.resourcesService.hasEnoughResource(Resource.money, cost)
      ? ErrorCode.NONE
      : ErrorCode.NOT_ENOUGH_RES,
    tile: tile0,
    cost: cost,
    plan: plan,
    planted: planted,
    kept: kept,
  };
};

/**
 *
 * @returns {number}
 */
City.prototype.id = function () {
  return this._id;
};

/**
 *
 * @param value
 * @returns {*}
 */
City.prototype.name = function (value) {
  if (value !== undefined) {
    this._name = value;
    Events.fire(this, events.rename, value);
    return value;
  }
  return this._name;
};

/**
 *
 * @param value
 * @returns {int}
 */
City.prototype.tile = function (value) {
  if (value !== undefined) return (this._tile = value);
  return this._tile;
};

/**
 * The middle of the town: of all the land it owns, wherever that is - which
 * is where its name is shown.
 *
 * @returns {{x: number, y: number}} in tiles, not whole ones
 */
City.prototype.center = function () {
  return this.areaService.center();
};

/**
 * Everything of the city that came from the player: what they named it, where
 * they put it, what they own and what they built. What they cleared away is
 * the world's, and saved with it (see Terrain#save).
 * Anything the game can work out on its own - production, ratings, what the
 * research opened up - is left to it.
 *
 * @returns {Object}
 */
City.prototype.save = function () {
  return {
    name: this.name(),
    tile: this.tile(),
    established: this.timeEstablished,
    resources: this.resourcesService.save(),
    population: this.populationService.save(),
    area: this.areaService.save(),
    research: this.laboratoryService.save(),
    buildings: this.buildingService.save(),
  };
};

/**
 * Puts a saved city back together. The order is the one the city grew in:
 * research opens the buildings up, the land is bought, the ground is cleared,
 * and only then does anything stand on it.
 *
 * @param data {Object} as City#save left it
 */
City.prototype.load = function (data) {
  this.name(data.name || "");

  if (data.established !== undefined) this.timeEstablished = data.established;

  this.laboratoryService.load(data.research || {});
  this.areaService.load(data.area || []);
  //saves from before the world kept its own cleared tiles have them here -
  //they move over to the world, which saves them from then on
  var cleared = data.clearedTiles || [];
  for (var i = 0; i < cleared.length; i++) this.world.terrain.clear(cleared[i]);

  this.buildingService.load(data.buildings || []);

  //last, so that nothing the restoring did can show up on the bill
  if (data.resources !== undefined) this.resourcesService.load(data.resources);

  this.populationService.load(data.population);
};

/**
 * @deprecated
 * @returns {{name: *, population: *, maxPopulation: *, x: *, y: *, resources: *, resourceProduce: *, resourceDemand: *, maintenanceCost: *}}
 */
City.prototype.toJSON = function () {
  var data = {
    name: this.name(),
    population: this.populationService.getPopulation(),
    maxPopulation: this.populationService.getCapacity(),
    tile: this.tile(),
    resources: this.resources.getResources(),
    resourceProduce: this.statsService.getCityResourceProduce(),
    resourceDemand: this.statsService.getCityResourceDemand(),
    maintenanceCost: this.statsService.getCityBuildingMaintenanceCost(),
  };

  return data;
};

/**
 * Why a city could not be founded on tile, or ErrorCode.NONE when it can: the
 * middle of the land it starts out with has to be ground a building could
 * go up on - flat, dry and free, as a town hall's would be.
 *
 * @param world
 * @param tile
 * @returns {number} ErrorCode
 */
City.establishTest = function (world, tile) {
  return world.buildingService.test(BuildingCode.cityHall, tile, false);
};

/**
 *
 * @param world
 * @param tile
 * @returns {boolean}
 */
City.canEstablish = function (world, tile) {
  return City.establishTest(world, tile) === ErrorCode.NONE;
};

/**
 *
 * @param world
 * @param tile
 * @param name
 * @returns {*}
 */
City.establish = function (world, tile, name) {
  if (!City.canEstablish(world, tile)) return null;

  var city = new City(world, tile);
  city.name(name);
  return city;
};

export default City;
