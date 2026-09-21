import CatalogueView from "./views/catalogue";
import BuildingsView from "./views/buildings";
import BuildingView from "./views/building";
import Buildings from "./collections/buildings";
import Building from "./models/building";
import Data from "data/buildings";
import BuildingCode from "data/buildingcode";
import CityPopulation from "core/city/citypopulation";

var BuildingData = Data;

//what a card shows under the picture: one line each, "—" where a building has
//nothing to say, so every card in the grid comes out the same height
function formatList(parts) {
    return parts.length ? parts.join(", ") : "\u2014";
}

function getStats(b) {
    var cost = [], needs = [], benefits = [], res;
    var requires = b.requires || {};

    for (res in b.constructionCost) {
        cost.push((res === "money" ? "$" : res + " ") + b.constructionCost[res]);
    }
    if (b.demanding && b.demanding.money) {
        cost.push("$" + b.demanding.money + "/tick upkeep");
    }

    if (requires.road) needs.push("road");
    if (requires.water) needs.push("water");

    if (b.citizenCapacity) {
        benefits.push("up to +$" + b.citizenCapacity * CityPopulation.TAX_MONEY + "/tick tax");
    }
    for (res in b.producing) {
        benefits.push("+" + (res === "money" ? "$" : res + " ") + b.producing[res] + "/tick"
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
var LAST = [BuildingCode.cityHall, BuildingCode.tree1, BuildingCode.tree2, BuildingCode.cliff];

//-1 for everything else, which sorts it ahead of the LAST ones
function lastRank(code) {
    return LAST.indexOf(parseInt(code, 10));
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
                displayName: b.name,
                stats: getStats(b)
            }));
        }
    }
    //sort is stable, so the rest keep the order the data gives them
    return r.sort(function (x, y) {
        return lastRank(x.get("code")) - lastRank(y.get("code"));
    });
}

function getBuilding(self, code) {
    var data = BuildingData[code];
    var model = new Building({
        displayName: data.name,
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
