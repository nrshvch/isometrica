/**
 * Created by denis on 9/11/14.
 */
define(function(require){
    var Config = require("./config");
    var Core = require("core");
    var TileIterator = Core.TileIterator;
    var Terrain = Core.Terrain;

    function Chunk(tile0, tile1){
        this.tile0 = tile0;
        this.tile1 = tile1;
    }

    Chunk.prototype.tile0 = -1;
    Chunk.prototype.tile1 = -1;

    Chunk.prototype.tiles = function(){
        return new TileIterator(this.tile0, this.tile1);
    };

    return Chunk;
});
