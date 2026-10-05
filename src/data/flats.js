/**
 * The blocks of flats put together out of parts the game paints (see
 * shared/gen/flats and client/compoundbuilding): a tower of one section, a
 * wall of two or three, with no yard, a row of yard in front or two - two to
 * four storeys high - each of those a building of its own in the catalogue.
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
//offices' codes. cells, how many sections side by side; yards, how many rows
//of yard there are in front
var LAYOUTS = {
  tower: { cells: 1, yards: 0, name: "tower" },
  toweryard: { cells: 1, yards: 1, name: "tower with a yard" },
  wall: { cells: 2, yards: 0, name: "block" },
  wallyard: { cells: 2, yards: 1, name: "block with a yard" },
  row: { cells: 3, yards: 0, name: "long block" },
  rowyard: { cells: 3, yards: 1, name: "long block with a yard" },
  towercourt: { cells: 1, yards: 2, name: "tower with a court" },
  wallcourt: { cells: 2, yards: 2, name: "block with a court" },
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
];

var STOREYS = [2, 3, 4];

//what the catalogue offers - flats for every footprint, as high as there is
//ground round them for: the ones on three tiles or more a storey higher. The
//others stay buildable from a save that has them, and are not offered any
//more
var OFFERED = {
  wall: [3],
  toweryard: [3],
  wallyard: [3],
  row: [3],
  rowyard: [4],
  towercourt: [4],
  wallcourt: [4],
};

//how many live in a section, each storey of it
var PER_STOREY = 8;

function code(layout, storeys) {
  return BASE + ORDER.indexOf(layout) * 100 + storeys * 10;
}

/**
 * Every block there is, as data/buildings has its buildings, by code.
 */
function buildings() {
  var out = {};

  ORDER.forEach(function (layout) {
    var l = LAYOUTS[layout];

    STOREYS.forEach(function (storeys) {
      var capacity = l.cells * storeys * PER_STOREY;

      out[code(layout, storeys)] = {
        sizeX: l.cells,
        sizeY: 1 + l.yards,
        buildingCode: code(layout, storeys),
        classCode: BuildingClassCode.house,
        producing: {},
        demanding: {},
        requires: {
          road: true,
          water: true,
        },
        //flats like the handmade ones: their people's work is what the
        //treasury gets out of them, not their taxes
        taxPerResident: 10,
        citizenCapacity: capacity,
        constructionTime: 50000 + storeys * 25000,
        constructionCost: {
          //a row of yard costs what a storey of the block it is in front
          //of does
          money: capacity * 1000 + l.yards * l.cells * PER_STOREY * 1000,
        },
        name: storeys + "-storey " + l.name,
        hidden: (OFFERED[layout] || []).indexOf(storeys) === -1,
        tier: 3,
        //drawn out of parts, see client/compoundbuilding
        compound: {
          gen: "flats",
          layout: layout,
          cells: l.cells,
          yard: l.yards > 0,
          yardRows: l.yards,
          storeys: storeys,
        },
      };
    });
  });

  return out;
}

export default { LAYOUTS: LAYOUTS, code: code, buildings: buildings };
