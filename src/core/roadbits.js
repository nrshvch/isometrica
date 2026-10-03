/**
 * How roads join up and sit on the ground, the way OpenTTD has it
 * (src/road_cmd.cpp: CmdBuildLongRoad, CheckRoadSlope, GetRoadFoundation).
 *
 * Every road tile has its own road bits - which of its four edges the road
 * runs out to, a half of the tile each. A road laid along a line runs along
 * it, and joins every road next to it - which joins it back - as far as each
 * of the two fits its slope; a road already there only ever gains the bit
 * towards the new one (plan).
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
 * What laying road on tiles would do: every tile gets the bits along the
 * line it is laid in - the tiles next to it laid with it - and then joins
 * every road next to it, laid with it or already there, which joins it back;
 * each bit only where it fits the slope of both tiles (fit), so a road on a
 * slope is levelled, a ramp or turned down the way OpenTTD has it. A road
 * already there only ever gains the bit towards the new one.
 *
 * @param terrain {Terrain} core terrain
 * @param tiles {number[]} the tiles laid - a line, maybe turning a corner
 * @param bitsAt {function(number): number|null} the bits of the road already
 *        on a tile, or null for none
 * @returns {Object[]} {tile, bits, existing}: bits as they would be - null
 *          where the road along the line does not fit the slope - and
 *          existing the road's bits before, or null where there is none. The
 *          roads already there next to the line that it joins come after the
 *          tiles laid
 */
export function plan(terrain, tiles, bitsAt) {
  var laid = Object.create(null),
    planned = Object.create(null),
    out = [],
    joined = [];

  tiles.forEach(function (t) {
    laid[t] = true;
  });

  //a tile's bits as the plan has them so far
  function current(t) {
    return planned[t] !== undefined ? planned[t] : bitsAt(t);
  }

  //the bits along the line first, for every tile laid
  tiles.forEach(function (tile) {
    var h = heightsOf(terrain, tile),
      existing = bitsAt(tile),
      line = 0,
      bits;

    for (var i = 0; i < 4; i++) if (laid[tile + OFFSETS[i]]) line |= 1 << i;

    //a single tile with nothing along it: a square of road on the flat, and
    //on a slope a straight road the way it fits
    if (line === 0 && existing === null)
      bits = flat(h) ? 0 : fit(h, X, 0) !== null ? fit(h, X, 0) : fit(h, Y, 0);
    else bits = fit(h, line, existing);

    planned[tile] = bits;
    out.push({ tile: tile, bits: bits, existing: existing });
  });

  //then joined to every road next to it, where that fits both of them
  out.forEach(function (o) {
    if (o.bits === null) return;

    var h = heightsOf(terrain, o.tile);

    for (var i = 0; i < 4; i++) {
      if (o.bits & (1 << i)) continue;

      var next = o.tile + OFFSETS[i],
        theirs = current(next);

      if (theirs === null || theirs === undefined) continue;

      var ours = fit(h, 1 << i, o.bits),
        back = fit(heightsOf(terrain, next), 1 << ((i + 2) % 4), theirs);

      if (ours === null || back === null) continue;

      o.bits = planned[o.tile] = ours;

      if (back !== theirs) {
        planned[next] = back;

        if (!laid[next] && joined.indexOf(next) === -1) joined.push(next);
      }
    }
  });

  //what the tiles laid ended up with, and the roads already there they join
  out.forEach(function (o) {
    if (o.bits !== null) o.bits = planned[o.tile];
  });

  return out.concat(
    joined.map(function (t) {
      return { tile: t, bits: planned[t], existing: bitsAt(t) };
    }),
  );
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
