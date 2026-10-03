import { tileName, shoreName, gridName } from "shared/gen/names";

//The ground is painted by the game rather than loaded - lazily, a tile at a
//time as it is drawn, see client/generator. What the build worked out about
//it (gfx/generated/terrain.json) says which tiles there are; this says which
//of them a tile of the terrain is drawn with.

/**
 * What a tile is drawn with: the sprites laid over one another, bottom
 * first, for SpriteCache#getComposite.
 *
 * @param terrain {Object} the data of gfx/generated/terrain.json
 * @param kind {string} "land", "shore", "water" - the shallows along the
 *        land - "mid", the step from them to deep water, or "deep", the water
 *        further out
 * @param slope {string|number} the tile's slope code
 * @param x {number} where the tile is, which picks one of the variants
 * @param y {number}
 */
function tileParts(terrain, kind, slope, x, y) {
  var set =
      kind === "water"
        ? terrain.water
        : kind === "mid"
          ? terrain.mid
          : kind === "deep"
            ? terrain.deep
            : terrain.land,
    n = terrain.variants[set],
    base = tileName(set, slope, n > 1 ? scatter(x, y) % n : 0);

  //the land with the water's shore over it - a flat shore has no water
  //painted on it - and the grid over all of it
  if (kind === "shore" && terrain.shores[slope] === true)
    return [base, shoreName(terrain.water, slope), gridName(slope)];

  return [base, gridName(slope)];
}

/**
 * A number for a spot that looks random but is always the same there - its
 * low bits as mixed as its high ones, so that neighbours do not fall into a
 * pattern.
 */
function scatter(x, y) {
  var h = Math.imul(x, 0x9e3779b1) ^ Math.imul(y, 0x85ebca6b);

  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);

  return (h ^ (h >>> 15)) >>> 0;
}

export default { tileParts: tileParts };
