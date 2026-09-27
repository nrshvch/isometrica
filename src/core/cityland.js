/**
 * Keeps track of which city owns which tile.
 *
 * City land is not grown automatically anymore - it is bought one block of
 * tiles at a time (see CityService.Area), and this registry is the world wide
 * index of those purchases, so a tile can be traced back to its owner and so
 * two cities can never buy the same piece of land.
 */
import Events from "events";
import TileIterator from "./tileiterator";
import namespace from "namespace";

namespace("Isometrica.Core").CityLand = CityLand;

var events = {
    areaChange: 0
};

function CityLand(world) {
    this.world = world;
    this._owners = {};
}

CityLand.events = events;
CityLand.prototype.events = events;

/**
 * @type {World}
 */
CityLand.prototype.world = null;

/**
 * Records a rectangle of tiles as owned by the city.
 * @param cityId {number}
 * @param tile0 {number}
 * @param tile1 {number}
 */
CityLand.prototype.claim = function (cityId, tile0, tile1) {
    var iter = new TileIterator(tile0, tile1),
        owners = this._owners,
        tile;

    while (!iter.done) {
        tile = iter.next();
        owners[tile] = cityId;
    }

    Events.fire(this, events.areaChange, cityId);
};

/**
 * @param tile {number}
 * @returns {number} city id, or -1 when the tile belongs to nobody
 */
CityLand.prototype.getTileOwner = function (tile) {
    var owner = this._owners[tile];
    return owner === undefined ? -1 : owner;
};

/**
 * True when no other city than cityId holds any tile of the rectangle.
 * @param tile0 {number}
 * @param tile1 {number}
 * @param cityId {number}
 * @returns {boolean}
 */
CityLand.prototype.isFree = function (tile0, tile1, cityId) {
    var iter = new TileIterator(tile0, tile1),
        owners = this._owners,
        owner;

    while (!iter.done) {
        owner = owners[iter.next()];
        if (owner !== undefined && owner !== cityId)
            return false;
    }

    return true;
};

export default CityLand;
