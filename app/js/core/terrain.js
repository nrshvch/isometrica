//TODO cache terrain Z values

define(function (require) {
    var namespace = require("namespace");
    var ResourceCode = require("core/resourcecode");
    var TerrainType = require('./terraintype');
    var Simplex = require("./vendor/simplex-noise");
    //var TileIterator = require("./tileiterator");

    namespace("Isometrica.Core").Terrain = Terrain;

    /**
     * @type {TileIterator}
     */
    //Terrain.TileIterator = Terrain.TerrainIterator = TileIterator;

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

    function calcZ(index) {
        var land = 0,
            island = 0;

        var x = Terrain.extractX(index);
        var y = Terrain.extractY(index);

        x += 640;
        y += 700;

        land += simplex.noise2D(x / 512, y / 512) / 2; //noisemap of continents
        land += simplex.noise2D(x / 256, y / 256) / 4; //of smaller lands
        land += simplex.noise2D(x / 128, y / 128) / 8;  //...
        land += simplex.noise2D(x / 64, y / 64) / 16; //...
        land += simplex.noise2D(x / 32, y / 32) / 32; //...
        land += simplex.noise2D(x / 16, y / 16) / 64; //...
        land += simplex.noise2D(x / 8, y / 8) / 64; //smallest details

        island += simplex.noise2D(x / 64, y / 64) / 10;
        island += simplex.noise2D(x / 32, y / 32) / 20;
        island += simplex.noise2D(x / 16, y / 16) / 40;
        island += simplex.noise2D(x / 8, y / 8) / 40;

        return Math.floor((0.8 * land + 0.2 * island) * 16);
    }


    /**
     * @exports
     * @param world
     * @constructor
     */
    function Terrain(world) {
        this.world = world;
        this.gridPoints = [];
    }


    Terrain.prototype.getGridPoints = function (x, y) {
        return [
            this.getGridPointHeight(x, y), //s
            this.getGridPointHeight(x + 1, y), //e
            this.getGridPointHeight(x, y + 1), //w
            this.getGridPointHeight(x + 1, y + 1), //n
        ]
    };

    Terrain.prototype.getAreaGrid = function (x0, y0, w, l) {
        var result = [];

        var x1 = x0 + w;
        var y1 = y0 + l;

        for (var x = x0; x <= x1; x++) {
            for (var y = y0; y <= y1; y++) {
                result.push(this.getGridPointHeight(x, y));
            }
        }

        return result;
    };

    Terrain.prototype.getTerrainTypes = function (x0, y0, w, l) {
        var result = [];

        var x1 = x0 + w;
        var y1 = y0 + l;

        for (var x = x0; x < x1; x++) {
            for (var y = y0; y < y1; y++) {
                result.push(this.getTerrainType(x, y));
            }
        }

        return result;
    };

    Terrain.prototype.getGridPointHeight = function (indexOrX, y) {
        var index = indexOrX;
        var x = indexOrX;

        if (arguments.length === 2)
            index = y << 16 ^ x;

        var gp = this.gridPoints[index];

        if (gp === undefined) {
            gp = this.gridPoints[index] = calcZ(index);
        }

        return gp;
    };

    Terrain.prototype.getTerrainType = function (idxOrX, y) {
        var idx, a, b, c, d;

        if(idxOrX === undefined)
            throw "first argument is mandatory";

        if (arguments.length === 2)
            idx = Terrain.convertToIndex(idxOrX, y);
        else idx = idxOrX;

        a = this.getGridPointHeight(idx);
        b = this.getGridPointHeight(idx + 1);
        c = this.getGridPointHeight(idx + Terrain.dy);
        d = this.getGridPointHeight(idx + Terrain.dy + 1);

        if (a <= 0 && b <= 0 && c <= 0 && d <= 0)
            return TerrainType.water;
        else if (a <= 0 || b <= 0 || c <= 0 || d <= 0)
            return TerrainType.shore;
        else
            return TerrainType.grass;
    };

    //TODO slopeId could be int where each gridPoint height is stored in two bits
    //TODO: If each point z pos would be relative to lowest point, instead of x0-y0 point, then each point could be described in 0-2 int.
    Terrain.prototype.calcSlopeId = function (idx, y) {
        var x = idx;
        if(arguments.length === 1) {
            x = Terrain.extractX(idx);
            y = Terrain.extractY(idx);
        }
        var terrainType = this.getTerrainType(x, y);

        if (terrainType === TerrainType.water) return 2222;
        //if (terrainType === TerrainType.water) return 0;

        var z0 = this.getGridPointHeight(x, y),
            z1 = this.getGridPointHeight(x + 1, y),
            z2 = this.getGridPointHeight(x, y + 1),
            z3 = this.getGridPointHeight(x + 1, y + 1);

        return 2000 + (z1 - z0 + 2) * 100 + (z2 - z0 + 2) * 10 + (z3 - z0 + 2);

        var baseZ = Math.min(z0, z1, z2, z3);

        z0 -= baseZ;
        z1 -= baseZ;
        z2 -= baseZ;
        z3 -= baseZ;

        return z3 << 6 ^ z2 << 4 ^ z1 << 2 ^ z0;
    };

    Terrain.prototype.getResource = function (idxOrX, y) {
        var x;

        if (arguments.length === 1) {
            x = Terrain.extractX(idxOrX);
            y = Terrain.extractY(idxOrX);
        }else
            x = idxOrX;

        if (this.calcSlopeId(x,y) === 2222) {
            var r = this.world.resourceDistribution(x, y);

            if (r === ResourceCode.oil && this.getTerrainType(x, y) === TerrainType.water) {
                return ResourceCode.oil;
            } else if (r !== ResourceCode.none && r !== ResourceCode.oil && this.getTerrainType(x, y) !== TerrainType.water) {
                return r;
            }
        }
        return null;
    };

    Terrain.convertToIndex = function (x, y) {
        return y << 16 ^ x;
    };

    Terrain.extractX = function (index) {
        return index & 0xFFFF;
    };

    Terrain.extractY = function (index) {
        return index >>> 16;
    };

    Terrain.dx = Terrain.convertToIndex(1, 0);
    Terrain.dy = Terrain.convertToIndex(0, 1);

    return Terrain;
});