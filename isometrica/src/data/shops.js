/**
 * The shops put together out of parts the game paints (see shared/gen/shops
 * and client/compoundbuilding): one to a tier and footprint in the
 * catalogue, and each put down as any of the shops there are for it, at
 * random. Three tiers of them, every one on every footprint - a tile or two
 * along the street and one deep (2x1, 3x1), end on to it (1x2, 1x3), or on a
 * lot both ways (2x2, 2x3, 3x2):
 *
 *   1. small shops: a corner shop, a parade of them, shops with car parks
 *      side by side;
 *   2. stores: supermarkets, superstores, department stores, a shopping
 *      centre or a market hall;
 *   3. farmers' markets - in the open, under a timber roof or by a glass
 *      hall - or else office blocks (data/offices).
 *
 * Like the other shops they make their money with the people who work in
 * them, the bigger the more of it for every tile; a market less of them for
 * what it makes, but on stalls rather than floors. What a shop employs, makes
 * and costs is its tier's and how many tiles it covers, and nothing else
 * (BY_TILES): the footprints of the same size are the same shop laid out
 * another way.
 *
 *              tiles   jobs   money    cost   money  payback
 *                                              /tile
 *  small         1      16     120     9000    120      75
 *                2      34     260    19000    130      73
 *                3      52     400    30000    133      75
 *                4      72     550    42000    138      76
 *                6     112     860    66000    143      77
 *  stores        2      56     410    38000    205      93
 *                3      86     630    59000    210      94
 *                4     118     860    81000    215      94
 *                6     182    1320   126000    220      95
 *  markets       2      20     280    12000    140      43
 *                3      31     435    18500    145      43
 *                4      42     595    25500    149      43
 *                6      66     915    40000    153      44
 */
import BuildingClassCode from "./classcode";

//over the office blocks' codes (data/offices)
var BASE = 3000;

//tier: which of the three above; code: for the first shops, which kept the
//codes they had before there were tiers - the rest are numbered BASE, a
//hundred for every tier, and the footprint - and for a footprint's second
//design, which took the place of its first, five hundred more than that,
//with the footprint it is painted as (gen). Those replacedBy another are no
//longer offered: deprecated, kept hidden only for the cities that have them,
//till the saves are rid of them
var SHOPS = [
  {
    tier: 1,
    code: 3011,
    footprint: "1x1",
    name: "corner shop",
  },
  {
    tier: 1,
    code: 3012,
    footprint: "1x2",
    name: "shop with parking",
  },
  {
    tier: 1,
    footprint: "2x1",
    name: "parade of shops",
  },
  {
    tier: 1,
    footprint: "3x1",
    name: "row of shops",
    replacedBy: 3631,
  },
  {
    tier: 1,
    code: 3631,
    footprint: "3x1",
    gen: "small-3x1-side",
    name: "shop with side parking",
  },
  {
    tier: 1,
    footprint: "1x3",
    name: "shop with a big car park",
  },
  {
    tier: 1,
    footprint: "2x2",
    name: "shops with parking",
  },
  {
    tier: 1,
    footprint: "2x3",
    name: "shops with a big car park",
  },
  {
    tier: 1,
    footprint: "3x2",
    name: "strip of shops",
  },
  {
    tier: 2,
    code: 3022,
    footprint: "2x2",
    name: "superstore",
  },
  {
    tier: 2,
    code: 3023,
    footprint: "2x3",
    name: "shopping centre",
  },
  {
    tier: 2,
    footprint: "2x1",
    name: "store on the street",
    replacedBy: 3721,
  },
  {
    tier: 2,
    code: 3721,
    footprint: "2x1",
    gen: "mall-2x1-side",
    name: "store with side parking",
  },
  {
    tier: 2,
    footprint: "3x1",
    name: "big store on the street",
  },
  {
    tier: 2,
    footprint: "1x2",
    name: "department store",
  },
  {
    tier: 2,
    footprint: "1x3",
    name: "department store with parking",
  },
  {
    tier: 2,
    footprint: "3x2",
    name: "retail park",
  },
  {
    tier: 3,
    footprint: "1x2",
    name: "farmers' market",
  },
  {
    tier: 3,
    footprint: "2x1",
    name: "farmers' market on the street",
  },
  {
    tier: 3,
    footprint: "3x1",
    name: "long farmers' market",
  },
  {
    tier: 3,
    footprint: "1x3",
    name: "deep farmers' market",
  },
  {
    tier: 3,
    footprint: "2x2",
    name: "market square",
  },
  {
    tier: 3,
    footprint: "2x3",
    name: "market hall",
  },
  {
    tier: 3,
    footprint: "3x2",
    name: "great market",
  },
];

//what a shop of each tier employs, makes, costs and takes to build by how
//many tiles it covers: [jobs, money, cost, time]
var BY_TILES = {
  1: {
    1: [16, 120, 9000, 40000],
    2: [34, 260, 19000, 55000],
    3: [52, 400, 30000, 65000],
    4: [72, 550, 42000, 70000],
    6: [112, 860, 66000, 85000],
  },
  2: {
    2: [56, 410, 38000, 85000],
    3: [86, 630, 59000, 100000],
    4: [118, 860, 81000, 110000],
    6: [182, 1320, 126000, 140000],
  },
  3: {
    2: [20, 280, 12000, 60000],
    3: [31, 435, 18500, 70000],
    4: [42, 595, 25500, 80000],
    6: [66, 915, 40000, 100000],
  },
};

//what each tier's footprints are called among the shops the generator
//paints (shared/gen/shops describe footprints) - the first shops by their
//footprint alone
var GEN = { 1: "small-", 2: "mall-", 3: "market-" };

function genFootprint(shop) {
  if (shop.gen !== undefined) return shop.gen;

  return shop.code !== undefined
    ? shop.footprint
    : GEN[shop.tier] + shop.footprint;
}

function code(shop) {
  if (shop.code !== undefined) return shop.code;

  var size = shop.footprint.split("x").map(Number);

  return BASE + shop.tier * 100 + size[0] * 10 + size[1];
}

/**
 * Every shop there is, as data/buildings has its buildings, by code.
 */
function buildings() {
  var out = {};

  SHOPS.forEach(function (shop) {
    var size = shop.footprint.split("x").map(Number),
      numbers = BY_TILES[shop.tier][size[0] * size[1]],
      data;

    data = out[code(shop)] = {
      sizeX: size[0],
      sizeY: size[1],
      buildingCode: code(shop),
      classCode: BuildingClassCode.commerce,
      producing: {
        money: numbers[1],
      },
      //it only makes its money with them in
      jobs: numbers[0],
      demanding: {},
      //a cobbled street at least, and the mains
      requires: {
        road: "cobble",
        water: true,
      },
      constructionTime: numbers[3],
      constructionCost: {
        money: numbers[2],
      },
      name: shop.name,
      tier: shop.tier,
      //drawn out of parts, see client/compoundbuilding
      compound: {
        gen: "shops",
        footprint: genFootprint(shop),
        sizeX: size[0],
        sizeY: size[1],
      },
    };

    if (shop.replacedBy !== undefined) {
      data.hidden = true;
      data.deprecated = true;
      data.replacedBy = shop.replacedBy;
    }
  });

  return out;
}

export default { code: code, buildings: buildings };
