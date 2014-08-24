/**
 * Created by User on 20.08.2014.
 */
define(function(require){
    var Resources = require("../resources");

    /**
     * @param city {City}
     * @constructor
     */
    function CityResources(city){
        this.city = city;
        this._resources = {
            money: 10000,
            stone: 100,
            wood: 100
        };
    }

    /**
     * @type {City}
     */
    CityResources.prototype.city = null;

    /**
     * @type {Resources}
     * @private
     */
    CityResources.prototype._resources = null;

    CityResources.prototype.add = function(resources){
        Resources.add(this._resources, this._resources, resources);
    };

    CityResources.prototype.sub = function(resources){
        Resources.sub(this._resources, this._resources, resources);
    };

    CityResources.prototype.hasMoreThan = function (resReq) {
        return Resources.every(resReq, hasMoreThanCheck, this);
    };

    CityResources.prototype.getResources = function(){
        return this._resources;
    };

    function hasMoreThanCheck(key, value, self) {
        return self._resources[key] >= value;
    }

    return CityResources;
});
