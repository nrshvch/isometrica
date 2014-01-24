//TODO each building should be a building instance with attached prefab of building
define(function (require) {
    var engine = require("engine"),
        ResponseCode = require("lib/responsecode"),
        objectList = require("./objectlist"),
        site = require("./gameObjects/buildingSite"),
        BuildingState = require("lib/buildingstate"),
        BuildingClassCode = require("lib/buildingclasscode"),
        TileMessage = require("./gameObjects/tilemessage"),
        Building = require("./building"),
        buildingData = require("lib/buildingdata"),
        EventManager = require("lib/eventmanager");

    var roadSprite = {
        90001: "road/straight1.png",
        90010: "road/straight2.png",
        90011: "road/turn3.png",
        90100: "road/straight1.png",
        90101: "road/straight1.png",
        90110: "road/turn2.png",
        90111: "road/t2.png",
        91000: "road/straight2.png",
        91001: "road/turn1.png",
        91010: "road/straight2.png",
        91011: "road/t3.png",
        91100: "road/turn4.png",
        91101: "road/t4.png",
        91110: "road/t1.png",
        91111: "road/x1.png",
        1: "road/elevation1.png",
        2: "road/elevation2.png",
        3: "road/elevation3.png",
        4: "road/elevation4.png"
    };

    var bridgeSprite = {

    };

    function Buildman(main) {
        EventManager.call(this);

        this.buildingByXY = [];

        this.roadByXY = [];

        var self = this;
        this.main = main;

        this.onBuildingBuilt = function (sender, building) {
            var gameObject = self.processSerializedBuilding(building);
            self.updateRoads(building);
        };

        this.onBuildingRemoved = function (sender, building) {
            self.removeBuilding(building.x, building.y);
            self.updateRoads(building);
        };

        this.onTilesLoaded = function (sender, args) {
            var meta = args.meta;
            vkaria.logicInterface.getBuildingData(meta.x, meta.y, meta.w, meta.h, function (response) {
                var data = response.data,
                    i, l = data.length;

                for (i = 0; i < l; i++)
                    self.processSerializedBuilding(data[i]);
            });
        };

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

        this.tilesman.addEventListener(this.tilesman.events.loadedTiles, this.onTilesLoaded);
        this.tilesman.addEventListener(this.tilesman.events.removedTiles, this.onTilesRemoved);

        vkaria.logicInterface.addEventListener(ResponseCode.buildingBuilt, this.onBuildingBuilt);
        vkaria.logicInterface.addEventListener(ResponseCode.buildingRemoved, this.onBuildingRemoved);
        vkaria.logicInterface.addEventListener(ResponseCode.buildingUpdated, this.onBuildingBuilt);
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
            this.dispatchEvent(this.events.buildingRemoved, this, building);
            building.destroy();
            delete this.buildingByXY[x][y];
        }

        if (this.roadByXY[x] !== undefined && this.roadByXY[x][y] !== undefined)
            delete this.roadByXY[x][y];
    };

    Buildman.prototype.build = function (buildingCode, x, y, rotate, callback) {
        var self = this;

        vkaria.logicInterface.build(buildingCode, x, y, rotate, function (data) {
            var tile = vkaria.tilesman.getTile(x, y),
                pos = tile.transform.getPosition();

            if (!data.success) {
                var msg = new TileMessage(data.error, "red");
                msg.transform.setPosition(pos[0], pos[1], pos[2]);
                vkaria.game.logic.world.addGameObject(msg);


                vkaria.assets.getAsset("/audio/error.wav", vkaria.assets.constructor.Resource.ResourceTypeEnum.audio).done(function (resource) {
                    resource.data.play();
                });
            } else {
                vkaria.assets.getAsset("/audio/blip.wav", vkaria.assets.constructor.Resource.ResourceTypeEnum.audio).done(function (resource) {
                    resource.data.play();
                });
            }

            callback && callback(data);
        });
    };

    Buildman.prototype.processSerializedBuilding = function (data) {
        var x = data.x,
            y = data.y,
            tile,
            building;

        tile = vkaria.tilesman.getTile(x,y);

        if(!tile)
            return;

        building = this.getBuilding(x, y);

        var isNew = false;
        if(building === null){
            building = new Building();
            this.setBuilding(x,y, building);

            if (buildingData[data.buildingCode].classCode === BuildingClassCode.road)
                this.addRoad(x, y, building);

            isNew = true;
        }

        building.setData(data);

        //will add building to scene
        building.activate();

        if(isNew)
            this.dispatchEvent(this.events.buildingAdded, this, building);

        if (buildingData[data.buildingCode].classCode === BuildingClassCode.road)
            this.updateRoads(data);

        return;
    };

    Buildman.prototype.updateRoads = function (item) {
        var x = item.x,
            y = item.y;

        if (this.getRoad(x, y) !== null)
            this.updateRoad(x, y);

        if (this.getRoad(x + 1, y) !== null)
            this.updateRoad(x + 1, y);

        if (this.getRoad(x, y + 1) !== null)
            this.updateRoad(x, y + 1);

        if (this.getRoad(x - 1, y) !== null)
            this.updateRoad(x - 1, y);

        if (this.getRoad(x, y - 1) !== null)
            this.updateRoad(x, y - 1);
    };

    Buildman.prototype.updateRoad = function (x, y) {
        var tile = vkaria.tilesman.getTile(x, y),
            slopeId = tile.tileScript.getSlopeId(),
            road = this.getRoad(x, y).gameObject,
            ne = this.getRoad(x + 1, y),
            nw = this.getRoad(x, y + 1),
            sw = this.getRoad(x - 1, y),
            se = this.getRoad(x, y - 1),
            id;

        if (road.name === "road") {

            if (slopeId === 2222) {
                var a = sw !== null,
                    b = se !== null,
                    c = ne !== null,
                    d = nw !== null;

                id = 90000 + a * 1000 + b * 100 + c * 10 + d;

                if (id === 90000) return;
            } else if (slopeId === 2233) {
                id = 1;
            } else if (slopeId === 2112) {
                id = 2;
            } else if (slopeId === 2211) {
                id = 3;
            } else if (slopeId === 2332) {
                id = 4;
            }


            if (road.transform.children[0].gameObject.spriteRenderer)
                road.transform.children[0].gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite(roadSprite[id]));

        } else if (road.name === "bridge") {
            if ((ne !== null && ne.name === "bridge") || (sw !== null && sw.name === "bridge"))
                road.transform.children[0].gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite("bridge/2.png"));
            else if ((nw !== null && nw.name === "bridge") || (se !== null && se.name === "bridge"))
                road.transform.children[0].gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite("bridge/1.png"));

            if (slopeId === 2332)
                road.transform.children[0].gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite("bridge/ne.png"));

            if (slopeId === 2211)
                road.transform.children[0].gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite("bridge/nw.png"));

            if (slopeId === 2233)
                road.transform.children[0].gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite("bridge/se.png"));

            if (slopeId === 2112)
                road.transform.children[0].gameObject.spriteRenderer.setSprite(vkaria.sprites.getSprite("bridge/sw.png"));
        }
    };

    return Buildman;
});


