//TODO do something with trees
//if trees are simply generated and planted on start up, then
//when saving game they all appear in savegame file making it huuuge
//BUT you can make trees being generated on the fly , each time when undentified tile is requsted,
//don't forget that second approach will take more cpu time.
//Try instancing only one tree and each time, when tile is requested put that instance in tile. Kinda singleton tree))

define(function (require) {
    var Events = require("events");
    var BuildingData = require("./buildingdata"),
        Building = require("./building");
    /**
     * @type {BuildingClassCode}
     */
    var BuildingClassCode = require("./buildingclasscode");

    /**
     * @type {ErrorCode}
     */
    var ErrorCode = require("./errorcode");
    /**
     * @type {Terrain}
     */
    var Terrain = require("./terrain"),
        TerrainType = require("./terraintype");
    var TileIterator = require("./tileiterator");
    /**
     * @type {BuildingPositioning}
     */
    var BuildingPositioning = require("./buildingpositioning");

    var tileIterator = new TileIterator(0, 0, 1, 1);

    var events = {
        buildingBuilt: 0,
        buildingUpdated: 1,
        buildingRemoved: 2,
        buildingStateChange: 3,
    };

    function Buildings(world) {
        this.world = world;
        this.buildings = Object.create(null);
        this.byTile = Object.create(null);
    }

    Buildings.events = Buildings.prototype.events = events;

    Buildings.prototype.get = function (idx, y) {
        if (arguments.length === 2)
            idx = Terrain.convertToIndex(idx, y);

        var b = this.byTile[idx];

        if (b === undefined)
            b = this.world.ambient.getTree(idx);

        return b;
    };

    Buildings.prototype.getRange = function (x0, y0, w, h) {
        tileIterator = new TileIterator(x0, y0, w, h);
        var b, r = [];

        while (!tileIterator.done) {
            b = this.get(TileIterator.next(tileIterator));
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

            removeTrees(this, baseX, baseY, sizeX, sizeY);

            var building = new Building();
            building.init(this.world, buildingCode, Terrain.convertToIndex(baseX, baseY), rotated);
            build(this, building);

            onSuccess(building);

            Events.fire(this, this.events.buildingBuilt, building);
        } else {
            onError(test.error);
        }
    };

    Buildings.prototype.remove = function (idx, y) {
        var w, l, tileIterator, idx2, x;

        if (arguments.length === 2)
            idx = Terrain.convertToIndex(idx, y);

        var building = this.get(idx);
        var data = BuildingData[building.buildingCode];

        if (building != null) {
            w = data.sizeX;
            l = data.sizeY;

            building.dispose();

            if (w > 1 || l > 1) {
                tileIterator = new Terrain.TileIterator(idx, w, l);

                while (!tileIterator.done) {
                    idx2 = TileIterator.next(tileIterator);

                    unset(this, idx2);
                }
            } else {
                unset(this, idx);
            }

            Events.fire(this, this.events.buildingRemoved, building);

            return true;
        }
        return false;
    };

    function removeTrees(self, baseX, baseY, sizeX, sizeY) {
        var b, idx;

        var tileIterator = new TileIterator(baseX, baseY, sizeX, sizeY);

        while (!tileIterator.done) {
            idx = TileIterator.next(tileIterator);
            b = self.get(idx);

            if (b !== undefined && b !== null && BuildingData[b.buildingCode].classCode === BuildingClassCode.tree)
                self.remove(idx);
        }

    }

    function set(self, idx, building) {
        self.buildings[building.id] = building;
        self.byTile[idx] = building;
        return building;
    }

    function unset(self, idx, y) {
        if (arguments.length === 2)
            idx = Terrain.convertToIndex(idx, y);

        var building = self.byTile[idx];
        if (building !== undefined && building !== null) {
            self.byTile[idx] = null;
            delete self.buildings[building.id];
        }
    }

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
            positioning = data.positioning || BuildingPositioning.flat,
            sizeX = rotated ? data.sizeY : data.sizeX,
            sizeY = rotated ? data.sizeX : data.sizeY,
            slopeId, terrain, terrainType, resource, tile,
            tileIterator = new TileIterator(baseX, baseY, sizeX, sizeY);

        while (!tileIterator.done) {
            tile = TileIterator.next(tileIterator);

            terrain = self.world.terrain;
            slopeId = terrain.calcSlopeId(tile);
            terrainType = terrain.getTerrainType(tile);
            resource = terrain.getResource(tile);

            if (terrainType === TerrainType.water) {
                result.error = ErrorCode.CANT_BUILD_ON_WATER;
            } else if (positioning === BuildingPositioning.flat && resource !== null) {
                result.error = ErrorCode.CANT_BUILD_HERE;
            } else if (positioning === BuildingPositioning.resource && resource !== data.resource) {
                result.error = ErrorCode.WRONG_RESOURCE_TILE;
            } else if (data.classCode === BuildingClassCode.road && slopeId !== 2222 && slopeId !== 2112 && slopeId !== 2211 && slopeId !== 2233 && slopeId !== 2332) {
                result.error = ErrorCode.LAND_NOT_SUITABLE;
            } else if (data.classCode !== BuildingClassCode.tree && data.classCode !== BuildingClassCode.road && slopeId != 2222) {
                result.error = ErrorCode.FLAT_LAND_REQUIRED;
            } else if (self.get(tile) !== null && BuildingData[self.get(tile).buildingCode].classCode !== BuildingClassCode.tree) {
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

    function onBuildingStateChange(building, state, self) {
        Events.fire(self, events.buildingStateChange, building);
    }

    function onBuildingDispose(building, args, self) {
        Events.off(building, Building.events.stateChange, sub1);
        Events.off(building, Building.events.update, sub2);
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
    function build(self, building) {
        var rotation = building.rotation;
        var data = BuildingData[building.buildingCode];
        var sizeX = rotation ? data.sizeY : data.sizeX,
            sizeY = rotation ? data.sizeX : data.sizeY,
            tile, iter = new TileIterator(building.tile, sizeX, sizeY);

        while (!iter.done) {
            tile = TileIterator.next(iter);
            set(self, tile, building);
        }

        var sub1 = Events.on(building, Building.events.stateChange, onBuildingStateChange, self);
        var sub2 = Events.on(building, Building.events.update, onBuildingUpdated, self);
        Events.once(building, "dispose", onBuildingDispose, [sub1, sub2]);
    }

    return Buildings;
});