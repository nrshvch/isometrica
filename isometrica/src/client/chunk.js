/**
 * Created by denis on 9/11/14.
 */
import Core from "../core/main";

var TileIterator = Core.TileIterator;

function Chunk(tile0, tile1) {
  this.tile0 = tile0;
  this.tile1 = tile1;
}

Chunk.prototype.tile0 = -1;
Chunk.prototype.tile1 = -1;

Chunk.prototype.tiles = function () {
  return new TileIterator(this.tile0, this.tile1);
};

export default Chunk;
