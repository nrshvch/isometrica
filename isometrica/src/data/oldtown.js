/**
 * The old town in the catalogue, one to a footprint; no water nor street
 * needed, gravel next to it cobbled.
 * See isometrica/.claude/skills/generators/buildings.md (The old town).
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
