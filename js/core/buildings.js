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
        Events = require("lib/events"),
        ResourceCode = require("lib/resourcecode"),
        ErrorCode = require("lib/errorcode"),
        TerrainType = require("lib/terraintype");

    function buildTest(self, buildingCode, baseX, baseY, rotated) {
        var result = {
                success: true,
                error: ErrorCode.NONE
            },
            data = BuildingData[buildingCode],
            sizeX = rotated ? data.sizeY : data.sizeX,
            sizeY = rotated ? data.sizeX : data.sizeY,
            i, l, x, y, tile, slopeId;

        for (i = 0, l = sizeX * sizeY; i < l; i++) {
            y = ((i / sizeX) | 0);
            x = i - y * sizeX;

            x += baseX;
            y += baseY;

            tile = self.world.tiles.get(x, y);
            slopeId = tile.getSlopeId();

            if (tile.terrainType === TerrainType.water) {
                result.error = ErrorCode.CANT_BUILD_ON_WATER;
            } else if (data.gather === null && tile.resource !== null) {
                result.error = ErrorCode.CANT_BUILD_HERE;
            } else if (data.gather !== null && data.gather !== tile.resource) {
                result.error = ErrorCode.WRONG_RESOURCE_TILE;
            } else if (data.classCode === BuildingClassCode.road && slopeId !== 2222 && slopeId !== 2112 && slopeId !== 2211 && slopeId !== 2233 && slopeId !== 2332) {
                result.error = ErrorCode.LAND_NOT_SUITABLE;
            } else if (data.classCode !== BuildingClassCode.tree && slopeId != 2222) {
                result.error = ErrorCode.FLAT_LAND_REQUIRED;
            } else if (self.get(x, y) !== null && self.get(x,y).data.classCode !== BuildingClassCode.tree) {
                result.error = ErrorCode.TILE_TAKEN;
            }

            if (result.error !== ErrorCode.NONE) {
                result.success = false;
                break;
            }
        }

        return result;
    }

    function onBuildingUpdated(sender, args, self) {
        var building = sender;
        Events.fire(self, self.events.buildingUpdated, self, building);
    }

    /**
     * Method for registering building instances in map, arrays etc.
     * Is used when loading building from serialized data.
     *
     * @param baseX
     * @param baseY
     * @param building
     * @private
     */
    function build(self, baseX, baseY, building) {
        building.setTile(self.world.tiles.get(baseX, baseY));

        var sizeX = building.rotation ? building.data.sizeY : building.data.sizeX,
            sizeY = building.rotation ? building.data.sizeX : building.data.sizeY,
            i, x, y, l;

        for (i = 0, l = sizeX * sizeY; i < l; i++) {
            x = ((i / sizeY) | 0) + baseX;
            y = i % sizeY + baseY;
            self.set(x, y, building);
            self.mark(x, y);
        }

        Events.subscribe(building, building.events.update, onBuildingUpdated, self);
    }

    /**
     * @param self this
     * @param buildingCode
     * @param baseX
     * @param baseY
     * @returns {Building}
     */
    function place(self, buildingCode, baseX, baseY, rotate) {
        var data = BuildingData[buildingCode],
            building,
            sizeX = rotate ? data.sizeY : data.sizeX,
            sizeY = rotate ? data.sizeX : data.sizeY,
            i, x, y, l,
            b;

        /*
         //check all covered tiles
         for (i = 0, l = sizeX * sizeY; i < l; i++) {
         x = ((i / sizeY) | 0) + baseX;
         y = i % sizeY + baseY;

         b = self.get(x, y);

         if (b !== undefined && b !== null)
         throw "Tile is already taken!";
         }
         */

        building = new Building(buildingCode, self.world);
        building.rotate(rotate);
        build(self, baseX, baseY, building);

        return building;
    }

    function PlantTrees(buildman) {
        //initalize all tiles
        for (var i = 0; i < buildman.world.size * buildman.world.size; i++) {
            var x = (i / buildman.world.size) | 0;
            var y = i - (x * buildman.world.size);

            buildman.plantTree(x, y);
        }
    }

    function Buildings(world) {
        this.world = world;

        this.buildingIdToBuildingMap = Object.create(null);

        this.byId = [];

        this.fillMap = new Uint8Array((world.size * world.size) / 8);
    }

    Buildings.prototype.events = {
        buildingBuilt: 0,
        buildingUpdated: 1,
        buildingRemoved: 2
    };

    Buildings.prototype.init = function () {
        PlantTrees(this);
    };

    Buildings.prototype.fillTest = function (x, y) {
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

    Buildings.prototype.get = function (x, y) {
        if (this.fillTest(x, y))
            return this.byId[x * this.world.size + y];

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



    Buildings.prototype.build = function (buildingCode, baseX, baseY, rotated, onSuccess, onError) {
        if (!BuildingData[buildingCode].canRotate)
            rotated = false;

        var test = buildTest(this, buildingCode, baseX, baseY, rotated);

        if (test.success) {
            var data = BuildingData[buildingCode];
            var sizeX = rotated ? data.sizeY : data.sizeX;
            var sizeY = rotated ? data.sizeX : data.sizeY;

            this.removeTrees(baseX, baseY, sizeX, sizeY);

            var building = place(this, buildingCode, baseX, baseY, rotated);

            onSuccess(building);

            Events.fire(this, this.events.buildingBuilt, this, building);
        } else {
            onError(test.error);
        }
    };

    Buildings.prototype.remove = function (x, y) {
        var building = this.get(x, y);
        if (building != null) {
            var sizeX = building.data.sizeX,
                sizeY = building.data.sizeY,
                i, l, x, y;

            building.onRemove();

            for (i = 0, l = sizeX * sizeY; i < l; i++) {
                x = ((i / sizeY) | 0) + building.x;
                y = i % sizeY + building.y;

                this.unset(x, y);
            }


            //this.dispatchEvent(this.events.buildingRemoved, building);
            Events.fire(this, this.events.buildingRemoved, this, building);

            return true;
        }
        return false;
    };

    Buildings.prototype.plantTree = function (x, y) {
        //return null;
        var world = this.world,
            tile, building;


        if (world.terrain.getTerrainType(x, y) !== TerrainType.water && world.forestDistribution(x, y)) {
            tile = world.tiles.get(x, y);
            if (tile.terrainType !== TerrainType.water && tile.terrainType !== TerrainType.shore && tile.resource === null) {
                var simplex = world.simplex,
                    building = place(this, ([BuildingCode.tree1, BuildingCode.tree2])[Math.ceil(simplex.noise2D(tile.x * 2, tile.y * 2))], tile.x, tile.y, false);

                building.setSubPosition(simplex.noise2D(tile.y / 2, tile.x / 2) / 4, simplex.noise2D(tile.x / 2, tile.y / 2) / 4);

                return building;
            }
        } else if (world.oilDistribution(x, y)) {
            tile = world.tiles.get(x, y);
            if (tile.terrainType !== TerrainType.water && tile.getSlopeId() === 2222) {
                building = place(this, BuildingCode.cliff, tile.x, tile.y, false);

                return building;
            }
        }
        return null;
    };

    Buildings.prototype.removeTrees = function (baseX, baseY, sizeX, sizeY) {
        var i, l, x, y, tree;

        for (i = 0, l = sizeX * sizeY; i < l; i++) {
            x = ((i / sizeY) | 0) + baseX;
            y = i % sizeY + baseY;

            tree = this.get(x, y);

            if (tree !== undefined && tree !== null && tree.data.classCode === BuildingClassCode.tree)
                this.remove(x,y);
        }
    };

    Buildings.prototype.save = function () {
        var data = {},
            buildings = [];

        for (var id in this.buildingIdToBuildingMap)
            buildings.push(this.buildingIdToBuildingMap[id].toJSON());

        data.buildings = buildings;

        return data;
    };

    Buildings.prototype.load = function (buildingsData) {
        for (var index in buildingsData.buildings) {
            var data = buildingsData.buildings[index],
                b = Building.fromJSON(data);

            this._build(b.x, b.y, b);
        }
        return this;
    };


    return Buildings;
});