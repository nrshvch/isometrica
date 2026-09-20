/**
 * Shows what the city's services do and do not reach.
 *
 * Two things, both about the same question - why a house is standing empty:
 *
 *  - a red word over anything going without, "no road" before "no water",
 *    because a street is the first thing to put right. Without it a house
 *    nobody moves into looks like a bug rather than a missing street.
 *  - the ground a water tower waters, outlined in one continuous line the way
 *    the city limits are. Clicking a tower shows its reach and clicking
 *    anywhere else puts it away again; the same outline follows the cursor
 *    while a tower is being placed (see buildman).
 *
 * Labels live and die with the building views themselves (buildman announces
 * those as chunks come and go), so nothing is drawn for a part of the map that
 * is not on screen in the first place.
 */
import engine from "engine/main";
import Events from "events";
import Core from "core/main";
import ServiceCode from "core/servicecode";
import CityWater from "core/city/citywater";
import Buildman from "./buildman";
import WorldCamera from "./components/camerascript";
import TileAreaBorderRenderer from "./components/tileareaborderrenderer";
import RenderLayer from "client/renderlayer";
import Config from "./config";

var Terrain = Core.Terrain;

var text = {};
text[ServiceCode.road] = "no road";
text[ServiceCode.water] = "no water";

//high enough to clear the roof of anything it sits over
var HEIGHT = Config.tileSize;

function createLabel(self, tile, missing) {
    var go = new engine.GameObject("serviceWarning");
    var renderer = go.addComponent(new engine.TextRenderer());

    renderer.layer = RenderLayer.overlayLayer;
    renderer.color = "rgb(255,64,64)";
    renderer.style = "bold 16px Courier New";
    renderer.strokeStyle = "black";
    renderer.lineWidth = 4;
    renderer.text = text[missing];

    var terrain = self.root.terrain;

    go.transform.setPosition(
        terrain.tileXPos(tile),
        terrain.tileYPos(tile) + HEIGHT,
        terrain.tileZPos(tile));

    self.root.game.scene.addGameObject(go);

    return go;
}

function show(self, tile, missing) {
    var label = self._labels[tile];

    if (label === undefined)
        self._labels[tile] = createLabel(self, tile, missing);
    else
        label.textRenderer.text = text[missing];
}

function hide(self, tile) {
    var label = self._labels[tile];

    if (label !== undefined) {
        label.destroy();
        delete self._labels[tile];
    }
}

/**
 * Goes over everything on screen and puts a word over whatever is going
 * without. Once a tick is plenty - a street or a tower takes longer than that
 * to build.
 */
function refresh(self) {
    var city = self.root.core.cities.getCity(0),
        views = self._views,
        tile, model, missing;

    if (city === undefined)
        return;

    for (tile in views) {
        model = views[tile].model();
        missing = city.missing(model);

        if (missing === null)
            hide(self, tile);
        else
            show(self, tile, missing);
    }
}

function onBuildingLoad(sender, building, self) {
    self._views[building.model().tile] = building;
}

function onBuildingUnload(sender, building, self) {
    var tile = building.model().tile;

    delete self._views[tile];
    hide(self, tile);
}

function onTick(sender, args, self) {
    refresh(self);
}

function pickTile(root, screenX, screenY) {
    var gos = root.camera.cameraScript.pickGameObject(screenX, screenY),
        sprite, i;

    for (i = 0; i < gos.length; i++) {
        sprite = gos[i].spriteRenderer;

        if (sprite !== undefined && sprite.layer === RenderLayer.groundLayer)
            return root.terrain.getCoordinates(gos[i]);
    }

    return -1;
}

/**
 * An action taking over the world - placing a building, clearing ground,
 * buying land - owns what is drawn on it, so the outline steps aside rather
 * than being left behind on top of somebody else's business.
 */
function onBusyChange(sender, busy, self) {
    if (busy)
        self.hideCoverage();
}

/**
 * Clicking a water tower shows what it waters. Clicking anything else - bare
 * ground, a house, the sea - puts the outline away again.
 */
function onClick(sender, e, self) {
    //while an action owns the world (placing a building, clearing ground) the
    //outline belongs to that action, not to a stray click
    if (self.root.ui.gameScreen().worldScreen().busy())
        return;

    var root = self.root,
        building = root.buildman.pickBuilding(e.gameViewportX, e.gameViewportY);

    //clicking the ground a tower stands on counts too - its sprite leaves the
    //corners of its own tile showing
    if (building === null) {
        var tile = pickTile(root, e.gameViewportX, e.gameViewportY);
        building = tile === -1 ? null : root.core.buildings.get(tile);
    }

    var radius = building === null ? 0 : CityWater.radius(building);

    if (radius > 0)
        self.showCoverage(building.tile, radius);
    else
        self.hideCoverage();
}

function ServiceMan(root) {
    this.root = root;
    this._views = {};
    this._labels = {};
    this._coverage = null;
}

/**
 * Outlines the ground a tower on this tile waters - the very tiles CityWater
 * goes on to count as watered.
 *
 * @param tile {number}
 * @param radius {number}
 */
ServiceMan.prototype.showCoverage = function (tile, radius) {
    var tiles = CityWater.coverage(tile, radius),
        coverage = this._coverage;

    if (coverage === null) {
        var go = new engine.GameObject("waterCoverage");

        coverage = this._coverage = go.addComponent(
            new TileAreaBorderRenderer(this.root.core.terrain, tiles));

        this.root.game.logic.world.addGameObject(go);
    } else {
        coverage.setTiles(tiles);
    }
};

ServiceMan.prototype.hideCoverage = function () {
    if (this._coverage !== null) {
        this._coverage.gameObject.destroy();
        this._coverage = null;
    }
};

ServiceMan.prototype.init = function () {
    var root = this.root,
        world = root.core;

    Events.on(root.buildman, Buildman.events.buildingLoad, onBuildingLoad, this);
    Events.on(root.buildman, Buildman.events.buildingUnload, onBuildingUnload, this);
    Events.on(world, world.events.tick, onTick, this);
    Events.on(root.camera.cameraScript, WorldCamera.events.inputClick, onClick, this);

    root.ui.gameScreen().worldScreen().busy.onChange(onBusyChange, false, this);

    //views that were made before this ran are just as much on screen
    var views = root.buildman.getBuildingViews();

    for (var i = 0; i < views.length; i++)
        onBuildingLoad(root.buildman, views[i], this);

    refresh(this);
};

export default ServiceMan;
