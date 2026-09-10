import engine from "engine/main";
import RenderLayer from "./renderlayer";
import WorldCamera from "./components/camerascript";
import Events from "events";
import RProp from "reactive-property";

function filterTile(gameObjects) {
    var r = gameObjects,
        l = r.length,
        layer;

    for (var i = 0; i < l; i++) {
        layer = r[i].spriteRenderer.layer;
        if (layer === RenderLayer.groundLayer)
            return r[i];
    }

    return false;
}

function pickTile(me, screenX, screenY) {
    var tile = filterTile(me._cam.pickGameObject(screenX, screenY));
    return tile && me.root.terrain.getCoordinates(tile) || -1;
}

function onMove(sender, e, self) {
    if (self._locked) return;

    var screenX = e.gameViewportX,
        screenY = e.gameViewportY;

    var tile = pickTile(self, screenX, screenY);
    self._tile(tile);
}

function onClick(sender, e, self) {
    var screenX = e.gameViewportX,
        screenY = e.gameViewportY;

    var tile = pickTile(self, screenX, screenY);
    self._tile(tile);
    self._locked = true;
}

function onChange(s,a,m){
    Events.fire(m, events.change);
}

function onDispose(a,b,c){
    Events.off(c);
}

var events = {
    change: 0,
    dispose: 1
};

function TileSelector(root) {
    this.root = root;
    this._tile = RProp(-1);
    this._locked = false;

    var cam = this._cam = root.camera.cameraScript;

    var ms = Events.on(cam, WorldCamera.events.inputMove, onMove, this);
    var cs = Events.on(cam, WorldCamera.events.inputClick, onClick, this);
    var s = this._tile.onChange(onChange, false, this);

    Events.once(this, events.dispose, onDispose, ms);
    Events.once(this, events.dispose, onDispose, cs);
    Events.once(this, events.dispose, onDispose, s);
}

TileSelector.events = events;

TileSelector.prototype._tile = -1;
TileSelector.prototype._locked = false;

TileSelector.prototype.selectedTile = function(){
    return this._tile();
};

TileSelector.prototype.dispose = function () {
    Events.fire(this, events.dispose);
};

export default TileSelector;
