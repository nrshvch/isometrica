define(/** @lends TileIteratorAction */ function(require){
    var Namespace = require("namespace");
    var Terrain = require("./terrain");

    var Core = Namespace("Isometrica.Core");

    var dy = Terrain.dy;

    /**
     * @type {TileIteratorAction}
     */
    Core.TileIteratorAction = TileIteratorAction;

    /**
     * @exports TileIteratorAction
     * @param x0
     * @param y0
     * @param w
     * @param l [number]
     * @constructor
     */
    function TileIteratorAction(tile, w, l, f, args) {
        TileIteratorAction.setup(this, tile, w, l, f, args);
    }

    TileIteratorAction.next = function(iterator){
        if(iterator.done)
            return -1;

        var i = iterator.i++;

        if (i === iterator.count - 1)
            iterator.done = true;

        var w = iterator.w;
        var y = (i / w) | 0;
        var x = i - y * w;
        return iterator.f(iterator.tile + y * dy + x, iterator.args);
    };

    TileIteratorAction.reset = function(iterator){
        iterator.i = 0;
    };

    TileIteratorAction.setup = function(iterator, tile, w, l, f, args){
        iterator.tile = tile;
        iterator.f = f;
        iterator.w = w;
        iterator.l = l;
        iterator.count = w * l;
        iterator.i = 0;
        iterator.done = false;
        iterator.args = args;
    };




    TileIteratorAction.prototype.next = function () {
        return TileIteratorAction.next(this);
    };

    TileIteratorAction.prototype.reset = function () {
        return TileIteratorAction.reset(this);
    };

    TileIteratorAction.prototype.setup = function (tile, w, l, f, args) {
        return TileIteratorAction.setup(tile, w, l, f, args);
    };

    return TileIteratorAction;
});
