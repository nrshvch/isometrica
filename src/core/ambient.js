/**
 * Created by User on 13.07.2014.
 */
import Simplex from "simplex-noise";
import TerrainType from "./terraintype";
import BuildingCode from "data/buildingcode";
import Rocks from "data/rocks";
import BuildingService from "./buildings";
import Terrain from "./terrain";
import Events from "events";
import namespace from "namespace";

var Core = namespace("Isometrica.Core");
Core.EnvService = Ambient;

var simplex = new Simplex([151, 160, 137, 91, 90, 15,
    131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23,
    190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33,
    88, 237, 149, 56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166,
    77, 146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244,
    102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187, 208, 89, 18, 169, 200, 196,
    135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217, 226, 250, 124, 123,
    5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
    223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9,
    129, 22, 39, 253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
    251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107,
    49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121, 50, 45, 127, 4, 150, 254,
    138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156, 180]);

var events = {
    //whatever the world put on the tile - a tree, a rock - is gone for good
    sceneryRemove: 0
};

//how likely stones are on a tile in the very middle of a rock field, and of a
//handful together - never all of them, so there is grass in between
var FIELD_ROCKS = 0.8;
var GROUP_ROCKS = 0.55;
//how likely stones are on any tile of dry land, rock field or not - the lone
//ones out in the fields
var LONE_ROCKS = 0.003;
//and how much likelier, at the most, on a hillside that has some
var SLOPE_ROCKS = 0.16;

//how likely a cliff is on any tile of dry land - one on its own now and then,
//never a group of them
var LONE_CLIFFS = 0.004;

//the rock codes of either kind of picture, to pick one of
var HEAPS = [], STREWN = [];

Rocks.forEach(function (rock, code) {
    (rock.heap ? HEAPS : STREWN).push(code);
});

function hasTree(self, tile) {
    return self._usedTiles[tile] === undefined && simplex.noise2D(Terrain.extractX(tile), Terrain.extractY(tile)) > 0;
}

function rareDistribution(x, y) {
    if (simplex.noise2D(y / 64, x / 64) * 64 > 50)
        return simplex.noise2D(y / 8, x / 8) * 64 > 50;
}

/**
 * A number in [0, 1) for every tile, as good as random and nothing like the
 * one next to it - which the noise is too smooth to be. Every salt gives
 * another one.
 */
function hash(x, y, salt) {
    var h = Math.imul(x, 0x27d4eb2d) ^ Math.imul(y, 0x165667b1) ^ Math.imul(salt, 0x9e3779b1);

    h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);

    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function clamp01(v) {
    return v < 0 ? 0 : v > 1 ? 1 : v;
}

function smoothstep(lo, hi, v) {
    var t = clamp01((v - lo) / (hi - lo));
    return t * t * (3 - 2 * t);
}

/**
 * How thick stones lie around x, y, from 0 to 1: now and then a field of
 * them, packed tight in the middle and thinning out far around it, and here
 * and there a handful together. Both are bent out of round by the same
 * smaller noise.
 */
function rockField(x, y) {
    var warp = simplex.noise2D(x / 7 - 91.1, y / 7 + 433.9),
        field = simplex.noise2D(x / 40 + 311.7, y / 40 - 57.3) + warp * 0.15,
        group = simplex.noise2D(x / 9 - 731.3, y / 9 + 127.7) + warp * 0.1;

    //squared, so that it thins out slowly towards the edge and fast only in
    //the middle
    field = Math.pow(clamp01((field - 0.35) / 0.55), 2) * FIELD_ROCKS;
    group = smoothstep(0.72, 1, group) * GROUP_ROCKS;

    return 1 - (1 - field) * (1 - group);
}

/**
 * How likely a stone is on a slope around x, y: some hillsides have a few,
 * most none, and the higher up the more.
 *
 * @param low {number} the height of the lowest corner of the tile
 */
function slopeRocks(x, y, low) {
    return SLOPE_ROCKS
        * smoothstep(0.1, 0.7, simplex.noise2D(x / 9 + 173.3, y / 9 + 619.1))
        * (0.4 + 0.6 * smoothstep(2, 6, low));
}

/**
 * The rock code of the stones on the tile, or null. Only dry land has them,
 * sloped or not, and never a tile anything was built on or cleared.
 */
function rockAt(self, tile) {
    var terrain = self.root.terrain,
        x = Terrain.extractX(tile),
        y = Terrain.extractY(tile),
        a, b, c, d, low, field, density, kinds;

    if (self._usedTiles[tile] !== undefined)
        return null;

    a = terrain.getGridPointHeight(tile);
    b = terrain.getGridPointHeight(tile + Terrain.dx);
    c = terrain.getGridPointHeight(tile + Terrain.dy);
    d = terrain.getGridPointHeight(tile + Terrain.dx + Terrain.dy);
    low = Math.min(a, b, c, d);

    //on the shore they would lie half in the water
    if (low <= 0)
        return null;

    field = rockField(x, y);
    density = 1 - (1 - field) * (1 - LONE_ROCKS);

    if (a !== b || a !== c || a !== d)
        density = 1 - (1 - density) * (1 - slopeRocks(x, y, low));

    if (hash(x, y, 1) >= density)
        return null;

    //heaps where the field is thick, a few stones where it is thin
    kinds = hash(x, y, 2) < field * 0.9 ? HEAPS : STREWN;

    return kinds[Math.floor(hash(x, y, 3) * kinds.length)];
}

/**
 * Nothing the world put on the tile grows or lies there again - whether
 * there was anything or not, whoever draws it is told.
 */
function clear(self, tile) {
    if (self._usedTiles[tile] !== undefined)
        return;

    self._usedTiles[tile] = true;
    Events.fire(self, events.sceneryRemove, tile);
}

function onTileCleared(terrainman, tile, self) {
    clear(self, tile);
}

function onConstructionBuilt(buildman, building, self) {
    var tiles = building.occupiedTiles();

    while (!tiles.done)
        clear(self, tiles.next());
}

function Ambient(root) {
    this.root = root;
    this._usedTiles = {};
}

Ambient.events = events;

/**
 *
 * What stands on the tile: a tree, or rarely a cliff on its own - as its
 * building code, or null.
 *
 * @param tileIdx
 * @returns {number|null}
 */
Ambient.prototype.getTree = function (tile) {
    var world = this.root,
        terrain = world.terrain,
        terrainType = terrain.getTerrainType(tile),
        resource = terrain.getResource(tile);

    if (terrainType !== TerrainType.water && terrainType !== TerrainType.shore && resource === null
        && this._usedTiles[tile] === undefined
        && !Terrain.isSlope(terrain.tileSlope(tile))
        && hash(Terrain.extractX(tile), Terrain.extractY(tile), 4) < LONE_CLIFFS)
        return BuildingCode.cliff;

    //nothing grows where there are stones
    if (terrainType !== TerrainType.water && terrainType !== TerrainType.shore && resource === null && hasTree(this, tile)
        && rockAt(this, tile) === null)
        //which of the two - the same one every time it is asked
        return simplex.noise2D(1, tile) > 0 ? BuildingCode.tree2 : BuildingCode.tree1;

    return null;
};

Ambient.prototype.hasTree = function (tile) {
    return hasTree(this, tile);
};

/**
 * The stones lying on the tile, as their rock code - see data/rocks - or
 * null. They are there to look at and nothing else: they can be cleared away
 * like a tree, but nobody puts them down.
 *
 * @param tile {number}
 * @returns {number|null}
 */
Ambient.prototype.getRock = function (tile) {
    return rockAt(this, tile);
};

/**
 * Whether the world put anything on the tile - a tree or stones - that has to
 * be cleared off it before it is bare ground.
 *
 * @param tile {number}
 * @returns {boolean}
 */
Ambient.prototype.hasScenery = function (tile) {
    return this.getTree(tile) !== null || rockAt(this, tile) !== null;
};

Ambient.prototype.init = function () {
    var world = this.root;
    var terrain = world.terrain;
    var buildman = world.buildingService;

    Events.on(terrain, Terrain.events.tileCleared, onTileCleared, this);
    Events.on(buildman, BuildingService.events.buildingBuilt, onConstructionBuilt, this);
};

export default Ambient;
