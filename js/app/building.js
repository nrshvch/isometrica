define(function (require) {
    var engine = require("engine"),
        BuildingState = require("lib/buildingstate"),
        buildingModels = require("./objectlist"),
        site = require("./gameObjects/buildingSite"),
        buildingData = require("lib/buildingdata"),
        BuildingClassCode = require("lib/buildingclasscode"),
        BuildingWaypoints = require("lib/buildingwaypoints"),
        BuildingNode = require("./pathfinding/buildingnode"),
        RoadNode = require("./pathfinding/roadnode");

    function Building() {

    }

    Building.prototype.gameObject = null;
    Building.prototype.data = null;
    Building.prototype.tile = null;

    Building.prototype.activate = function () {
        if (!this.gameObject.world) {
            vkaria.game.logic.world.addGameObject(this.gameObject);

            if(this.staticData.classCode === BuildingClassCode.road)
                this.node = new RoadNode(this);
            else
                this.node = new BuildingNode(this);
        }
    };

    Building.prototype.setData = function (data) {
        var mData = this.data;
        if (mData !== null && mData.buildingCode === data.buildingCode && mData.state === data.state)
            return;

        this.staticData = buildingData[data.buildingCode];

        this.data = data;
        this.tile = vkaria.tilesman.getTile(data.x, data.y).tileScript;

        this.setupGameObject();


    };

    Building.prototype.setupGameObject = function () {
        var model,
            data = this.data,
            tile = this.tile,
            g = this.gameObject;

        if (g === null) {
            g = new engine.GameObject(buildingData[this.data.buildingCode].name);

            var z = tile.gameObject.transform.getPosition()[1] + tile.subpositionZ(data.subPosX, data.subPosY),
                x = data.x + data.subPosX,
                y = data.y + data.subPosY,
                tileSize = engine.config.tileSize;

            g.transform.setPosition(x * tileSize, z, y * tileSize);

            this.gameObject = g;
        } else {
            var t = g.transform.children[0];
            this.gameObject.transform.removeChild(t);
            t.gameObject.destroy();
        }

        if (this.data.state != BuildingState.underConstruction)
            model = new (buildingModels[data.buildingCode])(buildingData[data.buildingCode].name);
        else
            model = new site(buildingData[data.buildingCode].size & 0x0F, buildingData[data.buildingCode].size >> 4);

        g.transform.addChild(model.transform);

        return g;
    };

    Building.prototype.destroy = function () {
        if (this.gameObject !== null) {
            this.gameObject.destroy();
            this.gameObject = null;
        }
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
            tile = tilesman.getTile(x0 + i, y0)
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
            engine.glMatrix.vec3.transformMat4(wp, wpsSource[i], this.gameObject.transform.localToWorld);
            wps.push(wp);
        }

        return wps;
    };

    return Building;
});