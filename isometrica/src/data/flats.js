/**
 * The blocks of flats put together out of parts the game paints (see
 * shared/gen/flats and client/compoundbuilding): a tower of one section, a
 * wall of two or three, with no yard, a row of yard in front or two - or a
 * tower on the street with a yard or two beside it - two to four storeys
 * high - each of those a building of its own in the catalogue.
 * The town's housing at its densest: a lot of people on little ground, paying
 * little each. What a block looks
 * like, its colours and details, is picked for each one as it goes up.
 *
 * A block's code comes from what the block is - its layout and how many
 * storeys it has - and not from where it is listed here, so that cities built
 * out of them keep loading whatever is added later.
 */
import BuildingClassCode from "./classcode";

//the handmade codes in data/buildingcode stop well below this
var BASE = 100;

//a layout is worth 100 and a storey 10: room for nine storeys of each
//layout before one layout runs into the next, and nine layouts before the
//offices' codes - those after that numbered from a base of their own, past
//the old town's codes. cells, how many sections side by side; yards, how
//many rows of yard there are in front; sides, how many tiles of yard there
//are beside them
var LAYOUTS = {
  tower: { cells: 1, yards: 0, name: "tower" },
  toweryard: { cells: 1, yards: 1, name: "tower with a yard" },
  wall: { cells: 2, yards: 0, name: "block" },
  wallyard: { cells: 2, yards: 1, name: "block with a yard" },
  row: { cells: 3, yards: 0, name: "long block" },
  rowyard: { cells: 3, yards: 1, name: "long block with a yard" },
  towercourt: { cells: 1, yards: 2, name: "tower with a court" },
  wallcourt: { cells: 2, yards: 2, name: "block with a court" },
  towerside: {
    cells: 1,
    yards: 0,
    sides: 1,
    base: 8000,
    name: "tower with a yard beside it",
  },
  towersides: {
    cells: 1,
    yards: 0,
    sides: 2,
    base: 8100,
    name: "tower with yards beside it",
  },
};

var ORDER = [
  "tower",
  "toweryard",
  "wall",
  "wallyard",
  "row",
  "rowyard",
  "towercourt",
  "wallcourt",
  "towerside",
  "towersides",
];

var STOREYS = [2, 3, 4];

//what the catalogue offers - flats for every footprint, as high as there is
//ground round them for: the ones on three tiles or more a storey higher. The
//others stay buildable from a save that has them, and are not offered any
//more
var OFFERED = {
  toweryard: [3],
  wallyard: [3],
  rowyard: [4],
  towercourt: [4],
  wallcourt: [4],
  towerside: [3],
  towersides: [3],
};

//what was offered once and is not any more, for what took its place: kept,
//hidden, only for the cities that have them, till the saves are rid of them
var DEPRECATED = {
  wall: { 3: "towerside" },
  row: { 3: "towersides" },
};

//how many live in a block and what it costs by how many tiles it covers -
//[heads, cost] - however high it is and whatever is round it: the blocks on
//the same ground are the same flats laid out another way, and the more
//ground, the more of them on every tile of it, for a little more a head
//
//   tiles  heads    cost   heads  cost
//                          /tile  /head
//     1      11    15000    11    1364
//     2      24    32000    12    1333
//     3      38    52000    12.7  1368
//     4      52    72000    13    1385
//     6      82   116000    13.7  1415
var BY_TILES = {
  1: [11, 15000],
  2: [24, 32000],
  3: [38, 52000],
  4: [52, 72000],
  6: [82, 116000],
};

function code(layout, storeys) {
  var base = LAYOUTS[layout].base;

  return (
    (base !== undefined ? base : BASE + ORDER.indexOf(layout) * 100) +
    storeys * 10
  );
}

/**
 * Every block there is, as data/buildings has its buildings, by code.
 */
function buildings() {
  var out = {};

  ORDER.forEach(function (layout) {
    var l = LAYOUTS[layout];

    STOREYS.forEach(function (storeys) {
      var sides = l.sides || 0,
        numbers = BY_TILES[(l.cells + sides) * (1 + l.yards)],
        replaced = (DEPRECATED[layout] || {})[storeys],
        data;

      data = out[code(layout, storeys)] = {
        sizeX: l.cells + sides,
        sizeY: 1 + l.yards,
        buildingCode: code(layout, storeys),
        classCode: BuildingClassCode.house,
        producing: {},
        demanding: {},
        //a cobbled street at least, and the mains
        requires: {
          road: "cobble",
          water: true,
        },
        //flats like the handmade ones: their people's work is what the
        //treasury gets out of them, not their taxes
        taxPerResident: 10,
        citizenCapacity: numbers[0],
        constructionTime: 50000 + storeys * 25000,
        constructionCost: {
          money: numbers[1],
        },
        name: storeys + "-storey " + l.name,
        hidden: (OFFERED[layout] || []).indexOf(storeys) === -1,
        //the top tier of housing, with the villas (data/houses)
        tier: 3,
        //drawn out of parts, see client/compoundbuilding
        compound: {
          gen: "flats",
          layout: layout,
          cells: l.cells,
          yard: l.yards > 0,
          yardRows: l.yards,
          sides: sides,
          storeys: storeys,
        },
      };

      if (replaced !== undefined) {
        data.deprecated = true;
        data.replacedBy = code(replaced, storeys);
      }
    });
  });

  return out;
}

export default { LAYOUTS: LAYOUTS, code: code, buildings: buildings };
