/**
 * Created with JetBrains WebStorm.
 * User: User
 * Date: 20.09.13
 * Time: 18:56
 * To change this template use File | Settings | File Templates.
 */
import BuildingState from "core/buildingstate";
import Resources from "core/resources";
import Resource from "core/resourcecode";
import Events from "events";
/**
 * @type {BuildingClassCode}
 */
import BuildingClassCode from "data/classcode";
import BuildingData from "data/buildings";
import TileIterator from "./tileiterator";
/**
 * @type {TileIteratorRadial}
 */
import TileIteratorRadial from "./tileiteratorradial";
/**
 * @type {TerrainType}
 */
import TerrainType from "./terraintype";
/**
 * @type {GatherReq}
 */
import GatherReq from "./gatherreq";
import Terrain from "./terrain";

import Construction from "./construction";

var events = {
    stateChange: 0
};

function Building() {
    Construction.constructor(this);

    this.producing = {};
    this.demanding = {};
}

Building.events = events;

Building.prototype = Object.create(Construction.prototype);
Building.prototype.constructor = Building;

Building.prototype.createdAt = null; //game time
Building.prototype.demanding = null;
Building.prototype.producing = null;
Building.prototype.permanent = true;
Building.prototype.events = events;

Building.prototype.init = function(world, code, tile, rot, done){
    Construction.init(this, world, code, tile, rot, done);

    this.createdAt = this.createdAt || this.world.time.now;

    Events.on(this, Construction.events.stateChange, onStateChange, this);

    if (this.data.classCode !== BuildingClassCode.tree) {
        Events.once(this, "dispose", onDispose, Events.on(this.world, this.world.events.tick, onTick, this));
    }
};

Building.prototype.dispose = function () {
    Events.fire(this, "dispose");
};

Building.prototype.citizenCapacity = function () {
    var data = BuildingData[this.buildingCode];

    if (this._state !== BuildingState.ready)
        return 0;

    //nobody moves into a house with no street to it or no water in it
    var city = this.getCity();

    if (city !== null && city.missing(this) !== null)
        return 0;

    return data.citizenCapacity || 0;
};

/**
 * @returns {number} how many people it can employ - none, like a house full of
 *                   nobody, until it is built and has everything it needs
 */
Building.prototype.jobs = function () {
    var data = BuildingData[this.buildingCode];

    if (!data.jobs || this._state !== BuildingState.ready)
        return 0;

    var city = this.getCity();

    if (city !== null && city.missing(this) !== null)
        return 0;

    return data.jobs;
};

function onDispose(self, args, tickSubscriptionId) {
    Events.off(self.world, self.world.events.tick, tickSubscriptionId);

    self._state = BuildingState.none;
    updateEffectOnTileParams(self);
}

function checkFullfilRequirements(self) {
    var world = self.world;
    var data = BuildingData[self.buildingCode];
    //turned round, the footprint's sides swap
    var sizeX = self.rotation ? data.sizeY : data.sizeX,
        sizeY = self.rotation ? data.sizeX : data.sizeY;

    if (!world)
        throw "World is not set yet";

    if (data.requirement === GatherReq.inGrassLand) {
        var occupiedIterator = self.occupiedTiles();

        while (!occupiedIterator.done) {
            var tile = occupiedIterator.next();
            var terrainType = world.terrain.getTerrainType(tile);
            if (terrainType !== TerrainType.grass)
                return false;
        }
    } else if (data.requirement === GatherReq.nearTree) {
        var iter = new TileIterator(self.tile - Terrain.dx, self.tile - Terrain.dy, sizeX + 2, sizeY + 2);
        while (!iter.done) {
            var tile = iter.next();
            var b = world.buildings.get(tile);

            if(b === undefined && world.envService.hasTree(tile))
                return true;
            else if (b !== null) {
                var d = BuildingData[b.buildingCode];
                if (d.classCode === BuildingClassCode.tree)
                    return true;
            }
        }
    } else if (data.requirement === GatherReq.nearWater) {
        var iter = new TileIterator(self.tile - Terrain.dx, self.tile - Terrain.dy, sizeX + 2, sizeY + 2);
        while (!iter.done) {
            var tile = iter.next();
            var t = world.terrain.getTerrainType(tile);
            if (t === TerrainType.water || t === TerrainType.shore) {
                return true;
            }
        }
    }

    return true;
}

/**
 * Updates params of tiles that are affected by effect of this building
 * @param self
 */
function updateEffectOnTileParams(self) {
    var key = "building_" + self.id;
    var paramsMan = self.world.tileParams;
    var circle, tile, data, tilesParams, effect, effectRadius;

    data = BuildingData[self.buildingCode];
    effect = data.tileEffect || null;
    effectRadius = data.tileEffectRadius || 1;

    if (self._state === BuildingState.ready) {
        if (effect !== null) {
            if (paramsMan.has(key))
                paramsMan.remove(key);

            circle = new TileIteratorRadial(self.tile, effectRadius);
            tilesParams = {};

            while (!circle.done) {
                tile = TileIteratorRadial.next(circle);
                tilesParams[tile] = effect;
            }

            paramsMan.add(key, tilesParams);
        }
    } else {
        if (effect !== null && paramsMan.has(key))
            paramsMan.remove(key);
    }
}

function onTick(sender, args, self) {
    self.getCity();

    produce(self);
    demand(self);
}

function onStateChange(sender, args, self){
    updateEffectOnTileParams(self);
}

function produce(self) {
    Resources.clear(self.producing);

    var data = BuildingData[self.buildingCode];
    var city = self.getCity();

    //a road laid outside of any city's borders belongs to no one, so there is
    //no treasury to pay into
    if (city === null)
        return;

    //a shop with no street to it or no water in it takes nothing over the counter
    if (city.missing(self) !== null)
        return;

    if (self._state == BuildingState.ready && (data.requirement === undefined || data.requirement === GatherReq.none || checkFullfilRequirements(self))) {
        //a business makes what it makes only as far as it has the people for it
        Resources.mul(self.producing, data.producing, city.jobs.getStaffing(self));
        city.resources.add(self.producing);
    }
}

function demand(self) {
    Resources.clear(self.demanding);

    var data = BuildingData[self.buildingCode];
    var city = self.getCity();

    if (city === null)
        return;

    //a town nobody has moved into yet runs up no bills - the player gets to
    //look around before the clock starts ticking
    if (city.population.getPopulation() === 0)
        return;

    if (self._state == BuildingState.ready) {
        Resources.add(self.demanding, self.demanding, data.demanding);

        //the city hall is paid to administer the city, and the more land there
        //is to administer the more it costs - which is what makes a tight city
        //of tall houses cheaper to run than the same people spread thin. The
        //block the city was founded on is covered by its flat upkeep.
        if (data.upkeepPerTile !== undefined)
            Resources.addOne(self.demanding, self.demanding, Resource.money,
                data.upkeepPerTile * city.area.getBoughtTileCount());

        city.resources.sub(self.demanding);
    }
}

export default Building;
