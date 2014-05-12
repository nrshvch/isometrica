//TODO cache terrain Z values

define(['lib/terraintype'], function (TileType) {
    function Terrain(world) {
        this.world = world;
        this.gridPoints = [];
    }

    Terrain.prototype.init = function () {

    }

    Terrain.prototype.tick = function () {

    }

    Terrain.prototype.getGridPoints = function (x, y) {
        return [
            this.getGridPoint(x, y), //s
            this.getGridPoint(x+1, y), //e
            this.getGridPoint(x, y+1), //w
            this.getGridPoint(x+1, y+1), //n
        ]
    }

    Terrain.prototype.getGridPoint = function (x, y) {
        var gp = this.gridPoints[x * this.world.size + y];

        if (gp) {
            console.log(gp)
            return gp;
        }

        return this.world.gridDistribution(x, y);
    }

    Terrain.prototype.setGridPoint = function (x, y, z) {
        var ngps = this.getNeighbourGridPoints(x, y),
            gp;

        for (var i = 0; i < 8; i++) {
            gp = ngps[i];

            if (Math.abs(gp - z) >= 1)
                return;
        }

        this.gridPoints[x * this.world.size + y] = z;
    }

    Terrain.prototype.getNeighbourGridPoints = function (x, y) {
        return [
            this.getGridPoint(x - 1, y - 1),
            this.getGridPoint(x - 1, y),
            this.getGridPoint(x - 1, y + 1),
            this.getGridPoint(x, y - 1),
            this.getGridPoint(x, y + 1),
            this.getGridPoint(x + 1, y - 1),
            this.getGridPoint(x + 1, y),
            this.getGridPoint(x + 1, y + 1)
        ]
    }

    Terrain.prototype.getTerrainType = function (x, y) {
        var gps = this.getGridPoints(x, y);
        if (gps[0] <= 0 && gps[1] <= 0 && gps[2] <= 0 && gps[3] <= 0)
            return TileType.water;
        else if(gps[0] <= 0 || gps[1] <= 0 || gps[2] <= 0 || gps[3] <= 0)
            return TileType.shore;
        else
            return TileType.grass;

    };

    Terrain.prototype.save = function(){
        return null;
    };

    Terrain.prototype.load = function(savedGameState){
        return true;
    };

    return Terrain;
})