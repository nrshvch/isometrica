define(function(require){
    var CategoriesView = require("./views/categories");
    var BuildingsView = require("./views/buildings");
    var BuildingView = require("./views/building");
    var Categories = require("./collections/categories");
    var Buildings = require("./collections/buildings");
    var Category = require("./models/category");
    var Building = require("./models/building");
    var Data = require("data/data");
    var BuildingData = Data;
    var ClassCode = require("data/buildingclasscode");
    var ClassData = require("data/buildingclassdata");

    function getCategories(self){
        var cats = new Categories();
        //var core = self.ui.core();
        var val, data, cat;
        for(var key in ClassCode){
            val = ClassCode[key];
            data = ClassData[val];
            if(!data.hidden){
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

    function getBuildings(self, classCode){
        var r = [], code,b;
        for(code in Data){
            b = Data[code];
            if(b.classCode === classCode){
                r.push(new Building({
                   code: code,
                    classCode: b.classCode,
                   displayName: b.name,
                }));
            }
        }
        return r;
    }

    function getCategory(self, code){
        code = parseInt(code, 10);
        var data = ClassData[code];
        var category = new Category({
            code: code,
            displayName: data.name
        });
        category.buildings.add(getBuildings(self, code));
        return category;
    }

    function getBuilding(self, code){
        var data = BuildingData[code];
        var model = new Building({
            displayName: data.name,
            code: code,
            description: "This is a "+data.name+"! Deal with that!"
        });
        return model;
    }

    function Catalogue(ui){
        this.ui = ui;
    }

    Catalogue.prototype.execute = function(catId, buildingId){
        if(buildingId)
            return new BuildingView({
                model: getBuilding(this, buildingId)
            }).render();
        else if(catId)
            return new BuildingsView({
                model: getCategory(this, catId)
            }).render();
        else
            return new CategoriesView({
                collection: getCategories(this)
            }).render();
    };

    return Catalogue;
});