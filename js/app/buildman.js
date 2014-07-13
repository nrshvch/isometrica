//TODO each building should be a building instance with attached prefab of building
define(function (require) {
    var engine = require("engine"),
        ResponseCode = require("lib/responsecode"),
        BuildingState = require("lib/buildingstate"),
        BuildingClassCode = require("lib/buildingclasscode"),
        TileMessage = require("./gameObjects/tilemessage"),
        Building = require("./building"),
        Road = require("./road"),
        buildingData = require("lib/buildingdata"),
        EventManager = require("lib/eventmanager"),
        Events = require("lib/events"),
        ErrorCode = require("lib/errorcode"),
        Enumerator = require("lib/enumerator");

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
            self.removeBuilding(building.x, building.y);
        };

        //Load buildings
        this.onTilesLoaded = function (sender, args) {
            var meta = args.meta;
            ;
            //vkaria.logicInterface.getBuildingData(meta.x, meta.y, meta.w, meta.h, function (response) {
                //var data = response.data,
                var data = vkaria.core.world.buildings.getRange(meta.x, meta.y, meta.w, meta.h),
                    i, l = data.length;

                for (i = 0; i < l; i++)
                    self.createBuilding(data[i]);
            //});
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
        buildingRemoved: 1
    };

    Buildman.prototype.start = function () {
        this.tilesman = vkariaApp.tilesman;

        Events.subscribe(this.tilesman, this.tilesman.events.loadedTiles, this.onTilesLoaded, this);
        Events.subscribe(this.tilesman, this.tilesman.events.removedTiles, this.onTilesRemoved, this);

        Events.subscribe(vkaria.logicInterface, ResponseCode.buildingBuilt, this.onBuildingBuilt, this);
        Events.subscribe(vkaria.logicInterface, ResponseCode.buildingUpdated, this.onBuildingUpdated, this);
        Events.subscribe(vkaria.logicInterface, ResponseCode.buildingRemoved, this.onBuildingRemoved, this);
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
            Events.fire(this, this.events.buildingRemoved, this, building);
            building.destroy();
            delete this.buildingByXY[x][y];
        }

        if (this.roadByXY[x] !== undefined && this.roadByXY[x][y] !== undefined)
            delete this.roadByXY[x][y];

        return building;
    };

    Buildman.prototype.build = function (buildingCode, x, y, rotate, onSuccess, onError) {
        var self = this;

        vkaria.core.world.city.build(buildingCode, x, y, rotate, function (building) {
            vkaria.assets.getAsset("/audio/blip.wav", vkaria.assets.constructor.Resource.ResourceTypeEnum.audio).done(function (resource) {
                //resource.data.play();
            });

            onSuccess && onSuccess();
        }, function (error) {
            var tile = vkaria.terrain.getTile(x, y),
                pos = tile.transform.getPosition();


            var msg = new TileMessage(Enumerator.parse(ErrorCode, error), "red");
            msg.transform.setPosition(pos[0], pos[1], pos[2]);
            vkaria.game.logic.world.addGameObject(msg);


            vkaria.assets.getAsset("/audio/error.wav", vkaria.assets.constructor.Resource.ResourceTypeEnum.audio).done(function (resource) {
                //resource.data.play();
            });

            onError && onError();
        });
    };

    Buildman.prototype.createBuilding = function (data) {
        var x = data.x,
            y = data.y,
            tile,
            building;

        tile = vkaria.terrain.getTile(x, y);

        if (!tile)
            return false;

        if (buildingData[data.data.buildingCode].classCode === BuildingClassCode.road) {
            building = new Road();
        } else
            building = new Building();

        building.setData(data);

        this.setBuilding(x, y, building);

        if (buildingData[data.data.buildingCode].classCode === BuildingClassCode.road) {
            this.addRoad(x, y, building);
            this.updateRoads(x, y);
        }

        Events.fire(this, this.events.buildingAdded, this, building);

        return building;
    };

    Buildman.prototype.updateBuilding = function (data) {
        var x = data.x,
            y = data.y,
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


