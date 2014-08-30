define(function (require) {
    var Core = require("core");
    var engine = require("engine"),
        EventManager = require("events"),
        BuildingClassCode = require("core/buildingclasscode"),
        CityLabel = require("./gameObjects/citylabel"),
        ToolCode = require("./tools/toolcode"),
        Events = require("events");

    function City(x, y) {
        EventManager.call(this);

        var self = this;

        this.buildingsByClass = {};

        //init buildingsByClass
        for (var key in BuildingClassCode) {
            var code = BuildingClassCode[key];
            this.buildingsByClass[code] = [];
        }

        this.buildings = [];

        this.onCityData = function (sender, data) {
            if (data) {
                this.setData(data);

                vkaria.tools.enableAll();
                vkaria.tools.selectTool(ToolCode.panner);
            } else {
                vkaria.tools.disableAll();
                vkaria.tools.enableTool(ToolCode.tileSelector);
                var tool = vkaria.tools.tools[ToolCode.tileSelector];
                var handler = function (sender, crds) {
                    tool.removeEventListener(tool.events.tileSelected, handler);
                    var data = vkaria.core.world.establishCity(crds.x, crds.y, "Unnamed");

                    //vkaria.core.establishCity(crds.x, crds.y, "Unnamed", function(data){
                        self.setData(data);

                        vkaria.tools.enableAll();
                        vkaria.tools.selectTool(ToolCode.panner);

                        self.rename();
                    //});
                };
                tool.addEventListener(tool.events.tileSelected, handler);
                vkaria.tools.selectTool(ToolCode.tileSelector);

            }
        };

        this.onCityUpdate = function (sender, cityData) {
            self.setData(cityData);
            self.dispatchEvent(self.events.resourcesUpdate, cityData.resources);
        };
    }

    City.prototype = Object.create(EventManager.prototype);
    City.prototype.constructor = City;

    City.prototype.events = {
        established: 0,
        resourcesUpdate: 1,
        researchComplete: 2,
        buildingInvented: 3,
        nameRequired: 4
    };

    City.prototype.start = function () {
        var core = vkaria.core;

        Events.once(core.world, core.world.events.cityEstablished, function (sender, city, self) {
            Events.on(city, city.events.update, self.onCityUpdate, self);
        }, this);

        this.onCityData(vkaria.core.world.city);
    };

    City.prototype.setData = function (data) {
        var mOldData = this.data;

        this.data = data;

        if (!mOldData || mOldData.name !== data.name)
            this.setupLabel();

        this.resources = data.resources;
    };

    City.prototype.setupLabel = function () {
        if (!this.label) {
            this.label = new CityLabel("");
            vkaria.game.logic.world.addGameObject(this.label);
        }

        var tile = vkaria.terrain.getTile(this.data.x, this.data.y);
        this.label.transform.setPosition(tile.transform.getPosition()[0], tile.transform.getPosition()[1], tile.transform.getPosition()[2]);
        this.label.textRenderer.text = this.data.name;
    };

    City.prototype.getBuildingCountList = function () {
        var list = Object.create(null);

        for (var key in this.buildingsByClass) {
            var arr = this.buildingsByClass[key];
            list[key] = arr.length;
        }

        return list;
    };

    City.prototype.locate = function () {
        vkaria.camera.cameraScript.moveTo(this.label.transform);
        vkaria.tilesman.loadChunks();
    };

    City.prototype.rename = function(){
        this.dispatchEvent(this.events.nameRequired, this);
    };

    City.prototype.inputName = function(name){
        var self = this;

        vkaria.core.world.city.name = name;
        self.setData(vkaria.core.world.city);
        //vkaria.core.renameCity(name, function(citydata){
          //  self.setData(citydata);
        //});
    };

    return City;
});
