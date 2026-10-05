/**
 * The office blocks put together out of parts the game paints (see
 * shared/gen/offices and client/compoundbuilding): a tower of one section, a
 * wall of two or three, right on the street or behind a car park and a plaza
 * - a row of them, or two in front of the taller ones. What
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

//cells: how many sections side by side; yards: what is in front of them, as
//many rows of it as rows says. The first two keep the codes they were given
//by their sections and storeys, the rest are numbered by their footprint
var BLOCKS = [
  {
    code: 1130,
    layout: "officetower",
    cells: 1,
    rows: 1,
    storeys: 3,
    yards: ["parking"],
    name: "office tower",
  },
  {
    code: 1240,
    layout: "officeblock",
    cells: 2,
    rows: 1,
    storeys: 4,
    yards: ["parking", "plaza"],
    name: "office block",
  },
  {
    code: 2204,
    layout: "officefront",
    cells: 2,
    rows: 0,
    storeys: 4,
    name: "office block on the street",
  },
  {
    code: 2304,
    layout: "officerow",
    cells: 3,
    rows: 0,
    storeys: 4,
    name: "office row",
  },
  {
    code: 2126,
    layout: "officespire",
    cells: 1,
    rows: 2,
    storeys: 6,
    yards: ["plaza", "parking"],
    name: "office tower with a plaza",
  },
  {
    code: 2226,
    layout: "officetwin",
    cells: 2,
    rows: 2,
    storeys: 6,
    yards: ["plaza", "parking"],
    name: "office towers",
  },
  {
    code: 2315,
    layout: "officewide",
    cells: 3,
    rows: 1,
    storeys: 5,
    yards: ["parking", "plaza"],
    name: "office headquarters",
  },
];

function code(block) {
  return block.code;
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
      sizeY: 1 + block.rows,
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
      //drawn out of parts, see client/compoundbuilding
      compound: {
        gen: "offices",
        layout: block.layout,
        cells: block.cells,
        yard: block.rows > 0,
        yardRows: block.rows,
        yards: block.yards,
        storeys: block.storeys,
      },
    };
  });

  return out;
}

export default { code: code, buildings: buildings };
