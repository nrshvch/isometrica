define(function(require){
    var Namespace = require("namespace");
    var Terrain = require("./terrain");
    var Core = Namespace("Isometrica.Core");

    /**
     * @type {TileRadialIterator}
     */
    Core.TileRadialIterator = TileRadialIterator;

    /**
     * @exports TileRadialIterator
     * @param x0
     * @param y0
     * @param w
     * @param l
     * @constructor
     */
    function TileRadialIterator(tile, radius) {
        TileRadialIterator.setup(this, tile, radius);
    }

    TileRadialIterator.next = function(iterator){
        if(iterator.done)
            return -1;

        var closed = iterator.closed,
            open = iterator.open,
            tile = open.pop();

        closed[tile] = true;

        var a = tile + 1;
        var b = tile - 1;
        var c = tile + Terrain.dy;
        var d = tile - Terrain.dy;

        if(closed[a] !== true && insideRadius(iterator, a))
            open.push(a);

        if(closed[b] !== true && insideRadius(iterator, b))
            open.push(b);

        if(closed[c] !== true && insideRadius(iterator, c))
            open.push(c);

        if(closed[d] !== true && insideRadius(iterator, d))
            open.push(d);

        if(open.length === 0)
            iterator.done = true;

        return tile;
    };

    TileRadialIterator.reset = function(iterator){
        iterator.i = 0;
    };

    TileRadialIterator.setup = function(iterator, tile, radius){
        tile = parseInt(tile, 10);
        iterator.tile = tile;
        iterator.open = [tile];
        iterator.closed = {};
        iterator.radius = radius;
        iterator.done = false;
    };

    var extractX = Terrain.extractX,
        extractY = Terrain.extractY,
        dx,dy;

    function insideRadius(iterator, tile){
        dx = extractX(tile) - extractX(iterator.tile);
        dy = extractY(tile) - extractY(iterator.tile);

        return (Math.sqrt(dx*dx + dy*dy)) <= iterator.radius;
    }

    return TileRadialIterator;
});
