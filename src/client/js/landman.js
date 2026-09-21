/**
 * Buying city land.
 *
 * The city no longer grows by itself - it expands one 5x5 block at a time, and
 * only when the player pays for it. This puts the player in charge of which way
 * the city spreads, keeps it off the water and hands over a whole block of free
 * land at once, so even the biggest buildings have somewhere to go.
 *
 * Buying is a mode of its own, entered from the world's action bar. Only then
 * do the blocks on sale show up around the city, each with its price across
 * the middle, and the only way out is the cross on the left. Clicking a block
 * asks for the purchase to be confirmed; either way it goes, the player is back
 * to picking, with whatever new blocks the purchase opened up.
 *
 * Outside the mode the world shows the city and nothing for sale.
 */
import Core from "core/main";
import Events from "events";
import Numeral from "numeral";
import Config from "./config";
import RenderLayer from "./renderlayer";
import WorldCamera from "./components/camerascript";
import LandBlock from "./gameObjects/landblock";
import TileMessage from "./gameObjects/tilemessage";

var OFFER_FILL = "rgba(0,255,0,0.05)";
var OFFER_BORDER = "rgba(0,255,0,0.4)";
var OFFER_DASH = [4];

var PICKED_FILL = "rgba(0,255,0,0.15)";
var PICKED_BORDER = "rgba(0,255,0,0.5)";
var PICKED_DASH = [4];

function formatMoney(amount) {
    //"$10 000" reads easier than "$10000" on top of the terrain
    return "$" + Numeral(amount).format("0,0").replace(/,/g, " ");
}

function pickTile(root, screenX, screenY) {
    var gos = root.camera.cameraScript.pickGameObject(screenX, screenY),
        sprite;

    for (var i = 0; i < gos.length; i++) {
        sprite = gos[i].spriteRenderer;
        if (sprite !== undefined && sprite.layer === RenderLayer.groundLayer)
            return root.terrain.getCoordinates(gos[i]);
    }

    return -1;
}

/**
 * Center of a block in world space, where its price and the money it cost go.
 */
function blockCenter(root, block) {
    var terrain = root.core.world.terrain,
        half = block.size >> 1;

    return [
        (block.x0 + (block.size - 1) / 2) * Config.tileSize,
        terrain.getGridPointHeight(block.x0 + half, block.y0 + half) * Config.tileZStep,
        (block.y0 + (block.size - 1) / 2) * Config.tileSize
    ];
}

function paint(go, fill, border, dash) {
    go.areaRenderer.fillColor = fill;
    go.areaRenderer.borderColor = border;
    go.areaRenderer.dash = dash;
}

function worldScreen(self) {
    return self.root.ui.gameScreen().worldScreen();
}

function hint(self, text) {
    worldScreen(self).showHint(text);
}

function clearOffers(self) {
    for (var i = 0; i < self._offers.length; i++)
        self._offers[i].destroy();

    self._offers = [];
    self._picked = null;
}

/**
 * Marks out every block the city may buy right now.
 */
function showOffers(self) {
    clearOffers(self);

    var root = self.root,
        city = self._city;

    if (city === undefined || city === null)
        return;

    var terrain = root.core.world.terrain,
        blocks = city.area.getAvailableBlocks(),
        block, go, pos;

    for (var i = 0; i < blocks.length; i++) {
        block = blocks[i];

        go = new LandBlock(terrain, block);
        go.setPrice(formatMoney(block.price));
        paint(go, OFFER_FILL, OFFER_BORDER, OFFER_DASH);
        root.game.logic.world.addGameObject(go);

        pos = blockCenter(root, block);
        go.transform.setPosition(pos[0], pos[1], pos[2]);

        self._offers.push(go);
    }
}

/**
 * Only the block being bought stays on screen while its purchase is confirmed.
 */
function hideOtherOffers(self) {
    for (var i = 0; i < self._offers.length; i++)
        self._offers[i].renderersEnabled(self._offers[i] === self._picked);
}

function showAllOffers(self) {
    for (var i = 0; i < self._offers.length; i++)
        self._offers[i].renderersEnabled(true);
}

function findOffer(self, tile) {
    if (tile === -1 || self._city === undefined || self._city === null)
        return null;

    var block = self._city.area.getBlockAt(tile),
        offers = self._offers;

    for (var i = 0; i < offers.length; i++)
        if (offers[i].block.bx === block.bx && offers[i].block.by === block.by)
            return offers[i];

    return null;
}

function showCost(self, block, cost) {
    var message = new TileMessage("-" + formatMoney(cost), "rgb(255,64,64)"),
        pos = blockCenter(self.root, block);

    self.root.game.logic.world.addGameObject(message);
    message.transform.setPosition(pos[0], pos[1], pos[2]);
}

/**
 * Waits for a block to be picked, with nothing to confirm yet and only the
 * cross to leave by.
 */
function pick(self) {
    hint(self, "Pick a block of land to buy!");

    var controls = self.root.ui.gameScreen().showActionControls();
    controls.canRotate(false);
    controls.canSubmit(false);
    controls.onDiscard = function () {
        self.exit();
    };
}

/**
 * Leaves the confirmation step for picking again - the player may well want
 * the next block along.
 */
function done(self) {
    self._picked = null;
    showAllOffers(self);
    pick(self);
}

/**
 * Clicking a block on sale asks whether to buy it.
 */
function confirm(self, go) {
    self._picked = go;

    paint(go, PICKED_FILL, PICKED_BORDER, PICKED_DASH);
    hideOtherOffers(self);

    hint(self, "Are you sure you want to buy this land for " + formatMoney(go.block.price) + "?");

    var controls = self.root.ui.gameScreen().showActionControls();
    controls.canRotate(false);
    controls.onSubmit = function () {
        var block = go.block;

        if (!self._city.area.buyBlock(block.bx, block.by)) {
            hint(self, "You cannot afford this land!");
            return;
        }

        showCost(self, block, block.price);
        //the purchase opens up new neighbours, showOffers picks them up
        done(self);
    };
    controls.onDiscard = function () {
        paint(go, OFFER_FILL, OFFER_BORDER, OFFER_DASH);
        showAllOffers(self);
        done(self);
    };
}

function onClick(sender, e, self) {
    //outside the mode there is nothing for sale, and while a block is being
    //confirmed the buttons are the only way on
    if (!self._active || self._picked !== null)
        return;

    //in this mode it is the land the player is aiming at, whatever happens to
    //stand on it or behind it
    var go = findOffer(self, pickTile(self.root, e.gameViewportX, e.gameViewportY));

    if (go !== null)
        confirm(self, go);
}

function onAreaChange(sender, args, self) {
    //new land means new neighbours for sale - only worth drawing while buying
    if (self._active)
        showOffers(self);
}

function onNewCity(sender, city, self) {
    //a single city for now, same assumption the rest of the client makes
    if (self._city !== null)
        return;

    self._city = city;
    Events.on(city.area, city.area.events.change, onAreaChange, self);
}

function Landman(root) {
    this.root = root;
    this._offers = [];
    this._picked = null;
    this._city = null;
    this._active = false;
}

/**
 * Puts the blocks on sale on the map and waits for one to be picked.
 */
Landman.prototype.enter = function () {
    if (this._city === null)
        return;

    this._active = true;

    showOffers(this);
    pick(this);
};

/**
 * Takes the blocks on sale off the map and hands the world buttons back.
 */
Landman.prototype.exit = function () {
    this._active = false;

    clearOffers(this);
    hint(this, "");

    this.root.ui.gameScreen().showWorld();
};

Landman.prototype.init = function () {
    var root = this.root,
        cities = root.core.cities;

    Events.on(cities, Core.CityService.events.cityNew, onNewCity, this);
    Events.on(root.camera.cameraScript, WorldCamera.events.inputClick, onClick, this);

    //the city may already be there when the client restarts its services
    var city = cities.getCity(0);
    if (city !== undefined)
        onNewCity(cities, city, this);
};

export default Landman;
