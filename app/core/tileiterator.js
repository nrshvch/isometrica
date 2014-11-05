define(/** @lends TileIterator */ function(require){
    var Namespace = require("namespace");
    var Terrain = require("./terrain");
    var TerrainDY = Terrain.dy;
    var Core = Namespace("Isometrica.Core");

    var tileOne = TerrainDY + 1;

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
    function TileIterator(tile0, tile1) {
        if(arguments.length > 2)throw "invalid args";
        TileIterator.setup(this, tile0, tile1);
    }

    function isInt(c){
        return (typeof c==='number' && (c%1)===0)
    }

    TileIterator.prototype = Object.create(null);

    TileIterator.next = function(iterator){
        if(iterator.done === true)
            return -1;

        var i = iterator.i++;

        var w = iterator.w;
        var y = (i / w) | 0;
        var x = i - y * w;
        var tile = iterator.tile0 + x + y * TerrainDY;

        if(tile === iterator.tile1)
            iterator.done = true;

        return tile;
    };

    TileIterator.reset = function(iterator){
        iterator.i = 0;
    };

    TileIterator.setup = function(iterator, tile0, tile1){
        if(!isInt(tile0) || !isInt(tile1) || tile0 === -1 || tile1 === -1)
            throw "Invalid tiles "+tile0+" and "+tile1;

        var t0,t1;

        t0 = Terrain.min(tile0,tile1);
        t1 = Terrain.max(tile0,tile1);

        iterator.tile0 = t0;
        iterator.tile1 = t1;
        iterator.w = Terrain.extractX(t1 - t0 + tileOne);
        iterator.i = 0;
        iterator.done = false;
    };

    TileIterator.toArray = function(iterator){
        var iter = new TileIterator(iterator.tile0, iterator.tile1),
            result = [];

        while(!iter.done){
            result.push(iter.next());
        }

        return result;
    };

    TileIterator.prototype.toArray = function(){
        return TileIterator.toArray(this);
    };

    TileIterator.prototype.next = function () {
        return TileIterator.next(this);
    };

    TileIterator.prototype.reset = function () {
        return TileIterator.reset(this);
    };

    TileIterator.prototype.setup = function (tile0, tile1) {
        return TileIterator.setup(this, tile0, tile1);
    };

    return TileIterator;
});
