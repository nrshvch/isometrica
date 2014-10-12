define(function (require) {
    var Core = require("core/main");
    var engine = require("engine/main"),
        Building = require("./building"),
        buildingData = Core.BuildingData,
        BuildingData = buildingData,
        RoadNode = require("./pathfinding/roadnode"),
        RoadView = require("./roadview");
    var Terrain = Core.Terrain;

    function Road(root) {
        this.root = root;
        this.view = new RoadView();
        this.view.setRoad(this);
    }

    Road.prototype = Object.create(Building.prototype);

    Road.prototype.typeCode = 91111;

    Road.prototype.setData = function(data){
        this.data = data;
        this.staticData = BuildingData[data.buildingCode];
        //this.tile = vkaria.terrain.getTile(data.x, data.y).tileScript;

        if(this.node === null)
            this.node = new RoadNode(this);

        this.view.update();
        this.view.render();
    };

    Road.prototype.updateProfile = function () {
        var tile = this.data.tile,
            slopeId = this.root.core.terrain.tileSlope(tile),
            buildman = this.root.roadman,
            ne = buildman.getRoad(tile + 1),
            nw = buildman.getRoad(tile + Terrain.dy),
            sw = buildman.getRoad(tile - 1),
            se = buildman.getRoad(tile - Terrain.dy),
            id;

        if (!Terrain.isSlope(slopeId)) {
            var a = sw !== null,
                b = se !== null,
                c = ne !== null,
                d = nw !== null;

            id = 90000 + a * 1000 + b * 100 + c * 10 + d;

            if (id === 90000) return;
        } else if (slopeId === Terrain.SlopeType.AB) {
            id = 1;
        } else if (slopeId === Terrain.SlopeType.AC) {
            id = 2;
        } else if (slopeId === Terrain.SlopeType.CD) {
            id = 3;
        } else if (slopeId === Terrain.SlopeType.BD) {
            id = 4;
        }

        this.typeCode = id;

        this.view.update();
        this.view.render();

        return id;
    };

    return Road;
});