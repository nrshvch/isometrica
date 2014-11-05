define(function (require) {
    var engine = require("engine/main"),
        RenderLayer = require("./renderlayer");
    var WorldCamera = require("./components/camerascript");
    var Events = require("events");
    var Core = require("core/main");
    var RProp = require("reactive-property");
    var Terrain = Core.Terrain;

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
        return tile && me._terrain.getCoordinates(tile) || -1;
    }

    function onClick(sender, e, self) {
        var screenX = e.gameViewportX,
            screenY = e.gameViewportY;

        var tile = pickTile(self, screenX, screenY);
        self._tile0(tile, true);
        self._tile1(tile);
    }

    function onDragStart(sender, e, me) {
        var screenX = e.gameViewportX,
            screenY = e.gameViewportY;

        var tile = pickTile(me, screenX, screenY);
        me._tile0(tile, true);
        me._tile1(tile);
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

    function onDispose(a,b,c){
        Events.off(c);
    }

    var events = {
        change: 0,
        dispose: 1
    };

    function TileSelector(root) {
        this.root = root;
        this._tile0 = RProp(-1);
        this._tile1 = RProp(-1);

        this._terrain = root.terrain;
        var cam = this._cam = root.camera.cameraScript;

        var cs = Events.on(cam, WorldCamera.events.inputClick, onClick, this);
        var dss = Events.on(cam, WorldCamera.events.inputDragStart, onDragStart, this);
        var ds = Events.on(cam, WorldCamera.events.inputDrag, onDrag, this);

        var a = this._tile0.onChange(onChange, false, this);
        var b = this._tile1.onChange(onChange, false, this);

        Events.once(this, events.dispose, onDispose, cs);
        Events.once(this, events.dispose, onDispose, dss);
        Events.once(this, events.dispose, onDispose, ds);
        Events.once(this, events.dispose, onDispose, a);
        Events.once(this, events.dispose, onDispose, b);
    }

    TileSelector.events = events;

    TileSelector.prototype._tile0 = -1;
    TileSelector.prototype._tile1 = -1;

    TileSelector.prototype.selectedTiles = function () {
        var t0 = this._tile0(),
            t1 = this._tile1();
        return t0 !== -1 && t1 !== -1 && new Core.TileIterator(t0, t1) || null;
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

    return TileSelector;
});
