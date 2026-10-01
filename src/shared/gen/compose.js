/**
 * A whole building in one, put together out of parts of any of the
 * generators that paint parts - the blocks' own (shared/gen/flats, offices)
 * and the building sites' (shared/gen/sites) side by side - every box of it
 * in place: to look at, and to hold the parts against. What the game draws
 * out of the parts, tile by tile (client/compoundbuilding), has to come out
 * the same as this painted whole.
 */
import * as iso from "./isobox.js";
import * as Flats from "./flats.js";
import * as Offices from "./offices.js";
import * as Sites from "./sites.js";
import { lifts, kindOf } from "./stacking.js";

var TILE = iso.TILE;

//the generators of parts, by what their parts' names start with
var GENERATORS = { flats: Flats, offices: Offices, sites: Sites };

/**
 * The boxes of a part by its name without its turn - "sites/mast" - as it is
 * painted.
 */
export function partBoxes(key) {
  var g = GENERATORS[key.split("/")[0]];

  if (g === undefined) throw new Error("no such part: " + key);

  return g.partBoxes(key);
}

/**
 * @param plan {Object[]} what stands on each tile: {x, y, parts}, x along
 *        the wall, y from the front, parts the names of what is laid there
 *        bottom first, without their turns
 * @param sizeX {number}
 * @param sizeY {number}
 * @param turns {number}
 */
export function model(plan, sizeX, sizeY, turns) {
  var b = [];

  plan.forEach(function (tile) {
    var up = lifts(tile.parts.map(kindOf), Sites.STOREY);

    tile.parts.forEach(function (key, i) {
      partBoxes(key).forEach(function (c) {
        b.push(
          iso.box(
            c.x0 + tile.x * TILE,
            c.x1 + tile.x * TILE,
            c.y0 + tile.y * TILE,
            c.y1 + tile.y * TILE,
            c.z0 + up[i],
            c.z1 + up[i],
            c.color,
            c.finish,
          ),
        );
      });
    });
  });

  return iso.rotate(b, sizeX, sizeY, turns);
}
