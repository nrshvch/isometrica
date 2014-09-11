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

    function Buildman(main) {
        EventManager.call(this);

        this.buildingByXY = [];

        this.roadByXY = [];

        var self = this;
        this.main = main;

        this.onBuildingBuilt = function (sender, building) {
            self.createBuilding(building);
        };

        this.onBuildingUpdated = function (sender, building) {
            self.updateBuilding(building);

        };

        this.onBuildingRemoved = function (sender, building) {
            var x = Terrain.extractX(building.tile);
            var y = Terrain.extractY(building.tile);
            self.removeBuilding(x, y);
        };

        //Load buildings
        this.onTilesLoaded = function (sender, args) {
            var meta = args.meta;

            var buildings = vkaria.core.world.buildings;
            var iter = buildings.getRange(meta.x, meta.y, meta.w, meta.h);
            var model;
            while (!iter.done) {
                model = iter.next();
                if (model !== null && model !== undefined)
                    self.createBuilding(model);
            }

        };

        //Unload buildings
        this.onTilesRemoved = function (sender, response) {
            var x = response.x,
                y = response.y,
                w = response.w,
                h = response.h;

            for (var i = x; i < x + w; i++)
                for (var j = y; j < y + h; j++)
                    self.removeBuilding(i, j);
        };
    }

    Buildman.prototype = Object.create(EventManager.prototype);

    Buildman.prototype.events = {
        buildingAdded: 0,
        buildingRemoved: 1,
        buildingAdd: 0,
        buildingRemove: 1
    };

    Buildman.prototype.start = function () {
        this.tilesman = vkariaApp.tilesman;
        var coreTerrain = this.main.core.world.terrain;

        Events.subscribe(this.tilesman, this.tilesman.events.loadedTiles, this.onTilesLoaded, this);
        Events.subscribe(this.tilesman, this.tilesman.events.removedTiles, this.onTilesRemoved, this);

        Events.on(coreTerrain, Terrain.events.tileCleared, function (sender, args, self) {
            var x = Terrain.extractX(args);
            var y = Terrain.extractY(args);
            self.removeBuilding(x, y);
        }, this);

        var bSrvEv = Core.ConstructionService.events;
        var bSrv = this.main.core.world.buildingService;

        Events.on(bSrv, bSrvEv.buildingBuilt, this.onBuildingBuilt, this);
        Events.on(bSrv, bSrvEv.buildingUpdated, this.onBuildingUpdated, this);
        Events.on(bSrv, bSrvEv.buildingRemoved, this.onBuildingRemoved, this);
    };

    Buildman.prototype.getRoad = function (x, y) {
        if (this.roadByXY[x] !== undefined && this.roadByXY[x][y] !== undefined)
            return this.roadByXY[x][y];
        else
            return null;
    };

    Buildman.prototype.addRoad = function (x, y, road) {
        if (this.roadByXY[x] === undefined)
            this.roadByXY[x] = [];

        this.roadByXY[x][y] = road;
    };

    Buildman.prototype.getBuilding = function (x, y) {
        if (this.buildingByXY[x] !== undefined && this.buildingByXY[x][y] !== undefined)
            return this.buildingByXY[x][y];
        else
            return null;
    };

    Buildman.prototype.setBuilding = function (x, y, building) {
        if (this.buildingByXY[x] === undefined)
            this.buildingByXY[x] = [];

        this.buildingByXY[x][y] = building;
    };

    Buildman.prototype.removeBuilding = function (x, y) {
        var building;
        if (this.buildingByXY[x] !== undefined && this.buildingByXY[x][y] !== undefined) {
            building = this.buildingByXY[x][y];
            Events.fire(this, this.events.buildingRemoved, building);
            building.destroy();

            if (!building.data.permanent)
                building.data.dispose();

            delete this.buildingByXY[x][y];
        }

        if (this.roadByXY[x] !== undefined && this.roadByXY[x][y] !== undefined)
            delete this.roadByXY[x][y];

        return building;
    };

    Buildman.prototype.createBuilding = function (model) {
        var x = Terrain.extractX(model.tile),
            y = Terrain.extractY(model.tile),
            tile,
            building;

        tile = vkaria.terrain.getTile(x, y);

        if (!tile)
            return false;

        if (model.data.classCode === BuildingClassCode.road) {
            building = new Road();
        } else
            building = new Building();

        building.setData(model);

        this.setBuilding(x, y, building);

        if (model.data.classCode === BuildingClassCode.road) {
            this.addRoad(x, y, building);
            this.updateRoads(x, y);
        }

        Events.fire(this, this.events.buildingAdded, building);

        return building;
    };

    Buildman.prototype.updateBuilding = function (data) {
        var x = Terrain.extractX(data.tile),
            y = Terrain.extractY(data.tile),
            tile,
            building;

        tile = vkaria.terrain.getTile(x, y);

        if (!tile)
            return false;

        building = this.getBuilding(x, y);
        building.setData(data);

        return building;
    };

    Buildman.prototype.updateRoads = function (x, y) {
        var buildman = vkaria.buildman,
            road;

        if ((road = buildman.getRoad(x, y)) !== null)
            road.updateRoad(x, y);

        if ((road = buildman.getRoad(x + 1, y)) !== null)
            road.updateRoad(x + 1, y);

        if ((road = buildman.getRoad(x, y + 1)) !== null)
            road.updateRoad(x, y + 1);

        if ((road = buildman.getRoad(x - 1, y)) !== null)
            road.updateRoad(x - 1, y);

        if ((road = buildman.getRoad(x, y - 1)) !== null)
            road.updateRoad(x, y - 1);
    };

    return Buildman;
});


