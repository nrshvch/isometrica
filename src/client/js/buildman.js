//TODO each building should be a building instance with attached prefab of building
import Core from "core/main";
import engine from "engine/main";
import BuildingClassCode from "data/classcode";
import BuildingData from "data/buildings";
import Building from "./building";
import BuildingView from "./buildingview";
import Road from "./road";
import EventManager from "events";
import Events from "events";
import Chunkman from "./chunkman";
import AreaSelector from "./areaselector";
import TileMessage from "./gameObjects/tilemessage";
import CityWater from "core/city/citywater";
import Config from "./config";
import RenderLayer from "./renderlayer";
import ResourceCode from "core/resourcecode";
import ErrorCode from "core/errorcode";
import Numeral from "numeral";

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
    var building = getBuilding(self, model.tile);

    //the same building can turn up here more than once: one reaching over a
    //chunk's edge is found by both chunks, and a chunk streamed in while the
    //client was starting up is walked again by Buildman#init. A second view
    //would be left over the first for good - drawn, but no longer tracked, so
    //it never goes away with the building and never follows its neighbours
    if (building !== null && building.data === model)
        return building;

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
 * A see-through copy of the building standing on tile, turned the way it would
 * be put down - so that what is about to be placed, and which way it faces, is
 * seen before the click rather than after it.
 *
 * @returns {engine.GameObject}
 */
function createPreview(self, data, tile, rotation) {
    var terrain = self.root.core.world.terrain,
        tileSize = Config.tileSize,
        x = Terrain.extractX(tile),
        y = Terrain.extractY(tile),
        //over water it floats on the surface, which is drawn at 0 whatever
        //the depth of the bottom underneath (see client Terrain)
        z = terrain.getTerrainType(x, y) === Core.TerrainType.water
            ? 0
            : terrain.getGridPointHeight(x + 1, y),
        go = new engine.GameObject("building preview");

    BuildingView.addSprites(go, data, rotation, 0.5, RenderLayer.previewLayer);

    //placed before it goes in - the world files it by where it stands
    go.transform.setPosition(x * tileSize, z * Config.tileZStep, y * tileSize);
    self.root.game.logic.world.addGameObject(go);

    return go;
}

/**
 * Floats text over the middle of an area of sizeX by sizeY tiles anchored at
 * tile.
 */
function showText(self, tile, sizeX, sizeY, text) {
    var message = new TileMessage(text, "rgb(255,64,64)");
    self.root.game.logic.world.addGameObject(message);
    placeOverArea(self, message, tile, sizeX, sizeY, 0);
}

/**
 * Puts go over the middle of an area of sizeX by sizeY tiles anchored at
 * tile, height world units above the ground.
 */
function placeOverArea(self, go, tile, sizeX, sizeY, height) {
    var terrain = self.root.core.world.terrain,
        tileSize = Config.tileSize,
        x = Terrain.extractX(tile),
        y = Terrain.extractY(tile),
        //over water it floats from the surface, not from the bottom
        z = terrain.getTerrainType(x, y) === Core.TerrainType.water
            ? 0
            : terrain.getGridPointHeight(x + 1, y);

    go.transform.setPosition(
        (x + (sizeX - 1) / 2) * tileSize,
        z * Config.tileZStep + height,
        (y + (sizeY - 1) / 2) * tileSize
    );
}

/**
 * A price tag that stays over a building yet to be put down, for as long as
 * it is being aimed - what it would cost, trees cleared for it included.
 * Grey when the city could not pay it.
 *
 * @returns {engine.GameObject}
 */
function createPriceTag(self, tile, sizeX, sizeY, amount, affordable) {
    var go = new engine.GameObject("price tag"),
        renderer = go.addComponent(new engine.TextRenderer());

    renderer.layer = RenderLayer.overlayLayer;
    renderer.color = affordable ? "rgb(255,64,64)" : "rgb(160,160,160)";
    renderer.style = "bold 16px Courier New";
    renderer.strokeStyle = "black";
    renderer.lineWidth = 4;
    renderer.text = "-$" + Numeral(amount).format("0,0");

    //placed before it goes in - the world files it by where it stands; up
    //off the ground so the ghost underneath does not hide it
    placeOverArea(self, go, tile, sizeX, sizeY, Config.tileSize);
    self.root.game.logic.world.addGameObject(go);

    return go;
}

/**
 * Floats what it just cost over the middle of an area of sizeX by sizeY tiles
 * anchored at tile.
 */
function showCost(self, tile, sizeX, sizeY, amount) {
    showText(self, tile, sizeX, sizeY, "-$" + Numeral(amount).format("0,0"));
}

/**
 * What the player is told when a build is turned down, keyed by ErrorCode.
 */
var errorText = {};
errorText[ErrorCode.CITY_HALL_ALREADY_BUILT] = "city hall exists";
errorText[ErrorCode.BUILDING_NOT_AVAIL] = "not available";
errorText[ErrorCode.NOT_ENOUGH_RES] = "no money";
errorText[ErrorCode.CANT_BUILD_ON_WATER] = "on water";
errorText[ErrorCode.CANT_BUILD_HERE] = "can't build here";
errorText[ErrorCode.WRONG_RESOURCE_TILE] = "no deposit";
errorText[ErrorCode.LAND_NOT_SUITABLE] = "too steep";
errorText[ErrorCode.FLAT_LAND_REQUIRED] = "not flat";
errorText[ErrorCode.TILE_TAKEN] = "occupied";
errorText[ErrorCode.OUTSIDE_CITY] = "outside city";

/**
 * Puts code down on every tile of the selection and tells the player why
 * whatever did not go in was turned down.
 *
 * The core reports each refusal on its own tile. An area dragged out is tried
 * tile by tile, so it would bury itself in them: the tiles covered by what
 * was just put down all come back occupied, and the same reason tends to
 * repeat everywhere - so each reason is said once, where it first came up,
 * and "occupied" only when nothing went in at all.
 */
function buildSelection(self, code, iter, rotation) {
    var root = self.root,
        data = BuildingData[code],
        messaging = root.core.messagingService,
        errors = [],
        tried = 0,
        tile, i, seen = {};

    var sub = Events.on(messaging, Core.MessagingService.events.tileMessage, function (sender, message) {
        if (message.type === Core.MessageType.tileError)
            errors.push(message);
    });

    try {
        while (!iter.done) {
            tile = iter.next();
            tried++;
            root.core.cities.getCity(0).buildingService.buildBuilding(code, tile, rotation);
        }
    } finally {
        Events.off(messaging, Core.MessagingService.events.tileMessage, sub);
    }

    for (i = 0; i < errors.length; i++) {
        var reason = errors[i].text;

        if (seen[reason] || (reason === ErrorCode.TILE_TAKEN && errors.length < tried))
            continue;

        seen[reason] = true;
        showText(self, errors[i].tile,
            rotation ? data.sizeY : data.sizeX,
            rotation ? data.sizeX : data.sizeY,
            errorText[reason] || "can't build");
    }
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

/**
 * Floats text over the middle of an area of sizeX by sizeY tiles anchored at
 * tile - the way a build that was turned down says why.
 */
Buildman.prototype.showText = function (tile, sizeX, sizeY, text) {
    showText(this, tile, sizeX, sizeY, text);
};

/**
 * Floats what something just cost over the middle of an area of sizeX by
 * sizeY tiles anchored at tile.
 */
Buildman.prototype.showCost = function (tile, sizeX, sizeY, amount) {
    showCost(this, tile, sizeX, sizeY, amount);
};

Buildman.prototype.build = function (code) {
    var self = this;
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
    var preview = null;
    var priceTags = [];

    //one tag over every building the selection would put down, priced the
    //way a submit would charge it
    function updatePriceTags(tile0, tile1) {
        var i, quotes, sizeX, sizeY;

        for (i = 0; i < priceTags.length; i++)
            priceTags[i].destroy();
        priceTags = [];

        if (tile0 === -1 || tile1 === -1)
            return;

        sizeX = rotation ? data.sizeY : data.sizeX;
        sizeY = rotation ? data.sizeX : data.sizeY;
        quotes = root.core.cities.getCity(0).buildingService.quoteSelection(code, tile0, tile1, rotation);

        for (i = 0; i < quotes.length; i++) {
            if (quotes[i].cost > 0)
                priceTags.push(createPriceTag(self, quotes[i].tile, sizeX, sizeY,
                    quotes[i].cost, quotes[i].error === ErrorCode.NONE));
        }
    }

    function updatePreview(tile0, tile1) {
        if (preview !== null) {
            preview.destroy();
            preview = null;
        }

        //only while a single building is being aimed - an area dragged out
        //is shown by its hilite alone
        if (tile0 !== -1 && tile0 === tile1)
            preview = createPreview(self, data, tile0, rotation);
    }

    function updateHilite() {
        var tile0 = ts.tile0(),
            tile1 = ts.tile1();

        updatePreview(tile0, tile1);
        updatePriceTags(tile0, tile1);

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
    //anything can be turned round - what was never painted that way is drawn
    //flipped over (see BuildingView) - unless it says otherwise
    controls.canRotate(data.canRotate !== false);
    controls.onRotate = function () {
        rotation = !rotation;
        updateHilite();
    };
    controls.onSubmit = function () {
        var iter = ts.selectedTiles();
        if (iter !== null)
            buildSelection(self, code, iter, rotation);

        // stay in build mode: drop the selection and keep the selector, hint,
        // controls and cam lock so another area can be placed right away
        ts.reset();
        updateHilite();
    };
    controls.onDiscard = function () {
        //release resources
        ts.dispose();
        updatePreview(-1, -1);
        updatePriceTags(-1, -1);
        root.hiliteMan.disable(tokens);
        root.serviceman.hideCoverage();
        Events.off(ts, AreaSelector.events.change, sub);

        root.ui.gameScreen().showWorld();
        root.ui.gameScreen().worldScreen().hideHint();
        root.camera.cameraScript.lock(false);
    };
};

export default Buildman;
