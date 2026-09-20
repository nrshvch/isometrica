import namespace from "namespace";
import Events from "events";
import Laboratory from "./city/laboratory";
import CityStats from "./city/citystats";
import Area from "./city/area";
import CityBuildings from "./city/citybuildings";
import CityResources from "./city/cityresources";
import CityTilesParams from "./city/citytilesparams";
import CityPopulation from "./city/citypopulation";
import CityWater from "./city/citywater";
import CityRoads from "./city/cityroads";
import ServiceCode from "./servicecode";
import Resource from "./resourcecode";
import BuildingCode from "data/buildingcode";
import BuildingClassCode from "data/classcode";
import BuildingData from "data/buildings";
import Config from "./config";
import Terrain from "./terrain";

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

    //tiles the player paid to have cleared - the world generates the same
    //trees every time, so a save only has to name the ones that went
    this._clearedTiles = [];

    this.area = this.areaService = new Area(this);
    this.tilesParams = this.tileParamsService = new CityTilesParams(this);
    this.resourcesModule = this.resources = this.resourcesService = new CityResources(this);
    this.statsService = new CityStats(this);
    this.populationService = this.population = new CityPopulation(this);
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
        //removable out there as well - anything else is city land only
        isOwnRoad = building !== null && BuildingData[building.buildingCode].classCode === BuildingClassCode.road;

    //bare ground has nothing to clear away, so it is free and does nothing
    if (building === null && this.world.envService.getTree(tile) === null)
        return false;

    if(this.areaService.contains(tile) || isOwnRoad) {
        var cost = Config.clearTileCost;

        if(this.resourcesService.hasEnoughResource(Resource.money, cost)) {
            this.world.terrain.clearTile(tile);
            this.resourcesModule.subResource(Resource.money, cost);
            this._clearedTiles.push(tile);
            return true;
        }
    }
    return false;
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
 * they put it, what they own, what they built and what they cleared away.
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
        clearedTiles: this._clearedTiles.slice(),
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

    var cleared = data.clearedTiles || [];
    for (var i = 0; i < cleared.length; i++) {
        this.world.terrain.clearTile(cleared[i]);
        this._clearedTiles.push(cleared[i]);
    }

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
