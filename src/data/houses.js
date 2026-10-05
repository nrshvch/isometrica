/**
 * The houses put together out of parts the game paints (see shared/gen/houses
 * and client/compoundbuilding): one to a kind and footprint in the catalogue,
 * and each put down as any of the houses there are of that kind for that
 * footprint, at random - so a street of them is not the same house over and
 * over.
 *
 * Three tiers of them, every one on every footprint - a tile or two along
 * the street and one deep (2x1, 3x1), end on to it (1x2, 1x3), or on a lot
 * both ways (2x2, 2x3, 3x2):
 *
 *   1. village houses need no street and no water, and their people no job
 *      in town: cottages, a longhouse, a farmstead or a croft, a farm round
 *      its yard - what a village is before it is a town;
 *   2. town houses - bungalows, two-storey houses, terraces and
 *      semi-detached houses (kinds "city" and "town"): a house of one's own
 *      on its own land, worth more a head to the treasury than flats - the
 *      more garden the more;
 *   3. villas: few people on a lot of land, and the richest of them - or,
 *      the other way, flats (data/flats): a lot of people on little land,
 *      paying little each.
 *
 * Measured against the rest the way data/buildings measures them:
 *
 *                       cost  heads  tax   heads   money   payback
 *                                    /head /tile   /tile
 *  village house        2500    3    20      3       60       42
 *  farmstead            4500    5    20     2.5      50       45
 *  cottages, 2x1        5000    6    20      3       60       42
 *  hamlet, 3x1          7500    9    20      3       60       42
 *  croft, 1x3           6000    7    20     2.3      47       43
 *  farm, 2x2            9000   11    20     2.8      55       41
 *  long farm, 2x3      12500   14    20     2.3      47       45
 *  wide farm, 3x2      12500   14    20     2.3      47       45
 *  bungalow            14000    8    25      4      100       70
 *  two-storey house    13000    8    25      4      100       65
 *  house, long garden  18000   10    25     3.3      83       72
 *  terrace, 3x1        21000   12    25      4      100       70
 *  semi-detached       28000   16    25      4      100       70
 *   with gardens       34000   16    30     2.7      80       71
 *  terrace, 3x2        38000   18    28      3       84       75
 *  town villa, 1x2     30000    5    70     2.5     175       86
 *  villa, 2x1          33000    5    75     2.5     188       88
 *  town villa, 1x3     42000    6    75      2      150       93
 *  villa, 3x1          48000    7    75     2.3     175       91
 *  villa               60000   10    70     2.5     175       86
 *  grand villa         95000   14    75     2.3     175       90
 *  villa, 2x3          95000   13    75     2.2     163       97
 */
import BuildingClassCode from "./classcode";

//over the shops' codes (data/shops)
var BASE = 4000;

//each kind a hundred of its own, each footprint of it ten a tile across and
//one a tile deep within that
var KINDS = ["village", "city", "town", "villa"];

var HOUSES = [
  {
    kind: "village",
    footprint: "1x1",
    name: "village house",
    heads: 3,
    cost: 2500,
    time: 30000,
  },
  {
    kind: "village",
    footprint: "1x2",
    name: "farmstead",
    heads: 5,
    cost: 4500,
    time: 40000,
  },
  {
    kind: "village",
    footprint: "2x1",
    name: "cottages",
    heads: 6,
    cost: 5000,
    time: 40000,
  },
  {
    kind: "village",
    footprint: "3x1",
    name: "hamlet",
    heads: 9,
    cost: 7500,
    time: 50000,
  },
  {
    kind: "village",
    footprint: "1x3",
    name: "croft",
    heads: 7,
    cost: 6000,
    time: 45000,
  },
  {
    kind: "village",
    footprint: "2x2",
    name: "farm",
    heads: 11,
    cost: 9000,
    time: 55000,
  },
  {
    kind: "village",
    footprint: "2x3",
    name: "long farm",
    heads: 14,
    cost: 12500,
    time: 65000,
  },
  {
    kind: "village",
    footprint: "3x2",
    name: "wide farm",
    heads: 14,
    cost: 12500,
    time: 65000,
  },
  {
    kind: "city",
    footprint: "2x1",
    name: "bungalow with garage",
    heads: 8,
    cost: 14000,
    tax: 25,
    time: 45000,
  },
  {
    kind: "city",
    footprint: "1x2",
    name: "town house",
    heads: 8,
    cost: 13000,
    tax: 25,
    time: 45000,
  },
  {
    kind: "city",
    footprint: "1x3",
    name: "house with long garden",
    heads: 10,
    cost: 18000,
    tax: 25,
    time: 55000,
  },
  {
    kind: "city",
    footprint: "3x1",
    name: "terrace",
    heads: 12,
    cost: 21000,
    tax: 25,
    time: 60000,
  },
  {
    kind: "town",
    footprint: "2x2",
    name: "semi-detached houses",
    heads: 16,
    cost: 28000,
    tax: 25,
    time: 70000,
  },
  {
    kind: "town",
    footprint: "2x3",
    name: "semi-detached with gardens",
    heads: 16,
    cost: 34000,
    tax: 30,
    time: 80000,
  },
  {
    kind: "town",
    footprint: "3x2",
    name: "terrace with gardens",
    heads: 18,
    cost: 38000,
    tax: 28,
    time: 85000,
  },
  {
    kind: "villa",
    footprint: "1x2",
    name: "town villa",
    heads: 5,
    cost: 30000,
    tax: 70,
    time: 80000,
  },
  {
    kind: "villa",
    footprint: "2x1",
    name: "villa on the street",
    heads: 5,
    cost: 33000,
    tax: 75,
    time: 85000,
  },
  {
    kind: "villa",
    footprint: "1x3",
    name: "town villa with garden",
    heads: 6,
    cost: 42000,
    tax: 75,
    time: 90000,
  },
  {
    kind: "villa",
    footprint: "3x1",
    name: "long villa",
    heads: 7,
    cost: 48000,
    tax: 75,
    time: 100000,
  },
  {
    kind: "villa",
    footprint: "2x2",
    name: "villa with garden",
    heads: 10,
    cost: 60000,
    tax: 70,
    time: 100000,
  },
  {
    kind: "villa",
    footprint: "3x2",
    name: "grand villa",
    heads: 14,
    cost: 95000,
    tax: 75,
    time: 130000,
  },
  {
    kind: "villa",
    footprint: "2x3",
    name: "villa with grounds",
    heads: 13,
    cost: 95000,
    tax: 75,
    time: 130000,
  },
];

//which tier of housing each kind is (see above), for the catalogue to keep
//them together
var TIERS = { village: 1, city: 2, town: 2, villa: 3 };

function code(house) {
  var size = house.footprint.split("x").map(Number);

  return BASE + KINDS.indexOf(house.kind) * 100 + size[0] * 10 + size[1];
}

/**
 * Every house there is, as data/buildings has its buildings, by code.
 */
function buildings() {
  var out = {};

  HOUSES.forEach(function (house) {
    var size = house.footprint.split("x").map(Number),
      village = house.kind === "village",
      data = {
        sizeX: size[0],
        sizeY: size[1],
        buildingCode: code(house),
        classCode: BuildingClassCode.house,
        producing: {},
        demanding: {},
        //a village needs nothing of the town - a well and a lane of its own
        requires: village ? {} : { road: true, water: true },
        citizenCapacity: house.heads,
        constructionTime: house.time,
        constructionCost: {
          money: house.cost,
        },
        name: house.name,
        tier: TIERS[house.kind],
        //drawn out of parts, see client/compoundbuilding
        compound: {
          gen: "houses",
          footprint: house.kind + "-" + house.footprint,
          sizeX: size[0],
          sizeY: size[1],
        },
      };

    //they live off the land, not off a job in town
    if (village) data.needsJobs = false;
    if (house.tax !== undefined) data.taxPerResident = house.tax;

    out[code(house)] = data;
  });

  return out;
}

export default { code: code, buildings: buildings };
