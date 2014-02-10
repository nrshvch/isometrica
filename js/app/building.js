define(function (require) {
    var engine = require("engine"),
        BuildingState = require("lib/buildingstate"),
        buildingData = require("lib/buildingdata"),
        BuildingData = require("lib/buildingdata"),
        BuildingClassCode = require("lib/buildingclasscode"),
        BuildingWaypoints = require("lib/buildingwaypoints"),
        BuildingNode = require("./pathfinding/buildingnode"),
        BuildingView = require("./buildingview");

    function Building() {
        this.view = new BuildingView();
        this.view.setBuilding(this);
    }

    Building.prototype.gameObject = null;
    Building.prototype.data = null;
    Building.prototype.staticData = null;
    Building.prototype.tile = null;
    Building.prototype.node = null;

    Building.prototype.setData = function(data){
        this.data = data;
        this.staticData = BuildingData[data.buildingCode];
        this.tile = vkaria.tilesman.getTile(data.x, data.y).tileScript;

        if(this.node === null){
            if(this.staticData.classCode === BuildingClassCode.road)
                this.node = new RoadNode(this);
            else
                this.node = new BuildingNode(this);
        }

        this.view.update();
        this.view.render();
    };

    Building.prototype.destroy = function () {
        this.view.gameObject.destroy();
    };

    Building.prototype.getSideTiles = function () {
        var mData = this.data,
            sData = buildingData[mData.buildingCode],
            tilesman = vkaria.tilesman,
            tiles = [], tile;

        var x0 = mData.x - 1,
            y0 = mData.y - 1,
            lx = (sData.size & 0x0F) + 2,
            ly = (sData.size >> 4) + 2;

        for (var i = 1; i < lx - 1; i++) {
            tile = tilesman.getTile(x0 + i, y0);
            if (tile !== null) tiles.push(tile);

            tile = tilesman.getTile(x0 + i, y0 + ly - 1);
            if (tile !== null) tiles.push(tile);
        }

        for (var j = 1; j < ly - 1; j++) {
            tile = tilesman.getTile(x0, y0 + j);
            if (tile !== null) tiles.push(tile);

            tile = tilesman.getTile(x0 + lx - 1, y0 + j);
            if (tile !== null) tiles.push(tile);
        }

        return tiles;
    };

    Building.prototype.getPath = function(gateIn, gateOut){
        if(gateIn === null || gateIn === undefined)
            gateIn = 0;
        else
            gateIn += 1;

        if(gateOut === null || gateOut === undefined)
            gateOut = 0;
        else
            gateOut += 1;


        var wpsSource = BuildingWaypoints[this.data.buildingCode][gateIn | gateOut << 8],
            wps = [];

        if(!wpsSource)
            return wps;

        for(var i = 0; i < wpsSource.length; i++){
            var wp = [];
            engine.glMatrix.vec3.transformMat4(wp, wpsSource[i], this.view.gameObject.transform.localToWorld);
            wps.push(wp);
        }

        return wps;
    };

    return Building;
});