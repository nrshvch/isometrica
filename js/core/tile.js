//TODO tile type could be mask.

define(function (require) {
    var Events = require("lib/events");
    var BuildingCode = require("lib/buildingcode");
    var ResourceCode = require("lib/resourcecode");
    var TerrainType = require("lib/terraintype"),
        TileType = require("lib/tiletype"),
        BuildingClassCode = require("lib/buildingclasscode");

    function Tile(world, x, y) {
        this.world = world;
        this.tiles = world.tiles;
        this.gridPoints = world.terrain.getGridPoints(x, y);
        this.x = x;
        this.y = y;
        this.z = Math.min.apply(this, this.gridPoints);

        this.terrainType = world.terrain.getTerrainType(x, y);

        this.resource = null;
        if(this.getSlopeId() === 2222){
            var r = world.resourceDistribution(x, y);

            if(r === ResourceCode.oil && this.terrainType === TerrainType.water){
                this.resource = ResourceCode.oil;
            }else if(r !== ResourceCode.none && r !== ResourceCode.oil && this.terrainType !== TerrainType.water){
                this.resource = r;
            }
        }

        this.tileType = this.resource !== null ? TileType.resource : TileType.clear;
    }

    Tile.prototype.x = -1;
    Tile.prototype.y = -1;
    Tile.prototype.z = -1;
    Tile.prototype.gridPoints = null;
    Tile.prototype.terrainType = null;
    Tile.prototype.tileType = null;

    Tile.prototype.init = function () {

    };

    Tile.prototype.getBuilding = function () {
        return this.world.buildings.getByTile(this)
    };

    Tile.prototype.getSlopeId = function () {
        if (this.terrainType === TerrainType.water)return 2222;
        var gridPoints = this.gridPoints,
            z0 = gridPoints[2];
        return 2000 + (gridPoints[3] - z0 + 2) * 100 + (gridPoints[1] - z0 + 2) * 10 + (gridPoints[0] - z0 + 2);
    };

    Tile.prototype.clear = function () {
        var b = this.getBuilding();
        if (b)
            this.world.buildings.remove(b);
    };

    Tile.prototype.toJSON = function(){
        return {
            x: this.x,
            y: this.y,
            terrainType: this.terrainType,
            gridPoints: this.gridPoints,
            resource: this.resource
        }
    };

    return Tile;
});
