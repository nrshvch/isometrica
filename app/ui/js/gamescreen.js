define(function (require) {
    var View = require("./views/gamescreenview");
    var TopBar = require("./topbar");
    var WorldScreen = require("./worldscreen");
    var BuildingCategoryList = require("./views/buildingcategorylistview");
    var BuildingCategory = require("./views/buildingcategoryview");

    function GameScreen(ui) {
        this.ui = ui;

        this.view = new View({
            controller: this
        });

        this.view.head(this.topBar().view);
    }

    GameScreen.prototype.init = function (callback) {
        if(this.ready === true)
            callback(this);
        else {
            var self = this;
            this.ui.game(function (core, client) {
                self.ready = true;
                self.client = client;
                //self.worldScreen().init(client);
                callback(self);
            });
        }
    };

    GameScreen.prototype.view = null;

    GameScreen.prototype.worldScreen = function () {
        return this._worldScreen || (this._worldScreen = new WorldScreen(this.ui, this.client));
    };

    GameScreen.prototype.topBar = function () {
        return this._topBar || (this._topBar = new TopBar(this.ui));
    };

    GameScreen.prototype.buildingCategory = function () {
        return this._buildingCategory || (this._buildingCategory = new BuildingCategory({
            ui: this.ui
        }));
    };

    GameScreen.prototype.buildingCategoryList = function () {
        return this._buildingCategoryList || (this._buildingCategoryList = new BuildingCategoryList({
            ui: this.ui
        }));
    };

    GameScreen.prototype.show = function (name) {
        switch (name) {
            case "world":
                var vs = this.worldScreen();
                this.view.body(vs.view);
                vs.updateSize();
                break;
            case "catalogue":
                this.view.body(this.buildingCategoryList());
                return this.buildingCategoryList();
                break;
            case "category":
                this.view.body(this.buildingCategory());
                return this.buildingCategory();
        }
    };

    return GameScreen;
});
