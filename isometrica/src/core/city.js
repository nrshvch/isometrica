import namespace from "namespace";
import Events from "events";
import Laboratory from "./city/laboratory";
import CityStats from "./city/citystats";
import CityBuildings from "./city/citybuildings";
import CityResources from "./city/cityresources";
import CityTilesParams from "./city/citytilesparams";
import CityPopulation from "./city/citypopulation";
import CityJobs from "./city/cityjobs";
import CityWater from "./city/citywater";
import CityRoads from "./city/cityroads";
import ServiceCode from "./servicecode";
import Resource from "./resourcecode";
import BuildingCode from "../data/buildingcode";
import BuildingClassCode from "../data/classcode";
import BuildingData from "../data/buildings";
import Config from "./config";
import Terrain from "./terrain";
import ErrorCode from "./errorcode";
import TerrainType from "./terraintype";
import Surface from "./surface";
import Rotation from "./rotation";

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

  this.statsService.init();
  this.waterService.init();
  this.roadService.init();
  this.populationService.init();
  this.buildingService.init();

  Events.on(world, world.events.tick, this.onTick, { self: this });
}

City.events = events;

City.prototype._name = "";
City.prototype.world = null;
City.prototype._tile = -1;

/**
 * A city is founded with its first house - a family or a few settling
 * somewhere (CityPopulation.canFound) - and puts up a town hall once it has
 * grown into a town.
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

  //true for any road, or the least of one it wants - a gravel lane for a
  //village's houses, a cobbled street for the rest (data/buildings)
  var road = requires[ServiceCode.road];

  if (road && !this.roadService.reaches(building, road))
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
    this.populationService.getTaxes(building)
  );
};

/**
 * Where the city's money came from and went on the last tick, the way the
 * buildings were paid and billed for it (see Building): the taxes of the
 * people in the houses, what the businesses took over the counter, and the
 * upkeep of the water towers, the city hall and the rest - the roads cost
 * nothing to keep.
 *
 * @returns {{taxes: number, commerce: number, income: number, water: number,
 *          cityHall: number, other: number, upkeep: number, net: number}}
 *          money per tick, upkeep as what is paid
 */
City.prototype.getBudget = function () {
  var buildings = this.buildingService.getBuildings(),
    r = {
      taxes: this.populationService.getTaxIncomeAmount(),
      commerce: 0,
      water: 0,
      cityHall: 0,
      other: 0,
    },
    building,
    data,
    paid,
    i;

  for (i = 0; i < buildings.length; i++) {
    building = buildings[i];
    data = building.data;

    r.commerce += building.producing[Resource.money] || 0;

    paid = building.demanding[Resource.money] || 0;

    if (paid === 0) continue;

    if (data.waterRadius) {
      //whatever waters the town: a water tower, a pump station
      r.water += paid;
    } else if (building.buildingCode === BuildingCode.cityHall) {
      r.cityHall += paid;
    } else {
      r.other += paid;
    }
  }

  r.income = r.taxes + r.commerce;
  r.upkeep = r.water + r.cityHall + r.other;
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

  //anything standing is the city's to clear - there are no borders - and a
  //tree or a rock is part of the world, so it can go anywhere
  return true;
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
 * The middle of the town, which is where its name goes and the camera goes
 * back to: its town hall, if one stands on its roads (CityRoads#townHall) -
 * a town's centre need not be the thick of it, it can be a square or a park
 * - and otherwise the middle of what stands on its roads, the roads left
 * out. Before anything does, the middle of whatever it has built; before
 * that, where it was founded.
 *
 * @returns {{x: number, y: number}} in tiles, not whole ones
 */
City.prototype.center = function () {
  var hall = this.roadService.townHall(),
    buildings = this.buildingService.getBuildings(),
    on = [],
    all = [],
    classCode,
    b,
    i;

  if (hall !== null) return middleOf([hall]);

  for (i = 0; i < buildings.length; i++) {
    b = buildings[i];
    classCode = b.data.classCode;

    if (
      classCode === BuildingClassCode.road ||
      classCode === BuildingClassCode.tree
    )
      continue;

    all.push(b);
    if (this.roadService.onNetwork(b)) on.push(b);
  }

  if (on.length > 0) return middleOf(on);
  if (all.length > 0) return middleOf(all);

  return {
    x: Terrain.extractX(this.tile()),
    y: Terrain.extractY(this.tile()),
  };
};

//the middle of the footprints of buildings, in tiles
function middleOf(buildings) {
  var x = 0,
    y = 0,
    b,
    i;

  for (i = 0; i < buildings.length; i++) {
    b = buildings[i];

    x +=
      Terrain.extractX(b.tile) + Rotation.sizeX(b.data, b.rotation) / 2 - 0.5;
    y +=
      Terrain.extractY(b.tile) + Rotation.sizeY(b.data, b.rotation) / 2 - 0.5;
  }

  return { x: x / buildings.length, y: y / buildings.length };
}

/**
 * Everything of the city that came from the player: what they named it, where
 * they put it, what they have and what they built. What they cleared away is
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
    research: this.laboratoryService.save(),
    buildings: this.buildingService.save(),
  };
};

/**
 * Puts a saved city back together. The order is the one the city grew in:
 * research opens the buildings up, the ground is cleared,
 * and only then does anything stand on it.
 *
 * @param data {Object} as City#save left it
 */
City.prototype.load = function (data) {
  this.name(data.name || "");

  if (data.established !== undefined) this.timeEstablished = data.established;

  this.laboratoryService.load(data.research || {});
  //the land a save of before bought (data.area) is no more: the city has
  //it all
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
 * What putting code down on each of anchors would come to as the first of a
 * city - which they would found: quoted the way CityBuildings#quoteSelection
 * quotes, out of what a city is founded with, for a house it can be founded
 * with (CityPopulation.canFound) and nothing else.
 *
 * @param world
 * @param code {number}
 * @param anchors {number[]}
 * @param [rotation] {number}
 * @returns {Array} as CityBuildings#quoteSelection
 */
City.quoteFounding = function (world, code, anchors, rotation) {
  if (!CityPopulation.canFound(BuildingData[code])) return [];

  return CityBuildings.quote(
    {
      world: world,
      resources: CityResources.START,
      available: null,
      cityHall: false,
    },
    code,
    anchors,
    rotation,
  );
};

/**
 * A city, founded where its first house is to go up - which the founder
 * builds then, as any other.
 *
 * @param world
 * @param tile
 * @param name
 * @returns {City}
 */
City.establish = function (world, tile, name) {
  var city = new City(world, tile);
  city.name(name);
  return city;
};

export default City;
