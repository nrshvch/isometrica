/**
 * What the city's streets reach.
 *
 * A building is on the road network when one of the tiles alongside it - north,
 * south, east or west of its footprint, never a corner - carries a road, and
 * when that road can be followed, tile by tile, back to the city hall. A lane
 * out in a field that touches nothing is not a road network, and the houses
 * along it are as good as unreachable.
 *
 * That is what makes a player lay streets instead of dropping houses wherever
 * there is room: a house off the network holds nobody (Building#citizenCapacity).
 */
import Events from "events";
import BuildingData from "data/buildings";
import BuildingClassCode from "data/classcode";
import Terrain from "../terrain";
import TileIterator from "../tileiterator";

import namespace from "namespace";
var CityService = namespace("Isometrica.Core.CityService");
CityService.Roads = CityRoads;

/**
 * @param city {City}
 * @constructor
 */
function CityRoads(city) {
    this.city = city;
    this._network = {};
    this._stale = true;
}

CityRoads.prototype.init = function () {
    var buildings = this.city.world.buildings;

    //the network is only ever changed by something being built or pulled down
    Events.on(buildings, buildings.events.buildingBuilt, onChange, this);
    Events.on(buildings, buildings.events.buildingRemoved, onChange, this);
};

/**
 * @param building {Building}
 * @returns {boolean} whether the city's streets reach it
 */
CityRoads.prototype.reaches = function (building) {
    update(this);

    //the hall is where the network is measured from, so it is always reached
    if (building === this.city.buildings.cityHall)
        return true;

    var sides = alongside(building), i;

    for (i = 0; i < sides.length; i++) {
        if (this._network[sides[i]] === true)
            return true;
    }

    return false;
};

/**
 * @returns {number} how many road tiles hang together off the city hall
 */
CityRoads.prototype.getNetworkSize = function () {
    update(this);

    var n = 0;

    for (var tile in this._network)
        n++;

    return n;
};

/**
 * The tiles that run alongside a building - its footprint grown by one to each
 * side, corners left out, which is what "neighbouring, but not diagonal" means
 * for something bigger than a single tile.
 *
 * @param building {Building}
 * @returns {number[]}
 */
function alongside(building) {
    var iter = building.occupiedTiles(),
        footprint = {},
        tiles = [],
        sides = [],
        tile, i;

    while (!iter.done) {
        tile = TileIterator.next(iter);
        footprint[tile] = true;
        tiles.push(tile);
    }

    for (i = 0; i < tiles.length; i++) {
        tile = tiles[i];

        offer(sides, footprint, tile + 1);
        offer(sides, footprint, tile - 1);
        offer(sides, footprint, tile + Terrain.dy);
        offer(sides, footprint, tile - Terrain.dy);
    }

    return sides;
}

function offer(sides, footprint, tile) {
    if (footprint[tile] !== true && sides.indexOf(tile) === -1)
        sides.push(tile);
}

function isRoad(world, tile) {
    var building = world.buildings.get(tile);

    return building !== null &&
        BuildingData[building.buildingCode].classCode === BuildingClassCode.road;
}

function onChange(sender, args, self) {
    self._stale = true;
}

/**
 * Walks the roads out from the city hall and notes down every tile it can get
 * to. Everything else may be paved, but it is not this city's network.
 */
function update(self) {
    if (!self._stale)
        return;

    var world = self.city.world,
        hall = self.city.buildings.cityHall,
        network = {};

    self._network = network;
    self._stale = false;

    if (hall === null || hall === undefined)
        return;

    //the roads that touch the hall are where the network starts
    var open = [], seeds = alongside(hall), tile, i;

    for (i = 0; i < seeds.length; i++) {
        if (isRoad(world, seeds[i]) && network[seeds[i]] !== true) {
            network[seeds[i]] = true;
            open.push(seeds[i]);
        }
    }

    while (open.length > 0) {
        tile = open.pop();

        step(world, network, open, tile + 1);
        step(world, network, open, tile - 1);
        step(world, network, open, tile + Terrain.dy);
        step(world, network, open, tile - Terrain.dy);
    }
}

function step(world, network, open, tile) {
    if (network[tile] === true || !isRoad(world, tile))
        return;

    network[tile] = true;
    open.push(tile);
}

export default CityRoads;
