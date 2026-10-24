/**
 * Created by denis on 9/17/14.
 */
import Core from "../core/main";
import Events from "events";
import CityLabel from "./gameObjects/citylabel";
import CityComponent from "./components/city";
import Config from "./config";
import View from "./view";

var City = Core.City;
var CoreTerrain = Core.Terrain;

function addCityGO(self, city) {
  var gos = self._cityGOs;
  var tile = city.tile();

  if (gos[tile] !== undefined)
    throw "There already is some city GO on tile " + tile;

  var go = new CityLabel(city);
  self.root.game.scene.addGameObject(go);

  gos[tile] = go;

  return gos[tile];
}

function labelText(city) {
  return city.name() + " (" + city.population.getPopulation() + ")";
}

function updateLabel(self, city) {
  var go = self._cityGOs[city.tile()];

  go.textRenderer.text =
    self._namesHidden || !self.names ? "" : labelText(city);
}

function setupLabel(self, city) {
  addCityGO(self, city);

  placeLabel(self, city);
  updateLabel(self, city);
}

/**
 * Hangs the city's name over the middle of the town (City#center) - moved
 * along as it grows - at the height of the ground there.
 */
function placeLabel(self, city) {
  var go = self._cityGOs[city.tile()],
    c = city.center(),
    tile = CoreTerrain.convertToIndex(Math.round(c.x), Math.round(c.y));

  go.transform.setPosition(
    c.x * Config.tileSize,
    self.root.terrain.tileYPos(tile),
    c.y * Config.tileSize,
  );
}

function onNewCity(sender, city, self) {
  setupLabel(self, city);

  Events.on(city, City.events.rename, onCityRename, self);
  //the city ticks its update event, which is when the population moves
  Events.on(city, City.events.update, onCityUpdate, self);
}

function onCityRename(city, name, self) {
  updateLabel(self, city);
}

function onCityUpdate(city, args, self) {
  placeLabel(self, city);
  updateLabel(self, city);
}

function Cityman(root) {
  this.root = root;
  this._cityGOs = {};
  //the cities' names put away, with the rest of the words over the world
  //(ServiceMan#toggleLabels)
  this._namesHidden = false;
  //whether the cities' names are written over them at all - a game that
  //shows its city's elsewhere goes without (city-sim play.js)
  this.names = true;
}

/**
 * @returns {boolean} whether the cities' names are put away with the rest of
 *          the words over the world - and whatever a game draws with them
 */
Cityman.prototype.namesHidden = function () {
  return this._namesHidden;
};

/**
 * Puts the cities' names away, or brings them back.
 *
 * @param hidden {boolean}
 */
Cityman.prototype.hideNames = function (hidden) {
  var cities = this.root.core.cities.getCities();

  this._namesHidden = hidden;
  for (var i = 0; i < cities.length; i++) updateLabel(this, cities[i]);
};

Cityman.prototype.init = function () {
  var root = this.root;

  //a click on the name is a click on the city hall under it - see
  //ServiceMan#inspect. The city screen opens off the money in the top bar
  Events.on(root.core.cities, Core.CityService.events.cityNew, onNewCity, this);

  //a city loaded from a save was put into the world before the client came
  //up, so it gets its label here instead of off the event - and the camera
  //opens on it, where the player left off
  var cities = root.core.cities.getCities();
  for (var i = 0; i < cities.length; i++)
    onNewCity(root.core.cities, cities[i], this);

  //turned the way it was left - before it moves, as it turns about where
  //it is
  keepTurns(root);

  if (cities.length > 0) this.locate(cities[0]);
  else startAtPicked(root);
};

/**
 * The camera turned the way the save says, and the save told of every turn
 * from here on - so that the city opens the way it was looked at. A save
 * from before that was kept, or one that makes no sense, opens unturned.
 */
function keepTurns(root) {
  var persistence = root.core.persistence;

  if (!persistence) return;

  var view = persistence.view(),
    turns = view !== null ? view.turns : 0;

  if (typeof turns === "number" && isFinite(turns) && turns % 1 === 0) {
    turns = ((turns % 4) + 4) % 4;
    if (turns !== View.turns())
      root.camera.cameraScript.turn(turns - View.turns());
  }

  Events.on(View, View.events.change, function () {
    //from above it is unturned for a while - the side it was seen from is
    //the one to come back to
    persistence.setView({
      turns: View.top() ? root.turnsBeforeTop : View.turns(),
    });
  });
}

/**
 * A blank city opens wherever UIManager#startFreshCity picked for it, once.
 */
function startAtPicked(root) {
  var at = null;

  try {
    at = JSON.parse(window.sessionStorage.getItem("isometrica.startAt"));
    window.sessionStorage.removeItem("isometrica.startAt");
  } catch (e) {
    return;
  }

  if (at !== null && isFinite(at.x) && isFinite(at.z))
    root.camera.transform.setPosition(at.x, 0, at.z);
}

/**
 * The city whose name was clicked on, if it was one.
 *
 * @returns {City|null}
 */
Cityman.prototype.pickCity = function (screenX, screenY) {
  var gos = this.root.camera.cameraScript.pickGameObject(screenX, screenY);

  for (var i = 0; i < gos.length; i++) {
    if (gos[i] instanceof CityLabel)
      return gos[i].getComponent(CityComponent).city;
  }

  return null;
};

/**
 * Puts the camera on the city, over its name - a city not founded yet has
 * none, and it stays where it is.
 *
 * @param city {City}
 * @param [glide] {boolean} on its way there, a moment, rather than right
 *        there (WorldCamera#glideTo)
 */
Cityman.prototype.locate = function (city, glide) {
  var go = this._cityGOs[city.tile()],
    cam = this.root.camera.cameraScript,
    pos;

  if (go === undefined) return;

  if (!glide) {
    cam.moveTo(go.transform);
    return;
  }

  pos = go.transform.getPosition();
  cam.glideTo(pos[0], pos[2]);
};

/**
 * Floats money the city made over the middle of it (City#center) - what it
 * made while the game was away, say.
 *
 * @param city {City}
 * @param amount {number}
 */
Cityman.prototype.showIncome = function (city, amount) {
  var c = city.center();

  this.root.buildman.showIncome(
    CoreTerrain.convertToIndex(Math.round(c.x), Math.round(c.y)),
    amount,
  );
};

Cityman.prototype.getCityGameObject = function (cityId) {
  var city = this.root.core.cities.getCity(cityId);
  var tile = city.tile();
  return this._cityGOs[tile];
};

export default Cityman;
