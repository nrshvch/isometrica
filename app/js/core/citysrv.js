/**
 * Created by denis on 9/17/14.
 */
define(function (require) {
    var City = require("./city");
    var namespace = require("namespace");

    var Core = namespace("Isometrica.Core");
    Core.CityService = CityService;

    var events = {
        cityNew: 0,
        cityRemove: 1
    };

    function addCity(self, city){
        if(self._citiesById[city.id()] === undefined){
            self._cities.push(city);
            self._citiesByName[city.name()] = city;
            self._citiesByTile[city.tile()] = city;
            self._citiesById[city.id()] = city;
        }else
            throw "City with id: "+city.id()+" already exists";
    }

    function removeCity(self, city){
        var index = this._cities.indexOf(city);
        if(index !== -1)
            this._cities.splice(index, 1);
        delete this._citiesByName[city.name()];
        delete this._citiesById[city.id()];
        delete this._citiesByTile[city.tile()];
    }

    function CityService(root) {
        this.root = root;
        this._cities = [];
        this._citiesByName = {};
        this._citiesByTile = {};
        this._citiesById = {};
    }

    CityService.events = events;

    CityService.prototype.init = function(){};

    CityService.prototype.establishCity = function(tile, name){
        var city = City.establish(this.root, tile, name);
        if (city === null)
            return false;
        addCity(this, city);
        Events.fire(this, events.cityNew, city);
        city.init();
        return city;
    };

    CityService.prototype.getCity = function (id) {
        return this._citiesById[id];
    };

    return CityService;
});