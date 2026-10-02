/**
 * The blocks of flats put together out of parts the game paints (see
 * shared/gen/flats and client/compoundbuilding): a tower of one section or a
 * wall of two, with or without a yard in front, two or three storeys high -
 * each of those a building of its own in the catalogue. What a block looks
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
//layout before one layout runs into the next. cells, how many sections side
//by side; yard, whether there is a row of yard in front
var LAYOUTS = {
  tower: { cells: 1, yard: false, name: "tower" },
  toweryard: { cells: 1, yard: true, name: "tower with a yard" },
  wall: { cells: 2, yard: false, name: "block" },
  wallyard: { cells: 2, yard: true, name: "block with a yard" },
};

var ORDER = ["tower", "toweryard", "wall", "wallyard"];

var STOREYS = [2, 3];

//what the catalogue offers: the blocks with a yard, three storeys high. The
//others stay buildable from a save that has them, and are not offered any
//more
var OFFERED = { toweryard: [3], wallyard: [3] };

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
        sizeY: l.yard ? 2 : 1,
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
          //a yard costs what a storey of the block it is in front of does
          money: capacity * 1000 + (l.yard ? l.cells * PER_STOREY * 1000 : 0),
        },
        name: storeys + "-storey " + l.name,
        hidden: (OFFERED[layout] || []).indexOf(storeys) === -1,
        //drawn out of parts, see client/compoundbuilding
        compound: {
          gen: "flats",
          layout: layout,
          cells: l.cells,
          yard: l.yard,
          storeys: storeys,
        },
      };
    });
  });

  return out;
}

export default { LAYOUTS: LAYOUTS, code: code, buildings: buildings };
