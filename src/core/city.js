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

var Core = namespace("Isometrica.Core");

Core.City = City;

var id = 0;

var events = City.events = City.prototype.events = {
    update: 0,
    rename: 1
};

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
    this.resourcesModule = this.resources = this.resourcesService = new CityResources(this);
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

    Events.on(world, world.events.tick, this.onTick, {self: this});


}

City.events = events;

City.prototype._name = "";
City.prototype.world = null;
City.prototype._tile = -1;

City.prototype.init = function(){
    this.buildingService.buildBuilding(BuildingCode.cityHall, this.tile());
};

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

    if (requires === undefined)
        return null;

    if (requires[ServiceCode.road] === true && !this.roadService.reaches(building))
        return ServiceCode.road;

    if (requires[ServiceCode.water] === true && !this.waterService.serves(building))
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
    return (building.producing[Resource.money] || 0)
        - (building.demanding[Resource.money] || 0)
        + this.populationService.getResidents(building)
        * CityPopulation.taxPerResident(building.data);
};

/**
 * How many of the city's buildings are going without, per service.
 *
 * @returns {Object} ServiceCode -> count
 */
City.prototype.getMissingServices = function () {
    var buildings = this.buildingService.getBuildings(),
        r = {},
        missing, i;

    for (var name in ServiceCode)
        r[ServiceCode[name]] = 0;

    for (i = 0; i < buildings.length; i++) {
        missing = this.missing(buildings[i]);

        if (missing !== null)
            r[missing]++;
    }

    return r;
};

City.prototype.onTick = function (sender, args, meta) {
    var self = meta.self;
    Events.fire(self, self.events.update, self);
};

City.prototype.clearTile = function (tile) {
    var building = this.world.buildingService.get(tile),
        //roads may be laid outside of the borders, so they have to be
        //removable out there as well - any other building is city land only.
        //A tree is part of the world, not of the city, so it can go anywhere
        allowed = building === null
            || this.areaService.contains(tile)
            || BuildingData[building.buildingCode].classCode === BuildingClassCode.road;

    //bare ground has nothing to clear away, so it is free and does nothing
    if (building === null && this.world.envService.getTree(tile) === null)
        return false;

    if (!allowed || !this.resourcesService.hasEnoughResource(Resource.money, Config.clearTileCost))
        return false;

    this.world.terrain.clear(tile);
    this.resourcesModule.subResource(Resource.money, Config.clearTileCost);
    return true;
};

/**
 * Raises or lowers the rectangle of tiles between tile0 and tile1 as one piece
 * of land - see Terrain#planLevel for what that does to the ground - and pays
 * for it. The ground belongs to the world, not to the city, so it can be
 * shaped anywhere; the city only foots the bill.
 *
 * Every tile the ground moves under is a tile modified, whether it was picked
 * or only dragged along: each costs terraformTileCost - ten times that for
 * water being raised - plus clearing whatever tree grew on it. Nothing may
 * stand on any of them, so a building anywhere in the way stops the whole thing.
 *
 * @param tile0 {number}
 * @param tile1 {number}
 * @param direction {number} 1 to raise, -1 to lower
 * @returns {{error: number, tile: number, cost: number}} error is an
 *          ErrorCode, and tile the tile it is about; cost is what was paid
 */
City.prototype.terraform = function (tile0, tile1, direction) {
    var world = this.world,
        terrain = world.terrain,
        plan = terrain.planLevel(tile0, tile1, direction),
        cost = 0,
        tile, i;

    if (plan === null)
        return {error: ErrorCode.TERRAFORM_TOO_LARGE, tile: tile0, cost: 0};

    for (i = 0; i < plan.tiles.length; i++) {
        tile = plan.tiles[i];

        if (world.buildingService.get(tile) !== null)
            return {error: ErrorCode.TILE_TAKEN, tile: tile, cost: 0};

        //what the tile is and what grows there are looked up before the
        //ground moves
        cost += Config.terraformTileCost
            * (direction > 0 && terrain.getTerrainType(tile) === TerrainType.water
                ? Config.terraformWaterFactor : 1);

        if (world.envService.getTree(tile) !== null)
            cost += Config.clearTileCost;
    }

    if (!this.resourcesService.hasEnoughResource(Resource.money, cost))
        return {error: ErrorCode.NOT_ENOUGH_RES, tile: tile0, cost: 0};

    terrain.modify(plan);
    this.resourcesModule.subResource(Resource.money, cost);

    return {error: ErrorCode.NONE, tile: tile0, cost: cost};
};

/**
 *
 * @returns {number}
 */
City.prototype.id = function(){
    return this._id;
};

/**
 *
 * @param value
 * @returns {*}
 */
City.prototype.name = function(value) {
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
City.prototype.tile = function(value){
    if(value !== undefined)
        return this._tile = value;
    return this._tile;
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
        buildings: this.buildingService.save()
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

    if (data.established !== undefined)
        this.timeEstablished = data.established;

    this.laboratoryService.load(data.research || {});
    this.areaService.load(data.area || []);
    //saves from before the world kept its own cleared tiles have them here -
    //they move over to the world, which saves them from then on
    var cleared = data.clearedTiles || [];
    for (var i = 0; i < cleared.length; i++)
        this.world.terrain.clear(cleared[i]);

    this.buildingService.load(data.buildings || []);

    //last, so that nothing the restoring did can show up on the bill
    if (data.resources !== undefined)
        this.resourcesService.load(data.resources);

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
        maintenanceCost: this.statsService.getCityBuildingMaintenanceCost()
    };

    return data;
};

/**
 *
 * @param world
 * @param tile
 * @returns {boolean}
 */
City.canEstablish = function(world, tile){
    return !Terrain.isSlope(world.terrain.tileSlope(tile));
};

/**
 *
 * @param world
 * @param tile
 * @param name
 * @returns {*}
 */
City.establish = function(world, tile, name) {
    if(!City.canEstablish(world, tile))
        return null;

    var city = new City(world, tile);
    city.name(name);
    return city;
};

export default City;
