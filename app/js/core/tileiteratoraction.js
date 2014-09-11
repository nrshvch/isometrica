define(/** @lends TileIteratorAction */ function (require) {
    var Namespace = require("namespace");
    var TileIterator = require("./tileiterator");
    var Core = Namespace("Isometrica.Core");

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
    function TileIteratorAction(tile0, tile1, f, args) {
        TileIteratorAction.setup(this, tile0, tile1, f, args);
    }

    TileIteratorAction.next = function (iterator) {
        var tile = TileIterator.next(iterator);
        return iterator.f(tile, iterator.args);
    };

    TileIteratorAction.reset = function (iterator) {
        TileIterator.reset(iterator);
    };

    TileIteratorAction.setup = function (iterator, tile0, tile1, f, args) {
        TileIterator.setup(iterator, tile0, tile1);
        iterator.f = f;
        iterator.args = args;
    };

    TileIteratorAction.prototype = Object.create(TileIterator.prototype);

    TileIteratorAction.prototype.setup = function (tile, w, l, f, args) {
        return TileIteratorAction.setup(tile, w, l, f, args);
    };

    return TileIteratorAction;
});
