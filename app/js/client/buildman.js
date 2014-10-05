//TODO each building should be a building instance with attached prefab of building
define(function (require) {
    var Core = require("core");
    var engine = require("engine"),
        BuildingClassCode = require("core/buildingclasscode"),
        Building = require("./building"),
        Road = require("./road"),
        EventManager = require("events"),
        Events = require("events");
    var Terrain = Core.Terrain;
    var Chunkman = require("./chunkman");
    var TileIterator = Core.TileIterator;
    var Terrain = Core.Terrain;
    var ConstructionService = Core.ConstructionService;

    function getBuilding(self, tile) {
        var x = Terrain.extractX(tile);
        var y = Terrain.extractY(tile);

        if (self.buildingByXY[x] !== undefined && self.buildingByXY[x][y] !== undefined)
            return self.buildingByXY[x][y];
        else
            return null;
    }

    function setBuilding(self, tile, building) {
        var x = Terrain.extractX(tile);
        var y = Terrain.extractY(tile);

        if (self.buildingByXY[x] === undefined)
            self.buildingByXY[x] = [];

        self.buildingByXY[x][y] = building;
    }

    function removeBuilding(self, tile) {
        var x = Terrain.extractX(tile);
        var y = Terrain.extractY(tile);

        var building;
        if (self.buildingByXY[x] !== undefined && self.buildingByXY[x][y] !== undefined) {
            building = self.buildingByXY[x][y];
            Events.fire(self, self.events.buildingRemoved, building);
            building.destroy();

            if (!building.data.permanent)
                building.data.dispose();

            delete self.buildingByXY[x][y];
        }

        return building;
    }

    function createBuilding(self, model) {
        var building;

        if (model.data.classCode === BuildingClassCode.road) {
            building = new Road(self.root);
        } else
            building = new Building(self.root);

        building.setData(model);

        setBuilding(self, model.tile, building);

        Events.fire(self, self.events.buildingAdded, building);

        return building;
    }

    function updateBuilding(self, data) {
        var tile = data.tile,
            building;

        building = getBuilding(self, tile);
        building.setData(data);

        return building;
    }


    function onChunkLoad(sender, chunk, self) {
        var tiles = chunk.tiles();
        var tile, model, buildings = self.root.core.buildingService;
        while (!tiles.done) {
            tile = TileIterator.next(tiles);
            model = buildings.get(tile);
            if (model !== null && model !== undefined)
                createBuilding(self, model);
        }
    }

    function onChunkRemove(sender, chunk, self) {
        var tiles = chunk.tiles();
        var tile;
        while (!tiles.done) {
            tile = TileIterator.next(tiles);
            removeBuilding(self, tile);
        }
    }


    function onBuildingBuilt(sender, building, self) {
        createBuilding(self, building);
    }

    function onBuildingUpdated(sender, building, self) {
        updateBuilding(self, building);

    }

    function onBuildingRemoved(sender, building, self) {
        removeBuilding(self, building.tile);
    }

    var events = {
        buildingAdded: 0,
        buildingRemoved: 1,
        buildingAdd: 0,
        buildingRemove: 1,
        buildingLoad: 0,
        buildingUnload: 1
    };

    function Buildman(main) {
        EventManager.call(this);

        this.buildingByXY = [];
        this.root = main;
    }


    Buildman.events = events;

    Buildman.prototype = Object.create(EventManager.prototype);

    Buildman.prototype.events = events;

    Buildman.prototype.start = function () {
        Events.on(this.root.chunkman, Chunkman.events.chunkLoad, onChunkLoad, this);
        Events.on(this.root.chunkman, Chunkman.events.chunkUnload, onChunkRemove, this);

        var core = this.root.core;

        Events.on(core.constructionService, ConstructionService.events.buildingBuilt, onBuildingBuilt, this);
        Events.on(core.constructionService, ConstructionService.events.buildingUpdated, onBuildingUpdated, this);
        Events.on(core.constructionService, ConstructionService.events.buildingRemoved, onBuildingRemoved, this);
    };

    Buildman.prototype.getBuilding = function (tile_or_x, y) {
        var tile;

        if (arguments.length === 2)
            tile = Terrain.convertToIndex(tile_or_x, y);
        else
            tile = tile_or_x;

        return getBuilding(this, tile);
    };


    return Buildman;
});


