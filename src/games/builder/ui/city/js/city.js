import MainView from "./views/city";
import InfoView from "./views/info";
import MapView from "./views/map";
import CityModel from "./models/city";
import { initialCityFile, download } from "./export";

function getCity(self, id) {
  var city = self.game.client.core.cities.getCity(id);
  return new CityModel(
    {},
    {
      city: city,
    },
  );
}

function Module(game) {
  this.game = game;
  this.ui = game.ui;
}

Module.prototype._mainView = undefined;
Module.prototype._infoView = null;
Module.prototype._mapView = null;

Module.prototype.mainView = function () {
  if (this._mainView !== undefined) return this._mainView;

  var mainView = (this._mainView = new MainView({
    ui: this.ui,
  }));
  mainView.addTab("info", this.infoView());
  mainView.addTab("map", this.mapView());

  return mainView;
};

Module.prototype.infoView = function () {
  return (
    this._infoView ||
    (this._infoView = new InfoView({
      model: getCity(this, 0),
      exportCity: this.exportCity.bind(this),
    }))
  );
};

/**
 * Downloads the city as it stands as data/initialcity.js.
 */
Module.prototype.exportCity = function () {
  var save = this.game.client.core.persistence.snapshot();

  if (save !== null) download("initialcity.js", initialCityFile(save));
};

Module.prototype.mapView = function () {
  return this._mapView || (this._mapView = new MapView());
};

Module.prototype.execute = function (id, tab) {
  switch (tab) {
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

export default Module;
