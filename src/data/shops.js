/**
 * The shops put together out of parts the game paints (see shared/gen/shops
 * and client/compoundbuilding): one to a footprint in the catalogue, and
 * each put down as any of the shops there are for that footprint, at
 * random - a corner shop of the small town, a shop with its own car park, a
 * superstore, a shopping centre or a market hall.
 *
 * Like the other shops they make their money with the people who work in
 * them, the bigger the more of it for every tile.
 */
import BuildingClassCode from "./classcode";

//over the office blocks' codes (data/offices)
var BASE = 3000;

var SHOPS = [
  {
    footprint: "1x1",
    name: "corner shop",
    jobs: 16,
    money: 120,
    cost: 9000,
    time: 40000,
  },
  {
    footprint: "1x2",
    name: "shop with parking",
    jobs: 30,
    money: 230,
    cost: 20000,
    time: 60000,
  },
  {
    footprint: "2x2",
    name: "superstore",
    jobs: 90,
    money: 660,
    cost: 65000,
    time: 110000,
  },
  {
    footprint: "2x3",
    name: "shopping centre",
    jobs: 150,
    money: 1080,
    cost: 110000,
    time: 150000,
  },
];

function code(shop) {
  var size = shop.footprint.split("x").map(Number);

  return BASE + size[0] * 10 + size[1];
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
      //drawn out of parts, see client/compoundbuilding
      compound: {
        gen: "shops",
        footprint: shop.footprint,
        sizeX: size[0],
        sizeY: size[1],
      },
    };
  });

  return out;
}

export default { code: code, buildings: buildings };
