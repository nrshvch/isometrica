/**
 * Created by denis on 9/17/14.
 */
define(function (require) {
    var Core = require("core/main");
    var City = Core.City;
    var Events = require("events");
    var CityLabel = require("./gameObjects/citylabel");
    var Config = require("./config");
    var ToolCode = require("./tools/toolcode");

    function addCityGO(self, city) {
        var gos = self._cityGOs;
        var tile = city.tile();

        if (gos[tile] !== undefined)
            throw "There already is some city GO on tile " + tile;

        var go = new CityLabel(city);
        self.root.game.scene.addGameObject(go);

        gos[tile] = {
            city: city,
            go: go
        };

        return gos[tile];
    }

    function setupLabel(self, city) {
        var go = addCityGO(self, city);
        var tile = city.tile();
        var x = self.root.terrain.tileXPos(tile);
        var y = self.root.terrain.tileYPos(tile);
        var z = self.root.terrain.tileZPos(tile);

        go.go.transform.setPosition(x, y, z);
        go.go.textRenderer.text = city.name();
    }

    function onNewCity(sender, city, self) {
        setupLabel(self, city);

        Events.on(city, City.events.rename, onCityRename, self)
    }

    function onCityRename(city, name, self) {
        self._cityGOs[city.tile()].go.textRenderer.text = name;
    }

    function Cityman(root) {
        this.root = root;
        this._cityGOs = {};
    }

    Cityman.prototype.init = function () {
        var root = this.root;

        Events.on(root.core.cities, Core.CityService.events.cityNew, onNewCity, this);

        this.establish();
    };

    Cityman.prototype.locate = function (city) {
        this.root.camera.cameraScript.moveTo(this._cityGOs[city.tile()].go.transform);
    };

    Cityman.prototype.establish = function(){
        var root = this.root;
        var tools = root.tools;
        tools.disableAll();
        tools.enableTool(ToolCode.tileSelector);
        var tool = tools.tools[ToolCode.tileSelector];

        root.ui.gameScreen().worldScreen().showHint("Pick a tile where you want your city to be located!");
        var controls = root.ui.gameScreen().showActionControls();
        controls.onSubmit = function () {
            var tile = tool.selectedTile;

            root.ui.gameScreen().showPrompt("Give city a name!", function (val) {
                root.core.cities.establishCity(tile, val);
                tools.enableAll();
                tools.selectTool(ToolCode.panner);
                root.ui.gameScreen().showWorld();
                root.ui.gameScreen().worldScreen().hideHint();
            }, "My City");
        };
        controls.canDiscard(false);
        tools.selectTool(ToolCode.tileSelector);
    };

    return Cityman;
});