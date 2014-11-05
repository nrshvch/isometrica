define(function (require) {
    var MainView = require("./views/city");
    var InfoView = require("./views/info");
    var MapView = require("./views/map");

    var CityModel = require("./models/city");

    function getCity(self, id){
        var city = self.game.client.core.cities.getCity(id);
        return new CityModel({
            name: city.name()
        },{
            city: city
        });
    }

    function Module(game) {
        this.game = game;
        this.ui = game.ui;
    }

    Module.prototype._mainView = undefined;
    Module.prototype._infoView = null;
    Module.prototype._mapView = null;

    Module.prototype.mainView = function () {
        if(this._mainView !== undefined)
            return this._mainView;

        var mainView = this._mainView = new MainView({
            ui: this.ui
        });
        mainView.addTab("info", this.infoView());
        mainView.addTab("map", this.mapView());

        return mainView;
    };

    Module.prototype.infoView = function () {
        return this._infoView || (this._infoView = new InfoView({
            model: getCity(this, 0),
            cityView: this
        }));
    };

    Module.prototype.mapView = function () {
        return this._mapView || (this._mapView = new MapView());
    };

    Module.prototype.execute = function (id, tab) {
        switch(tab) {
            case "info":
            case "map":
                break;
            default:
                tab = "info";
        }

        var mainView = this.mainView();
        this.mainView().render();
        mainView.show(tab);

        return mainView;
    };

    return Module;
});