import CatalogueView from "./views/catalogue";
import BuildingsView from "./views/buildings";
import BuildingView from "./views/building";
import Buildings from "./collections/buildings";
import Building from "./models/building";
import Data from "data/buildings";
import BuildingCode from "data/buildingcode";
import BuildingClassCode from "data/classcode";
import CityPopulation from "core/city/citypopulation";
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
function displayName(b) {
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
  if (b.demanding && b.demanding.money) {
    cost.push(formatMoney(b.demanding.money) + "/tick upkeep");
  }

  if (requires.road) needs.push("road");
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
    benefits: formatList(benefits),
  };
}

//rarely wanted, so they go after everything the city is actually built from,
//in this order
var LAST = [BuildingCode.cityHall, BuildingCode.tree, BuildingCode.cliff];

//-1 for everything else, which sorts it ahead of the LAST ones
function lastRank(code) {
  return LAST.indexOf(parseInt(code, 10));
}

function orderOf(code) {
  var variants = BuildingData[code].variants;

  return variants ? Math.min.apply(null, variants) : parseInt(code, 10);
}

//what a game starts with comes first: whatever needs nothing - no road, no
//water - can go down on the first day, the houses and the water tower that a
//village is made of before what only looks well, a park; and the rest only
//once there are roads and water to it
function startRank(code) {
  var b = BuildingData[code],
    requires = b.requires || {},
    gives =
      b.citizenCapacity ||
      b.waterRadius ||
      b.jobs ||
      Object.keys(b.producing || {}).length > 0;

  if (requires.road || requires.water) return 2;

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

// Buildings still carry a classCode (see data/classcode, data/classes) so the
// category grouping stays in the data, but the catalogue UI no longer splits
// on it - everything is shown as one flat list.
function getBuildings(self) {
  var r = [],
    code,
    b;
  for (code in Data) {
    b = Data[code];
    if (!b.hidden) {
      r.push(
        new Building({
          code: code,
          classCode: b.classCode,
          displayName: displayName(b),
          stats: getStats(b),
          image: imageOf(code),
          //the code to draw a picture of as the catalogue opens, see
          //showPreviews - none for a building drawn by hand
          preview: b.compound !== undefined ? code : "",
        }),
      );
    }
  }
  //what a game starts with first, then by cost - and among the same, by
  //code: a type where its first variant would be
  return r.sort(function (x, y) {
    var a = x.get("code"),
      b = y.get("code");

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

//the picture on a building's card: drawn by hand for most - for one put
//together out of parts, nothing until showPreviews draws it
function imageOf(code) {
  return BuildingData[code].compound !== undefined
    ? ""
    : "ui/img/buildings/" + code + ".png";
}

function getBuilding(self, code) {
  var data = BuildingData[code];
  var model = new Building({
    displayName: displayName(data),
    code: code,
    image: imageOf(code),
    preview: data.compound !== undefined ? code : "",
    description: "This is a " + data.name + "! Deal with that!",
  });
  return model;
}

function Catalogue(ui) {
  this.ui = ui.ui;
  this.view = new CatalogueView();
}

Catalogue.prototype.execute = function (buildingId) {
  var v;
  if (buildingId) {
    v = new BuildingView({
      catalogue: this,
      model: getBuilding(this, buildingId),
    }).render();
  } else {
    v = new BuildingsView({
      catalogue: this,
      collection: new Buildings(getBuildings(this)),
    }).render();
  }

  this.view.$el.empty();
  this.view.$el.append(v.el);

  return this.view;
};

export default Catalogue;
