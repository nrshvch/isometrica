import Namespace from "namespace";
import Terrain from "./terrain";

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

        //a tile is spoken for the moment it goes on the open list, not when it
        //comes off it - marking it later let the same tile be pushed by each
        //of its neighbours in turn and handed out several times over
        push(iterator, closed, open, tile + 1);
        push(iterator, closed, open, tile - 1);
        push(iterator, closed, open, tile + Terrain.dy);
        push(iterator, closed, open, tile - Terrain.dy);

        if(open.length === 0)
            iterator.done = true;

        return tile;
    };

    function push(iterator, closed, open, tile){
        if(closed[tile] !== true && insideRadius(iterator, tile)){
            closed[tile] = true;
            open.push(tile);
        }
    }

    TileRadialIterator.reset = function(iterator){
        iterator.i = 0;
    };

    TileRadialIterator.setup = function(iterator, tile, radius){
        tile = parseInt(tile, 10);
        iterator.tile = tile;
        iterator.open = [tile];
        iterator.closed = {};
        iterator.closed[tile] = true;
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

export default TileRadialIterator;
