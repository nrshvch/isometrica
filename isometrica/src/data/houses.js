/**
 * The houses put together out of parts the game paints (see shared/gen/houses
 * and client/compoundbuilding): one to a kind and footprint in the catalogue,
 * and each put down as any of the houses there are of that kind for that
 * footprint, at random - so a street of them is not the same house over and
 * over.
 *
 * Three tiers of them, on the footprints that suit them - a tile or two
 * along the street and one deep (2x1, 3x1), end on to it (1x2, 1x3), or on a
 * lot both ways (2x2, 2x3, 3x2, and a villa's 3x3):
 *
 *   1. village houses need no more than to stand with the village - near a
 *      house of it, or a road - no water, and their people no job in town:
 *      cottages, a longhouse, a farmstead or a croft, a farm round its yard
 *      - what a village is before it is a town;
 *   2. town houses - bungalows, two-storey houses, terraces and
 *      semi-detached houses (kinds "city" and "town"): a house of one's own
 *      on its own land, worth more a head to the treasury than flats;
 *   3. villas: few people on a lot of land, and the richest of them - or,
 *      the other way, flats (data/flats): a lot of people on little land,
 *      paying little each.
 *
 * What a house holds and costs is its tier's and how many tiles it covers,
 * and nothing else (BY_TILES): the footprints of the same size are the same
 * house laid out another way - a farmstead end on to the street or cottages
 * along it, five homes for $4,500 either way. And the more tiles, the more
 * homes on each of them, for a little more a home: a big lot is the better
 * use of the land, a small one the cheaper start.
 *
 *              tiles  heads   cost    tax   heads   money  payback
 *                                    /head  /tile   /tile
 *  village       1      2     1800    20     2.0      40      45
 *                2      5     4500    20     2.5      50      45
 *                3      8     8000    20     2.7      53      50
 *                4     11    12000    20     2.8      55      55
 *                6     17    20000    20     2.8      57      59
 *  town          2      8    13000    25     4.0     100      65
 *                3     13    22000    25     4.3     108      68
 *                4     18    31000    25     4.5     113      69
 *                6     28    50000    25     4.7     117      71
 *  villa         2      5    30000    75     2.5     188      80
 *                3      8    50000    75     2.7     200      83
 *                4     11    70000    75     2.8     206      85
 *                6     17   112000    75     2.8     213      88
 *                9     26   175000    75     2.9     217      90
 *
 * Those marked deprecated - the village house on one tile, the villas on one
 * row of tiles - or replacedBy another - the hamlet by the croft along the
 * street - are no longer offered: they are kept, hidden, only for the
 * cities that have them, till the saves are rid of them.
 */
import BuildingClassCode from "./classcode";

//over the shops' codes (data/shops)
var BASE = 4000;

//each kind a hundred of its own, each footprint of it ten a tile across and
//one a tile deep within that - and for a footprint's second design, which
//took the place of its first, five hundred more than that (code), with the
//footprint it is painted as (gen)
var KINDS = ["village", "city", "town", "villa"];

var HOUSES = [
  {
    kind: "village",
    footprint: "1x1",
    name: "village house",
    deprecated: true,
  },
  {
    kind: "village",
    footprint: "1x2",
    name: "farmstead",
  },
  {
    kind: "village",
    footprint: "2x1",
    name: "cottages",
  },
  {
    kind: "village",
    footprint: "3x1",
    name: "hamlet",
    replacedBy: 4531,
  },
  {
    kind: "village",
    footprint: "3x1",
    code: 4531,
    gen: "village-3x1-side",
    name: "croft along the street",
  },
  {
    kind: "village",
    footprint: "1x3",
    name: "croft",
  },
  {
    kind: "village",
    footprint: "2x2",
    name: "farm",
  },
  {
    kind: "village",
    footprint: "2x3",
    name: "long farm",
  },
  {
    kind: "village",
    footprint: "3x2",
    name: "wide farm",
  },
  {
    kind: "city",
    footprint: "2x1",
    name: "bungalow with garage",
  },
  {
    kind: "city",
    footprint: "1x2",
    name: "town house",
  },
  {
    kind: "city",
    footprint: "1x3",
    name: "house with long garden",
  },
  {
    kind: "city",
    footprint: "3x1",
    name: "terrace",
  },
  {
    kind: "town",
    footprint: "2x2",
    name: "semi-detached houses",
  },
  {
    kind: "town",
    footprint: "2x3",
    name: "semi-detached with gardens",
  },
  {
    kind: "town",
    footprint: "3x2",
    name: "terrace with gardens",
  },
  {
    kind: "villa",
    footprint: "1x2",
    name: "town villa",
    deprecated: true,
  },
  {
    kind: "villa",
    footprint: "2x1",
    name: "villa on the street",
    deprecated: true,
  },
  {
    kind: "villa",
    footprint: "1x3",
    name: "town villa with garden",
    deprecated: true,
  },
  {
    kind: "villa",
    footprint: "3x1",
    name: "long villa",
    deprecated: true,
  },
  {
    kind: "villa",
    footprint: "2x2",
    name: "villa with garden",
  },
  {
    kind: "villa",
    footprint: "3x2",
    name: "grand villa",
  },
  {
    kind: "villa",
    footprint: "2x3",
    name: "villa with grounds",
  },
  {
    kind: "villa",
    footprint: "3x3",
    name: "villa estate",
  },
];

//which tier of housing each kind is (see above), for the catalogue to keep
//them together
var TIERS = { village: 1, city: 2, town: 2, villa: 3 };

//what a house of each tier holds, costs and takes to build by how many
//tiles it covers - [heads, cost, time] - and what each head of it pays
var BY_TILES = {
  1: {
    tax: 20,
    1: [2, 1800, 30000],
    2: [5, 4500, 40000],
    3: [8, 8000, 45000],
    4: [11, 12000, 55000],
    6: [17, 20000, 65000],
  },
  2: {
    tax: 25,
    2: [8, 13000, 45000],
    3: [13, 22000, 55000],
    4: [18, 31000, 70000],
    6: [28, 50000, 85000],
  },
  3: {
    tax: 75,
    2: [5, 30000, 80000],
    3: [8, 50000, 95000],
    4: [11, 70000, 100000],
    6: [17, 112000, 130000],
    9: [26, 175000, 150000],
  },
};

function code(house) {
  if (house.code !== undefined) return house.code;

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
      tier = BY_TILES[TIERS[house.kind]],
      numbers = tier[size[0] * size[1]],
      data = {
        sizeX: size[0],
        sizeY: size[1],
        buildingCode: code(house),
        classCode: BuildingClassCode.house,
        producing: {},
        demanding: {},
        //a village's house needs nothing of the town but to stand with it,
        //as everything does (core/city/cityroads) - its fields in its
        //footprint, a well of its own; a house in town a cobbled street at
        //least, and the mains
        requires: village ? undefined : { road: "cobble", water: true },
        citizenCapacity: numbers[0],
        taxPerResident: tier.tax,
        constructionTime: numbers[2],
        constructionCost: {
          money: numbers[1],
        },
        name: house.name,
        tier: TIERS[house.kind],
        //drawn out of parts, see client/compoundbuilding
        compound: {
          gen: "houses",
          footprint:
            house.gen !== undefined
              ? house.gen
              : house.kind + "-" + house.footprint,
          sizeX: size[0],
          sizeY: size[1],
        },
      };

    //they live off the land, not off a job in town
    if (village) data.needsJobs = false;
    //no longer offered, kept only for the cities that have them - and what
    //took the place of one, if anything did
    if (house.deprecated || house.replacedBy !== undefined) {
      data.hidden = true;
      data.deprecated = true;
    }
    if (house.replacedBy !== undefined) data.replacedBy = house.replacedBy;

    out[code(house)] = data;
  });

  return out;
}

export default { code: code, buildings: buildings };
