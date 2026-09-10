import CatalogueView from "./views/catalogue";
import BuildingsView from "./views/buildings";
import BuildingView from "./views/building";
import Buildings from "./collections/buildings";
import Building from "./models/building";
import Data from "data/buildings";

var BuildingData = Data;

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
            }));
        }
    }
    return r;
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
