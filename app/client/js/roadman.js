/**
 * Created by denis on 9/18/14.
 */
define(function (require) {
    var Events = require("events");
    var Buildman = require("./buildman");
    var Core = require("core/main");
    var BuildingClassCode = Core.BuildingClassCode;
    var Terrain = Core.Terrain;

    function getRoad(self, tile) {
        var road = self._roads[tile];
        return road || null;
    }

    function addRoad(self, tile, road) {
        self._roads[tile] = road;
    }

    function removeRoad(self, tile){
        delete self._roads[tile];
    }

    function updateRoadsNear(self, tile) {
        var road;
        (road = getRoad(self, tile + 1)) !== null && road.updateProfile();
        (road = getRoad(self, tile + Terrain.dy)) !== null && road.updateProfile();
        (road = getRoad(self, tile - 1)) !== null && road.updateProfile();
        (road = getRoad(self, tile - Terrain.dy)) !== null && road.updateProfile();
    }

    function onBuildingLoad(sender, building, self){
        var model = building.model();
        var data = model.data;

        if(data.classCode === BuildingClassCode.road){
            addRoad(self, model.tile, building);

            updateRoadsNear(self, model.tile);

            building.updateProfile();
        }
    }

    function onBuildingUnload(sender, building, self){
        var model = building.model();
        var data = model.data;

        if(data.classCode === BuildingClassCode.road){
            removeRoad(self, model.tile);
        }
    }

    function Roadman(root) {
        this.root = root;
        this._roads = {};
    }

    Roadman.prototype.init = function () {
        Events.on(this.root.buildman, Buildman.events.buildingLoad, onBuildingLoad, this);
        Events.on(this.root.buildman, Buildman.events.buildingUnload, onBuildingUnload, this);
    };

    Roadman.prototype.getRoad = function(tile){
        return getRoad(this, tile);
    };

    return Roadman;
});