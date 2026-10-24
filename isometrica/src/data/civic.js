/**
 * The town's own buildings, put together out of parts the game paints (see
 * shared/gen/civic and client/compoundbuilding): a church and a town hall,
 * each on a tile across and two deep, end on to the street - and the town
 * hall along it too, on two across and one deep - and a square on one tile to fill a gap between the roads with - each put down as any of
 * the ones there are of it, at random.
 *
 * Like a park they earn nothing - the town keeps them up - but the church and
 * the town hall have people working in them, and unlike one they want a
 * cobbled street to them at least (core/roadrules serves). A square wants
 * only to stand with the town, as a park does, and squares side by side make
 * a bigger one: what stands round them is on whatever street they open onto
 * (core/city/cityroads reaches).
 */
import BuildingClassCode from "./classcode";

//over the flats' new layouts (data/flats)
var BASE = 9000;

//kind: which of them - a hundred each, its footprint within that
var CIVIC = [
  {
    kind: 0,
    footprint: "square",
    size: [1, 1],
    name: "town square",
    cost: 1200,
    upkeep: 3,
    time: 20000,
    requires: { linked: true },
    plaza: true,
  },
  {
    kind: 1,
    footprint: "church",
    size: [1, 2],
    name: "church",
    cost: 15000,
    upkeep: 25,
    jobs: 2,
    time: 120000,
    requires: { road: "cobble" },
  },
  {
    kind: 2,
    footprint: "townhall",
    size: [1, 2],
    name: "town hall",
    cost: 30000,
    upkeep: 60,
    jobs: 14,
    time: 150000,
    requires: { road: "cobble", water: true },
    townHall: true,
  },
  {
    kind: 2,
    footprint: "townhall-wide",
    size: [2, 1],
    name: "town hall along the street",
    cost: 30000,
    upkeep: 60,
    jobs: 14,
    time: 150000,
    requires: { road: "cobble", water: true },
    townHall: true,
  },
];

function code(civic) {
  return BASE + civic.kind * 100 + civic.size[0] * 10 + civic.size[1];
}

/**
 * Every one there is, as data/buildings has its buildings, by code.
 */
function buildings() {
  var out = {};

  CIVIC.forEach(function (civic) {
    var data = {
      sizeX: civic.size[0],
      sizeY: civic.size[1],
      buildingCode: code(civic),
      classCode: BuildingClassCode.municipal,
      producing: {},
      demanding: {
        money: civic.upkeep,
      },
      requires: civic.requires,
      constructionTime: civic.time,
      constructionCost: {
        money: civic.cost,
      },
      name: civic.name,
      //drawn out of parts, see client/compoundbuilding
      compound: {
        gen: "civic",
        footprint: civic.footprint,
        sizeX: civic.size[0],
        sizeY: civic.size[1],
      },
    };

    if (civic.jobs) data.jobs = civic.jobs;
    //where the city is: its part of the roads, and its middle (core/city/
    //cityroads)
    if (civic.townHall) data.townHall = true;
    //a square passes on the street it opens onto (core/city/cityroads)
    if (civic.plaza) data.plaza = true;

    out[data.buildingCode] = data;
  });

  return out;
}

export default { code: code, buildings: buildings };
