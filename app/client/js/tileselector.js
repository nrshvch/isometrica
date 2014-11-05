define(function (require) {
    var engine = require("engine/main"),
        RenderLayer = require("./renderlayer");
    var WorldCamera = require("./components/camerascript");
    var Events = require("events");
    var RProp = require("reactive-property");

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

    function onClick(sender, e, self) {
        var screenX = e.gameViewportX,
            screenY = e.gameViewportY;

        var tile = pickTile(self, screenX, screenY);
        self._tile(tile);
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

        var cam = this._cam = root.camera.cameraScript;

        var cs = Events.on(cam, WorldCamera.events.inputClick, onClick, this);
        var s = this._tile.onChange(onChange, false, this);

        Events.once(this, events.dispose, onDispose, cs);
        Events.once(this, events.dispose, onDispose, s);
    }

    TileSelector.events = events;

    TileSelector.prototype._tile = -1;

    TileSelector.prototype.selectedTile = function(){
        return this._tile();
    };

    TileSelector.prototype.dispose = function () {
        Events.fire(this, events.dispose);
    };

    return TileSelector;
});
