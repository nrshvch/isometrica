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
    var buildings = this.city.root.buildings;

    //whatever takes a building down - a bulldozer, the terrain being cleared -
    //goes through the world's register, and the city's own list has to follow
    //it, or a save would put razed buildings back up
    Events.on(buildings, buildings.events.buildingRemoved, onBuildingRemoved, this);
};

CityBuildings.prototype.buildBuilding = function (code, tile, rotate) {
    var city = this.city;
    var root = this.city.root;

    //the catalogue hands codes over as the strings they are in the markup, and
    //"3" is not BuildingCode.cityHall however much it looks like it
    code = parseInt(code, 10);

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

/**
 * Where the buildings go when the tiles from tile0 to tile1 are covered with
 * code: the area is tiled with its footprint from its near corner on, one
 * building to a footprint, and a footprint that would reach out past the far
 * corner is left out. In the order a build of the selection goes through them.
 *
 * @param code {number}
 * @param tile0 {number}
 * @param tile1 {number}
 * @param [rotation] {boolean}
 * @returns {number[]} the tile each building would stand on
 */
CityBuildings.selectionAnchors = function (code, tile0, tile1, rotation) {
    var data = BuildingData[parseInt(code, 10)],
        sizeX = rotation ? data.sizeY : data.sizeX,
        sizeY = rotation ? data.sizeX : data.sizeY,
        t0 = Terrain.min(tile0, tile1),
        t1 = Terrain.max(tile0, tile1),
        x0 = Terrain.extractX(t0),
        y0 = Terrain.extractY(t0),
        x1 = Terrain.extractX(t1),
        y1 = Terrain.extractY(t1),
        r = [],
        x, y;

    for (y = y0; y + sizeY - 1 <= y1; y += sizeY) {
        for (x = x0; x + sizeX - 1 <= x1; x += sizeX)
            r.push(Terrain.convertToIndex(x, y));
    }

    return r;
};

/**
 * What covering the tiles from tile0 to tile1 with code would come to,
 * without putting anything down - so the bill can be shown before the click.
 *
 * Goes through the buildings in the order a build of the selection does (see
 * CityBuildings.selectionAnchors), and holds what the ones before would have
 * taken against the ones after: the money they would have spent, a city hall
 * one of them would have put up. A building the build would turn down is left
 * out, save one turned down for want of money only - its price is still worth
 * knowing.
 *
 * @param code {number}
 * @param tile0 {number}
 * @param tile1 {number}
 * @param [rotation] {boolean}
 * @returns {{tile: number, cost: number, error: number}[]}
 */
CityBuildings.prototype.quoteSelection = function (code, tile0, tile1, rotation) {
    code = parseInt(code, 10);

    var data = BuildingData[code],
        sizeX = rotation ? data.sizeY : data.sizeX,
        sizeY = rotation ? data.sizeX : data.sizeY,
        resources = this.city.resources.getResources(),
        cost = data.constructionCost || {},
        spent = Object.create(null),
        cityHall = this.cityHall !== null,
        anchors = CityBuildings.selectionAnchors(code, tile0, tile1, rotation),
        r = [],
        tile, errorCode, clearing, money, key, enough, i;

    for (i = 0; i < anchors.length; i++) {
        tile = anchors[i];

        errorCode = this.city.root.buildingService.test(code, tile, rotation);

        //the rest of buildTest, less what is about money - that is held
        //against what the buildings before would have spent instead
        if (errorCode === ErrorCode.NONE) {
            if (this.city.laboratoryService.getAvailableBuildings()[code] !== true)
                errorCode = ErrorCode.BUILDING_NOT_AVAIL;
            else if (code === BuildingCode.cityHall && cityHall)
                errorCode = ErrorCode.CITY_HALL_ALREADY_BUILT;
            else if (data.classCode !== BuildingClassCode.road && !this.city.area.contains(
                    Terrain.extractX(tile), Terrain.extractY(tile), sizeX, sizeY))
                errorCode = ErrorCode.OUTSIDE_CITY;
        }

        if (errorCode !== ErrorCode.NONE)
            continue;

        clearing = clearingCost(this, code, tile, rotation);
        money = (cost[Resource.money] || 0) + clearing;

        enough = (resources[Resource.money] || 0) - (spent[Resource.money] || 0) >= money;
        for (key in cost) {
            if (key !== Resource.money && (resources[key] || 0) - (spent[key] || 0) < cost[key])
                enough = false;
        }

        if (!enough) {
            r.push({tile: tile, cost: money, error: ErrorCode.NOT_ENOUGH_RES});
            continue;
        }

        for (key in cost)
            spent[key] = (spent[key] || 0) + cost[key];
        spent[Resource.money] = (spent[Resource.money] || 0) + clearing;

        if (code === BuildingCode.cityHall)
            cityHall = true;

        r.push({tile: tile, cost: money, error: ErrorCode.NONE});
    }

    return r;
};

CityBuildings.prototype.buildRoad = function(code, tile0, tile1){
    code = parseInt(code, 10);

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

/**
 * Puts a building back where a save says it stood: no build test, no bill, and
 * standing finished from the start. What the build test looks at was the
 * player's business back when they built it, and they paid for it then.
 *
 * @param code {number}
 * @param tile {number}
 * @param [rotation] {number}
 * @returns {Building}
 */
CityBuildings.prototype.restore = function (code, tile, rotation) {
    //saves written before the codes were made numbers carry them as strings
    code = parseInt(code, 10);

    var building = new Building();

    building.init(this.city.world, code, tile, rotation, true);

    this.city.root.buildings.build(building);

    this._buildings.push(building);

    if (code === BuildingCode.cityHall)
        this.cityHall = building;

    Events.fire(this, events.new, building);

    return building;
};

/**
 * @returns {Object[]} what stands in the city, as it goes into a save
 */
CityBuildings.prototype.save = function () {
    var r = [], building;

    for (var i = 0; i < this._buildings.length; i++) {
        building = this._buildings[i];

        r.push({
            code: building.buildingCode,
            tile: building.tile,
            rotation: building.rotation || 0
        });
    }

    return r;
};

/**
 * @param list {Object[]}
 */
CityBuildings.prototype.load = function (list) {
    for (var i = 0; i < list.length; i++)
        this.restore(list[i].code, list[i].tile, list[i].rotation);
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

function onBuildingRemoved(sender, building, self) {
    var index = self._buildings.indexOf(building);

    if (index === -1)
        return;

    self._buildings.splice(index, 1);

    if (self.cityHall === building)
        self.cityHall = null;
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
    //turned round, the footprint's sides swap
    else if (data.classCode !== BuildingClassCode.road && !city.area.contains(
            Terrain.extractX(tile), Terrain.extractY(tile),
            rotation ? data.sizeY : data.sizeX,
            rotation ? data.sizeX : data.sizeY))
        return ErrorCode.OUTSIDE_CITY;
    else if (!city.resources.hasEnough(data.constructionCost))
        return ErrorCode.NOT_ENOUGH_RES;
    else if (!city.resources.hasEnoughResource(Resource.money,
            (data.constructionCost[Resource.money] || 0) + clearingCost(self, code, tile, rotation)))
        return ErrorCode.NOT_ENOUGH_RES;

    return ErrorCode.NONE;
}

export default CityBuildings;
