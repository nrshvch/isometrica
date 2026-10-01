/**
 * The office blocks put together out of parts the game paints (see
 * shared/gen/offices and client/compoundbuilding): a tower of one section with
 * its car park in front, and a wall of two with a car park and a plaza. What
 * a block looks like, its glass and its roofs, is picked for each one as it
 * goes up.
 *
 * Like the shops, an office block makes its money with the people who work
 * in it, and the more of it there is the more it makes - by the numbers a
 * little better than a mall for every job, on a fraction of the ground.
 */
import BuildingClassCode from "./classcode";

//over the blocks of flats' codes (data/flats)
var BASE = 1000;

//how many work on a storey of a section, and what each of them brings in
var PER_STOREY = 12,
  MONEY_PER_JOB = 7,
  COST_PER_JOB = 700;

//cells: how many sections side by side; yards: what is in front of them
var BLOCKS = [
  {
    layout: "officetower",
    cells: 1,
    storeys: 3,
    yards: ["parking"],
    name: "office tower",
  },
  {
    layout: "officeblock",
    cells: 2,
    storeys: 4,
    yards: ["parking", "plaza"],
    name: "office block",
    //not offered any more; there for a save that has one
    hidden: true,
  },
];

function code(block) {
  return BASE + block.cells * 100 + block.storeys * 10;
}

/**
 * Every office block there is, as data/buildings has its buildings, by code.
 */
function buildings() {
  var out = {};

  BLOCKS.forEach(function (block) {
    var jobs = block.cells * block.storeys * PER_STOREY;

    out[code(block)] = {
      sizeX: block.cells,
      sizeY: 2,
      buildingCode: code(block),
      classCode: BuildingClassCode.commerce,
      producing: {
        money: jobs * MONEY_PER_JOB,
      },
      //it only makes its money with them in
      jobs: jobs,
      demanding: {},
      requires: {
        road: true,
        water: true,
      },
      constructionTime: 60000 + block.storeys * 30000,
      constructionCost: {
        money: jobs * COST_PER_JOB,
      },
      name: block.storeys + "-storey " + block.name,
      hidden: block.hidden === true,
      //drawn out of parts, see client/compoundbuilding
      compound: {
        gen: "offices",
        layout: block.layout,
        cells: block.cells,
        yard: true,
        yards: block.yards,
        storeys: block.storeys,
      },
    };
  });

  return out;
}

export default { code: code, buildings: buildings };
