import Core from "../core/main";
import BuildingCode from "../data/buildingcode";

/**
 * The heaps of rubble a building blown up leaves (data/buildings rubble,
 * core/city explode), drawn as one pile: each tile's heap runs on into the
 * heaps of the same pile along its sides - what the same building left, not
 * what one next to it did, blown up as well - and where four meet at a
 * corner, over it too (shared/gen/stones pile). Which it does is its mask,
 * as the tiles round it are now. A heap the bulldozers are still to get to
 * is there still (client/buildman held). It lies on the ground as it is, not
 * levelled - its picture the one for its tile's slope, drawn from the
 * lowest corner of it - so that heaps on a hillside run on into each other
 * as they do on the flat.
 */

var Terrain = Core.Terrain;

//the tiles round a tile, as a pile's mask has them: its sides, -x, -y, +x,
//+y, then its corners, -x-y, +x-y, +x+y, -x+y - corner k between sides k
//and k + 1
var SIDES = [
    [-1, 0],
    [0, -1],
    [1, 0],
    [0, 1],
  ],
  CORNERS = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];

/**
 * Whether a building is a heap of rubble - the core's, or the client's.
 */
function isRubble(building) {
  var data = building && (building.staticData || building.data);

  return !!data && data.variantOf === BuildingCode.rubble;
}

/**
 * The pile a heap of rubble is of (core/city/citybuildings leaveRubble) -
 * the core's heap, or the client's - or undefined, for none, or one left
 * before heaps were told apart.
 */
function pileOf(building) {
  var model = building && building.staticData ? building.data : building,
    look = model && model.look;

  return look ? look.pile : undefined;
}

//the heap of rubble on tile, if there is one: in the world, or still to be
//pushed off by a bulldozer
function heapOn(root, tile) {
  var b = root.core.buildingService.get(tile);

  if (isRubble(b)) return b;

  b = root.buildman.held[tile];

  return isRubble(b) ? b : null;
}

/**
 * Which of the tiles round tile have a heap of the same pile of rubble on,
 * as a pile's mask has them (shared/gen/stones masks): "1" for a side that
 * has, and for a corner that has where both its sides have too.
 *
 * @param root {Vkaria}
 * @param tile {number}
 * @returns {string} eight of "0" and "1"
 */
function maskOf(root, tile) {
  var own = heapOn(root, tile),
    pile = pileOf(own);

  function has(d) {
    var next = heapOn(root, tile + d[0] + d[1] * Terrain.dy);

    return next !== null && pileOf(next) === pile;
  }

  var sides = SIDES.map(function (d) {
      return has(d) ? 1 : 0;
    }),
    corners = CORNERS.map(function (d, k) {
      return sides[k] && sides[(k + 1) % 4] && has(d) ? 1 : 0;
    });

  return sides.join("") + corners.join("");
}

//the heights of tile's corners - x, y; x + 1, y; x, y + 1; x + 1, y + 1 -
//in steps of the ground
function cornersOf(root, tile) {
  var terrain = root.core.terrain;

  return [tile, tile + 1, tile + Terrain.dy, tile + Terrain.dy + 1].map(
    function (p) {
      return terrain.getGridPointHeight(p);
    },
  );
}

/**
 * The slope of tile as a pile's picture is named by it (shared/gen/stones
 * slopes): how many steps over its lowest corner each of its corners is.
 *
 * @returns {string} "0000", "1100"...
 */
function slopeOf(root, tile) {
  var z = cornersOf(root, tile),
    low = Math.min.apply(null, z);

  return z
    .map(function (h) {
      return Math.max(0, Math.min(2, h - low));
    })
    .join("");
}

/**
 * How far below the highest corner of tile - where what stands on a tile is
 * drawn from (client/buildingview drawnAt) - its lowest one is, steps: where
 * a pile's picture is drawn from.
 */
function dropOf(root, tile) {
  var z = cornersOf(root, tile);

  return Math.max.apply(null, z) - Math.min.apply(null, z);
}

/**
 * The picture of the heap on tile, of the rubble it is (stones' "rubble"),
 * on its tile's slope, seen with the camera turned so many times.
 *
 * @returns {string}
 */
function pictureOf(root, tile, rubble, turns) {
  return (
    "gen/scenery/pile/" +
    rubble +
    "/" +
    maskOf(root, tile) +
    "/" +
    slopeOf(root, tile) +
    (turns & 3 ? "/r" + (turns & 3) : "")
  );
}

/**
 * The tiles round tiles - sides and corners - that are none of them.
 *
 * @param tiles {number[]}
 * @returns {number[]}
 */
function around(tiles) {
  var on = {},
    out = [];

  tiles.forEach(function (t) {
    on[t] = true;
  });

  tiles.forEach(function (t) {
    SIDES.concat(CORNERS).forEach(function (d) {
      var n = t + d[0] + d[1] * Terrain.dy;

      if (on[n] !== true) {
        on[n] = true;
        out.push(n);
      }
    });
  });

  return out;
}

export default {
  isRubble: isRubble,
  maskOf: maskOf,
  slopeOf: slopeOf,
  dropOf: dropOf,
  pictureOf: pictureOf,
  around: around,
};
