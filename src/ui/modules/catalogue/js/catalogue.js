import CatalogueView from "./views/catalogue";
import BuildingsView from "./views/buildings";
import BuildingView from "./views/building";
import Buildings from "./collections/buildings";
import Building from "./models/building";
import Data from "data/buildings";
import BuildingCode from "data/buildingcode";
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

function formatMoney(amount) {
    return "$" + Numeral(amount).format("0,0");
}

function getStats(b) {
    var cost = [], needs = [], benefits = [], res;
    var requires = b.requires || {};

    for (res in b.constructionCost) {
        cost.push(res === "money" ? formatMoney(b.constructionCost[res]) : res + " " + b.constructionCost[res]);
    }
    if (b.demanding && b.demanding.money) {
        cost.push(formatMoney(b.demanding.money) + "/tick upkeep");
    }

    if (requires.road) needs.push("road");
    if (requires.water) needs.push("water");
    if (b.citizenCapacity && CityPopulation.needsJobs(b)) needs.push("jobs");

    if (b.citizenCapacity) {
        benefits.push("up to +" + formatMoney(b.citizenCapacity * CityPopulation.taxPerResident(b)) + "/tick tax");
    }
    for (res in b.producing) {
        benefits.push("+" + (res === "money" ? formatMoney(b.producing[res]) : res + " " + b.producing[res]) + "/tick"
            + (b.jobs ? " when staffed" : ""));
    }
    if (b.waterRadius) {
        benefits.push("water in " + b.waterRadius + " tiles");
    }

    return {
        cost: cost.length ? formatList(cost) : "free",
        citizens: b.citizenCapacity ? String(b.citizenCapacity) : "\u2014",
        jobs: b.jobs ? String(b.jobs) : "\u2014",
        needs: needs.length ? formatList(needs) : "nothing",
        benefits: formatList(benefits)
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

// Buildings still carry a classCode (see data/classcode, data/classes) so the
// category grouping stays in the data, but the catalogue UI no longer splits
// on it - everything is shown as one flat list.
function getBuildings(self) {
    var r = [], code, b;
    for (code in Data) {
        b = Data[code];
        if(!b.hidden) {
            r.push(new Building({
                code: code,
                classCode: b.classCode,
                displayName: capitalize(b.name),
                stats: getStats(b)
            }));
        }
    }
    //the rest go by code - a type where its first variant would be, so that
    //it stands among the buildings it goes up as
    return r.sort(function (x, y) {
        return lastRank(x.get("code")) - lastRank(y.get("code"))
            || orderOf(x.get("code")) - orderOf(y.get("code"));
    });
}

function getBuilding(self, code) {
    var data = BuildingData[code];
    var model = new Building({
        displayName: capitalize(data.name),
        code: code,
        description: "This is a " + data.name + "! Deal with that!"
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
            model: getBuilding(this, buildingId)
        }).render();
    } else {
        v = new BuildingsView({
            catalogue: this,
            collection: new Buildings(getBuildings(this))
        }).render();
    }

    this.view.$el.empty();
    this.view.$el.append(v.el);

    return this.view;
};

export default Catalogue;
