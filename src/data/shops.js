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
 * what it makes, but on stalls rather than floors.
 */
import BuildingClassCode from "./classcode";

//over the office blocks' codes (data/offices)
var BASE = 3000;

//tier: which of the three above; code: for the first shops, which kept the
//codes they had before there were tiers - the rest are numbered BASE, a
//hundred for every tier, and the footprint
var SHOPS = [
  {
    tier: 1,
    code: 3011,
    footprint: "1x1",
    name: "corner shop",
    jobs: 16,
    money: 120,
    cost: 9000,
    time: 40000,
  },
  {
    tier: 1,
    code: 3012,
    footprint: "1x2",
    name: "shop with parking",
    jobs: 30,
    money: 230,
    cost: 20000,
    time: 60000,
  },
  {
    tier: 1,
    footprint: "2x1",
    name: "parade of shops",
    jobs: 32,
    money: 240,
    cost: 18000,
    time: 50000,
  },
  {
    tier: 1,
    footprint: "3x1",
    name: "row of shops",
    jobs: 48,
    money: 360,
    cost: 27000,
    time: 60000,
  },
  {
    tier: 1,
    footprint: "1x3",
    name: "shop with a big car park",
    jobs: 32,
    money: 250,
    cost: 23000,
    time: 65000,
  },
  {
    tier: 1,
    footprint: "2x2",
    name: "shops with parking",
    jobs: 50,
    money: 380,
    cost: 36000,
    time: 70000,
  },
  {
    tier: 1,
    footprint: "2x3",
    name: "shops with a big car park",
    jobs: 60,
    money: 460,
    cost: 44000,
    time: 80000,
  },
  {
    tier: 1,
    footprint: "3x2",
    name: "strip of shops",
    jobs: 75,
    money: 570,
    cost: 54000,
    time: 85000,
  },
  {
    tier: 2,
    code: 3022,
    footprint: "2x2",
    name: "superstore",
    jobs: 90,
    money: 660,
    cost: 65000,
    time: 110000,
  },
  {
    tier: 2,
    code: 3023,
    footprint: "2x3",
    name: "shopping centre",
    jobs: 150,
    money: 1080,
    cost: 110000,
    time: 150000,
  },
  {
    tier: 2,
    footprint: "2x1",
    name: "store on the street",
    jobs: 60,
    money: 440,
    cost: 42000,
    time: 90000,
  },
  {
    tier: 2,
    footprint: "3x1",
    name: "big store on the street",
    jobs: 90,
    money: 660,
    cost: 63000,
    time: 100000,
  },
  {
    tier: 2,
    footprint: "1x2",
    name: "department store",
    jobs: 60,
    money: 450,
    cost: 42000,
    time: 90000,
  },
  {
    tier: 2,
    footprint: "1x3",
    name: "department store with parking",
    jobs: 70,
    money: 520,
    cost: 50000,
    time: 100000,
  },
  {
    tier: 2,
    footprint: "3x2",
    name: "retail park",
    jobs: 135,
    money: 1000,
    cost: 98000,
    time: 130000,
  },
  {
    tier: 3,
    footprint: "1x2",
    name: "farmers' market",
    jobs: 20,
    money: 280,
    cost: 12000,
    time: 60000,
  },
  {
    tier: 3,
    footprint: "2x1",
    name: "farmers' market on the street",
    jobs: 20,
    money: 280,
    cost: 12000,
    time: 60000,
  },
  {
    tier: 3,
    footprint: "3x1",
    name: "long farmers' market",
    jobs: 30,
    money: 420,
    cost: 18000,
    time: 70000,
  },
  {
    tier: 3,
    footprint: "1x3",
    name: "deep farmers' market",
    jobs: 30,
    money: 420,
    cost: 18000,
    time: 70000,
  },
  {
    tier: 3,
    footprint: "2x2",
    name: "market square",
    jobs: 40,
    money: 560,
    cost: 24000,
    time: 80000,
  },
  {
    tier: 3,
    footprint: "2x3",
    name: "market hall",
    jobs: 60,
    money: 840,
    cost: 36000,
    time: 100000,
  },
  {
    tier: 3,
    footprint: "3x2",
    name: "great market",
    jobs: 60,
    money: 840,
    cost: 36000,
    time: 100000,
  },
];

//what each tier's footprints are called among the shops the generator
//paints (shared/gen/shops describe footprints) - the first shops by their
//footprint alone
var GEN = { 1: "small-", 2: "mall-", 3: "market-" };

function genFootprint(shop) {
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
    var size = shop.footprint.split("x").map(Number);

    out[code(shop)] = {
      sizeX: size[0],
      sizeY: size[1],
      buildingCode: code(shop),
      classCode: BuildingClassCode.commerce,
      producing: {
        money: shop.money,
      },
      //it only makes its money with them in
      jobs: shop.jobs,
      demanding: {},
      requires: {
        road: true,
        water: true,
      },
      constructionTime: shop.time,
      constructionCost: {
        money: shop.cost,
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
  });

  return out;
}

export default { code: code, buildings: buildings };
