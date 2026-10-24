/**
 * What the catalogue says of the buildings it offers, and the order it
 * offers them in: what a game starts with - what needs no water, the
 * houses, the old town, the water tower and the pump station first, then the parks - and then everything else: houses, then shops, a
 * tier at a time, the cheaper first within one.
 */
import Data from "isometrica/data/buildings";
import BuildingCode from "isometrica/data/buildingcode";
import BuildingClassCode from "isometrica/data/classcode";
import CityPopulation from "isometrica/core/city/citypopulation";
import Numeral from "numeral";

var BuildingData = Data;

//what a card shows under the picture: one line each, "—" where a building has
//nothing to say, so every card in the grid comes out the same height
function formatList(parts) {
  return parts.length ? parts.join(", ") : "\u2014";
}

//a building's name, the way it heads its card: "Town hall"
function capitalize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

//and for one put together out of parts, which comes on every footprint, the
//footprint too: "Farm · 2x2", along the street by back from it
export function displayName(b) {
  var name = capitalize(b.name);

  return b.compound !== undefined
    ? name + " \u00b7 " + b.sizeX + "x" + b.sizeY
    : name;
}

function formatMoney(amount) {
  return "$" + Numeral(amount).format("0,0");
}

function getStats(b) {
  var cost = [],
    needs = [],
    benefits = [],
    res;
  var requires = b.requires || {};

  for (res in b.constructionCost) {
    cost.push(
      res === "money"
        ? formatMoney(b.constructionCost[res])
        : res + " " + b.constructionCost[res],
    );
  }
  //the least of a road it wants: "cobble road" - and nothing for standing
  //with the town, which everything wants
  if (requires.road)
    needs.push(
      typeof requires.road === "string" ? requires.road + " road" : "road",
    );
  if (requires.water) needs.push("water");
  if (b.citizenCapacity && CityPopulation.needsJobs(b)) needs.push("jobs");

  if (b.citizenCapacity) {
    benefits.push(
      "up to +" +
        formatMoney(b.citizenCapacity * CityPopulation.taxPerResident(b)) +
        "/tick tax",
    );
  }
  for (res in b.producing) {
    benefits.push(
      "+" +
        (res === "money"
          ? formatMoney(b.producing[res])
          : res + " " + b.producing[res]) +
        "/tick" +
        (b.jobs ? " when staffed" : ""),
    );
  }
  if (b.waterRadius) {
    benefits.push("water in " + b.waterRadius + " tiles");
  }

  return {
    cost: cost.length ? formatList(cost) : "free",
    citizens: b.citizenCapacity ? String(b.citizenCapacity) : "\u2014",
    jobs: b.jobs ? String(b.jobs) : "\u2014",
    needs: needs.length ? formatList(needs) : "nothing",
    //what it costs to keep, every tick - or null for nothing
    upkeep:
      b.demanding && b.demanding.money
        ? formatMoney(b.demanding.money) + "/tick"
        : null,
    benefits: formatList(benefits),
  };
}

//rarely wanted, so they go after everything the city is actually built from,
//in this order
var LAST = [BuildingCode.cityHall, BuildingCode.tree];

//-1 for everything else, which sorts it ahead of the LAST ones
function lastRank(code) {
  return LAST.indexOf(parseInt(code, 10));
}

function orderOf(code) {
  var variants = BuildingData[code].variants;

  return variants ? Math.min.apply(null, variants) : parseInt(code, 10);
}

//what a game starts with comes first: whatever needs no water - a lane at
//most - can go down on the first day, the houses, the old town and the water
//tower that a village is made of before what only looks well, a park; and
//the rest only once there are streets and water to it
function startRank(code) {
  var b = BuildingData[code],
    requires = b.requires || {},
    gives =
      b.citizenCapacity ||
      b.waterRadius ||
      b.jobs ||
      Object.keys(b.producing || {}).length > 0;

  if (requires.water) return 2;

  return gives ? 0 : 1;
}

//and within that, houses before shops before the rest, a tier at a time -
//its footprints together, rather than every tier's cheapest first
var CLASS_ORDER = [
  BuildingClassCode.house,
  BuildingClassCode.commerce,
  BuildingClassCode.municipal,
];

function groupRank(code) {
  var b = BuildingData[code],
    at = CLASS_ORDER.indexOf(b.classCode);

  return (at === -1 ? CLASS_ORDER.length : at) * 10 + (b.tier || 0);
}

//and the top tiers' two ways apart: villas and flats, markets and offices -
//by what paints them
function kindOf(code) {
  var compound = BuildingData[code].compound;

  return compound ? compound.gen : "";
}

//and within that, the cheaper first: the order a town gets built in
function costOf(code) {
  var cost = BuildingData[code].constructionCost || {};

  return cost.money || 0;
}

/**
 * Everything the catalogue offers, in the order it offers it: {code,
 * displayName, stats} each. Buildings still carry a classCode (see
 * data/classcode, data/classes) so the category grouping stays in the data,
 * but the catalogue no longer splits on it - everything is one list.
 */
export function buildings() {
  var r = [],
    code,
    b;
  for (code in Data) {
    b = Data[code];
    if (!b.hidden) {
      r.push({
        code: code,
        displayName: displayName(b),
        stats: getStats(b),
      });
    }
  }
  //what a game starts with first, then by cost - and among the same, by
  //code: a type where its first variant would be
  return r.sort(function (x, y) {
    var a = x.code,
      b = y.code;

    return (
      lastRank(a) - lastRank(b) ||
      startRank(a) - startRank(b) ||
      groupRank(a) - groupRank(b) ||
      kindOf(b).localeCompare(kindOf(a)) ||
      costOf(a) - costOf(b) ||
      orderOf(a) - orderOf(b)
    );
  });
}
