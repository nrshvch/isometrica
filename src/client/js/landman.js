/**
 * Buying city land.
 *
 * The city no longer grows by itself - it expands one 5x5 block at a time, and
 * only when the player pays for it. This puts the player in charge of which way
 * the city spreads, keeps it off the water and hands over a whole block of free
 * land at once, so even the biggest buildings have somewhere to go.
 *
 * The blocks on sale are part of the world view, not a mode of their own: they
 * sit around the city with their price on them until one is clicked, and only
 * then does the purchase ask to be confirmed.
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
 * Leaves the confirmation step and hands the world buttons back.
 */
function done(self) {
    self._picked = null;
    hint(self, "");
    self.root.ui.gameScreen().showWorld();
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
    //while another action owns the buttons the world belongs to it
    if (self._picked !== null || worldScreen(self).busy())
        return;

    //a tower standing on a block that is up for sale is still a tower: the
    //click belongs to it, and the land underneath keeps out of it
    if (self.root.buildman.pickBuilding(e.gameViewportX, e.gameViewportY) !== null)
        return;

    var go = findOffer(self, pickTile(self.root, e.gameViewportX, e.gameViewportY));

    if (go !== null)
        confirm(self, go);
}

function onAreaChange(sender, args, self) {
    showOffers(self);
}

function onNewCity(sender, city, self) {
    //a single city for now, same assumption the rest of the client makes
    if (self._city !== null)
        return;

    self._city = city;
    Events.on(city.area, city.area.events.change, onAreaChange, self);

    showOffers(self);
}

/**
 * While a build or destroy action is running, the blocks on sale would only be
 * in the way, so they step aside until the world view is idle again.
 */
function onBusyChange(sender, busy, self) {
    //the confirmation step is an action of our own, it keeps its block
    if (self._picked !== null)
        return;

    for (var i = 0; i < self._offers.length; i++)
        self._offers[i].renderersEnabled(!busy);
}

function Landman(root) {
    this.root = root;
    this._offers = [];
    this._picked = null;
    this._city = null;
}

Landman.prototype.init = function () {
    var root = this.root,
        cities = root.core.cities;

    Events.on(cities, Core.CityService.events.cityNew, onNewCity, this);
    Events.on(root.camera.cameraScript, WorldCamera.events.inputClick, onClick, this);

    var ws = root.ui.gameScreen().worldScreen();
    ws.busy.onChange(onBusyChange, false, this);

    //the city may already be there when the client restarts its services
    var city = cities.getCity(0);
    if (city !== undefined)
        onNewCity(cities, city, this);
};

export default Landman;
