/**
 * What the generated terrain tiles are called as sprites - by
 * shared/gen/catalog, which describes them, and by the terrain, which draws
 * them. Apart from the catalog so that the game can name them without
 * taking in the painting.
 */

/**
 * @param set {string} the tileset, "grass"
 * @param slope {string|number} the slope code, "2222"
 * @param variant {number}
 */
export function tileName(set, slope, variant) {
  return "gen/terrain/" + set + "/" + slope + "_" + variant;
}

/**
 * A tileset's ground spilling over one edge or corner of a tile of another,
 * dir as shared/gen/terrain DIRECTIONS has it - "ne", "n".
 */
export function diffuseName(set, slope, dir, variant) {
  return "gen/terrain/" + set + "/diffuse/" + slope + "_" + dir + "_" + variant;
}

/**
 * The grid laid over every tile of that slope, land or water.
 */
export function gridName(slope) {
  return "gen/terrain/grid/" + slope;
}

/**
 * The shore of a water, laid over the land on that slope.
 */
export function shoreName(water, slope) {
  return "gen/terrain/" + water + "/shore/" + slope;
}
