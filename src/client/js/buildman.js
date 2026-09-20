//TODO each building should be a building instance with attached prefab of building
import Core from "core/main";
import engine from "engine/main";
import BuildingClassCode from "data/classcode";
import BuildingData from "data/buildings";
import Building from "./building";
import Road from "./road";
import EventManager from "events";
import Events from "events";
import Chunkman from "./chunkman";
import AreaSelector from "./areaselector";
import TileMessage from "./gameObjects/tilemessage";
import CityWater from "core/city/citywater";
import Config from "./config";
import ResourceCode from "core/resourcecode";

var Terrain = Core.Terrain;
var TileIterator = Core.TileIterator;
var Terrain = Core.Terrain;
var ConstructionService = Core.ConstructionService;

function getBuilding(self, tile) {
    var x = Terrain.extractX(tile);
    var y = Terrain.extractY(tile);

    if (self.buildingByXY[x] !== undefined && self.buildingByXY[x][y] !== undefined)
        return self.buildingByXY[x][y];
    else
        return null;
}

function setBuilding(self, tile, building) {
    var x = Terrain.extractX(tile);
    var y = Terrain.extractY(tile);

    if (self.buildingByXY[x] === undefined)
        self.buildingByXY[x] = [];

    self.buildingByXY[x][y] = building;

    //so a picked sprite can be traced back to the building it belongs to
    self.buildingByGO[building.view.gameObject.instanceId] = building;
}

function removeBuilding(self, tile) {
    var x = Terrain.extractX(tile);
    var y = Terrain.extractY(tile);

    var building;
    if (self.buildingByXY[x] !== undefined && self.buildingByXY[x][y] !== undefined) {
        building = self.buildingByXY[x][y];
        Events.fire(self, self.events.buildingRemoved, building);
        delete self.buildingByGO[building.view.gameObject.instanceId];
        building.destroy();

        if (!building.data.permanent)
            building.data.dispose();

        delete self.buildingByXY[x][y];
    }

    return building;
}

function createBuilding(self, model) {
    var building;

    if (model.data.classCode === BuildingClassCode.road) {
        building = new Road(self.root);
    } else
        building = new Building(self.root);

    building.setData(model);

    setBuilding(self, model.tile, building);

    Events.fire(self, self.events.buildingAdded, building);

    return building;
}

function updateBuilding(self, data) {
    var tile = data.tile,
        building;

    building = getBuilding(self, tile);
    building.setData(data);

    return building;
}


function onChunkLoad(sender, chunk, self) {
    var tiles = chunk.tiles();
    var tile, model, buildings = self.root.core.buildingService;
    while (!tiles.done) {
        tile = TileIterator.next(tiles);
        model = buildings.get(tile);
        if (model !== null && model !== undefined)
            createBuilding(self, model);
    }
}

function onChunkRemove(sender, chunk, self) {
    var tiles = chunk.tiles();
    var tile;
    while (!tiles.done) {
        tile = TileIterator.next(tiles);
        removeBuilding(self, tile);
    }
}


/**
 * Floats what it just cost over the middle of an area of sizeX by sizeY tiles
 * anchored at tile.
 */
function showCost(self, tile, sizeX, sizeY, amount) {
    var root = self.root,
        tileSize = Config.tileSize,
        x = Terrain.extractX(tile),
        y = Terrain.extractY(tile),
        z = root.core.world.terrain.getGridPointHeight(x + 1, y);

    var message = new TileMessage("-$" + amount, "rgb(255,64,64)");
    root.game.logic.world.addGameObject(message);
    message.transform.setPosition(
        (x + (sizeX - 1) / 2) * tileSize,
        z * Config.tileZStep,
        (y + (sizeY - 1) / 2) * tileSize
    );
}

/**
 * One text per built instance - a road tile is an instance of its own, while a
 * multi tile building gets a single text over the middle of its footprint.
 */
function showConstructionCost(self, model) {
    var data = model.data,
        //what the city was actually charged, trees cleared for the site
        //included - only a build the player paid for carries it
        cost = model.expense !== undefined
            ? model.expense
            : data.constructionCost && data.constructionCost[ResourceCode.money];

    if (!cost)
        return;

    showCost(self, model.tile,
        model.rotation ? data.sizeY : data.sizeX,
        model.rotation ? data.sizeX : data.sizeY,
        cost);
}

function onBuildingBuilt(sender, building, self) {
    createBuilding(self, building);
    showConstructionCost(self, building);
}

function onBuildingUpdated(sender, building, self) {
    updateBuilding(self, building);

}

function onBuildingRemoved(sender, building, self) {
    removeBuilding(self, building.tile);
}

var events = {
    buildingAdded: 0,
    buildingRemoved: 1,
    buildingAdd: 0,
    buildingRemove: 1,
    buildingLoad: 0,
    buildingUnload: 1
};

function Buildman(main) {
    EventManager.call(this);

    this.buildingByXY = [];
    this.buildingByGO = {};
    this.root = main;
}


Buildman.events = events;

Buildman.prototype = Object.create(EventManager.prototype);

Buildman.prototype.events = events;

Buildman.prototype.start = function () {
    Events.on(this.root.chunkman, Chunkman.events.chunkLoad, onChunkLoad, this);
    Events.on(this.root.chunkman, Chunkman.events.chunkUnload, onChunkRemove, this);

    var core = this.root.core;

    Events.on(core.constructionService, ConstructionService.events.buildingBuilt, onBuildingBuilt, this);
    Events.on(core.constructionService, ConstructionService.events.buildingUpdated, onBuildingUpdated, this);
    Events.on(core.constructionService, ConstructionService.events.buildingRemoved, onBuildingRemoved, this);
};

/**
 * Takes over the chunks that were already loaded before anyone was listening.
 *
 * A city out of a save is standing in the world before the client comes up, so
 * the chunks it sits on can have been loaded without a single chunkLoad going
 * out - whatever stands on them gets its view here. Runs once the rest of the
 * client is subscribed, so that roadman sees the roads it has to join up.
 */
Buildman.prototype.init = function () {
    var chunks = this.root.chunkman.getChunks();

    for (var i = 0; i < chunks.length; i++)
        onChunkLoad(this.root.chunkman, chunks[i], this);
};

/**
 * What the player clicked on, if they clicked on a building at all.
 *
 * A tall building is drawn well above the tile it stands on - the tile under
 * the cursor halfway up a water tower is the ground behind it - so this tests
 * the sprites themselves and traces whichever was hit back to its building.
 *
 * Whoever handles a click asks this first: a click that landed on a building
 * belongs to the building, not to the land underneath it.
 *
 * @returns {Building|null} the core building, not its view
 */
Buildman.prototype.pickBuilding = function (screenX, screenY) {
    var gos = this.root.camera.cameraScript.pickGameObject(screenX, screenY),
        view, i;

    for (i = 0; i < gos.length; i++) {
        view = viewOfGameObject(this, gos[i]);

        if (view !== null)
            return view.model();
    }

    return null;
};

/**
 * Walks up from a picked sprite to the view it is part of.
 */
function viewOfGameObject(self, go) {
    var transform = go.transform, view;

    while (transform !== null && transform !== undefined) {
        view = self.buildingByGO[transform.gameObject.instanceId];

        if (view !== undefined)
            return view;

        transform = transform.parent;
    }

    return null;
}

/**
 * Every building view there is right now.
 *
 * Whoever starts up after some of these were made needs to catch up on them -
 * chunks can be streamed in by something as innocent as the camera being moved
 * onto a loaded city, which happens while the client is still starting.
 *
 * @returns {Building[]}
 */
Buildman.prototype.getBuildingViews = function () {
    var byXY = this.buildingByXY, r = [], x, y;

    for (x in byXY) {
        for (y in byXY[x])
            r.push(byXY[x][y]);
    }

    return r;
};

Buildman.prototype.getBuilding = function (tile_or_x, y) {
    var tile;

    if (arguments.length === 2)
        tile = Terrain.convertToIndex(tile_or_x, y);
    else
        tile = tile_or_x;

    return getBuilding(this, tile);
};

Buildman.prototype.destroy = function () {
    var self = this;
    var root = this.root;

    //show hint
    root.ui.gameScreen().worldScreen().showHint("Pick a tile that you want to clear!");

    //lock cam
    root.camera.cameraScript.lock(true);

    //draw red grid
    var tokens = [];
    var ts = new AreaSelector(this.root);
    var sub = Events.on(ts, AreaSelector.events.change, function(a,b,c) {
        root.hiliteMan.disable(tokens);
        tokens = root.hiliteMan.hilite({
            tile0: ts.tile0(),
            tile1: ts.tile1(),
            fillColor: "rgba(127,0,0,0.4)",
            borderColor: "rgba(255,0,0,0.4)",
            borderWidth: 2
        });
    });

    //bind ui
    var controls = root.ui.gameScreen().showActionControls();
    controls.canRotate(false);
    controls.onSubmit = function () {
        var iter = ts.selectedTiles(),
            tile;
        if (iter !== null)
            while (!iter.done) {
                tile = iter.next();
                //every tile is charged on its own, so each one that goes
                //gets its own text
                if (root.core.cities.getCity(0).clearTile(tile))
                    showCost(self, tile, 1, 1, Core.Config.clearTileCost);
            }

        //release resources
        ts.dispose();
        root.hiliteMan.disable(tokens);
        Events.off(ts, AreaSelector.events.change, sub);

        root.ui.gameScreen().showWorld();
        root.ui.gameScreen().worldScreen().hideHint();
        root.camera.cameraScript.lock(false);
    };
    controls.onDiscard = function () {
        //release resources
        ts.dispose();
        root.hiliteMan.disable(tokens);
        Events.off(ts, AreaSelector.events.change, sub);

        root.ui.gameScreen().showWorld();
        root.ui.gameScreen().worldScreen().hideHint();
        root.camera.cameraScript.lock(false);
    };
};


Buildman.prototype.build = function (code) {
    var root = this.root;
    var data = BuildingData[code];

    //what this thing would water from where the cursor is, so that a tower is
    //placed by what it will reach rather than by guesswork
    var waterRadius = CityWater.radius(code);

    //show hint
    root.ui.gameScreen().worldScreen().showHint("Pick a tile!");

    //lock cam
    root.camera.cameraScript.lock(true);

    //draw blue grid
    var tokens = [];
    var ts = new AreaSelector(this.root);
    var rotation = false;

    function updateHilite() {
        var tile0 = ts.tile0(),
            tile1 = ts.tile1();

        // a single anchored tile (not yet dragged into a multi-tile paint
        // area) should hilite the building's whole footprint, not just the
        // one tile under the cursor - matching how Construction#occupiedTiles
        // and the under-construction site placeholder (buildingview.js) swap
        // sizeX/sizeY when rotated
        if (tile0 !== -1 && tile0 === tile1) {
            var sizeX = rotation ? data.sizeY : data.sizeX,
                sizeY = rotation ? data.sizeX : data.sizeY;
            tile1 = tile0 + (sizeX - 1) + (sizeY - 1) * Terrain.dy;
        }

        root.hiliteMan.disable(tokens);
        tokens = root.hiliteMan.hilite({
            tile0: tile0,
            tile1: tile1,
            fillColor: "rgba(0,0,127,0.4)",
            borderColor: "rgba(0,0,255,0.4)",
            borderWidth: 2
        });

        //what this tower would water, outlined the way the city limits are
        if (waterRadius > 0) {
            if (tile0 === -1)
                root.serviceman.hideCoverage();
            else
                root.serviceman.showCoverage(tile0, waterRadius);
        }
    }

    var sub = Events.on(ts, AreaSelector.events.change, updateHilite);

    //bind ui
    var controls = root.ui.gameScreen().showActionControls();
    controls.canRotate(!!data.canRotate);
    controls.onRotate = function () {
        rotation = !rotation;
        updateHilite();
    };
    controls.onSubmit = function () {
        var iter = ts.selectedTiles(),
            tile;
        if (iter !== null)
            while (!iter.done) {
                tile = iter.next();
                root.core.cities.getCity(0).buildingService.buildBuilding(code, tile, rotation);
            }

        // stay in build mode: drop the selection and keep the selector, hint,
        // controls and cam lock so another area can be placed right away
        ts.reset();
        updateHilite();
    };
    controls.onDiscard = function () {
        //release resources
        ts.dispose();
        root.hiliteMan.disable(tokens);
        root.serviceman.hideCoverage();
        Events.off(ts, AreaSelector.events.change, sub);

        root.ui.gameScreen().showWorld();
        root.ui.gameScreen().worldScreen().hideHint();
        root.camera.cameraScript.lock(false);
    };
};

export default Buildman;
