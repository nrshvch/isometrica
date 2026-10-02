/**
 * The parks put together out of parts the game paints (see shared/gen/parks
 * and client/compoundbuilding): one to a footprint in the catalogue, and
 * each laid out as any of the kinds of park there are, at random - courts
 * and a skate spot, a formal garden, or a town park with trees and a pond.
 *
 * A park earns nothing and needs nothing - no road, no water - so it can go
 * anywhere from the start: the town keeps it up.
 */
import BuildingClassCode from "./classcode";

//over the houses' codes (data/houses)
var BASE = 5000;

var PARKS = [
  { footprint: "1x1", name: "pocket park", cost: 1500, upkeep: 5 },
  { footprint: "1x2", name: "park", cost: 3000, upkeep: 10 },
  { footprint: "1x3", name: "long park", cost: 4500, upkeep: 15 },
  { footprint: "2x2", name: "town park", cost: 6000, upkeep: 20 },
  { footprint: "2x3", name: "city park", cost: 9000, upkeep: 30 },
];

function code(park) {
  var size = park.footprint.split("x").map(Number);

  return BASE + size[0] * 10 + size[1];
}

/**
 * Every park there is, as data/buildings has its buildings, by code.
 */
function buildings() {
  var out = {};

  PARKS.forEach(function (park) {
    var size = park.footprint.split("x").map(Number);

    out[code(park)] = {
      sizeX: size[0],
      sizeY: size[1],
      buildingCode: code(park),
      classCode: BuildingClassCode.municipal,
      producing: {},
      demanding: {
        money: park.upkeep,
      },
      constructionTime: 20000 + 10000 * size[0] * size[1],
      constructionCost: {
        money: park.cost,
      },
      name: park.name,
      //drawn out of parts, see client/compoundbuilding
      compound: {
        gen: "parks",
        footprint: park.footprint,
        sizeX: size[0],
        sizeY: size[1],
      },
    };
  });

  return out;
}

export default { code: code, buildings: buildings };
