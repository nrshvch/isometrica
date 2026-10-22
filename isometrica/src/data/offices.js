/**
 * The office blocks put together out of parts the game paints (see
 * shared/gen/offices and client/compoundbuilding): a tower of one section, a
 * wall of two or three, right on the street or behind a car park and a plaza
 * - a row of them, or two in front of the taller ones - or a tower on the
 * street with a car park or a plaza beside it, or one either side. What
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

//what each of them that work in it brings in
var MONEY_PER_JOB = 7;

//how many work in a block and what it costs by how many tiles it covers -
//[jobs, cost] - however high it is and whatever is round it: the blocks on
//the same ground are the same offices laid out another way, and the more
//ground, the more jobs on every tile of it, for a little more a job
//
//   tiles  jobs    cost   money   payback
//                         /tile
//     2     44    31000    154      101
//     3     70    50000    163      102
//     4     96    69000    168      103
//     6    150   108000    175      103
var BY_TILES = {
  2: [44, 31000],
  3: [70, 50000],
  4: [96, 69000],
  6: [150, 108000],
};

//cells: how many sections side by side; yards: what is in front of them, as
//many rows of it as rows says, and beside them, as many tiles of it as sides
//says. The first two keep the codes they were given by their sections and
//storeys, the rest are numbered by their footprint - a tower with yards
//beside it from 2500, by how wide it is and its storeys. Those replacedBy
//another are no longer offered: deprecated, kept hidden only for the cities
//that have them, till the saves are rid of them
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
    replacedBy: 2524,
  },
  {
    code: 2304,
    layout: "officerow",
    cells: 3,
    rows: 0,
    storeys: 4,
    name: "office row",
    replacedBy: 2534,
  },
  {
    code: 2524,
    layout: "officeside",
    cells: 1,
    rows: 0,
    sides: 1,
    storeys: 4,
    yards: ["parking", "plaza"],
    name: "office tower with a yard beside it",
  },
  {
    code: 2534,
    layout: "officesides",
    cells: 1,
    rows: 0,
    sides: 2,
    storeys: 4,
    yards: ["parking", "plaza"],
    name: "office tower with yards beside it",
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
    var sides = block.sides || 0,
      numbers = BY_TILES[(block.cells + sides) * (1 + block.rows)],
      jobs = numbers[0],
      data;

    data = out[code(block)] = {
      sizeX: block.cells + sides,
      sizeY: 1 + block.rows,
      buildingCode: code(block),
      classCode: BuildingClassCode.commerce,
      producing: {
        money: jobs * MONEY_PER_JOB,
      },
      //it only makes its money with them in
      jobs: jobs,
      demanding: {},
      //a cobbled street at least, and the mains
      requires: {
        road: "cobble",
        water: true,
      },
      constructionTime: 60000 + block.storeys * 30000,
      constructionCost: {
        money: numbers[1],
      },
      name: block.storeys + "-storey " + block.name,
      //the top tier of commerce, with the farmers' markets (data/shops)
      tier: 3,
      //drawn out of parts, see client/compoundbuilding
      compound: {
        gen: "offices",
        layout: block.layout,
        cells: block.cells,
        yard: block.rows > 0,
        yardRows: block.rows,
        yards: block.yards,
        sides: sides,
        storeys: block.storeys,
      },
    };

    if (block.replacedBy !== undefined) {
      data.hidden = true;
      data.deprecated = true;
      data.replacedBy = block.replacedBy;
    }
  });

  return out;
}

export default { code: code, buildings: buildings };
