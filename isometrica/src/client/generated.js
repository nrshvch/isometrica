import { tileName, shoreName, diffuseName } from "../shared/gen/names";

//The ground is painted by the game rather than loaded - lazily, a tile at a
//time as it is drawn, see client/generator. What the build worked out about
//it (gfx/generated/terrain.json) says which tiles there are; this says which
//of them a tile of the terrain is drawn with.

/**
 * What a tile is drawn with: the sprites laid over one another, bottom
 * first, for SpriteCache#getComposite.
 *
 * @param terrain {Object} the data of gfx/generated/terrain.json
 * @param set {string} the tileset the tile is: for land, the ground of its
 *        zone of the climate (core/climate) - "grass", "sand_dunes", "snow" -
 *        or the earth it was cleared down to, "earth", or that earth growing
 *        back over, "earth_regrowing"; for water, the shallows along the land,
 *        "water_shallow", the water further out, "water_deep", or the water
 *        frozen over, "ice"
 * @param slope {string|number} the tile's slope code
 * @param x {number} where the tile is, which picks one of the variants
 * @param y {number}
 * @param [over] {{set: string, dirs: string[]}[]} the tilesets spilling over
 *        the tile's edges and corners from the tiles next to it, lowest first
 *        - each over the edges and corners, as the tile is seen, it lies
 *        beyond: "ne", "n"
 * @param [shore] {string} for land at the water, the water - "water_shallow"
 *        or "ice" - whose shore is laid over it last: the water coming up the
 *        low side of it, and its beach. A flat one has none
 */
function tileParts(terrain, set, slope, x, y, over, shore) {
  var n = terrain.variants[set],
    parts = [tileName(set, slope, n > 1 ? scatter(x, y) % n : 0)];

  //ragged, the same one along an edge whichever tile, so it runs on - deep
  //water and ice on the flat, as the water is, dithered as they thin out
  if (over)
    over.forEach(function (o) {
      var variants = isWater(terrain, o.set)
        ? terrain.spills.variants
        : terrain.edges.variants;

      o.dirs.forEach(function (dir) {
        parts.push(
          diffuseName(o.set, slope, dir, scatter(x, y + dir.length) % variants),
        );
      });
    });

  if (shore && terrain.shores[shore] && terrain.shores[shore][slope] === true)
    parts.push(shoreName(shore, slope));

  return parts;
}

//whether a tileset is one of the water's: deep water, or the ice
function isWater(terrain, set) {
  return (
    set === terrain.water ||
    set === terrain.deep ||
    terrain.frozen.indexOf(set) !== -1
  );
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
