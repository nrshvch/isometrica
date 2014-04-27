//TODO tile type could be mask.

define(function (require) {
    var EventManager = require("lib/eventmanager");
    var BuildingCode = require("lib/buildingcode");
    var ResourceCode = require("lib/resourcecode");
    var TerrainType = require("lib/terraintype"),
        TileType = require("lib/tiletype"),
        BuildingClassCode = require("lib/buildingclasscode");

    function Tile(world, x, y) {
        EventManager.call(this);

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

    Tile.prototype = Object.create(EventManager.prototype);

    Tile.prototype.x = null;
    Tile.prototype.y = null;
    Tile.prototype.gridPoints = null;
    Tile.prototype.terrainType = null;
    Tile.prototype.tileType = null;

    Tile.prototype.events = {
        update: 0
    };

    Tile.prototype.init = function () {


        /*
         if(this.lake){
         this.world.terrain.setGridPoint(this.x, this.y, this.gridPoints[0]-1);
         this.world.terrain.setGridPoint(this.x+1, this.y, this.gridPoints[1]-1);
         this.world.terrain.setGridPoint(this.x, this.y+1, this.gridPoints[2]-1);
         this.world.terrain.setGridPoint(this.x+1, this.y+1, this.gridPoints[3]-1);
         }   */
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

    Tile.prototype.getPrice = function () {
        return 10;
    };

    Tile.prototype.clear = function () {
        var b = this.getBuilding();
        if (b)
            this.world.buildings.remove(b);
        //this.dispatchEvent(this.events.update, this);
    };

    /*
    //TODO seamless. don't need to store this, tile type info can be obtained from tilesman at any time.
    Tile.prototype.updateType = function (building) {
        //var building = this.world.buildings.build(this, BuildingTypeCode);
        //this.world.
        switch (building.classCode) {
            case BuildingClassCode.road:
                this.tileType = TileType.road;
                break;
            case BuildingClassCode.municipal:
            case BuildingClassCode.house:
                this.tileType = TileType.building;
        }

        this.dispatchEvent(this.events.update, this);
        return this.tileType;
    };*/

    return Tile;
});
