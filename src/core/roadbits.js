/**
 * How roads join up and sit on the ground, the way OpenTTD has it
 * (src/road_cmd.cpp: CmdBuildLongRoad, CheckRoadSlope, GetRoadFoundation).
 *
 * Every road tile has its own road bits - which of its four edges the road
 * runs out to, a half of the tile each - and they are only ever what was laid
 * there: a road drawn along a line has the bits along it, its ends only the
 * half towards the rest of it unless a road beyond faces back at them. A road
 * laid next to another does not join it by being next to it.
 *
 * The bits are 1 towards -x, 2 towards -y, 4 towards +x and 8 towards +y.
 *
 * On a slope the bits decide how the road sits (foundationOf):
 *
 *   - levelled at the top of the slope on a foundation, wherever every bit
 *     runs out to an edge with a corner at the top;
 *   - otherwise straight: up a slope with two corners side by side up, a
 *     ramp on the ground; over a slope with one corner up, a ramp on an
 *     inclined foundation;
 *   - and nothing else - a half road on a slope that cannot be levelled is
 *     made straight (uphill autocompletion), and if that does not fit either,
 *     no road goes there.
 */
import Terrain from "./terrain";

export var X = 1 | 4,
  Y = 2 | 8,
  ALL = 15;

//the tile beyond each side, as an offset: -x, -y, +x, +y
export var OFFSETS = [-1, -Terrain.dy, 1, Terrain.dy];

//the corners of each side's edge, of A (x, y), B (x + 1, y), C (x, y + 1),
//D (x + 1, y + 1)
var EDGE = [
  [0, 2],
  [0, 1],
  [1, 3],
  [2, 3],
];

/**
 * The same bits the other way round: -x for +x, -y for +y.
 */
export function mirror(bits) {
  return ((bits & 3) << 2) | ((bits >> 2) & 3);
}

/**
 * The heights of the tile's corners: A, B, C, D.
 */
export function heightsOf(terrain, tile) {
  return [
    terrain.getGridPointHeight(tile),
    terrain.getGridPointHeight(tile + 1),
    terrain.getGridPointHeight(tile + Terrain.dy),
    terrain.getGridPointHeight(tile + Terrain.dy + 1),
  ];
}

function top(h) {
  return Math.max(h[0], h[1], h[2], h[3]);
}

function flat(h) {
  return Math.min(h[0], h[1], h[2], h[3]) === top(h);
}

//which corners are at the top
function upCorners(h) {
  var t = top(h),
    out = [];

  h.forEach(function (v, i) {
    if (v === t) out.push(i);
  });

  return out;
}

//every bit runs out to an edge with a corner at the top: the road can be
//levelled there (OpenTTD _invalid_tileh_slopes_road[0])
function levelledFits(h, bits) {
  var t = top(h);

  for (var i = 0; i < 4; i++)
    if (bits & (1 << i) && h[EDGE[i][0]] !== t && h[EDGE[i][1]] !== t)
      return false;

  return true;
}

//a straight road that fits the slope: either way over one corner up, and up
//a slope with two corners side by side up only along it (OpenTTD
//_invalid_tileh_slopes_road[1])
function straightFits(h, bits) {
  if (bits !== X && bits !== Y) return false;

  var up = upCorners(h);

  if (up.length === 1) return true;
  if (up.length !== 2) return false;

  //the edge that is up: along x for one at -x or +x, along y otherwise
  for (var i = 0; i < 4; i++)
    if (EDGE[i][0] === up[0] && EDGE[i][1] === up[1])
      return (i === 0 || i === 2 ? X : Y) === bits;

  //two corners across from each other
  return false;
}

/**
 * The bits a road on a tile with corners h has once pieces are added to
 * existing ones - with a half road on a slope made straight where it has
 * to be - or null where they do not fit the slope (OpenTTD CheckRoadSlope).
 *
 * @param h {number[]} the corners' heights, heightsOf
 */
export function fit(h, pieces, existing) {
  existing = existing || 0;
  pieces &= ~existing;

  if (pieces === 0) return existing;
  if (flat(h)) return existing | pieces;
  //steeper than a step: no road
  if (top(h) - Math.min(h[0], h[1], h[2], h[3]) > 1) return null;

  if (levelledFits(h, existing | pieces)) return existing | pieces;

  //uphill autocompletion
  pieces |= mirror(pieces);

  var bits = existing | pieces;

  return straightFits(h, bits) ? bits : null;
}

/**
 * How a road with these bits sits on a tile with corners h (OpenTTD
 * GetRoadFoundation): "none" - on the ground, flat or a ramp up its slope -
 * "levelled" at the top of the slope, or "inclined" - a ramp on a
 * foundation over a slope with one corner up.
 */
export function foundationOf(h, bits) {
  if (flat(h) || bits === 0) return "none";
  if (levelledFits(h, bits)) return "levelled";
  if (upCorners(h).length !== 1 && straightFits(h, bits)) return "none";

  return "inclined";
}

//which way a ramp goes up, by the edge at the top: towards -y, -x, +y, +x
//are ramps 1, 2, 3, 4 (shared/gen/roads RAMPS)
var RAMP_OF_SIDE = [2, 1, 4, 3];

/**
 * What the road on a tile with corners h and these bits is drawn as: 0 for
 * flat - on flat ground, or levelled - or the ramp, 1..4.
 */
export function shapeOf(h, bits) {
  var f = foundationOf(h, bits);

  if (f === "levelled" || flat(h) || bits === 0) return 0;

  var up = upCorners(h),
    i;

  if (f === "none") {
    //up a slope: towards the edge that is up
    for (i = 0; i < 4; i++)
      if (EDGE[i][0] === up[0] && EDGE[i][1] === up[1]) return RAMP_OF_SIDE[i];

    return 0;
  }

  //on an inclined foundation: along the road, up towards the end of it
  //whose edge has the corner that is up
  var sides = bits === X ? [0, 2] : [1, 3];

  for (i = 0; i < 2; i++)
    if (EDGE[sides[i]].indexOf(up[0]) !== -1) return RAMP_OF_SIDE[sides[i]];

  return 0;
}

/**
 * What laying road on tiles would do (OpenTTD CmdBuildLongRoad): every tile
 * gets the bits towards the tiles next to it that are laid with it - its
 * ends only the half towards the rest, unless a road beyond faces back at
 * them - added to whatever bits a road already there has; a single tile
 * joins whatever roads round it face it. Each tile's bits as they would be,
 * or null where they do not fit its slope.
 *
 * @param terrain {Terrain} core terrain
 * @param tiles {number[]} the tiles laid - a line, maybe turning a corner
 * @param bitsAt {function(number): number|null} the bits of the road already
 *        on a tile, or null for none
 * @returns {Object[]} {tile, bits, existing}: existing is the road's bits
 *          before, or null where there is none
 */
export function plan(terrain, tiles, bitsAt) {
  var laid = Object.create(null);

  tiles.forEach(function (t) {
    laid[t] = true;
  });

  //whether the road on the tile beyond tile at side faces back at it
  function facesBack(tile, side) {
    var other = bitsAt(tile + OFFSETS[side]);

    return other !== null && (other & (1 << ((side + 2) % 4))) !== 0;
  }

  return tiles.map(function (tile) {
    var pieces = 0,
      along = 0,
      i;

    for (i = 0; i < 4; i++)
      if (laid[tile + OFFSETS[i]]) {
        pieces |= 1 << i;
        along++;
      }

    //an end: on to the road beyond it, if that faces back at it
    if (along === 1) {
      i = [1, 2, 4, 8].indexOf(pieces);
      if (facesBack(tile, (i + 2) % 4)) pieces |= 1 << ((i + 2) % 4);
    } else if (tiles.length === 1)
      for (i = 0; i < 4; i++) if (facesBack(tile, i)) pieces |= 1 << i;

    var existing = bitsAt(tile),
      h = heightsOf(terrain, tile),
      bits;

    //a single tile with nothing to join: a square of road on the flat, and
    //on a slope a straight road the way it fits
    if (pieces === 0 && existing === null)
      bits = flat(h) ? 0 : fit(h, X, 0) !== null ? fit(h, X, 0) : fit(h, Y, 0);
    else bits = fit(h, pieces, existing);

    return { tile: tile, bits: bits, existing: existing };
  });
}

/**
 * The bits for a road that has none of its own yet - one from a save made
 * before roads had them: towards every road next to it, as far as they fit
 * its slope.
 *
 * @param isRoad {function(number): boolean}
 */
export function guess(terrain, tile, isRoad) {
  var h = heightsOf(terrain, tile),
    pieces = 0,
    i,
    bits;

  for (i = 0; i < 4; i++) if (isRoad(tile + OFFSETS[i])) pieces |= 1 << i;

  bits = fit(h, pieces, 0);
  if (bits !== null) return bits;

  //as much of it as can be levelled, or a straight road the way it fits
  var level = 0;

  for (i = 0; i < 4; i++)
    if (pieces & (1 << i) && levelledFits(h, 1 << i)) level |= 1 << i;

  if (level !== 0) return level;

  return fit(h, X, 0) !== null ? fit(h, X, 0) : fit(h, Y, 0) || 0;
}
