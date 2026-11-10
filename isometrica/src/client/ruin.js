import Yards from "./yards";

/**
 * A building burnt down as it is drawn (core/building ruin), tile by tile
 * as it stood (client/compoundbuilding pieces): its ground storey only -
 * every part of it laid on the ground - charred, broken off about a storey
 * up and the posts of its frame standing up out of it (client/burnt);
 * whatever was laid higher, its storeys and its roof, gone - drawn as it is
 * painted (getComposite plain): nothing of it is lit any more, and it
 * stands no higher than it does. Its yard, its car park, its garden, as it
 * was but burnt, painted so: the grass black, the trees charred, the
 * asphalt cracked and sooted, ash strewn about (shared/gen/isobox setWorn).
 */

//how high its walls stand at the most, pixels - about a storey
var KEEP = 15;

//how a yard is run down, burnt (shared/gen/isobox setWorn)
var BURNT = 2;

//a part's name and where it is in the picture, out of the key of what it is
//put together out of (SpriteCache#getComposite)
var PART = /^([^@#!~]*)(?:@(-?\d+),(-?\d+))?/;

/**
 * The tiles of what is left of a building, each as a tile of it was drawn
 * standing (client/compoundbuilding pieces) - the same tile, put together
 * out of its parts laid on the ground only, burnt.
 *
 * @param sprites {SpriteCache}
 * @param pieces {Object[]} as client/compoundbuilding pieces made them
 * @param seed {number} the same for the same building every time
 * @returns {Object[]} pieces, the same way
 */
function pieces(sprites, pieces, seed) {
  return pieces.map(function (piece, k) {
    //its yard, its car park, its garden: as it was, burnt - painted so
    //(shared/gen/isobox setWorn)
    if (Yards.yardPicture(piece.sprite))
      return {
        x: piece.x,
        z: piece.z,
        pivotX: piece.pivotX,
        pivotY: piece.pivotY,
        overlays: [],
        sprite: sprites.worn(piece.sprite, BURNT),
        empty: false,
      };

    var keys =
        typeof piece.sprite.key === "string" ? piece.sprite.key.split("+") : [],
      parts = [];

    keys.forEach(function (key, i) {
      var m = PART.exec(key),
        frame = m ? sprites.frame(m[1]) : undefined;

      if (frame === undefined) return;

      var x = +(m[2] || 0),
        y = +(m[3] || 0),
        //how far it is laid up on the ones under it: its foot as far over
        //the tile's middle
        lift =
          frame.pivotY === undefined
            ? 0
            : Math.max(0, piece.pivotY - y - frame.pivotY);

      //a storey on one under it, a roof: gone
      if (lift > 1) return;

      parts.push({
        name: m[1],
        x: x,
        y: y,
        plain: true,
        burnt:
          "r:" +
          ((((seed | 0) * 131 + k * 17 + i * 7) >>> 0) % 100000) +
          ":" +
          KEEP,
      });
    });

    return {
      x: piece.x,
      z: piece.z,
      pivotX: piece.pivotX,
      pivotY: piece.pivotY,
      overlays: [],
      sprite: parts.length > 0 ? sprites.getComposite(parts) : piece.sprite,
      //nothing to it, for one with nothing left on the ground
      empty: parts.length === 0,
    };
  });
}

//what a building leaves burnt as its seed says: its walls broken off
//KEEP high
function words(seed) {
  return "r:" + ((seed >>> 0) % 100000) + ":" + KEEP;
}

/**
 * What is left of a building painted whole - a church, a water tower - its
 * picture as it is, burnt down: drawn as painted, as the pieces are.
 *
 * @param sprite {CachedSprite} as its view drew it standing
 * @param seed {number} the same for the same building every time
 * @returns {CachedSprite}
 */
function whole(sprites, sprite, seed) {
  return sprites.burnt(sprite, words(seed), true);
}

export default { pieces: pieces, whole: whole, KEEP: KEEP };
