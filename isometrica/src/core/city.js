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
import BuildingState from "./buildingstate";

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
 * A city is founded with whatever goes up first - its first house, a family
 * or a few settling somewhere, as often as not (City.quoteFounding) - and
 * puts up a town hall once it has grown into a town.
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

  //part of the city first, standing near enough to it - whatever it is, and
  //all a village's house wants (core/city/cityroads)
  if (this.roadService.cutOff(building) !== null) return ServiceCode.linked;

  if (requires === undefined) return null;

  //true for any road, or the least of one it wants - a cobbled street for a
  //house in town, say (data/buildings)
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
 * How many of the city's buildings are going without, per service - one cut
 * off from it going without being part of it (ServiceCode.linked), whatever
 * else it wants. What is still going up wants nothing yet.
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
    if (buildings[i].getState() !== BuildingState.ready) continue;

    missing = this.missing(buildings[i]);

    if (missing !== null) r[missing]++;
  }

  return r;
};

City.prototype.onTick = function (sender, args, meta) {
  var self = meta.self;
  Events.fire(self, self.events.update, self);
};

//whether what stands is a building that is demolished - brought down a
//tile at a time, the world keeping it till its last tile is down - rather
//than cleared away at once: anything but a tree or a road
function demolished(building) {
  return (
    building !== null &&
    building.data.classCode !== BuildingClassCode.tree &&
    building.data.classCode !== BuildingClassCode.road
  );
}

//what of a building demolishing it would clear (demolished): its tiles still
//standing that are not being cleared already - and what it comes to, one
//clearTileCost for every tile of it, but nothing for one being demolished,
//paid for already
function demolitionOf(self, building) {
  var terrain = self.world.terrain;

  return {
    tiles: building.standingTiles().filter(function (t) {
      return !terrain.beingCleared(t);
    }),
    cost: building.demolishing
      ? 0
      : building.tiles().length * Config.clearTileCost,
  };
}

/**
 * The tiles clearing the tile clears: every tile of whatever stands on it -
 * a building comes down whole - or the tile, for a tree or stones the world
 * put there; none, for bare ground, which has nothing to clear away.
 */
function clearedBy(self, tile) {
  var building = self.world.buildingService.get(tile),
    out = [];

  if (building === null)
    return self.world.envService.hasScenery(tile) ? [tile] : out;

  //anything standing is the city's to clear - there are no borders - and a
  //tree or a rock is part of the world, so it can go anywhere
  var iter = building.occupiedTiles();

  while (!iter.done) out.push(iter.next());

  return out;
}

/**
 * What clearing these tiles would come to - one clearTileCost for every
 * tile it clears, every tile of a building on any of them - without
 * clearing any of them.
 *
 * @param tiles {number[]}
 * @returns {{error: number, tile: number, cost: number}} as #quoteTerraform;
 *          BEING_CLEARED, rather than nothing to clear, for tiles still
 *          being cleared from before (Terrain#beingCleared)
 */
City.prototype.quoteClear = function (tiles) {
  var cleared = Object.create(null),
    count = 0,
    busy = false,
    i;

  var buildings = [],
    paid = 0,
    more = false;

  for (i = 0; i < tiles.length; i++) {
    var building = this.world.buildingService.get(tiles[i]);

    //a building, demolished: what of it is left to clear, once
    if (demolished(building)) {
      if (buildings.indexOf(building) !== -1) continue;
      buildings.push(building);

      var d = demolitionOf(this, building);

      if (d.tiles.length === 0) busy = true;
      else {
        paid += d.cost;
        more = true;
      }
      continue;
    }

    clearedBy(this, tiles[i]).forEach(function (tile) {
      if (cleared[tile] === true) return;

      cleared[tile] = true;
      count++;
    });

    if (this.world.terrain.beingCleared(tiles[i])) busy = true;
  }

  var cost = count * Config.clearTileCost + paid;

  return {
    error:
      cost === 0 && !more
        ? busy
          ? ErrorCode.BEING_CLEARED
          : ErrorCode.NOTHING_TO_CLEAR
        : this.resourcesService.hasEnoughResource(Resource.money, cost)
          ? ErrorCode.NONE
          : ErrorCode.NOT_ENOUGH_RES,
    tile: tiles[0],
    cost: cost,
  };
};

/**
 * Clears a tile, and pays one clearTileCost for it - a tree, a road, stones
 * the world put there, gone there and then. A building standing on it is
 * demolished instead: paid for once, one clearTileCost for every tile of it,
 * and kept, being demolished (Building demolishing), till its last tile is
 * down (#tileDown) - asked again, after a reload say, it is only its tiles
 * still standing sent for again, for nothing (buildingDemolish). The tiles
 * cleared are being cleared from then on (Terrain#beingCleared) - nothing
 * built on them, nor the ground moved under them - until whoever shows it
 * being done says it is.
 *
 * @param tile {number}
 * @returns {number[]} the tiles cleared - none where there was nothing to
 *          clear, or not the money to - with what it came to, cost
 */
City.prototype.clearTile = function (tile) {
  var building = this.world.buildingService.get(tile);

  if (demolished(building)) return demolish(this, building);

  var tiles = clearedBy(this, tile),
    terrain = this.world.terrain,
    cost = tiles.length * Config.clearTileCost,
    i;

  if (
    tiles.length === 0 ||
    !this.resourcesService.hasEnoughResource(Resource.money, cost)
  )
    return [];

  //being cleared before any of it goes, for whoever shows it going
  for (i = 0; i < tiles.length; i++) terrain.startClearing(tiles[i]);
  for (i = 0; i < tiles.length; i++) terrain.clear(tiles[i]);

  this.resourcesModule.subResource(Resource.money, cost);
  tiles.cost = cost;

  return tiles;
};

/**
 * Demolishes a building (#clearTile): its tiles still standing being cleared
 * - paid for the first time it is asked, every tile of it - and whoever shows
 * it told to send the bulldozers to them (buildingDemolish), the building
 * kept till they have brought it down, a tile at a time (#tileDown).
 */
function demolish(self, building) {
  var d = demolitionOf(self, building),
    terrain = self.world.terrain,
    service = self.world.buildingService,
    tiles = d.tiles;

  if (
    tiles.length === 0 ||
    !self.resourcesService.hasEnoughResource(Resource.money, d.cost)
  )
    return [];

  var first = !building.demolishing;

  if (first) {
    building.demolishing = true;
    building.down = building.down || [];
    self.resourcesModule.subResource(Resource.money, d.cost);
  }

  tiles.forEach(function (t) {
    terrain.startClearing(t);
  });
  Events.fire(service, service.events.buildingDemolish, {
    building: building,
    tiles: tiles,
  });
  //out of service from now on
  if (first)
    Events.fire(building, building.events.stateChange, building.getState());
  tiles.cost = d.cost;

  return tiles;
}

/**
 * A tile of a building being demolished is down, its rubble pushed away
 * (client/demolition): the ground there bare - and the building gone once
 * its last tile is.
 *
 * @param tile {number}
 */
City.prototype.tileDown = function (tile) {
  var building = this.world.buildingService.get(tile),
    terrain = this.world.terrain;

  if (building === null || !building.demolishing || building.isDown(tile))
    return;

  building.down.push(tile);
  terrain.bare(tile);

  if (building.standingTiles().length === 0)
    building.tiles().forEach(function (t) {
      terrain.clear(t);
    });
  else Events.fire(building, building.events.stateChange, building.getState());
};

/**
 * What putting code up in the place of what stands on tile would come to -
 * what stands there cleared away first, every tile of it, as clearing it
 * would (#clearTile), and code going up on its ground once it is gone
 * (#replace) - without doing any of it. code has to cover just the ground
 * that stands on, turned rotation times.
 *
 * @param tile {number} any tile of what stands there
 * @param code {number} a building, or a type - any of its variants
 * @param rotation {number} quarter turns, 0..3
 * @returns {{error: number, tile: number, cost: number, clearing: number}}
 *          error an ErrorCode, tile the corner of what stands there; cost
 *          all of it, clearing included - even when the city cannot
 *          afford it (NOT_ENOUGH_RES)
 */
City.prototype.quoteReplace = function (tile, code, rotation) {
  var building = this.world.buildingService.get(tile),
    data = BuildingData[parseInt(code, 10)],
    r = { error: ErrorCode.NONE, tile: tile, cost: 0, clearing: 0 };

  if (
    building === null ||
    building.data.classCode === BuildingClassCode.tree ||
    building.data.classCode === BuildingClassCode.road
  ) {
    r.error = ErrorCode.NOTHING_TO_CLEAR;
    return r;
  }

  r.tile = building.tile;

  if (data === undefined || data.classCode === BuildingClassCode.road) {
    r.error = ErrorCode.BUILDING_NOT_AVAIL;
    return r;
  }

  if (
    Rotation.sizeX(data, rotation) !==
      Rotation.sizeX(building.data, building.rotation) ||
    Rotation.sizeY(data, rotation) !==
      Rotation.sizeY(building.data, building.rotation)
  ) {
    r.error = ErrorCode.WRONG_FOOTPRINT;
    return r;
  }

  var cost = CityBuildings.costOf(parseInt(code, 10)),
    money;

  //demolished, paid for already; being brought down, nothing more to send
  var d = demolitionOf(this, building);

  if (d.tiles.length === 0) {
    r.error = ErrorCode.BEING_CLEARED;
    return r;
  }

  r.clearing = d.cost;
  money = (cost[Resource.money] || 0) + r.clearing;
  r.cost = money;

  if (this.laboratoryService.getAvailableBuildings()[code] !== true)
    r.error = ErrorCode.BUILDING_NOT_AVAIL;
  //one town hall to a city - unless it is the town hall going
  else if (
    parseInt(code, 10) === BuildingCode.cityHall &&
    this.buildingService.cityHall !== null &&
    this.buildingService.cityHall !== building
  )
    r.error = ErrorCode.CITY_HALL_ALREADY_BUILT;
  else if (
    !this.resourcesService.hasEnoughResource(Resource.money, money) ||
    !this.resourcesService.hasEnough(withoutMoney(cost))
  )
    r.error = ErrorCode.NOT_ENOUGH_RES;

  return r;
};

//a bill, but for the money on it
function withoutMoney(cost) {
  var out = {};

  for (var key in cost) if (key !== Resource.money) out[key] = cost[key];

  return out;
}

/**
 * Puts code up in the place of what stands on tile: what stands there
 * cleared away (#clearTile) - fenced off, coming down as the bulldozers get
 * to it, in the game (client/clearworks, client/demolition) - and code
 * going up on its ground, a building site, as soon as the last of it is
 * gone (CityBuildings#replaceLater), its ground kept for it meanwhile. All
 * of it paid for there and then - the clearing and code alike - so that
 * what was asked for goes up whatever the money does meanwhile, and goes
 * up from a save too (CityBuildings#saveReplacing).
 *
 * @param tile {number} any tile of what stands there
 * @param code {number} a building, or a type - any of its variants
 * @param rotation {number} quarter turns, 0..3
 * @param [look] {Object} for one put together out of parts, what it looks
 *        like (client/compoundbuilding) - one is picked for it otherwise
 * @returns {{error: number, tile: number, cost: number, tiles: number[]}}
 *          as #quoteReplace, and the tiles cleared - none, for an error
 */
City.prototype.replace = function (tile, code, rotation, look) {
  code = CityBuildings.variantOf(parseInt(code, 10));

  var quote = this.quoteReplace(tile, code, rotation),
    tiles;

  if (quote.error !== ErrorCode.NONE)
    return {
      error: quote.error,
      tile: quote.tile,
      cost: quote.cost,
      tiles: [],
    };

  tiles = this.clearTile(tile);

  if (tiles.length === 0)
    return {
      error: ErrorCode.NOT_ENOUGH_RES,
      tile: quote.tile,
      cost: quote.cost,
      tiles: [],
    };

  this.resourcesService.sub(CityBuildings.costOf(code));
  this.buildingService.replaceLater(code, quote.tile, rotation, look);

  return {
    error: ErrorCode.NONE,
    tile: quote.tile,
    cost: quote.cost,
    tiles: tiles,
  };
};

/**
 * Blows up what stands on tile, for nothing: the building is gone there and
 * then, every tile of it - no fence, no bulldozer (client/explosion) - the
 * ground under it bare earth, never grown over by the world again (Terrain
 * clear), and a heap of rubble left lying on every tile of it
 * (CityBuildings#leaveRubble), till it is cleared away or built over - all
 * of them one pile, of its own: not one with the heaps of anything blown
 * up next to it.
 *
 * @param tile {number} any tile of what stands there
 * @returns {{error: number, tile: number, tiles: number[]}} error an
 *          ErrorCode - NOTHING_TO_CLEAR for nothing there to blow up, a
 *          tree or a road; tile the corner of what stood there, and tiles
 *          every tile of it - none, for an error
 */
City.prototype.explode = function (tile) {
  var building = this.world.buildingService.get(tile),
    terrain = this.world.terrain,
    tiles = [],
    self = this;

  if (
    building === null ||
    building.data.classCode === BuildingClassCode.tree ||
    building.data.classCode === BuildingClassCode.road
  )
    return { error: ErrorCode.NOTHING_TO_CLEAR, tile: tile, tiles: tiles };

  var iter = building.occupiedTiles();

  while (!iter.done) tiles.push(iter.next());

  tiles.forEach(function (t) {
    terrain.clear(t);
  });
  //which pile its heaps are, of all the piles there are
  var pile = 1 + Math.floor(Math.random() * 2147483646);

  tiles.forEach(function (t) {
    self.buildingService.leaveRubble(t, pile);
  });

  return { error: ErrorCode.NONE, tile: building.tile, tiles: tiles };
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

    //not where the ground is still being cleared - nor where something is
    //to go up once the rest of it is (CityBuildings#replaceLater)
    if (terrain.beingCleared(tile) || world.buildingService.reserved(tile))
      return { error: ErrorCode.BEING_CLEARED, tile: tile, cost: 0 };

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
 * back to: its town hall, if one stands in it (CityRoads#townHall) - a
 * town's centre need not be the thick of it, it can be a square or a park -
 * and otherwise the middle of what is part of it, the roads left out.
 * Before anything is, the middle of whatever it has built; before that,
 * where it was founded.
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
    if (this.roadService.linked(b)) on.push(b);
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
    //what is to go up where something is coming down for it
    replacing: this.buildingService.saveReplacing(),
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
  //and what was to go up where something was coming down for it, on ground
  //that is clear by now
  this.buildingService.loadReplacing(data.replacing);

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
 * quotes, out of what a city is founded with, for anything that is offered to
 * be built.
 *
 * @param world
 * @param code {number}
 * @param anchors {number[]}
 * @param [rotation] {number}
 * @returns {Array} as CityBuildings#quoteSelection
 */
City.quoteFounding = function (world, code, anchors, rotation) {
  var data = BuildingData[code];

  if (data === undefined || data.hidden) return [];

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
 * A city, founded where the first of it is to go up - which the founder
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
