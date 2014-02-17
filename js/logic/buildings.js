//TODO do something with trees
//if trees are simply generated and planted on start up, then
//when saving game they all appear in savegame file making it huuuge
//BUT you can make trees being generated on the fly , each time when undentified tile is requsted,
//don't forget that second approach will take more cpu time.
//Try instancing only one tree and each time, when tile is requested put that instance in tile. Kinda singleton tree))

define(function (require) {
    var BuildingData = require("lib/buildingdata"),
        Building = require("./building"),
        BuildingCode = require("lib/buildingcode"),
        BuildingClassCode = require("lib/buildingclasscode"),
        TileType = require("lib/tiletype"),
        EventManager = require("lib/eventmanager"),
        ResourceCode = require("lib/resourcecode"),
        TerrainType = require("lib/terraintype");

    function buildTest(buildings, baseX, baseY, rotate, buildingData) {
        var size = buildingData.size,
            sizeX = size & 0x0F,
            sizeY = size >> 4,
            i, l, x, y, tile, slopeId;

        if(rotate){
            var t = sizeX;
            sizeX = sizeY;
            sizeY = t;
        }

        for (i = 0, l = sizeX * sizeY; i < l; i++) {
            x = ((i / sizeY) | 0) + baseX;
            y = i % sizeY + baseY;

            tile = buildings.world.tiles.get(x, y);
            slopeId = tile.getSlopeId();

            if (tile.terrainType === TerrainType.water) {
                throw "Can't build on water!";
            } else if (tile.tileType === TileType.resource) {
                throw "Can't build here!"
            }

            if (buildingData.classCode === BuildingClassCode.road) {
                if (slopeId !== 2222 && slopeId !== 2112 && slopeId !== 2211 && slopeId !== 2233 && slopeId !== 2332)
                    throw "Land not suitable!";
            } else if (buildingData.classCode !== BuildingClassCode.tree) {
                if (slopeId !== 2222)
                    throw "Flat land required!";
            }
        }
    }

    function Buildings(world) {
        EventManager.call(this);
        this.events = {
            buildingBuilt: 0,
            buildingUpdated: 1,
            buildingRemoved: 2
        };

        this.world = world;

        this.buildingIdToBuildingMap = Object.create(null);

        this.byId = [];

        var self = this;
        this.onBuildingUpdated = function (building) {
            self.dispatchEvent(self.events.buildingUpdated, building);
        };

        this.fillMap = new Uint8Array((world.size * world.size) / 8);


    }

    Buildings.prototype = Object.create(EventManager.prototype);

    Buildings.prototype.init = function () {
    };

    Buildings.prototype.tick = function () {
    };

    Buildings.prototype.getByTile = function (tile) {
        return this.get(tile.x, tile.y);
    };

    Buildings.prototype.check = function (x, y) {
        var n = x * this.world.size + y,
            index = n >> 3,
            offset = n - (index << 3);

        return !!(this.fillMap[index] >> offset & 1);
    };

    Buildings.prototype.mark = function (x, y) {
        var n = x * this.world.size + y,
            index = n >> 3,
            offset = n - (index << 3);

        return this.fillMap[index] |= 1 << offset;
    };

    Buildings.prototype._get = function (x, y) {
        if (this.check(x, y))
            return this.byId[x * this.world.size + y];

        return null;
    };

    Buildings.prototype.get = function (x, y) {
        if (this.check(x, y))
            return this.byId[x * this.world.size + y];
        else if(x >= 0 && x < this.world.size && y >= 0 && y < this.world.size)
            return this.plantTree(x, y);

        return null;
    };

    Buildings.prototype.set = function (x, y, building) {
        this.byId[x * this.world.size + y] = building;
        this.buildingIdToBuildingMap[building.id] = building;
        return building;
    };

    Buildings.prototype.unset = function (x, y) {
        var building = this.byId[x * this.world.size + y];
        this.byId[x * this.world.size + y] = null;
        delete this.buildingIdToBuildingMap[building.id];
    };

    Buildings.prototype.getRange = function (x0, y0, w, h) {
        var wh = w * h,
            r = [],
            x, y, i, b;

        for (i = 0; i < wh; i++) {
            x = ((i / h) | 0) + x0;
            y = i % h + y0;

            b = this.get(x, y);

            if (b)
                r.push(b);
        }
        return r;
    };

    /**
     * Method for registering building instances in map, arrays etc.
     * Is used when loading building from serialized data.
     *
     * @param baseX
     * @param baseY
     * @param building
     * @private
     */
    Buildings.prototype._build = function(baseX, baseY, building){
        building.setTile(this.world.tiles.get(baseX, baseY));

        var data = building.data,
            sizeX = data.size & 0x0F,
            sizeY = data.size >> 4,
            i, x, y, l;

        if(building.rotation){
            var t = sizeX;
            sizeX = sizeY;
            sizeY = t;
        }

        for (i = 0, l = sizeX * sizeY; i < l; i++) {
            x = ((i / sizeY) | 0) + baseX;
            y = i % sizeY + baseY;
            this.set(x, y, building);
            this.mark(x, y);
            //console.log(x,y);
        }

        building.addEventListener(building.events.update, this.onBuildingUpdated);
    };

    /**
     * @param baseTile
     * @param buildingCode
     * @returns {Building}
     */
    Buildings.prototype.place = function (buildingCode, baseX, baseY, rotate) {
        var data = BuildingData[buildingCode],
            building,
            sizeX = data.size & 0x0F,
            sizeY = data.size >> 4,
            i, x, y, l,
            b;

        if(rotate){
            var t = sizeX;
            sizeX = sizeY;
            sizeY = t;
        }

        //check all covered tiles
        for (i = 0, l = sizeX * sizeY; i < l; i++) {
            x = ((i / sizeY) | 0) + baseX;
            y = i % sizeY + baseY;

            b = this._get(x, y);

            if (b !== undefined && b !== null)
                throw "Tile is already taken!";
        }

        building = new Building(buildingCode);
        building.rotate(rotate);
        this._build(baseX, baseY, building);

        return building;
    };

    Buildings.prototype.build = function (buildingCode, baseX, baseY, rotate) {
        if(!BuildingData[buildingCode].canRotate)
            rotate = false;

        buildTest(this, baseX, baseY, rotate, BuildingData[buildingCode]);

        this.removeTrees(baseX, baseY, BuildingData[buildingCode].size, rotate);

        var building = this.place(buildingCode, baseX, baseY, rotate);

        this.dispatchEvent(this.events.buildingBuilt, building);

        return building;
    };

    Buildings.prototype.remove = function (building) {
        var size = building.data.size,
            sizeX = size & 0x0F,
            sizeY = size >> 4,
            i, l, x, y;

        for (i = 0, l = sizeX * sizeY; i < l; i++) {
            x = ((i / sizeY) | 0) + building.x;
            y = i % sizeY + building.y;

            this.unset(x, y);
        }

        this.dispatchEvent(this.events.buildingRemoved, building);
    };

    Buildings.prototype.plantTree = function (x, y) {
        //return null;
        var world = this.world,
            tile, building;


        if (world.terrain.getTerrainType(x, y) !== TerrainType.water && world.forestDistribution(x, y)) {
            tile = world.tiles.get(x, y);
            if (tile.terrainType !== TerrainType.water && tile.terrainType !== TerrainType.shore && tile.resource === null) {
                var simplex = world.simplex,
                    building = this.place(([BuildingCode.tree1, BuildingCode.tree2])[Math.ceil(simplex.noise2D(tile.x * 2, tile.y * 2))], tile.x, tile.y, false);

                building.setSubPosition(simplex.noise2D(tile.y / 2, tile.x / 2) / 4, simplex.noise2D(tile.x / 2, tile.y / 2) / 4);

                return building;
            }
        } else if (world.oilDistribution(x, y)) {
            tile = world.tiles.get(x, y);
            if (tile.terrainType !== TerrainType.water && tile.getSlopeId() === 2222) {
                building = this.place(BuildingCode.cliff, tile.x, tile.y, false);

                return building;
            }
        }
        return null;
    };

    Buildings.prototype.removeTrees = function (baseX, baseY, size, rotate) {
        var sizeX = size & 0x0F,
            sizeY = size >> 4,
            i, l, x, y, tree;

        if(rotate){
            var t = sizeX;
            sizeX = sizeY;
            sizeY = t;
        }


        for (i = 0, l = sizeX * sizeY; i < l; i++) {
            x = ((i / sizeY) | 0) + baseX;
            y = i % sizeY + baseY;

            tree = this._get(x, y);

            if (tree !== undefined && tree !== null && tree.data.classCode === BuildingClassCode.tree)
                this.remove(tree);
        }
    };

    Buildings.prototype.buildBridge = function (x0, y0, x1, y1) {
        var sx = Math.min(x0, x1),
            sy = Math.min(y0, y1),
            dx = Math.max(x0, x1),
            dy = Math.max(y0, y1);


        var tile0 = this.world.tiles.get(sx, sy),
            tile1 = this.world.tiles.get(dx, dy);


        var len = (dx - sx) * (y0 === y1 && x0 !== x1) + (dy - sy) * (y0 !== y1 && x0 === x1);

        if (tile0.z !== tile1.z || len === 0
            || (tile0.getSlopeId() !== 2112 && tile0.getSlopeId() !== 2211 && tile0.getSlopeId() !== 2233 && tile0.getSlopeId() !== 2332)
            || (tile1.getSlopeId() !== 2112 && tile1.getSlopeId() !== 2211 && tile1.getSlopeId() !== 2233 && tile1.getSlopeId() !== 2332)
            )
            throw "Invalid bridge";

        var valid = true;

        for (var i = 0; i <= len; i++) {
            var x = sx + i * (y0 === y1 && x0 !== x1),
                y = sy + i * (y0 !== y1 && x0 === x1);

            var tile = this.world.tiles.get(x, y);

            var b = this._get(x,y);


            valid &= !(tile.z !== tile0.z || (i !== 0 && i !== len && tile.getSlopeId() !== 2222) || (this._get(x,y) !== null && b.data.classCode !== BuildingClassCode.tree));
        }

        if (valid) {
            for (var i = 0; i <= len; i++) {
                var x = sx + i * (y0 === y1 && x0 !== x1),
                    y = sy + i * (y0 !== y1 && x0 === x1);

                this.removeTrees(x, y, 0x11);

                var building = this.place(BuildingCode.bridge, x, y);

                this.dispatchEvent(this.events.buildingBuilt, building);
            }
        } else
            throw "Invalid bridge!"
    };

    Buildings.prototype.save = function(){
        var data = {},
            buildings = [];

        for(var id in this.buildingIdToBuildingMap)
            buildings.push(Building.serialize(this.buildingIdToBuildingMap[id]));

        data.buildings = buildings;

        return data;
    };

    Buildings.prototype.load = function(buildingsData){
        for(var index in buildingsData.buildings){
            var data = buildingsData.buildings[index],
                b = Building.deserialize(data);

            this._build(b.x, b.y, b);
        }
        return this;
    };


    return Buildings;
});