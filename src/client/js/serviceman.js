/**
 * Shows what the city's services do and do not reach.
 *
 * Three things, all about the same question - what a building is doing for
 * the city, and why a house is standing empty:
 *
 *  - a red word over anything going without, "no road" before "no water",
 *    because a street is the first thing to put right. Without it a house
 *    nobody moves into looks like a bug rather than a missing street.
 *  - the ground a water tower waters, outlined in one continuous line the way
 *    the city limits are. Clicking a tower shows its reach and clicking
 *    anywhere else puts it away again; the same outline follows the cursor
 *    while a tower is being placed (see buildman).
 *  - what a clicked building is worth: the money it makes or costs a tick,
 *    and how full it is - residents for a house, workers for a business.
 *    It is put away the same way the outline is.
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
import MultilineTextRenderer from "./components/multilinetextrenderer";
import BuildingClassCode from "data/classcode";
import RenderLayer from "client/renderlayer";
import Config from "./config";

var Terrain = Core.Terrain;

var text = {};
text[ServiceCode.road] = "no road";
text[ServiceCode.water] = "no water";
//not a service, but the same kind of trouble: a business nobody works in
var NO_WORKERS = "noWorkers";
text[NO_WORKERS] = "no workers";

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

        if (missing === null && model.jobs() > 0 && city.jobs.getWorkers(model) === 0)
            missing = NO_WORKERS;

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
    refreshInfo(self);
}

var INCOME_COLOR = "rgb(64,255,64)";
var EXPENSE_COLOR = "rgb(255,64,64)";

/**
 * @returns {{text: string, color: string}} green for what it brings in, red for
 *                                          what it costs, white for neither
 */
function formatMoney(amount) {
    var rounded = Math.round(amount * 10) / 10;

    return {
        text: (rounded > 0 ? "+" : rounded < 0 ? "-" : "") + "$" + Math.abs(rounded),
        color: rounded > 0 ? INCOME_COLOR : rounded < 0 ? EXPENSE_COLOR : "white"
    };
}

/**
 * @returns {Array} the money first, then how full it is if anybody lives or
 *                  works in it
 */
function infoLines(city, building) {
    var data = building.data,
        lines = [formatMoney(city.getBuildingIncome(building))];

    if (data.citizenCapacity)
        lines.push("peeps " + city.population.getResidents(building) + "/" + data.citizenCapacity);
    else if (data.jobs)
        lines.push("jobs " + city.jobs.getWorkers(building) + "/" + data.jobs);

    return lines;
}

/**
 * Trees and rocks do nothing for anybody, and a road out past the borders has
 * no city to do it for.
 */
function hasInfo(building) {
    return building.data.classCode !== BuildingClassCode.tree && building.getCity() !== null;
}

function refreshInfo(self) {
    var building = self._infoBuilding;

    if (building === null)
        return;

    //bulldozed while it was being looked at
    if (self.root.core.buildings.get(building.tile) !== building) {
        self.hideInfo();
        return;
    }

    self._info.textRenderer.lines = infoLines(building.getCity(), building);
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
    if (busy) {
        self.hideCoverage();
        self.hideInfo();
    }
}

/**
 * Clicking a building shows what it is worth, and a water tower what it waters
 * as well. Clicking anything else - bare ground, a tree, the sea - puts them
 * away again.
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

    if (building !== null && hasInfo(building))
        self.showInfo(building);
    else
        self.hideInfo();
}

function ServiceMan(root) {
    this.root = root;
    this._views = {};
    this._labels = {};
    this._coverage = null;
    this._info = null;
    this._infoBuilding = null;
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

/**
 * Writes what the building is worth over the middle of it, and keeps it up to
 * date every tick until it is put away.
 *
 * @param building {Building}
 */
ServiceMan.prototype.showInfo = function (building) {
    var info = this._info;

    if (info === null) {
        info = this._info = new engine.GameObject("buildingInfo");

        var renderer = info.addComponent(new MultilineTextRenderer());

        renderer.layer = RenderLayer.overlayLayer;
        renderer.color = "white";
        renderer.style = "bold 16px Courier New";
        renderer.strokeStyle = "black";
        renderer.lineWidth = 4;

        this.root.game.scene.addGameObject(info);
    }

    var terrain = this.root.terrain,
        data = building.data,
        //turned round, the footprint's sides swap
        sizeX = building.rotation ? data.sizeY : data.sizeX,
        sizeY = building.rotation ? data.sizeX : data.sizeY,
        far = building.tile + (sizeX - 1) + (sizeY - 1) * Terrain.dy;

    info.transform.setPosition(
        (terrain.tileXPos(building.tile) + terrain.tileXPos(far)) / 2,
        (terrain.tileYPos(building.tile) + terrain.tileYPos(far)) / 2 + HEIGHT,
        (terrain.tileZPos(building.tile) + terrain.tileZPos(far)) / 2);

    this._infoBuilding = building;
    refreshInfo(this);
};

ServiceMan.prototype.hideInfo = function () {
    if (this._info !== null) {
        this._info.destroy();
        this._info = null;
        this._infoBuilding = null;
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
