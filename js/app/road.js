define(function (require) {
    var engine = require("engine"),
        Building = require("./building"),
        BuildingState = require("lib/buildingstate"),
        buildingData = require("lib/buildingdata"),
        BuildingData = require("lib/buildingdata"),
        BuildingClassCode = require("lib/buildingclasscode"),
        BuildingWaypoints = require("lib/buildingwaypoints"),
        RoadNode = require("./pathfinding/roadnode"),
        RoadView = require("./roadview");

    function Road() {
        this.view = new RoadView();
        this.view.setRoad(this);
    }

    Road.prototype = Object.create(Building.prototype);

    Road.prototype.typeCode = 91111;

    Road.prototype.setData = function(data){
        this.data = data;
        this.staticData = BuildingData[data.buildingCode];
        this.tile = vkaria.tilesman.getTile(data.x, data.y).tileScript;

        if(this.node === null)
            this.node = new RoadNode(this);

        this.view.update();
        this.view.render();
    };

    Road.prototype.updateRoad = function () {
        var tile = this.tile,
            x = tile.x,
            y = tile.y,
            slopeId = tile.getSlopeId(),
            buildman = vkaria.buildman,
            ne = buildman.getRoad(x + 1, y),
            nw = buildman.getRoad(x, y + 1),
            sw = buildman.getRoad(x - 1, y),
            se = buildman.getRoad(x, y - 1),
            id;

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

        this.typeCode = id;

        this.view.update();
        this.view.render();

        return id;
    };

    return Road;
});