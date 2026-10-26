/**
 * Where the city is, tile by tile, for its border (client/cityborder): the
 * area round everything that is part of it - each of its buildings' tiles,
 * and its roads' where they join them, with what is within two tiles of it
 * (isometrica core/city/cityroads AREA), all of it together. And the same for
 * what stands apart from it, and for what is being put down.
 */
import Core from "isometrica/core/main";
import CityRoads from "isometrica/core/city/cityroads";
import TileIterator from "isometrica/core/tileiterator";

var Terrain = Core.Terrain;

/**
 * The tiles a footprint's area covers - within two tiles of any of them.
 *
 * @param tiles {number[]}
 * @param [into] {Object} tile -> true, the tiles so far, added to
 * @returns {Object} tile -> true
 */
export function areaOfTiles(tiles, into) {
  var on = into || {},
    i,
    j;

  for (i = 0; i < tiles.length; i++)
    for (j = 0; j < CityRoads.AREA.length; j++)
      on[tiles[i] + CityRoads.AREA[j][0] + CityRoads.AREA[j][1] * Terrain.dy] =
        true;

  return on;
}

/**
 * The tiles buildings' areas cover, all together.
 *
 * @param buildings {Building[]}
 * @param [into] {Object}
 * @returns {Object} tile -> true
 */
export function areaOf(buildings, into) {
  var on = into || {},
    tiles = [],
    iter,
    i;

  for (i = 0; i < buildings.length; i++) {
    iter = buildings[i].occupiedTiles();

    while (!iter.done) tiles.push(TileIterator.next(iter));
  }

  return areaOfTiles(tiles, on);
}

/**
 * The tiles of what is about to be put down: a footprint sizeX by sizeY on
 * each of anchors - a road one tile each.
 *
 * @param anchors {number[]}
 * @param sizeX {number}
 * @param sizeY {number}
 * @returns {number[]}
 */
export function footprints(anchors, sizeX, sizeY) {
  var out = [],
    iter,
    i;

  for (i = 0; i < anchors.length; i++) {
    iter = new TileIterator(
      anchors[i],
      anchors[i] + (sizeX - 1) + (sizeY - 1) * Terrain.dy,
    );

    while (!iter.done) out.push(TileIterator.next(iter));
  }

  return out;
}

/**
 * @param on {Object} tile -> true
 * @returns {number[]}
 */
export function tilesOf(on) {
  return Object.keys(on).map(Number);
}

/**
 * The city's tiles: its area, all of it together.
 *
 * @param city {City}
 * @returns {number[]}
 */
export function area(city) {
  return tilesOf(areaOf(city.roads.members()));
}
