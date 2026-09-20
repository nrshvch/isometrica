/**
 * Created by denis on 9/17/14.
 */
import Core from "core/main";
import Events from "events";
import CityLabel from "./gameObjects/citylabel";
import Config from "./config";
import TileSelector from "./tileselector";
import WorldCamera from "./components/camerascript";
import CityComponent from "./components/city";

var City = Core.City;

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

function labelText(city) {
    return city.name() + " (" + city.population.getPopulation() + ")";
}

function updateLabel(self, city) {
    self._cityGOs[city.tile()].textRenderer.text = labelText(city);
}

function setupLabel(self, city) {
    var go = addCityGO(self, city);
    var tile = city.tile();
    var x = self.root.terrain.tileXPos(tile);
    var y = self.root.terrain.tileYPos(tile);
    var z = self.root.terrain.tileZPos(tile);

    go.transform.setPosition(x, y, z);
    go.textRenderer.text = labelText(city);
}

function onNewCity(sender, city, self) {
    setupLabel(self, city);

    Events.on(city, City.events.rename, onCityRename, self);
    //the city ticks its update event, which is when the population moves
    Events.on(city, City.events.update, onCityUpdate, self);
}

function onCityRename(city, name, self) {
    updateLabel(self, city);
}

function onCityUpdate(city, args, self) {
    updateLabel(self, city);
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
        //an action owns the world while it runs - opening the city screen from
        //under it would leave the action with no buttons and no way to finish
        if (root.ui.gameScreen().worldScreen().busy())
            return;

       var gos = cam.pickGameObject(e.gameViewportX, e.gameViewportY);
        for(var i in gos){
            var item = gos[i];
            if(item instanceof CityLabel){
                var cmp = item.getComponent(CityComponent);
                var city = cmp.city;
                var id = city.id();
                console.log("CITY!!!", id);
                root.ui.navigate("city", [id]);
            }
        }
    });

    //a city loaded from a save was put into the world before the client came
    //up, so it gets its label here instead of off the event - and the camera
    //opens on it, where the player left off
    var cities = root.core.cities.getCities();
    for (var i = 0; i < cities.length; i++)
        onNewCity(root.core.cities, cities[i], this);

    if (cities.length > 0)
        this.locate(cities[0]);
};

Cityman.prototype.locate = function (city) {
    this.root.camera.cameraScript.moveTo(this._cityGOs[city.tile()].transform);
};

Cityman.prototype.establish = function(){
    var self = this;
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

    function cleanup() {
        //disable hiliters & selector
        root.hiliteMan.disable(token);
        selector.dispose();
        Events.off(selector, TileSelector.events.change, s);
        root.ui.gameScreen().worldScreen().hideHint();
    }

    //bind ui
    var controls = root.ui.gameScreen().showActionControls();
    controls.canRotate(false);
    controls.onSubmit = function () {
        var tile = selector.selectedTile();

        root.ui.gameScreen().showPrompt("Give city a name!", function (val) {
            root.core.cities.establishCity(tile, val);
            root.ui.gameScreen().showWorld();
        }, "My City", function () {
            root.ui.gameScreen().showWorld();
            self.establish();
        });

        cleanup();
    };
    controls.onDiscard = function () {
        cleanup();
        root.ui.gameScreen().showWorld();
    };
};

Cityman.prototype.getCityGameObject = function(cityId){
    var city = this.root.core.cities.getCity(cityId);
    var tile = city.tile();
    return this._cityGOs[tile];
};

export default Cityman;
