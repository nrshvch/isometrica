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
    var TileIteratorAction = require("./tileiteratoraction");
    /**
     * @type {BuildingPositioning}
     */
    var BuildingPositioning = require("./buildingpositioning");

    var Namespace = require("namespace");

    var Core = Namespace("Isometrica.Core");
    Core.ConstructionService = Buildings;

    var events = {
        buildingBuilt: 0,
        buildingUpdated: 1,
        buildingRemoved: 2,
        buildingStateChange: 3
    };

    /**
     *
     * @param {Buildings} self
     * @returns {number}
     */
    function buildTest(self, code, tile, rotation) {
        var rotated = rotation,
            data = BuildingData[code],
            positioning = data.positioning || BuildingPositioning.flat,
            sizeX = rotated ? data.sizeY : data.sizeX,
            sizeY = rotated ? data.sizeX : data.sizeY,
            slopeId, terrain, terrainType, resource,
            tileIterator = new TileIterator(tile, sizeX, sizeY);

        while (!tileIterator.done) {
            tile = TileIterator.next(tileIterator);

            terrain = self.world.terrain;
            slopeId = terrain.calcSlopeId(tile);
            terrainType = terrain.getTerrainType(tile);
            resource = terrain.getResource(tile);

            if (terrainType === TerrainType.water)
                return ErrorCode.CANT_BUILD_ON_WATER;
            else if (positioning === BuildingPositioning.flat && resource !== null)
                return ErrorCode.CANT_BUILD_HERE;
            else if (positioning === BuildingPositioning.resource && resource !== data.resource)
                return ErrorCode.WRONG_RESOURCE_TILE;
            else if (data.classCode === BuildingClassCode.road && slopeId !== 2222 && slopeId !== 2112 && slopeId !== 2211 && slopeId !== 2233 && slopeId !== 2332)
                return ErrorCode.LAND_NOT_SUITABLE;
            else if (data.classCode !== BuildingClassCode.tree && data.classCode !== BuildingClassCode.road && slopeId != 2222)
                return ErrorCode.FLAT_LAND_REQUIRED;
            else if (self.get(tile) !== null && BuildingData[self.get(tile).buildingCode].classCode !== BuildingClassCode.tree)
                return ErrorCode.TILE_TAKEN;
        }

        return ErrorCode.NONE;
    }

    function onTileCleared(terrain, tile, self) {
        var building = self.byTile[tile];
        if (building !== null && building !== undefined)
            remove(self, building);
    }

    function onBuildingStateChange(building, state, self) {
        Events.fire(self, self.events.buildingUpdated, building);
        Events.fire(self, events.buildingStateChange, building);
    }

    function onBuildingDispose(building, args, meta) {
        Events.off(building, Building.events.stateChange, meta[0]);
        //Events.off(building, Building.events.update, meta[1]);
    }

    function removeTree(self, tile) {
        var tree;
        tree = self.byTile[tile];
        if (tree !== undefined && tree !== null && tree.data.classCode === BuildingClassCode.tree)
            remove(self, tree);
    }

    function remove(self, building) {
        var tile, occupiedTiles, id = building.id;

        if (building !== null && building !== undefined) {
            occupiedTiles = building.occupiedTiles();

            while (!occupiedTiles.done) {
                tile = TileIterator.next(occupiedTiles);
                self.byTile[tile] = null;
            }

            delete self.buildings[id];

            building.dispose();

            Events.fire(self, self.events.buildingRemoved, id);

            return true;
        }
        return false;
    }

    function getRangerIteratorAction(tile, self) {
        return self.get(tile);
    }

    /**
     * @class Buildings
     * @param world {World}
     * @constructor
     */
    function Buildings(world) {
        this.world = world;
        this.buildings = Object.create(null);
        this.byTile = Object.create(null);
    }

    Buildings.events = events;

    Buildings.prototype.events = events;

    Buildings.prototype.init = function () {
        var terrain = this.world.terrain;
        Events.on(terrain, Terrain.events.tileCleared, onTileCleared, this);
    };

    Buildings.prototype.get = function (idx, y) {
        if (arguments.length === 2)
            idx = Terrain.convertToIndex(idx, y);

        return this.byTile[idx] || null;
    };

    /**
     * @param x0
     * @param y0
     * @param w
     * @param h
     * @returns {Iterator}
     */
    Buildings.prototype.getRange = function (x0, y0, w, h) {
        return new TileIteratorAction(Terrain.convertToIndex(x0, y0), w, h, getRangerIteratorAction, this);
    };

    Buildings.prototype.build = function (building) {
        var tile, iter = building.occupiedTiles();

        this.buildings[building.id] = building;

        while (!iter.done) {
            tile = TileIterator.next(iter);
            removeTree(this, tile);
            this.byTile[tile] = building;
        }

        var sub1 = Events.on(building, Building.events.stateChange, onBuildingStateChange, this);

        Events.once(building, "dispose", onBuildingDispose, [sub1]);

        Events.fire(this, events.buildingBuilt, building);
    };

    Buildings.prototype.test = function (code, tile, rotation) {
        return buildTest(this, code, tile, rotation);
    };

    return Buildings;
});