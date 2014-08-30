define(/** @lends TileIterator */ function(require){
    var Namespace = require("namespace");
    var Terrain = require("./terrain");

    var Core = Namespace("Isometrica.Core");

    /**
     * @type {TileIterator}
     */
    Core.TileIterator = TileIterator;

    /**
     * @exports TileIterator
     * @param x0
     * @param y0
     * @param w
     * @param l [number]
     * @constructor
     */
    function TileIterator(a, b, c, d) {
        var x0,y0, w, l;

        if(arguments.length === 2){
            x0 = Terrain.extractX(a);
            y0 = Terrain.extractY(a);
            w = Terrain.extractX(b) - x0;
            l = Terrain.extractY(b) - y0;
        }else if(arguments.length === 3){
            x0 = Terrain.extractX(a);
            y0 = Terrain.extractY(a);
            w = b;
            l = c;
        }else{
            x0 = a;
            y0 = b;
            w = c;
            l = d;
        }
        TileIterator.setup(this, x0, y0, w, l);
    }

    TileIterator.next = function(iterator){
        if(iterator.done)
            return -1;

        var i = iterator.i++;

        if (i === iterator.count - 1)
            iterator.done = true;

        var w = iterator.w;
        var y = (i / w) | 0;
        var x = i - y * w;

        return (iterator.y0 + y) << 16 ^ (iterator.x0 + x);
    };

    TileIterator.reset = function(iterator){
        iterator.i = 0;
    };

    TileIterator.setup = function(iterator, x0, y0, w, l){
        iterator.x0 = x0;
        iterator.y0 = y0;
        iterator.w = w;
        iterator.l = l;
        iterator.count = w * l;
        iterator.i = 0;
        iterator.done = false;
    };




    TileIterator.prototype.next = function () {
        return TileIterator.next(this);
    };

    TileIterator.prototype.reset = function () {
        return TileIterator.reset(this);
    };

    TileIterator.prototype.setup = function (x0, y0, w, l) {
        return TileIterator.setup(x0, y0, w, l);
    };

    return TileIterator;
});
