import { tileName, shoreName, gridName, diffuseName } from "shared/gen/names";

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
 *        land - or "deep", the water further out
 * @param slope {string|number} the tile's slope code
 * @param x {number} where the tile is, which picks one of the variants
 * @param y {number}
 * @param [spills] {string[]} for the shallows, the edges and corners deep
 *        water lies beyond, as the tile is seen - "ne", "n" - which it spills
 *        over them from
 */
function tileParts(terrain, kind, slope, x, y, spills) {
  var set =
      kind === "water"
        ? terrain.water
        : kind === "deep"
          ? terrain.deep
          : terrain.land,
    n = terrain.variants[set],
    base = tileName(set, slope, n > 1 ? scatter(x, y) % n : 0);

  //the land with the water's shore over it - a flat shore has no water
  //painted on it - and the grid over all of it
  if (kind === "shore" && terrain.shores[slope] === true)
    return [base, shoreName(terrain.water, slope), gridName(slope)];

  var parts = [base];

  //deep water spilling over the edges it lies beyond, dithered as it thins
  //out - the same one along an edge whichever tile, so it runs on
  if (kind === "water" && spills && terrain.spills)
    spills.forEach(function (dir) {
      parts.push(
        diffuseName(
          terrain.deep,
          slope,
          dir,
          scatter(x, y + dir.length) % terrain.spills.variants,
        ),
      );
    });

  parts.push(gridName(slope));

  return parts;
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
