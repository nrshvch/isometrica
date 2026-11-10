import Yards from "./yards";
import Burning from "../core/burning";

/**
 * What is left of a building burnt down (core/building ruin) or come down
 * (core/city explode, collapse) as it is drawn, tile by tile as it stood
 * (client/compoundbuilding pieces) - painted so by the generators that
 * painted it (shared/gen/isobox setRuin), out of its own boxes, in its own
 * colours, lit as anything is - as it burns down by what it is built of
 * (core/burning outcome):
 *
 *   - gutted to its frame ("k"): concrete, every storey of it standing, its
 *     roof on it, charred black, black holes where its windows were;
 *   - burnt out, its walls standing ("s"): every storey of it as it stood, its
 *     roof gone, its walls charred, black holes where its windows and doors
 *     were, soot up the wall over them, ash and fallen beams inside;
 *   - burnt and fallen in ("b"): its ground storey's walls broken off any
 *     height up to a storey or so, and in them a heap of charred beams and
 *     rubble, as high as there were storeys to come down;
 *   - come down ("c"): the same, not burnt - the rubble of what it was
 *     built of, its floors fallen in on each other where it was concrete,
 *     beams across it.
 *
 * Its yard - a car park, a playground, a garden - is as it was: the fire
 * does not spread to it. A building painted whole, not put together a tile
 * at a time - a church, a water tower - is its picture burnt down
 * (client/burnt "r") instead.
 */

//how high a ruin painted whole stands at the most, pixels - about a storey
var KEEP = 15;

//a part's name and where it is in the picture, out of the key of what it is
//put together out of (SpriteCache#getComposite)
var PART = /^([^@#!~]*)(?:@(-?[\d.]+),(-?[\d.]+))?/;

//of the parts of a block of flats or offices, the ones that are its storeys
//(shared/gen/stacking kindOf)
var STOREYS = { ground: true, upper: true };

//the ruin a building burns down to, by what it burns down to (core/burning
//outcome): gutted to its frame, its roof on; its walls standing, roofless;
//fallen in
var KINDS = { frame: "k", walls: "s", fallen: "b" };

/**
 * The ruin a building burnt down is, by what it was built of (core/burning
 * outcome): "k" gutted to its frame, "s" its walls standing, "b" fallen in.
 *
 * @param model {Building} the core's
 * @returns {string}
 */
function kindOf(model) {
  return KINDS[Burning.outcome(model)] || "s";
}

//the kind of a part, by its name: "ground" for gen/flats/ground/...
function partOf(name) {
  var p = name.split("/");

  return p[p[0] === "gen" ? 2 : 1];
}

/**
 * A tile of a building - its parts put together (SpriteCache#getComposite)
 * - as a ruin of itself, kind "k", "s", "b" or "c": gutted or burnt out,
 * all of it; fallen in, its ground storey only, as many storeys come down
 * onto it as it had.
 * For one whose parts are not painted that way: itself, standing; its
 * picture broken off low (whole), come down.
 *
 * @returns {CachedSprite}
 */
function model(sprites, sprite, kind) {
  var keys = typeof sprite.key === "string" ? sprite.key.split("+") : [],
    parts = [],
    storeys = 0,
    ok = keys.length > 0;

  keys.forEach(function (key) {
    var m = PART.exec(key);

    if (m === null || sprites.frame(m[1]) === undefined) ok = false;
    else {
      parts.push({ name: m[1], x: +(m[2] || 0), y: +(m[3] || 0) });
      if (STOREYS[partOf(m[1])]) storeys++;
    }
  });

  if (!ok)
    return kind === "s" || kind === "k"
      ? sprite
      : whole(sprites, sprite, seedOf(sprite.key));

  var laid = parts
    .filter(function (p, i) {
      //fallen in: what is on the ground of it, the rest come down onto it
      return kind === "s" || kind === "k" || i === 0;
    })
    .map(function (p) {
      return {
        name: sprites.ruinName(
          p.name,
          kind,
          kind === "s" || kind === "k" ? 1 : storeys,
        ),
        x: p.x,
        y: p.y,
      };
    });

  return sprites.getComposite(laid);
}

/**
 * The tiles of what is left of a building, each as a tile of it was drawn
 * standing (client/compoundbuilding pieces) - its yard as it was, the rest
 * a ruin of itself (model).
 *
 * @param sprites {SpriteCache}
 * @param pieces {Object[]} as client/compoundbuilding pieces made them
 * @param kind {string} "k", "s", "b" or "c"
 * @returns {Object[]} pieces, the same way
 */
function pieces(sprites, pieces, kind) {
  return pieces.map(function (piece) {
    if (Yards.yardPicture(piece.sprite)) return piece;

    return Object.assign({}, piece, {
      overlays: [],
      sprite: model(sprites, piece.sprite, kind),
    });
  });
}

//a number for a picture, out of its key, the same every time
function seedOf(key) {
  var h = 0,
    k = String(key);

  for (var i = 0; i < k.length; i++)
    h = (Math.imul(h, 31) + k.charCodeAt(i)) | 0;

  return h >>> 0;
}

//what a building painted whole leaves burnt, as its seed says: its walls
//broken off KEEP high
function words(seed) {
  return "r:" + ((seed >>> 0) % 100000) + ":" + KEEP;
}

/**
 * What is left of a building painted whole - a church, a water tower - its
 * picture as it is, burnt down: drawn as painted.
 *
 * @param sprite {CachedSprite} as its view drew it standing
 * @param seed {number} the same for the same building every time
 * @returns {CachedSprite}
 */
function whole(sprites, sprite, seed) {
  return sprites.burnt(sprite, words(seed), true);
}

export default {
  pieces: pieces,
  model: model,
  whole: whole,
  kindOf: kindOf,
  KEEP: KEEP,
};
