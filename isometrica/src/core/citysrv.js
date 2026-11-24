/**
 * Created by denis on 9/17/14.
 */
import City from "./city";
import namespace from "namespace";
import Events from "events";

var Core = namespace("Isometrica.Core");
Core.CityService = CityService;

var events = {
  cityNew: 0,
  cityRemove: 1,
};

function addCity(self, city) {
  if (self._citiesById[city.id()] === undefined) {
    self._cities.push(city);
    self._citiesByName[city.name()] = city;
    self._citiesByTile[city.tile()] = city;
    self._citiesById[city.id()] = city;
  } else throw "City with id: " + city.id() + " already exists";
}

function CityService(root) {
  this.root = root;
  this._cities = [];
  this._citiesByName = {};
  this._citiesByTile = {};
  this._citiesById = {};
  //the next name for a city of the world (nameCity)
  this._named = 0;

  this.onNewCity = Events.event(events.cityNew);
}

CityService.events = events;

CityService.prototype.init = function () {};

/**
 * A city's name, for good: the one it had (a save), or the next - from 0,
 * the world's first city's, which saves from before cities kept theirs are
 * given too.
 *
 * @param [id] {number}
 * @returns {number}
 */
CityService.prototype.nameCity = function (id) {
  if (!(id >= 0)) id = this._named;
  this._named = Math.max(this._named, id + 1);
  return id;
};

CityService.prototype.establishCity = function (tile, name) {
  var city = City.establish(this.root, tile, name);
  if (city === null) return false;
  addCity(this, city);
  Events.fire(this, events.cityNew, city);
  city.init();
  return city;
};

/**
 * Brings a city back from a save. It is not founded - it has been there all
 * along, so nothing is tested, nothing is charged, and no city hall is put up:
 * the save says what stands where.
 *
 * @param data {Object} as City#save left it
 * @returns {City}
 */
CityService.prototype.restoreCity = function (data) {
  var city = new City(this.root, data.tile, data.id);

  addCity(this, city);
  Events.fire(this, events.cityNew, city);

  city.load(data);

  return city;
};

CityService.prototype.getCity = function (id) {
  return this._citiesById[id];
};

/**
 * @returns {City[]}
 */
CityService.prototype.getCities = function () {
  return this._cities;
};

export default CityService;
