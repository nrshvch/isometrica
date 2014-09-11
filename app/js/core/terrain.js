//TODO cache terrain Z values

define(function (require) {
    var namespace = require("namespace");
    var ResourceCode = require("core/resourcecode");
    var TerrainType = require('./terraintype');
    var Simplex = require("simplex-noise");
    var Events = require("events");
    //var TileIterator = require("./tileiterator");

    namespace("Isometrica.Core").Terrain = Terrain;

    var events = {
        tileCleared: 0,
        gridUpdate: 1
    };

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

    function stoneDistribution (x, y) {
        var d;

        d = simplex.noise2D(x / 8, y / 8);
        d *= simplex.noise2D(x / 24, y / 24);
        return d * 64 > 40;
    }


    function ironDistribution (x, y) {
        if (simplex.noise2D(x / 64, y / 64) * 64 > 50)
            return simplex.noise2D(x / 8, y / 8) * 64 > 50;
    }

    function oilDistribution (x, y) {
        if (simplex.noise2D(y / 64, x / 64) * 64 > 50)
            return simplex.noise2D(y / 8, x / 8) * 64 > 50;
    }

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

    function edit(self, idx, z) {
        var result = {};
        if(terraformResult(self, idx, z, result)){
            for(idx in result){
                self.gridPoints[idx] = result[idx];
            }
            Events.fire(self, events.gridUpdate, result);
        }
    }

    function terraformResult(self, idx, z, points){
        points = points || {};

        var t0 = gridpointTile(idx, 0);
        var t1 = gridpointTile(idx, 1);
        var t2 = gridpointTile(idx, 2);
        var t3 = gridpointTile(idx, 3);

        var bman = self.world.buildings;
        if(bman.get(t0) !== null || bman.get(t1) !== null || bman.get(t2) !== null || bman.get(t3) !== null)
            return false;


        var a = idx + 1;
        var b = idx - 1;
        var c = idx + dy;
        var d = idx - dy;

        var az = points[a] || self.getGridPointHeight(a);
        var bz = points[b] || self.getGridPointHeight(b);
        var cz = points[c] || self.getGridPointHeight(c);
        var dz = points[d] || self.getGridPointHeight(d);

        var ok = true;

        if (az - z < -1)
            ok = ok && terraformResult(self, a, z - 1, points);
        else if (az - z > 1)
            ok = ok && terraformResult(self, a, z + 1, points);

        if (bz - z < -1)
            ok = ok && terraformResult(self, b, z - 1, points);
        else if (bz - z > 1)
            ok = ok && terraformResult(self, b, z + 1, points);

        if (cz - z < -1)
            ok = ok && terraformResult(self, c, z - 1, points);
        else if (cz - z > 1)
            ok = ok && terraformResult(self, c, z + 1, points);

        if (dz - z < -1)
            ok = ok && terraformResult(self, d, z - 1, points);
        else if (dz - z > 1)
            ok = ok && terraformResult(self, d, z + 1, points);

        if(ok)
            points[idx] = z;

        return ok;
    }

    //A = x,y, B = x+1,y, C = x,y+1, D = x+1,y+1
    var A = 0x1, B = 0x100, C = 0x10000, D = 0x1000000;
    var SlopeType = {
        FLAT: 0,

        A: A,
        B: B,
        C: C,
        D: D,

        A_STEEP: 0x2 | B | C,
        B_STEEP: 0x200 | A | D,
        C_STEEP: 0x20000 | A | D,
        D_STEEP: 0x2000000 | B | C,

        AB: A | B,
        AC: A | C,
        BD: D | B,
        CD: D | C,
        AD: A | D,
        BC: B | C,

        ABC: A | B | C,
        ABD: A | B | D,
        ACD: C | D | A,
        BCD: C | B | D,
    };

    function isSlope(slope){
        return slope !== SlopeType.FLAT;
    }

    function isSlopeSmooth(slope){
        return slope === SlopeType.AB || slope === SlopeType.AC || slope === SlopeType.CD || slope === SlopeType.BD;
    }

    /**
     *
     * @param idx {number}
     * @param n {number} 0-3
     * @returns {number}
     */
    function gridpointTile(idx, n) {
        return idx - (n & 1) - ((n >> 1) & 1) * dy;
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

    Terrain.SlopeType = SlopeType;

    Terrain.convertToIndex = function (x, y) {
        return y << 16 ^ x;
    };

    Terrain.extractX = function (index) {
        return index & 0xFFFF;
    };

    Terrain.extractY = function (index) {
        return index >>> 16;
    };

    var dx = Terrain.dx = Terrain.convertToIndex(1, 0);
    var dy = Terrain.dy = Terrain.convertToIndex(0, 1);

    Terrain.events = events;

    //Terrain.prototype.events = events;

    Terrain.prototype.edit = function (idx, z) {
        return edit(this, idx, z);
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
            gp = calcZ(index);
            //gp = this.gridPoints[index] = calcZ(index);
        }

        return gp;
    };

    Terrain.prototype.getHeight = function(x,y){
        var subx = x % (x | 0);
        var suby = y % (y | 0);

        //normalize the values, because
        //interpolation is done for 0 - 1 interval
        //subx += 0.5;
        //suby += 0.5;

        //bilinear interpolation
        var x00 = this.getGridPointHeight(x,y),
            x01 = this.getGridPointHeight(x+1,y),
            x10 = this.getGridPointHeight(x,y+1),
            x11 = this.getGridPointHeight(x+1,y+1),
            i1 = x00 * (1 - subx) + x01 * subx,
            i2 = x10 * (1 - subx) + x11 * subx;

        return i1 * suby + i2 * (1 - suby);
    };

    Terrain.prototype.getTerrainType = function (idxOrX, y) {
        var idx, a, b, c, d;

        if (idxOrX === undefined)
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
    /*Terrain.prototype.calcSlopeId = function (idx, y) {
        var x = idx;
        if (arguments.length === 1) {
            x = Terrain.extractX(idx);
            y = Terrain.extractY(idx);
        }
        var terrainType = this.getTerrainType(x, y);

        if (terrainType === TerrainType.water) return 2222;

        var z0 = this.getGridPointHeight(x, y),
            z1 = this.getGridPointHeight(x + 1, y),
            z2 = this.getGridPointHeight(x, y + 1),
            z3 = this.getGridPointHeight(x + 1, y + 1);

        return 2000 + (z1 - z0 + 2) * 100 + (z2 - z0 + 2) * 10 + (z3 - z0 + 2);
    };
    */

    Terrain.prototype.tileSlope = function(tile){
        //slope id is calculated from tile point heights relative to lowest.

        var z0 = this.getGridPointHeight(tile),
            z1 = this.getGridPointHeight(tile + 1),
            z2 = this.getGridPointHeight(tile + dy),
            z3 = this.getGridPointHeight(tile + dy + 1);

        var baseZ = Math.min(z0, z1, z2, z3);
        z0 -= baseZ;
        z1 -= baseZ;
        z2 -= baseZ;
        z3 -= baseZ;

        return z3 << 24 ^ z2 << 16 ^ z1 << 8 ^ z0;
    };

    Terrain.prototype.tilePoints = function(tile){
        var z0 = this.getGridPointHeight(x, y),
            z1 = this.getGridPointHeight(x + 1, y),
            z2 = this.getGridPointHeight(x, y + 1),
            z3 = this.getGridPointHeight(x + 1, y + 1);

        //height is 0-255 (8 bits);
        //0-7 bits: x y height
        //8-15 bits: x+1 y height
        //16-23 bits: x y+1 height
        //24-32 bits: x+1 y+1 height
        return z3 << 24 ^ z2 << 16 ^ z1 << 8 ^ z0;
    };

    Terrain.prototype.resourceDistribution = function (x, y) {
        if (stoneDistribution(x, y))
            return ResourceCode.stone;
        else if (ironDistribution(x, y))
            return ResourceCode.iron;
        else if (oilDistribution(x, y))
            return ResourceCode.oil;
        else
            return null;
    };

    Terrain.prototype.getResource = function (idxOrX, y) {
        var x;

        if (arguments.length === 1) {
            x = Terrain.extractX(idxOrX);
            y = Terrain.extractY(idxOrX);
        } else
            x = idxOrX;

        if (!isSlope(this.tileSlope(Terrain.convertToIndex(x,y)))) {
            var r = this.resourceDistribution(x, y);

            if (r === ResourceCode.oil && this.getTerrainType(x, y) === TerrainType.water) {
                return ResourceCode.oil;
            } else if (r !== ResourceCode.none && r !== ResourceCode.oil && this.getTerrainType(x, y) !== TerrainType.water) {
                return r;
            }
        }
        return null;
    };

    Terrain.prototype.clearTile = function (idx) {
        Events.fire(this, events.tileCleared, idx);
    };

    Terrain.isSlope = isSlope;
    Terrain.isSlopeSmooth = isSlopeSmooth;

    return Terrain;
});