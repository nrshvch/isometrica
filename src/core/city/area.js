/**
 * Created by User on 29.07.2014.
 *
 * City land, bought block by block.
 *
 * A city starts off owning a single BLOCK_SIZE x BLOCK_SIZE block of tiles
 * centered on its city hall, and grows only when the player pays for another
 * block. Buildings do not claim land on their own anymore - that used to creep
 * the border one tile at a time, which both swallowed water tiles nobody can
 * build on and never opened up enough room at once for the bigger buildings.
 */
import Events from "events";
import TileIterator from "../tileiterator";
import Resource from "../resourcecode";
import Terrain from "../terrain";

import namespace from "namespace";
var CityService = namespace("Isometrica.Core.CityService");
CityService.Area = Area;

var BLOCK_SIZE = 5;
var BLOCK_BASE_PRICE = 100000;

var events = {
    change: 0
};

function Area(city) {
    this._city = city;
    this._blocks = {};

    //the block grid is anchored on the city origin, so that the very first
    //block is centered on the city hall instead of landing on it at random
    this._originX = Terrain.extractX(city.tile()) - (BLOCK_SIZE >> 1);
    this._originY = Terrain.extractY(city.tile()) - (BLOCK_SIZE >> 1);
}

Area.BLOCK_SIZE = BLOCK_SIZE;
Area.BLOCK_BASE_PRICE = BLOCK_BASE_PRICE;
Area.events = events;
Area.prototype.events = events;

/**
 * @type {City}
 * @private
 */
Area.prototype._city = null;

Area.prototype.init = function () {
    //the block the city was founded on comes with the city
    claimBlock(this, block(this, 0, 0));
};

/**
 * Accepts a single tile, a tile plus a size packed as a tile index
 * (as building data sizes are), or plain x0, y0, w, l.
 *
 * @returns {boolean} true when every tile of the rectangle is city land
 */
Area.prototype.contains = function (a, b, c, d) {
    var x0, y0, w, l;

    if (arguments.length === 1) {
        x0 = Terrain.extractX(a);
        y0 = Terrain.extractY(a);
        w = l = 1;
    } else if (arguments.length === 2) {
        x0 = Terrain.extractX(a);
        y0 = Terrain.extractY(a);
        w = Terrain.extractX(b);
        l = Terrain.extractY(b);
    } else {
        x0 = a;
        y0 = b;
        w = c;
        l = d;
    }

    w = w || 1;
    l = l || 1;

    for (var x = x0; x < x0 + w; x++) {
        for (var y = y0; y < y0 + l; y++) {
            if (!this.owns(x, y))
                return false;
        }
    }

    return true;
};

/**
 * @returns {number} how many tiles the city holds
 */
Area.prototype.getTileCount = function () {
    return this.getBlocks().length * BLOCK_SIZE * BLOCK_SIZE;
};

/**
 * @returns {number} how many tiles the city paid for - everything but the
 *                   block it was founded on
 */
Area.prototype.getBoughtTileCount = function () {
    return Math.max(0, this.getTileCount() - BLOCK_SIZE * BLOCK_SIZE);
};

/**
 * @param x {number}
 * @param y {number}
 * @returns {boolean}
 */
Area.prototype.owns = function (x, y) {
    return this._blocks[key(blockX(this, x), blockY(this, y))] !== undefined;
};

/**
 * Every tile the city owns.
 * @returns {number[]}
 */
Area.prototype.getTiles = function () {
    var tiles = [], blocks = this._blocks, iter;

    for (var k in blocks) {
        iter = new TileIterator(blocks[k].tile0, blocks[k].tile1);
        while (!iter.done)
            tiles.push(iter.next());
    }

    return tiles;
};

/**
 * @returns {Object[]} descriptors of the blocks the city owns
 */
Area.prototype.getBlocks = function () {
    var blocks = this._blocks, r = [];

    for (var k in blocks)
        r.push(blocks[k]);

    return r;
};

/**
 * Blocks the city may buy right now - the ones sharing a side with land it
 * already owns. Diagonal neighbours are deliberately left out, so the city
 * always stays a connected piece of land.
 *
 * @returns {Object[]}
 */
Area.prototype.getAvailableBlocks = function () {
    var blocks = this._blocks, candidates = {}, b, k, i;

    for (k in blocks) {
        b = blocks[k];

        offer(this, candidates, b.bx + 1, b.by);
        offer(this, candidates, b.bx - 1, b.by);
        offer(this, candidates, b.bx, b.by + 1);
        offer(this, candidates, b.bx, b.by - 1);
    }

    var r = [];
    for (k in candidates)
        r.push(candidates[k]);

    return r;
};

/**
 * @param bx {number}
 * @param by {number}
 * @returns {Object|null} the block descriptor, or null when it is not for sale
 */
Area.prototype.getAvailableBlock = function (bx, by) {
    var candidates = {};
    offer(this, candidates, bx, by);
    return candidates[key(bx, by)] || null;
};

/**
 * The block a tile falls into, whether the city owns it or not.
 * @param tile {number}
 * @returns {Object}
 */
Area.prototype.getBlockAt = function (tile) {
    return block(this,
        blockX(this, Terrain.extractX(tile)),
        blockY(this, Terrain.extractY(tile)));
};

/**
 * @param bx {number}
 * @param by {number}
 * @returns {number} what that block costs, by how far out it sits
 */
Area.prototype.getBlockPrice = function (bx, by) {
    return blockPrice(bx, by);
};

/**
 * Pays for a block and hands it to the city.
 *
 * @param bx {number}
 * @param by {number}
 * @returns {boolean} whether the purchase went through
 */
Area.prototype.buyBlock = function (bx, by) {
    var city = this._city,
        b = this.getAvailableBlock(bx, by);

    if (b === null)
        return false;

    if (!city.resources.hasEnoughResource(Resource.money, b.price))
        return false;

    city.resources.subResource(Resource.money, b.price);
    claimBlock(this, b);

    return true;
};

/**
 * @deprecated land is billed through the city hall now - see the upkeepPerTile
 *             of the city hall in data/buildings
 */
Area.prototype.getAreaCost = function () {
    return 0;
};

/**
 * Only the blocks the city bought go into a save - where they sit on the map
 * follows from the city's own tile, and their price from where they sit.
 *
 * @returns {Array[]} [bx, by] pairs
 */
Area.prototype.save = function () {
    var blocks = this._blocks, r = [];

    for (var k in blocks)
        r.push([blocks[k].bx, blocks[k].by]);

    return r;
};

/**
 * Hands the city back the blocks it had, free of charge.
 *
 * @param list {Array[]} [bx, by] pairs
 */
Area.prototype.load = function (list) {
    for (var i = 0; i < list.length; i++)
        claimBlock(this, block(this, list[i][0], list[i][1]));
};

function key(bx, by) {
    return bx + ":" + by;
}

function blockX(self, x) {
    return Math.floor((x - self._originX) / BLOCK_SIZE);
}

function blockY(self, y) {
    return Math.floor((y - self._originY) / BLOCK_SIZE);
}

function block(self, bx, by) {
    var x0 = self._originX + bx * BLOCK_SIZE,
        y0 = self._originY + by * BLOCK_SIZE,
        x1 = x0 + BLOCK_SIZE - 1,
        y1 = y0 + BLOCK_SIZE - 1;

    return {
        bx: bx,
        by: by,
        x0: x0,
        y0: y0,
        x1: x1,
        y1: y1,
        size: BLOCK_SIZE,
        tile0: Terrain.convertToIndex(x0, y0),
        tile1: Terrain.convertToIndex(x1, y1),
        price: blockPrice(bx, by)
    };
}

/**
 * Land gets dearer the further it is from the block the city was founded on:
 * the four blocks around it go for BLOCK_BASE_PRICE, and every ring beyond
 * costs BLOCK_BASE_PRICE more than the one before it.
 */
function blockPrice(bx, by) {
    var ring = Math.abs(bx) + Math.abs(by);

    return BLOCK_BASE_PRICE * ring;
}

/**
 * Puts a block up for sale in the candidates map, unless it is off the world,
 * already owned by this city, or overlapping somebody else's land.
 */
function offer(self, candidates, bx, by) {
    var k = key(bx, by);

    if (self._blocks[k] !== undefined || candidates[k] !== undefined)
        return;

    var b = block(self, bx, by);

    if (b.x0 < 0 || b.y0 < 0)
        return;

    var city = self._city;
    if (!city.world.landRegistry.isFree(b.tile0, b.tile1, city.id()))
        return;

    candidates[k] = b;
}

function claimBlock(self, b) {
    var city = self._city;

    self._blocks[key(b.bx, b.by)] = b;
    city.world.landRegistry.claim(city.id(), b.tile0, b.tile1);

    Events.fire(self, events.change, b);
}

export default Area;
