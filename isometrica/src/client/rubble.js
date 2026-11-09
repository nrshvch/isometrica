import Core from "../core/main";
import BuildingCode from "../data/buildingcode";

/**
 * The heaps of rubble a building blown up leaves (data/buildings rubble,
 * core/city explode), drawn as one pile where they lie next to each other:
 * each tile's heap runs on into the heaps along its sides, and where four
 * meet at a corner, over it too (shared/gen/stones pile) - which it does is
 * its mask, as the tiles round it are now. A heap the bulldozers are still
 * to get to is there still (client/buildman held).
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
 * Which of the tiles round tile have a heap of rubble on as well, as a
 * pile's mask has them (shared/gen/stones masks): "1" for a side that has,
 * and for a corner that has where both its sides have too.
 *
 * @param root {Vkaria}
 * @param tile {number}
 * @returns {string} eight of "0" and "1"
 */
function maskOf(root, tile) {
  function has(d) {
    var t = tile + d[0] + d[1] * Terrain.dy;

    return (
      isRubble(root.core.buildingService.get(t)) ||
      isRubble(root.buildman.held[t])
    );
  }

  var sides = SIDES.map(function (d) {
      return has(d) ? 1 : 0;
    }),
    corners = CORNERS.map(function (d, k) {
      return sides[k] && sides[(k + 1) % 4] && has(d) ? 1 : 0;
    });

  return sides.join("") + corners.join("");
}

/**
 * The picture of the heap on tile, of the rubble it is (stones' "rubble" or
 * "rubble0"), seen with the camera turned so many times.
 *
 * @returns {string}
 */
function pictureOf(root, tile, rubble, turns) {
  return (
    "gen/scenery/pile/" +
    rubble +
    "/" +
    maskOf(root, tile) +
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
  pictureOf: pictureOf,
  around: around,
};
