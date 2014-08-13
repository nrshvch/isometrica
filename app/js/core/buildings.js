//TODO do something with trees
//if trees are simply generated and planted on start up, then
//when saving game they all appear in savegame file making it huuuge
//BUT you can make trees being generated on the fly , each time when undentified tile is requsted,
//don't forget that second approach will take more cpu time.
//Try instancing only one tree and each time, when tile is requested put that instance in tile. Kinda singleton tree))

define(function (require) {
    var BuildingData = require("./buildingdata"),
        Building = require("./building"),
        BuildingClassCode = require("./buildingclasscode"),
        Events = require("events"),
        ErrorCode = require("./errorcode"),
        Terrain = require("./terrain"),
        TerrainType = require("./terraintype"),
        TileIterator = require("./tileiterator");

    var tileIterator = new TileIterator(0,0,1,1);

    /**
     *
     * @param {Buildings} self
     * @param {number} buildingCode
     * @param {number} baseX
     * @param {number} baseY
     * @param {boolean} rotated
     * @returns {{success: boolean, error: *}}
     */
    function buildTest(self, buildingCode, baseX, baseY, rotated) {
        var result = {
                success: true,
                error: ErrorCode.NONE
            },
            data = BuildingData[buildingCode],
            sizeX = rotated ? data.sizeY : data.sizeX,
            sizeY = rotated ? data.sizeX : data.sizeY,
            slopeId, terrain, terrainType, resource, tile,
            tileIterator = new TileIterator(baseX, baseY, sizeX, sizeY);

        while(!tileIterator.done){
            tile = TileIterator.next(tileIterator);

            terrain = self.world.terrain;
            slopeId = terrain.calcSlopeId(tile);
            terrainType = terrain.getTerrainType(tile);
            resource = terrain.getResource(tile);

            if (terrainType === TerrainType.water) {
                result.error = ErrorCode.CANT_BUILD_ON_WATER;
            } else if (data.gather === null && resource) {
                result.error = ErrorCode.CANT_BUILD_HERE;
            } else if (data.gather !== null && data.gather !== resource) {
                result.error = ErrorCode.WRONG_RESOURCE_TILE;
            } else if (data.classCode === BuildingClassCode.road && slopeId !== 2222 && slopeId !== 2112 && slopeId !== 2211 && slopeId !== 2233 && slopeId !== 2332) {
                result.error = ErrorCode.LAND_NOT_SUITABLE;
            } else if (data.classCode !== BuildingClassCode.tree && data.classCode !== BuildingClassCode.road && slopeId != 2222) {
                result.error = ErrorCode.FLAT_LAND_REQUIRED;
            } else if (self.get(tile) !== null && self.get(tile).data.classCode !== BuildingClassCode.tree) {
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
        var building = args;
        Events.fire(self, self.events.buildingUpdated, building);
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
        building.setPosition(baseX, baseY);

        var sizeX = building.rotation ? building.data.sizeY : building.data.sizeX,
            sizeY = building.rotation ? building.data.sizeX : building.data.sizeY,
            tile, iter = new Terrain.TileIterator(baseX,baseY,sizeX,sizeY);

        while(!iter.done){
            tile = TileIterator.next(iter);
            self.set(tile, building);
        }

        Events.on(building, building.events.update, onBuildingUpdated, self);
    }

    /**
     * @param self this
     * @param buildingCode
     * @param baseX
     * @param baseY
     * @returns {Building}
     */
    function place(self, buildingCode, baseX, baseY, rotate) {
        var building = new Building(buildingCode, self.world);
        building.rotate(rotate);
        build(self, baseX, baseY, building);

        return building;
    }

    function Buildings(world) {
        this.world = world;
        this.buildings = Object.create(null);
        this.byTile = Object.create(null);
    }

    Buildings.prototype.events = {
        buildingBuilt: 0,
        buildingUpdated: 1,
        buildingRemoved: 2
    };

    Buildings.prototype.get = function (idx, y) {
        if(arguments.length === 2)
            idx = Terrain.convertToIndex(idx, y);

        var b = this.byTile[idx];

        if(b === undefined)
            b = this.world.ambient.getTree(idx);

        return b;
    };

    Buildings.prototype.set = function (idx, building) {
        this.buildings[building.id] = building;
        this.byTile[idx] = building;
        return building;
    };

    Buildings.prototype.release = function(building){
        if(this.buildings[building.id] === undefined)
            building.dispose();
    };

    Buildings.prototype.unset = function (idx, y) {
        if(arguments.length === 2)
            idx = Terrain.convertToIndex(idx,y);

        var building = this.byTile[idx];
        if(building !== undefined && building !== null) {
            this.byTile[idx] = null;
            delete this.buildings[building.id];
        }
    };

    Buildings.prototype.getRange = function (x0, y0, w, h) {
        tileIterator = new Terrain.TileIterator(x0,y0,w,h);
        var b, r = [];

        while(!tileIterator.done){
            b = this.get(TileIterator.next(tileIterator));
            if(b)
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

            Events.fire(this, this.events.buildingBuilt, building);
        } else {
            onError(test.error);
        }
    };

    Buildings.prototype.remove = function (idx, y) {
        var w, l, tileIterator, idx2, x;

        if(arguments.length === 2)
            idx = Terrain.convertToIndex(idx, y);

        var building = this.get(idx);

        if (building != null) {
            w = building.data.sizeX;
            l = building.data.sizeY;

            building.onRemove();

            if(w > 1 || l > 1) {
                x = Terrain.extractX(idx);
                y = Terrain.extractY(idx);
                tileIterator = new Terrain.TileIterator(x, y, w, l);

                while(!tileIterator.done){
                    idx2 = TileIterator.next(tileIterator);

                    this.unset(idx2);
                }
            }else{
                this.unset(idx);
            }

            Events.fire(this, this.events.buildingRemoved, building);

            return true;
        }
        return false;
    };

    Buildings.prototype.removeTrees = function (baseX, baseY, sizeX, sizeY) {
        var b, idx;

        var tileIterator = new Terrain.TileIterator(baseX, baseY, sizeX, sizeY);

        while(!tileIterator.done){
            idx = TileIterator.next(tileIterator);
            b = this.get(idx);
            if(b !== undefined && b !== null && b.data.classCode === BuildingClassCode.tree)
                this.remove(idx);
        }

    };

    Buildings.prototype.save = function () {
        var data = {},
            buildings = [];

        for (var id in this.buildings)
            buildings.push(this.buildings[id].toJSON());

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