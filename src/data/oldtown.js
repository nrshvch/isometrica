/**
 * The old town (see shared/gen/oldtown and client/compoundbuilding): one to a
 * footprint in the catalogue, each put down as any of the designs there are
 * for it - a lane of craftsmen, a yard with its smithy, a market square, a
 * church, a quarter, and on three tiles by three all of it at once.
 *
 * It is what a village trades in from the first day: it needs no road and no
 * water, and makes its money with the people who work in it - the cottagers
 * round it, whose houses need no jobs of their own (data/houses). Later on
 * the town keeps it as its old town. Old town next to old town is one town,
 * and one wall goes round all of it (client/compoundbuilding walled).
 *
 *                      cost   jobs   money   money   payback
 *                                            /tile
 *  lane, 1x2           6000    10      80      40       75
 *  street, 1x3         9000    15     120      40       75
 *  square, 2x2        12500    20     170      43       74
 *  quarter, 2x3       18500    30     255      43       73
 *  centre, 3x3        28000    45     400      44       70
 */
import BuildingClassCode from "./classcode";

//over the trees' codes (data/trees)
var BASE = 7000;

var TOWNS = [
  { footprint: "1x2", name: "old town lane", jobs: 10, money: 80, cost: 6000 },
  {
    footprint: "1x3",
    name: "old town street",
    jobs: 15,
    money: 120,
    cost: 9000,
  },
  {
    footprint: "2x2",
    name: "old town square",
    jobs: 20,
    money: 170,
    cost: 12500,
  },
  {
    footprint: "2x3",
    name: "old town quarter",
    jobs: 30,
    money: 255,
    cost: 18500,
  },
  {
    footprint: "3x3",
    name: "old town centre",
    jobs: 45,
    money: 400,
    cost: 28000,
  },
];

function code(town) {
  var size = town.footprint.split("x").map(Number);

  return BASE + size[0] * 10 + size[1];
}

/**
 * Every old town there is, as data/buildings has its buildings, by code.
 */
function buildings() {
  var out = {};

  TOWNS.forEach(function (town) {
    var size = town.footprint.split("x").map(Number);

    out[code(town)] = {
      sizeX: size[0],
      sizeY: size[1],
      buildingCode: code(town),
      classCode: BuildingClassCode.commerce,
      producing: {
        money: town.money,
      },
      //it only makes its money with them in
      jobs: town.jobs,
      demanding: {},
      //what a village has from the start: no road, no water
      requires: {},
      constructionTime: 40000 + 15000 * size[0] * size[1],
      constructionCost: {
        money: town.cost,
      },
      name: town.name,
      //the commerce a game starts with, before the shops' tiers
      tier: 0,
      //drawn out of parts, see client/compoundbuilding
      compound: {
        gen: "oldtown",
        footprint: town.footprint,
        sizeX: size[0],
        sizeY: size[1],
      },
    };
  });

  return out;
}

export default { code: code, buildings: buildings };
