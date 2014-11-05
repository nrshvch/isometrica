/**
 * Created by denis on 9/17/14.
 */
define(function (require) {
    var Core = require("core/main");
    var City = Core.City;
    var Events = require("events");
    var CityLabel = require("./gameObjects/citylabel");
    var Config = require("./config");
    var TileSelector = require("./tileselector");
    var WorldCamera = require("./components/camerascript");
    var CityComponent = require("./components/city");

    function addCityGO(self, city) {
        var gos = self._cityGOs;
        var tile = city.tile();

        if (gos[tile] !== undefined)
            throw "There already is some city GO on tile " + tile;

        var go = new CityLabel(city);
        self.root.game.scene.addGameObject(go);

        gos[tile] = go;

        return gos[tile];
    }

    function setupLabel(self, city) {
        var go = addCityGO(self, city);
        var tile = city.tile();
        var x = self.root.terrain.tileXPos(tile);
        var y = self.root.terrain.tileYPos(tile);
        var z = self.root.terrain.tileZPos(tile);

        go.transform.setPosition(x, y, z);
        go.textRenderer.text = city.name();
    }

    function onNewCity(sender, city, self) {
        setupLabel(self, city);

        Events.on(city, City.events.rename, onCityRename, self)
    }

    function onCityRename(city, name, self) {
        self._cityGOs[city.tile()].textRenderer.text = name;
    }

    function Cityman(root) {
        this.root = root;
        this._cityGOs = {};
    }

    Cityman.prototype.init = function () {
        var root = this.root;
        var cam = root.camera.cameraScript;

        Events.on(root.core.cities, Core.CityService.events.cityNew, onNewCity, this);
        Events.on(cam, WorldCamera.events.inputClick, function(sender, e){
           var gos = cam.pickGameObject(e.gameViewportX, e.gameViewportY);
            for(var i in gos){
                var item = gos[i];
                if(item instanceof CityLabel){
                    var cmp = item.getComponent(CityComponent);
                    var city = cmp.city;
                    var id = city.id();
                    console.log("CITY!!!", id);
                    root.ui.navigate("city/"+id);
                }
            }
        });

        this.establish();
    };

    Cityman.prototype.locate = function (city) {
        this.root.camera.cameraScript.moveTo(this._cityGOs[city.tile()].go.transform);
    };

    Cityman.prototype.establish = function(){
        var root = this.root;

        //render hint
        root.ui.gameScreen().worldScreen().showHint("Pick a tile where you want your city to be located!");

        //enable selector
        var selector = new TileSelector(root);
        var token = -1;
        var s = Events.on(selector, TileSelector.events.change, function(a,b,c){
            root.hiliteMan.disable(token);
            token = root.hiliteMan.hilite({
                tile: a.selectedTile(),
                borderColor: "rgba(255,255,255,1)",
                borderWidth: 2
            });
        });

        //bind ui
        var controls = root.ui.gameScreen().showActionControls();
        controls.onSubmit = function () {
            var tile = selector.selectedTile();

            root.ui.gameScreen().showPrompt("Give city a name!", function (val) {
                root.core.cities.establishCity(tile, val);
                root.ui.gameScreen().showWorld();
                root.ui.gameScreen().worldScreen().hideHint();
            }, "My City");

            //disable hiliters & selector
            root.hiliteMan.disable(token);
            selector.dispose();
            Events.off(selector, TileSelector.events.change, s);
        };
        controls.canDiscard(false);
    };

    Cityman.prototype.getCityGameObject = function(cityId){
        var city = this.root.core.cities.getCity(cityId);
        var tile = city.tile();
        return this._cityGOs[tile];
    };

    return Cityman;
});