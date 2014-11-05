define(function (require) {
    var engine = require("engine/main"),
        Core = require("core/main"),
        glMatrix = require("./vendor/gl-matrix"),
        buildingData = Core.BuildingData,
        BuildingData = buildingData,
        BuildingClassCode = require("data/classcode"),
        BuildingWaypoints = require("client/buildingwaypoints"),
        BuildingNode = require("./pathfinding/buildingnode"),
        BuildingView = require("./buildingview");

    function Building(root) {
        this.root = root;
        this.view = new BuildingView();
        this.view.setBuilding(this);
    }

    Building.prototype.gameObject = null;
    Building.prototype.data = null;
    Building.prototype.staticData = null;
    Building.prototype.node = null;

    Building.prototype.setData = function(data){
        this.data = data;
        this.staticData = BuildingData[data.buildingCode];
        //this.tile = vkaria.tilesman.getTile(data.x, data.y);


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
            glMatrix.vec3.transformMat4(wp, wpsSource[i], this.view.gameObject.transform.localToWorld);
            wps.push(wp);
        }

        return wps;
    };

    Building.prototype.model = function(){
        return this.data;
    };

    return Building;
});