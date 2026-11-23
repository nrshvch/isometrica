/**
 * What a building or a road stands on: heights at corners A (x, y),
 * B (x + 1, y), C (x, y + 1), D (x + 1, y + 1), saved with it.
 * See isometrica/.claude/skills/buildings/going-up.md (Surfaces).
 */
import namespace from "namespace";
import * as RoadRules from "./roadrules";
import Terrain from "./terrain";
import TerrainType from "./terraintype";
import Rotation from "./rotation";
import BuildingData from "../data/buildings";
import BuildingClassCode from "../data/classcode";

var Surface = {};

//the corners each ramp is up at, of A, B, C and D: 1 up towards -y, 2 -x,
//3 +y, 4 +x
var RAMP_TOPS = {
  1: [1, 1, 0, 0],
  2: [1, 0, 1, 0],
  3: [0, 0, 1, 1],
  4: [0, 1, 0, 1],
};

Surface.RAMP_TOPS = RAMP_TOPS;

/**
 * The heights of the ground at the corners of tile, A, B, C and D.
 *
 * @param terrain {Terrain} the terrain - or the ground as a plan would leave
 *        it (Terrain#after)
 */
Surface.ground = function (terrain, tile) {
  return [
    terrain.getGridPointHeight(tile),
    terrain.getGridPointHeight(tile + 1),
    terrain.getGridPointHeight(tile + Terrain.dy),
    terrain.getGridPointHeight(tile + Terrain.dy + 1),
  ];
};

/**
 * A surface's shape: 0 for flat, the ramp it is, 1..4, or -1 for none a road
 * can have.
 */
Surface.shapeOf = function (surface) {
  var low = Math.min.apply(null, surface);

  if (
    surface.every(function (h) {
      return h === low;
    })
  )
    return 0;

  for (var r = 1; r <= 4; r++)
    if (
      RAMP_TOPS[r].every(function (up, k) {
        return surface[k] === low + up;
      })
    )
      return r;

  return -1;
};

/**
 * Whether surface can be on tile: flat or a ramp, over the ground at every
 * corner and a step over it at most - never in the water, and on the shore
 * flat only.
 */
Surface.fits = function (terrain, tile, surface) {
  var g = Surface.ground(terrain, tile),
    shape = Surface.shapeOf(surface);

  if (shape === -1 || Math.max.apply(null, g) <= 0) return false;
  if (shape !== 0 && terrain.getTerrainType(tile) === TerrainType.shore)
    return false;

  return surface.every(function (h, k) {
    return h >= g[k] && h - g[k] <= 1;
  });
};

/**
 * The surface a road on tile has on its own: the ground's, up a slope or on
 * flat ground - or flat at the top of any other, and of the shore.
 */
Surface.natural = function (terrain, tile) {
  var g = Surface.ground(terrain, tile),
    high = Math.max.apply(null, g);

  if (
    Surface.shapeOf(g) !== -1 &&
    (Surface.shapeOf(g) === 0 ||
      terrain.getTerrainType(tile) !== TerrainType.shore)
  )
    return g;

  return [high, high, high, high];
};

/**
 * Every tile a building stands on.
 *
 * @returns {number[]}
 */
Surface.footprint = function (building) {
  var data = BuildingData[building.buildingCode],
    x0 = Terrain.extractX(building.tile),
    y0 = Terrain.extractY(building.tile),
    sizeX = Rotation.sizeX(data, building.rotation),
    sizeY = Rotation.sizeY(data, building.rotation),
    tiles = [];

  for (var x = x0; x < x0 + sizeX; x++)
    for (var y = y0; y < y0 + sizeY; y++)
      tiles.push(Terrain.convertToIndex(x, y));

  return tiles;
};

/**
 * The surface a building is put up on: flat, at the highest corner under it.
 * Null for a tree, which grows on the ground as it is; for a road, the one
 * it has on its own (natural).
 */
Surface.of = function (terrain, building) {
  var classCode = BuildingData[building.buildingCode].classCode;

  if (classCode === BuildingClassCode.tree) return null;
  if (classCode === BuildingClassCode.road)
    return Surface.natural(terrain, building.tile);

  var high = -Infinity;

  Surface.footprint(building).forEach(function (tile) {
    high = Math.max.apply(null, [high].concat(Surface.ground(terrain, tile)));
  });

  return [high, high, high, high];
};

/**
 * Whether building's surface fits every tile it stands on (fits) - on
 * terrain, or the ground as a plan would leave it.
 */
Surface.standsOn = function (terrain, building) {
  var surface = building.surface;

  if (surface === null || surface === undefined) return false;

  return Surface.footprint(building).every(function (tile) {
    return Surface.fits(terrain, tile, surface);
  });
};

namespace("Isometrica.Core").Surface = Surface;

/**
 * Whether a road with surface a joins one with surface b next to it at side
 * (core/roadrules).
 */
Surface.meets = RoadRules.meets;

export default Surface;
