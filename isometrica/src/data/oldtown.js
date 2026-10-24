/**
 * The old town (see shared/gen/oldtown and client/compoundbuilding): one to a
 * footprint in the catalogue, each put down as any of the designs there are
 * for it - a lane of craftsmen, a yard with its smithy, a market square, a
 * church, a quarter, and on three tiles by three all of it at once.
 *
 * It is what a village trades in from the first day: it needs no water and no
 * street to it - only to stand with the village, as everything does
 * (core/city/cityroads); gravel laid next to it is cobbled, the way its own
 * lanes are (client/road materialAt) - and makes its money with the people
 * who work in it - the cottagers round it, whose houses need no jobs
 * of their own (data/houses). Later on the town keeps it as its old town. Old
 * town next to old town is one town, and one wall goes round all of it
 * (client/compoundbuilding walled).
 *
 * The bigger it is, the more it makes for every tile it covers:
 *
 *                      cost   jobs   money   money   payback
 *                                            /tile
 *  lane, 1x2           6000    10      80      40       75
 *  street, 1x3         9500    16     126      42       75
 *  square, 2x2        13000    22     176      44       74
 *  quarter, 2x3       20000    34     270      45       74
 *  centre, 3x3        31000    52     414      46       75
 */
import BuildingClassCode from "./classcode";

//over the trees' codes (data/trees)
var BASE = 7000;

var TOWNS = [
  { footprint: "1x2", name: "old town lane", jobs: 10, money: 80, cost: 6000 },
  {
    footprint: "1x3",
    name: "old town street",
    jobs: 16,
    money: 126,
    cost: 9500,
  },
  {
    footprint: "2x2",
    name: "old town square",
    jobs: 22,
    money: 176,
    cost: 13000,
  },
  {
    footprint: "2x3",
    name: "old town quarter",
    jobs: 34,
    money: 270,
    cost: 20000,
  },
  {
    footprint: "3x3",
    name: "old town centre",
    jobs: 52,
    money: 414,
    cost: 31000,
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
      //nothing - a well in the square, its own lanes - but to stand with
      //the village
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
