/**
 * Created by denis on 9/17/14.
 */
import Core from "core/main";
import Events from "events";
import CityLabel from "./gameObjects/citylabel";
import AreaSelector from "./areaselector";
import TileAreaBorderRenderer from "./components/tileareaborderrenderer";
import engine from "engine";
import Area from "core/city/area";
import BuildingCode from "data/buildingcode";
import BuildingData from "data/buildings";
import ResourceCode from "core/resourcecode";
import CityComponent from "./components/city";
import Buildman from "./buildman";
import ErrorCode from "core/errorcode";

var City = Core.City;
var CoreTerrain = Core.Terrain;

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

    //a click on the name is a click on the city hall under it - see
    //ServiceMan#inspect. The city screen opens off the money in the top bar
    Events.on(root.core.cities, Core.CityService.events.cityNew, onNewCity, this);

    //a city loaded from a save was put into the world before the client came
    //up, so it gets its label here instead of off the event - and the camera
    //opens on it, where the player left off
    var cities = root.core.cities.getCities();
    for (var i = 0; i < cities.length; i++)
        onNewCity(root.core.cities, cities[i], this);

    if (cities.length > 0)
        this.locate(cities[0]);
    else
        startAtPicked(root);
};

/**
 * A blank city opens wherever UIManager#startFreshCity picked for it, once.
 */
function startAtPicked(root) {
    var at = null;

    try {
        at = JSON.parse(window.sessionStorage.getItem("isometrica.startAt"));
        window.sessionStorage.removeItem("isometrica.startAt");
    } catch (e) {
        return;
    }

    if (at !== null && isFinite(at.x) && isFinite(at.z))
        root.camera.transform.setPosition(at.x, 0, at.z);
}

/**
 * The city whose name was clicked on, if it was one.
 *
 * @returns {City|null}
 */
Cityman.prototype.pickCity = function (screenX, screenY) {
    var gos = this.root.camera.cameraScript.pickGameObject(screenX, screenY);

    for (var i = 0; i < gos.length; i++) {
        if (gos[i] instanceof CityLabel)
            return gos[i].getComponent(CityComponent).city;
    }

    return null;
};

Cityman.prototype.locate = function (city) {
    this.root.camera.cameraScript.moveTo(this._cityGOs[city.tile()].transform);
};

/**
 * What founding a city on tile would look like: its city hall, faint where it
 * could not go up, and the block of land it would start out with, outlined
 * the way the city limits are.
 */
function previewCity(self, tile, ok) {
    var root = self.root,
        half = Area.BLOCK_SIZE >> 1,
        x0 = CoreTerrain.extractX(tile) - half,
        y0 = CoreTerrain.extractY(tile) - half,
        tiles = [],
        x, y;

    for (y = 0; y < Area.BLOCK_SIZE; y++)
        for (x = 0; x < Area.BLOCK_SIZE; x++)
            tiles.push(CoreTerrain.convertToIndex(x0 + x, y0 + y));

    var border = new engine.GameObject("city border preview"),
        renderer = border.addComponent(new TileAreaBorderRenderer(root.core.terrain, tiles));

    renderer.fillColor = "rgba(255,255,255,0)";
    renderer.borderColor = "rgba(255,255,255,0.7)";
    renderer.borderWidth = 3;
    renderer.dash = [4];
    root.game.logic.world.addGameObject(border);

    return [root.buildman.preview(BuildingCode.cityHall, tile, false, ok), border];
}

Cityman.prototype.establish = function(){
    var self = this;
    var root = this.root;

    root.ui.gameScreen().worldScreen().showHint("Drag to where you want your city to be established!");

    //one city hall's footprint, up from the start in the middle of the screen
    //- dragged about or tapped elsewhere, never resized
    var hall = BuildingData[BuildingCode.cityHall];
    var ts = new AreaSelector(root, {
        stepX: hall.sizeX,
        stepY: hall.sizeY,
        resizable: false
    });
    var tokens = [];
    var previews = [];

    function clearPreview() {
        for (var i = 0; i < previews.length; i++)
            previews[i].destroy();
        previews = [];
    }

    //green where a city could be founded, red where it could not - the same
    //as the ground under a building being placed
    function update() {
        var tile = ts.anchors()[0],
            ok = City.canEstablish(root.core.world, tile);

        clearPreview();
        previews = previewCity(self, tile, ok);
        root.buildman.fadeAround(ts.tiles());

        root.hiliteMan.disable(tokens);
        tokens = root.hiliteMan.hilite(ts.tiles().map(function (t) {
            return {
                x: CoreTerrain.extractX(t),
                y: CoreTerrain.extractY(t),
                fillColor: ok ? Buildman.HILITE_FILL : Buildman.HILITE_BLOCKED_FILL,
                borderColor: ok ? Buildman.HILITE_BORDER : Buildman.HILITE_BLOCKED_BORDER,
                borderWidth: 2
            };
        }));
    }

    var sub = Events.on(ts, AreaSelector.events.change, update);

    function cleanup() {
        clearPreview();
        root.buildman.unfade();
        root.hiliteMan.disable(tokens);
        Events.off(ts, AreaSelector.events.change, sub);
        ts.dispose();
        root.ui.gameScreen().worldScreen().hideHint();
    }

    //bind ui
    var controls = root.ui.gameScreen().showActionControls();
    controls.canRotate(false);
    controls.onSubmit = function () {
        var tile = ts.anchors()[0],
            reason = City.establishTest(root.core.world, tile);

        //turned down, the player is told why and gets to pick again
        if (reason !== ErrorCode.NONE) {
            root.buildman.showError(tile, reason);
            return;
        }

        root.ui.gameScreen().showPrompt("Give city a name!", function (val) {
            var city = root.core.cities.establishCity(tile, val);
            root.ui.gameScreen().showWorld();

            //what the new city starts out with, handed over where it stands
            if (city)
                root.buildman.showIncome(tile, city.resources.getResources()[ResourceCode.money]);
        }, ["Miniville", "Peepsville", "Flatville", "Greenville", "Happyville"][Math.round(Math.random()*2)], function () {
            root.ui.gameScreen().showWorld();
            self.establish();
        });

        cleanup();
    };
    controls.onDiscard = function () {
        cleanup();
        root.ui.gameScreen().showWorld();
    };

    update();
};

Cityman.prototype.getCityGameObject = function(cityId){
    var city = this.root.core.cities.getCity(cityId);
    var tile = city.tile();
    return this._cityGOs[tile];
};

export default Cityman;
