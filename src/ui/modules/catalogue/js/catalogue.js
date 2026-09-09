import CatalogueView from "./views/catalogue";
import CategoriesView from "./views/categories";
import BuildingsView from "./views/buildings";
import BuildingView from "./views/building";
import Categories from "./collections/categories";
import Buildings from "./collections/buildings";
import Category from "./models/category";
import Building from "./models/building";
import Data from "data/buildings";
import ClassCode from "data/classcode";
import ClassData from "data/classes";

var BuildingData = Data;

function getCategories(self) {
    var cats = new Categories();
    //var core = self.ui.core();
    var val, data, cat;
    for (var key in ClassCode) {
        val = ClassCode[key];
        data = ClassData[val];
        if (!data.hidden) {
            cat = new Category({
                code: val,
                name: key,
                displayName: data.name
            });
            cats.add(cat);
        }
    }
    return cats;
}

function getBuildings(self, classCode) {
    var r = [], code, b;
    for (code in Data) {
        b = Data[code];
        if (b.classCode === classCode) {
            r.push(new Building({
                code: code,
                classCode: b.classCode,
                displayName: b.name,
            }));
        }
    }
    return r;
}

function getCategory(self, code) {
    code = parseInt(code, 10);
    var data = ClassData[code];
    var category = new Category({
        code: code,
        displayName: data.name
    });
    category.buildings.add(getBuildings(self, code));
    return category;
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

Catalogue.prototype.execute = function (catId, buildingId) {
    var v;
    if (buildingId) {
        v = new BuildingView({
            catalogue: this,
            model: getBuilding(this, buildingId)
        }).render();
        this.ui.navigate("catalogue/" + catId + "/" + buildingId, false);
    } else if (catId) {
        v = new BuildingsView({
            catalogue: this,
            model: getCategory(this, catId)
        }).render();
        this.ui.navigate("catalogue/" + catId, false);
    } else {
        v = new CategoriesView({
            catalogue: this,
            collection: getCategories(this)
        }).render();
        this.ui.navigate("catalogue", false);
    }

    this.view.$el.empty();
    this.view.$el.append(v.el);

    return this.view;
};

export default Catalogue;
