/**
 * Created by User on 19.08.2014.
 */
import Events from "events";
import BuildingCode from "data/buildingcode";
import BuildingData from "data/buildings";
import BuildingClassCode from "data/classcode";
import ErrorCode from "../errorcode";
import Resource from "../resourcecode";
import Config from "../config";
import Building from "../building";
import Terrain from "../terrain";
import TileIterator from "../tileiterator";

import namespace from "namespace";
var CityService = namespace("Isometrica.Core.CityService");
CityService.Buildings = CityBuildings;

/**
 * @param city {City}
 * @constructor
 */
function CityBuildings(city) {
    this._buildings = [];
    this.city = this._city = city;
}

/**
 * @type {City}
 * @private
 */
CityBuildings.prototype._city = null;

/**
 * @type {Array}
 * @private
 */
CityBuildings.prototype._buildings = null;

CityBuildings.prototype.cityHall = null;

var events = CityBuildings.prototype.events = {
    "new": 0,
    "remove": 1
};

CityBuildings.prototype.init = function () {

};

CityBuildings.prototype.buildBuilding = function (code, tile, rotate) {
    var city = this.city;
    var root = this.city.root;

    var errorCode = buildTest(this, code, tile, rotate);

    if (errorCode === ErrorCode.NONE) {
        var data = BuildingData[code];

        //the trees the site stands on are felled by the build itself, and the
        //clearing goes on the bill - counted before, while they are still there
        var clearing = clearingCost(this, code, tile, rotate);

        var building = new Building();
        building.init(city.world, code, tile, rotate);

        //what the player pays for it, set before the build is announced so
        //that whoever shows it over the site has it in hand
        building.expense = (data.constructionCost[Resource.money] || 0) + clearing;

        root.buildings.build(building);

        city.resources.sub(data.constructionCost);

        if (clearing > 0)
            city.resources.subResource(Resource.money, clearing);

        this._buildings.push(building);

        if (code === BuildingCode.cityHall)
            this.cityHall = building;

        Events.fire(this, events.new, building);
    } else {
        root.messagingService.sendTileMessage(tile, Isometrica.Core.MessageType.tileError, errorCode);
    }
};

CityBuildings.prototype.buildRoad = function(code, tile0, tile1){
    var city = this.city;
    var root = city.root;
    var data = BuildingData[code];
    var iter = new TileIterator(tile0, tile1);
    var bs = [];
    while(!iter.done){
        var tile = TileIterator.next(iter);
        var errorCode = buildTest(this, code, tile);



        if(errorCode !== ErrorCode.NONE){
            root.messagingService.sendTileMessage(tile, Isometrica.Core.MessageType.tileError, errorCode);
            continue;
        }

        var building = new Building();
        building.init(root, code, tile);

        root.buildings.build(building);

        city.resources.sub(data.constructionCost);

        this._buildings.push(building);

        bs.push(building);
    }

    for(var i in bs)
        Events.fire(this, events.new, bs[i]);
};

CityBuildings.prototype.destroyBuilding = function () {
    throw "Not implemented";
};

CityBuildings.prototype.getBuildings = function () {
    return this._buildings;
};

/**
 * What it costs to clear the site of a building - one clearing charge for
 * every tile of its footprint that has a tree on it.
 *
 * @returns {number}
 */
function clearingCost(self, code, tile, rotation) {
    var world = self.city.world,
        data = BuildingData[code],
        sizeX = rotation ? data.sizeY : data.sizeX,
        sizeY = rotation ? data.sizeX : data.sizeY,
        iter = new TileIterator(tile, tile + (sizeX - 1) + (sizeY - 1) * Terrain.dy),
        trees = 0;

    while (!iter.done) {
        if (world.envService.getTree(TileIterator.next(iter)) !== null)
            trees++;
    }

    return trees * Config.clearTileCost;
}

function buildTest(self, code, tile, rotation) {
    var test = self.city.root.buildingService.test(code, tile, rotation);

    if(test !== ErrorCode.NONE)
        return test;

    var city = self.city;

    var data = BuildingData[code],
        availableBuildingList = city.laboratoryService.getAvailableBuildings();

    if (availableBuildingList[code] !== true)
        return ErrorCode.BUILDING_NOT_AVAIL;
    else if (code === BuildingCode.cityHall && self.cityHall !== null)
        return ErrorCode.CITY_HALL_ALREADY_BUILT;
    //roads may be laid anywhere, they are how a city reaches out beyond its
    //own borders in the first place - everything else stays inside them
    else if (data.classCode !== BuildingClassCode.road && !city.area.contains(tile, Terrain.convertToIndex(data.sizeX, data.sizeY)))
        return ErrorCode.CANT_BUILD_HERE;
    else if (!city.resources.hasEnough(data.constructionCost))
        return ErrorCode.NOT_ENOUGH_RES;
    else if (!city.resources.hasEnoughResource(Resource.money,
            (data.constructionCost[Resource.money] || 0) + clearingCost(self, code, tile, rotation)))
        return ErrorCode.NOT_ENOUGH_RES;

    return ErrorCode.NONE;
}

export default CityBuildings;
