import engine from "engine/main";
import RenderLayer from "./renderlayer";
import WorldCamera from "./components/camerascript";
import Events from "events";
import Core from "core/main";
import RProp from "reactive-property";

var Terrain = Core.Terrain;

function filterTile(gameObjects) {
    var r = gameObjects,
        l = r.length,
        sprite;

    for (var i = 0; i < l; i++) {
        //picking hands back anything it can hit, and that includes text - a
        //city's name, a "no water" over a house - which has no sprite to read
        //a layer off
        sprite = r[i].spriteRenderer;

        if (sprite !== undefined && sprite.layer === RenderLayer.groundLayer)
            return r[i];
    }

    return false;
}

function pickTile(me, screenX, screenY) {
    var tile = filterTile(me._cam.pickGameObject(screenX, screenY));
    return tile && me._terrain.getCoordinates(tile) || -1;
}

function onMove(sender, e, self) {
    if (self._locked) return;

    var screenX = e.gameViewportX,
        screenY = e.gameViewportY;

    var tile = pickTile(self, screenX, screenY);
    self._tile0(tile, true);
    self._tile1(tile);
}

function onClick(sender, e, self) {
    var screenX = e.gameViewportX,
        screenY = e.gameViewportY;

    var tile = pickTile(self, screenX, screenY);
    self._tile0(tile, true);
    self._tile1(tile);
    self._locked = true;
}

function onDragStart(sender, e, me) {
    var screenX = e.gameViewportX,
        screenY = e.gameViewportY;

    var tile = pickTile(me, screenX, screenY);
    me._tile0(tile, true);
    me._tile1(tile);
    me._locked = true;
}

function onDrag(sender, param, me) {
    var e = param.e,
        screenX = e.gameViewportX,
        screenY = e.gameViewportY,
        tile = pickTile(me, screenX, screenY);

    me._tile1(tile);
}

function onChange(sender, args, me) {
    Events.fire(me, events.change);
}

//data is [host, event, subscription] - Events.off needs all three, a bare
//subscription is not enough to find what it was subscribed to
function onDispose(sender, args, data){
    Events.off(data[0], data[1], data[2]);
}

function onDisposeProp(sender, args, data){
    //a reactive property's onChange called with a token unsubscribes it
    data[0].onChange(data[1]);
}

var events = {
    change: 0,
    dispose: 1
};

function TileSelector(root) {
    this.root = root;
    this._tile0 = RProp(-1);
    this._tile1 = RProp(-1);
    this._locked = false;

    this._terrain = root.terrain;
    var cam = this._cam = root.camera.cameraScript;

    var ms = Events.on(cam, WorldCamera.events.inputMove, onMove, this);
    var cs = Events.on(cam, WorldCamera.events.inputClick, onClick, this);
    var dss = Events.on(cam, WorldCamera.events.inputDragStart, onDragStart, this);
    var ds = Events.on(cam, WorldCamera.events.inputDrag, onDrag, this);

    var a = this._tile0.onChange(onChange, false, this);
    var b = this._tile1.onChange(onChange, false, this);

    Events.once(this, events.dispose, onDispose, [cam, WorldCamera.events.inputMove, ms]);
    Events.once(this, events.dispose, onDispose, [cam, WorldCamera.events.inputClick, cs]);
    Events.once(this, events.dispose, onDispose, [cam, WorldCamera.events.inputDragStart, dss]);
    Events.once(this, events.dispose, onDispose, [cam, WorldCamera.events.inputDrag, ds]);
    Events.once(this, events.dispose, onDisposeProp, [this._tile0, a]);
    Events.once(this, events.dispose, onDisposeProp, [this._tile1, b]);
}

TileSelector.events = events;

TileSelector.prototype._tile0 = -1;
TileSelector.prototype._tile1 = -1;
TileSelector.prototype._locked = false;

TileSelector.prototype.selectedTiles = function () {
    var t0 = this._tile0(),
        t1 = this._tile1();
    return t0 !== -1 && t1 !== -1 && new Core.TileIterator(t0, t1) || null;
};

/**
 * Drops the current selection and resumes following the cursor, so the
 * selector can be reused for another area without being recreated.
 */
TileSelector.prototype.reset = function () {
    this._locked = false;
    this._tile0(-1, true);
    this._tile1(-1);
};

/**
 * Whether the player has picked the area, rather than the selector just
 * following the cursor around.
 *
 * @returns {boolean}
 */
TileSelector.prototype.isPicked = function () {
    return this._locked && this._tile0() !== -1 && this._tile1() !== -1;
};

TileSelector.prototype.dispose = function () {
    Events.fire(this, events.dispose);
};

TileSelector.prototype.tile0 = function () {
    return this._tile0();
};

TileSelector.prototype.tile1 = function () {
    return this._tile1();
};

export default TileSelector;
