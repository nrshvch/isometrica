/**
 * Created by User on 19.08.2014.
 */
define(function(require){
    var Events = require("events");
    var BuildingCode = require("../buildingcode");
    var BuildingData = require("../buildingdata");
    var ErrorCode = require("../errorcode");

    /**
     * @param city {City}
     * @constructor
     */
    function CityBuildings(city){
        this._buildings = [];
        this.city = this._city = city;
    }

    /**
     * @type {City}
     * @private
     */
    CityBuildings.prototype._city = null;

    /**
     * @type {Array}
     * @private
     */
    CityBuildings.prototype._buildings = null;

    CityBuildings.prototype.cityHall = null;

    CityBuildings.prototype.events = {
        "new":0,
        "remove":1
    };

    CityBuildings.prototype.init = function(){

    };

    CityBuildings.prototype.buildBuilding = function (buildingCode, baseX, baseY, rotate, onSuccess, onError) {
        var test = buildTest(this, buildingCode, baseX, baseY, rotate);
        var self = this;
        var city = this._city;

        if (test.success) {
            var data = BuildingData[buildingCode];
            city.world.buildings.build(buildingCode, baseX, baseY, rotate, function(building){

                city.resources.sub(data.constructionCost);
                self._buildings.push(building);

                if (buildingCode === BuildingCode.cityHall)
                    self.cityHall = building;

                onSuccess(building);

                Events.fire(self, self.events.new, building);
            }, onError);
        }else{
            onError(test.error);
        }
    };

    CityBuildings.prototype.destroyBuilding = function(){
        throw "Not implemented";
    };

    CityBuildings.prototype.getBuildings = function(){
        return this._buildings;
    };

    function buildTest(self, buildingCode, x,y, rotated) {
        var city = self._city;

        var result = {
            success: true,
            error: ErrorCode.NONE
        };

        var data = BuildingData[buildingCode],
            availableBuildingList = city.lab.getAvailableBuildings();

        if (availableBuildingList.indexOf(buildingCode) === -1) {
            result.success = false;
            result.error = ErrorCode.BUILDING_NOT_AVAIL;
        } else if (buildingCode === BuildingCode.cityHall && self.cityHall !== null) {
            result.success = false;
            result.error = ErrorCode.CITY_HALL_ALREADY_BUILT;
        } else if(!city.area.contains(x,y,data.sizeX,data.sizeY)) {
            result.success = false;
            result.error = ErrorCode.CANT_BUILD_HERE;
        } else if (!city.resources.hasMoreThan(data.constructionCost)){
            result.success = false;
            result.error = ErrorCode.NOT_ENOUGH_RES;
        }
        return result;
    }

    return CityBuildings;
});